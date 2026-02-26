import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  careerConsultantChat,
  getConsultantSessions,
  createConsultantSession,
  deleteConsultantSession,
  assignSessionToApplication,
} from '../api/ai';
import { getApplications } from '../api/applications';
import { useNotification } from '../context/NotificationContext';
import './CareerConsultant.css';

const GUIDED_TOPICS = [
  { key: 'skills_assessment', icon: 'psychology' },
  { key: 'career_path', icon: 'route' },
  { key: 'interview_prep', icon: 'record_voice_over' },
  { key: 'salary_negotiation', icon: 'payments' },
  { key: 'cv_improvement', icon: 'description' },
  { key: 'job_market', icon: 'trending_up' },
  { key: 'networking', icon: 'group' },
  { key: 'career_transition', icon: 'swap_horiz' },
];

const STATUS_COLORS = {
  draft: 'var(--status-draft)',
  sent: 'var(--status-sent)',
  interview: 'var(--status-interview)',
  rejected: 'var(--status-rejected)',
};

const STATUS_OPTIONS = ['all', 'draft', 'sent', 'interview', 'rejected'];
const SORT_OPTIONS = ['newest', 'oldest', 'company', 'role'];

export default function CareerConsultant() {
  const { t } = useTranslation();
  const { addNotification } = useNotification();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState('general');
  const messagesEndRef = useRef(null);

  // Session state
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [showSessions, setShowSessions] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Application linking
  const [apps, setApps] = useState([]);
  const [linkedAppId, setLinkedAppId] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignAppId, setAssignAppId] = useState('');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [showAppPicker, setShowAppPicker] = useState(false);
  const appPickerRef = useRef(null);

  // Load applications for linking
  useEffect(() => {
    getApplications({ per_page: 200 })
      .then((data) => setApps(data.applications || []))
      .catch(() => {});
  }, []);

  // Check URL params for pre-linked application
  useEffect(() => {
    const appId = searchParams.get('application_id');
    if (appId) {
      setLinkedAppId(parseInt(appId));
    }
  }, [searchParams]);

  // Close app picker on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (appPickerRef.current && !appPickerRef.current.contains(e.target)) {
        setShowAppPicker(false);
      }
    };
    if (showAppPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAppPicker]);

  // Filtered and sorted applications
  const filteredApps = useMemo(() => {
    let result = [...apps];

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) =>
        (a.company || '').toLowerCase().includes(q) ||
        (a.role || '').toLowerCase().includes(q) ||
        (a.location || '').toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.applied_date || b.created_at) - new Date(a.applied_date || a.created_at));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.applied_date || a.created_at) - new Date(b.applied_date || b.created_at));
        break;
      case 'company':
        result.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
        break;
      case 'role':
        result.sort((a, b) => (a.role || '').localeCompare(b.role || ''));
        break;
      default:
        break;
    }

    return result;
  }, [apps, searchQuery, statusFilter, sortBy]);

  // Load sessions
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await getConsultantSessions();
      setSessions(data.sessions || []);
    } catch {
      // ignore
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start new session
  const handleNewSession = async (topic = 'general') => {
    try {
      const linkedApp = apps.find((a) => a.id === linkedAppId);
      const title = linkedApp
        ? `${linkedApp.company} - ${linkedApp.role}`
        : t('careerConsultant.newSession');
      const data = await createConsultantSession({
        application_id: linkedAppId,
        title,
        topic,
      });
      setActiveSession(data.session);
      setMessages([]);
      setActiveTopic(topic);
      loadSessions();
    } catch {
      addNotification(t('common.error'), 'error');
    }
  };

  // Load existing session
  const handleLoadSession = (session) => {
    setActiveSession(session);
    setMessages(
      session.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
    );
    setActiveTopic(session.topic || 'general');
    setLinkedAppId(session.application_id);
    setShowSessions(false);
  };

  // Delete session
  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await deleteConsultantSession(sessionId);
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
      loadSessions();
    } catch {
      addNotification(t('common.error'), 'error');
    }
  };

  // Send message
  const handleSend = async (text) => {
    const msgText = text || input.trim();
    if (!msgText || loading) return;

    // Create session if none active
    if (!activeSession) {
      try {
        const linkedApp = apps.find((a) => a.id === linkedAppId);
        const title = linkedApp
          ? `${linkedApp.company} - ${linkedApp.role}`
          : msgText.substring(0, 50);
        const data = await createConsultantSession({
          application_id: linkedAppId,
          title,
          topic: activeTopic,
        });
        setActiveSession(data.session);
        loadSessions();
        sendMessage(msgText, data.session.id);
      } catch {
        addNotification(t('common.error'), 'error');
      }
      return;
    }

    sendMessage(msgText, activeSession.id);
  };

  const sendMessage = async (msgText, sessionId) => {
    const userMsg = { role: 'user', content: msgText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { response } = await careerConsultantChat({
        message: msgText,
        topic: activeTopic,
        application_id: linkedAppId,
        session_id: sessionId,
        history: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('careerConsultant.errorMessage') },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Assign session to application
  const handleAssign = async () => {
    if (!activeSession || !assignAppId) return;
    try {
      const data = await assignSessionToApplication(activeSession.id, parseInt(assignAppId));
      setActiveSession(data.session);
      setLinkedAppId(parseInt(assignAppId));
      setShowAssignModal(false);
      setAssignAppId('');
      loadSessions();
      addNotification(t('careerConsultant.sessionAssigned'), 'success');
    } catch {
      addNotification(t('common.error'), 'error');
    }
  };

  // Handle guided topic click
  const handleTopicClick = (topicKey) => {
    setActiveTopic(topicKey);
    const question = t(`careerConsultant.guidedQuestions.${topicKey}`);
    handleSend(question);
  };

  // Application picker helpers
  const handleSelectApp = (app) => {
    setLinkedAppId(app.id);
    setShowAppPicker(false);
    setSearchQuery('');
  };

  const handleClearApp = () => {
    setLinkedAppId(null);
    setShowAppPicker(false);
    setSearchQuery('');
  };

  const linkedApp = apps.find((a) => a.id === linkedAppId);

  // Context-aware quick questions based on linked application
  const getContextQuestions = () => {
    if (linkedApp) {
      return [
        t('careerConsultant.contextQuestions.prepInterview', { company: linkedApp.company, role: linkedApp.role }),
        t('careerConsultant.contextQuestions.improveCV', { role: linkedApp.role }),
        t('careerConsultant.contextQuestions.salaryAdvice', { company: linkedApp.company }),
        t('careerConsultant.contextQuestions.followUp', { company: linkedApp.company }),
      ];
    }
    return [1, 2, 3, 4].map((i) => t(`careerConsultant.presetQuestions.q${i}`));
  };

  return (
    <div className="career-consultant-page">
      {/* Sessions sidebar */}
      <div className={`cc-sessions-panel ${showSessions ? 'open' : ''}`}>
        <div className="cc-sessions-header">
          <h3>{t('careerConsultant.sessions')}</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => setShowSessions(false)}>
            <span className="material-icon">close</span>
          </button>
        </div>
        <button
          className="btn btn-primary btn-sm cc-new-session-btn"
          onClick={() => { handleNewSession(); setShowSessions(false); }}
        >
          <span className="material-icon">add</span>
          {t('careerConsultant.newSession')}
        </button>
        <div className="cc-sessions-list">
          {sessionsLoading ? (
            <div className="cc-sessions-loading">
              <span className="spinner" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="cc-sessions-empty">
              <p>{t('careerConsultant.noSessions')}</p>
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={`cc-session-item ${activeSession?.id === s.id ? 'active' : ''}`}
                onClick={() => handleLoadSession(s)}
              >
                <div className="cc-session-info">
                  <span className="cc-session-title">{s.title}</span>
                  <span className="cc-session-meta">
                    {s.company && `${s.company} · `}
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button
                  className="btn btn-ghost btn-xs cc-session-delete"
                  onClick={(e) => handleDeleteSession(s.id, e)}
                >
                  <span className="material-icon" style={{ fontSize: 16 }}>delete</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="cc-main">
        {/* Header */}
        <div className="cc-header">
          <div className="cc-header-left">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowSessions(true)}>
              <span className="material-icon">menu</span>
            </button>
            <div className="cc-brand">
              <img src="/logo.png" alt="FinixAI" className="cc-avatar" />
              <div>
                <h2 className="cc-title">FinixAI</h2>
                <span className="cc-subtitle">{t('careerConsultant.subtitle')}</span>
              </div>
            </div>
          </div>
          <div className="cc-header-right">
            {linkedApp && (
              <div className="cc-linked-app">
                <span className="material-icon" style={{ fontSize: 16 }}>link</span>
                <span>{linkedApp.company} - {linkedApp.role}</span>
              </div>
            )}
            {activeSession && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setShowAssignModal(true)}
              >
                <span className="material-icon" style={{ fontSize: 16 }}>assignment</span>
                {t('careerConsultant.assignToApp')}
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="cc-search-bar" ref={appPickerRef}>
          <div className="cc-search-row">
            <div className="cc-search-input-wrapper">
              <span className="material-icon cc-search-icon">search</span>
              <input
                type="text"
                className="cc-search-input"
                placeholder={t('careerConsultant.searchApplication')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowAppPicker(true)}
              />
              {searchQuery && (
                <button
                  className="btn btn-ghost btn-xs cc-search-clear"
                  onClick={() => setSearchQuery('')}
                >
                  <span className="material-icon" style={{ fontSize: 16 }}>close</span>
                </button>
              )}
            </div>

            <button
              className={`cc-filter-toggle ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
              title={t('careerConsultant.filters')}
            >
              <span className="material-icon">tune</span>
              {!showFilters && statusFilter !== 'all' && (
                <span className="cc-filter-badge" />
              )}
            </button>

            {linkedApp ? (
              <div className="cc-selected-chip" onClick={() => setShowAppPicker(!showAppPicker)}>
                <div
                  className="cc-chip-dot"
                  style={{ background: STATUS_COLORS[linkedApp.status] || 'var(--accent)' }}
                />
                <span className="cc-chip-text">{linkedApp.company} — {linkedApp.role}</span>
                <button
                  className="cc-chip-remove"
                  onClick={(e) => { e.stopPropagation(); handleClearApp(); }}
                >
                  <span className="material-icon" style={{ fontSize: 14 }}>close</span>
                </button>
              </div>
            ) : (
              <button
                className="cc-pick-app-btn-compact"
                onClick={() => setShowAppPicker(!showAppPicker)}
              >
                <span className="material-icon">work_outline</span>
                <span>{t('careerConsultant.selectApplication')}</span>
              </button>
            )}
          </div>

          {/* Filter row */}
          {showFilters && (
            <div className="cc-filter-row">
              <div className="cc-filter-group">
                <label>{t('careerConsultant.filterStatus')}</label>
                <div className="cc-filter-pills">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      className={`cc-filter-pill ${statusFilter === s ? 'active' : ''}`}
                      onClick={() => setStatusFilter(s)}
                      style={s !== 'all' ? { '--pill-color': STATUS_COLORS[s] } : {}}
                    >
                      {s === 'all' ? t('careerConsultant.allStatuses') : t(`statuses.${s}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cc-filter-group">
                <label>{t('careerConsultant.sortBy')}</label>
                <select
                  className="cc-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s} value={s}>{t(`careerConsultant.sort.${s}`)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Dropdown picker */}
          {showAppPicker && (
            <div className="cc-app-picker-dropdown">
              <div className="cc-app-picker-list">
                {/* No app option */}
                <div
                  className={`cc-app-picker-card cc-app-picker-none ${!linkedAppId ? 'selected' : ''}`}
                  onClick={handleClearApp}
                >
                  <span className="material-icon">do_not_disturb</span>
                  <span>{t('careerConsultant.noAppLinked')}</span>
                </div>

                {filteredApps.length === 0 && searchQuery ? (
                  <div className="cc-app-picker-empty">
                    <span className="material-icon">search_off</span>
                    <span>{t('careerConsultant.noAppsFound')}</span>
                  </div>
                ) : (
                  filteredApps.map((app) => (
                    <div
                      key={app.id}
                      className={`cc-app-picker-card ${linkedAppId === app.id ? 'selected' : ''}`}
                      onClick={() => handleSelectApp(app)}
                    >
                      <div className="cc-app-picker-card-left">
                        <div className="cc-app-picker-card-icon" style={{ background: STATUS_COLORS[app.status] || 'var(--accent)' }}>
                          {(app.company || '?')[0].toUpperCase()}
                        </div>
                        <div className="cc-app-picker-card-info">
                          <span className="cc-app-picker-card-company">{app.company}</span>
                          <span className="cc-app-picker-card-role">{app.role}</span>
                        </div>
                      </div>
                      <div className="cc-app-picker-card-right">
                        <span
                          className="cc-app-picker-card-status"
                          style={{ color: STATUS_COLORS[app.status] || 'var(--text-muted)' }}
                        >
                          {t(`statuses.${app.status}`)}
                        </span>
                        {app.applied_date && (
                          <span className="cc-app-picker-card-date">
                            {new Date(app.applied_date).toLocaleDateString()}
                          </span>
                        )}
                        {app.match_score && (
                          <span className="cc-app-picker-card-score">
                            {app.match_score}/10
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chat messages */}
        <div className="cc-messages">
          {messages.length === 0 ? (
            <div className="cc-welcome">
              <div className="cc-welcome-avatar">
                <img src="/logo.png" alt="FinixAI" />
              </div>
              <h3>
                {linkedApp
                  ? t('careerConsultant.welcomeTitleLinked', { company: linkedApp.company, role: linkedApp.role })
                  : t('careerConsultant.welcomeTitle')
                }
              </h3>
              <p>
                {linkedApp
                  ? t('careerConsultant.welcomeMessageLinked', { company: linkedApp.company, role: linkedApp.role })
                  : t('careerConsultant.welcomeMessage')
                }
              </p>

              {/* Guided topics */}
              <div className="cc-topics-grid">
                {GUIDED_TOPICS.map((topic) => (
                  <button
                    key={topic.key}
                    className="cc-topic-card"
                    onClick={() => handleTopicClick(topic.key)}
                  >
                    <span className="material-icon cc-topic-icon">{topic.icon}</span>
                    <span className="cc-topic-label">
                      {t(`careerConsultant.topics.${topic.key}`)}
                    </span>
                    <span className="cc-topic-desc">
                      {t(`careerConsultant.topicDescs.${topic.key}`)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Quick questions — context-aware */}
              <div className="cc-quick-questions">
                <h4>
                  {linkedApp
                    ? t('careerConsultant.questionsFor', { company: linkedApp.company })
                    : t('careerConsultant.quickQuestions')
                  }
                </h4>
                <div className="cc-quick-list">
                  {getContextQuestions().map((q, i) => (
                    <button
                      key={i}
                      className="cc-quick-btn"
                      onClick={() => handleSend(q)}
                    >
                      <span className="material-icon" style={{ fontSize: 14 }}>arrow_forward</span>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`cc-message ${msg.role}`}>
                  {msg.role === 'assistant' && (
                    <img src="/logo.png" alt="FinixAI" className="cc-msg-avatar" />
                  )}
                  <div className="cc-message-content">
                    {msg.content.split('\n').map((line, j) => (
                      <span key={j}>
                        {line}
                        {j < msg.content.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="cc-message assistant">
                  <img src="/logo.png" alt="FinixAI" className="cc-msg-avatar" />
                  <div className="cc-message-content cc-typing">
                    <span className="spinner" /> {t('careerConsultant.thinking')}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Topic pills (visible when in conversation) */}
        {messages.length > 0 && (
          <div className="cc-topic-pills">
            {GUIDED_TOPICS.slice(0, 4).map((topic) => (
              <button
                key={topic.key}
                className={`cc-pill ${activeTopic === topic.key ? 'active' : ''}`}
                onClick={() => handleTopicClick(topic.key)}
              >
                <span className="material-icon" style={{ fontSize: 14 }}>{topic.icon}</span>
                {t(`careerConsultant.topics.${topic.key}`)}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="cc-input-area">
          <input
            className="form-input cc-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              linkedApp
                ? t('careerConsultant.placeholderLinked', { company: linkedApp.company })
                : t('careerConsultant.placeholder')
            }
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button
            className="btn btn-primary cc-send-btn"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
          >
            <span className="material-icon">send</span>
          </button>
        </div>
      </div>

      {/* Assign to application modal */}
      {showAssignModal && (
        <div className="cc-modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="cc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cc-modal-header">
              <h3>{t('careerConsultant.assignToApp')}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAssignModal(false)}>
                <span className="material-icon">close</span>
              </button>
            </div>
            <div className="cc-modal-body">
              <p>{t('careerConsultant.assignDescription')}</p>
              <select
                className="form-input"
                value={assignAppId}
                onChange={(e) => setAssignAppId(e.target.value)}
              >
                <option value="">{t('careerConsultant.selectApp')}</option>
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.company} - {a.role}
                  </option>
                ))}
              </select>
            </div>
            <div className="cc-modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-primary" onClick={handleAssign} disabled={!assignAppId}>
                {t('careerConsultant.assign')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
