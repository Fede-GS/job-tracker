import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getApplication, updateApplication, deleteApplication, changeStatus } from '../api/applications';
import { uploadDocument, deleteDocument } from '../api/documents';
import { createReminder, dismissReminder, deleteReminder } from '../api/reminders';
import { summarizeApplication, generateInterviewPrep, tailorCvTemplate } from '../api/ai';
import { generatePdf } from '../api/profile';
import { createInterview, updateInterview, deleteInterview } from '../api/interviews';
import { useNotification } from '../context/NotificationContext';
import ApplicationForm from '../components/applications/ApplicationForm';
import StatusSelect from '../components/applications/StatusSelect';
import StatusBadge from '../components/applications/StatusBadge';
import InterviewForm from '../components/applications/InterviewForm';
import UnifiedTimeline from '../components/applications/UnifiedTimeline';
import FileUpload from '../components/documents/FileUpload';
import FileList from '../components/documents/FileList';
import ConfirmDialog from '../components/common/ConfirmDialog';
import Modal from '../components/common/Modal';
import RichTextEditor from '../components/editor/RichTextEditor';
import './ApplicationDetail.css';

const scoreColor = (score) => {
  if (score >= 7) return 'var(--success)';
  if (score >= 4) return 'var(--warning)';
  return 'var(--error)';
};

export default function ApplicationDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [reminderForm, setReminderForm] = useState({ remind_at: '', message: '' });
  const [editing, setEditing] = useState(false);
  const [showOriginalPosting, setShowOriginalPosting] = useState(false);

  // Tab system
  const [activeTab, setActiveTab] = useState('overview');

  // CV/CL viewer state
  const [cvMode, setCvMode] = useState('generated');
  const [cvEditing, setCvEditing] = useState(false);
  const [editedCvHtml, setEditedCvHtml] = useState('');
  const [clMode, setClMode] = useState('generated');
  const [clEditing, setClEditing] = useState(false);
  const [editedClHtml, setEditedClHtml] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);

  // CV template config state
  const [templateId, setTemplateId] = useState('classic');
  const [includePhoto, setIncludePhoto] = useState(false);
  const [maxPages, setMaxPages] = useState(1);
  const [skillsFormat, setSkillsFormat] = useState('list');
  const [generatingCv, setGeneratingCv] = useState(false);

  // Interview Prep state
  const [interviewPrep, setInterviewPrep] = useState(null);
  const [generatingPrep, setGeneratingPrep] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ questions: true, star: true, tips: true, advice: true });

  // Interview tracking state
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);

  const fetchApp = () => {
    getApplication(id)
      .then(({ application }) => setApp(application))
      .catch(() => addNotification(t('common.error'), 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchApp(); }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      const { application } = await changeStatus(id, { status: newStatus });
      setApp((prev) => ({ ...prev, ...application }));
      if (newStatus === 'interview') {
        setActiveTab('interviews');
        setShowInterviewForm(true);
      } else if (activeTab === 'interviewPrep' || activeTab === 'interviews') {
        setActiveTab('overview');
      }
      addNotification(t('common.success'), 'success');
    } catch (err) {
      addNotification(err.message, 'error');
    }
  };

  const handleSaveInterview = async (data) => {
    if (editingInterview) {
      const { interview } = await updateInterview(id, editingInterview.id, data);
      setApp((prev) => ({
        ...prev,
        interview_events: prev.interview_events.map((ie) => ie.id === interview.id ? interview : ie),
      }));
      setEditingInterview(null);
    } else {
      const { interview } = await createInterview(id, data);
      setApp((prev) => ({
        ...prev,
        interview_events: [...(prev.interview_events || []), interview],
      }));
    }
    addNotification(t('common.success'), 'success');
  };

  const handleDeleteInterview = async (interviewId) => {
    try {
      await deleteInterview(id, interviewId);
      setApp((prev) => ({
        ...prev,
        interview_events: prev.interview_events.filter((ie) => ie.id !== interviewId),
      }));
      addNotification(t('common.success'), 'success');
    } catch (err) {
      addNotification(err.message || t('common.error'), 'error');
    }
  };

  const handleGeneratePrep = async () => {
    setGeneratingPrep(true);
    try {
      const data = await generateInterviewPrep(id);
      setInterviewPrep(data.prep);
    } catch (err) {
      addNotification(err.message || t('common.error'), 'error');
    } finally {
      setGeneratingPrep(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const DIFFICULTY_MAP = { easy: t('applicationDetail.prepDifficultyEasy'), medium: t('applicationDetail.prepDifficultyMedium'), hard: t('applicationDetail.prepDifficultyHard') };
  const CATEGORY_MAP = { behavioral: t('applicationDetail.prepCategoryBehavioral'), technical: t('applicationDetail.prepCategoryTechnical'), situational: t('applicationDetail.prepCategorySituational'), company_knowledge: t('applicationDetail.prepCategoryCompanyKnowledge') };
  const TIP_CATEGORY_MAP = { culture: t('applicationDetail.tipCategoryCulture'), industry: t('applicationDetail.tipCategoryIndustry'), recent_news: t('applicationDetail.tipCategoryRecentNews'), preparation: t('applicationDetail.tipCategoryPreparation') };

  const handleUpdate = async (data) => {
    setSaving(true);
    try {
      const { application } = await updateApplication(id, data);
      setApp((prev) => ({ ...prev, ...application }));
      setEditing(false);
      addNotification(t('common.success'), 'success');
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteApplication(id);
      addNotification(t('common.success'), 'success');
      navigate('/applications');
    } catch (err) {
      addNotification(err.message, 'error');
    }
  };

  const handleUpload = async (file, category) => {
    setUploading(true);
    try {
      await uploadDocument(id, file, category);
      addNotification(t('common.success'), 'success');
      fetchApp();
    } catch (err) {
      addNotification(err.message || t('common.error'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await deleteDocument(docId);
      addNotification(t('common.success'), 'success');
      fetchApp();
    } catch (err) {
      addNotification(err.message, 'error');
    }
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const { summary } = await summarizeApplication(id);
      setApp((prev) => ({ ...prev, ai_summary: summary }));
      addNotification(t('common.success'), 'success');
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setSummarizing(false);
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    try {
      await createReminder(id, reminderForm);
      addNotification(t('common.success'), 'success');
      setShowReminder(false);
      setReminderForm({ remind_at: '', message: '' });
      fetchApp();
    } catch (err) {
      addNotification(err.message, 'error');
    }
  };

  const handleDismissReminder = async (reminderId) => {
    await dismissReminder(reminderId);
    fetchApp();
  };

  const handleDeleteReminder = async (reminderId) => {
    await deleteReminder(reminderId);
    fetchApp();
  };

  const handleExportPdf = async (html, docType) => {
    setExportingPdf(true);
    try {
      await generatePdf(html, docType, id, templateId);
      addNotification(t('common.success'), 'success');
      fetchApp();
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleGenerateTemplatedCv = async () => {
    if (!app.job_posting_text) {
      addNotification(t('applicationDetail.noJobPosting'), 'error');
      return;
    }
    setGeneratingCv(true);
    try {
      const { html } = await tailorCvTemplate({
        job_posting: app.job_posting_text,
        template_config: {
          template_id: templateId,
          include_photo: includePhoto,
          max_pages: maxPages,
          skills_format: skillsFormat,
        },
      });
      const { application } = await updateApplication(id, { generated_cv_html: html });
      setApp((prev) => ({ ...prev, ...application }));
      addNotification(t('common.success'), 'success');
    } catch (err) {
      addNotification(err.message || t('common.error'), 'error');
    } finally {
      setGeneratingCv(false);
    }
  };

  const handleSaveGeneratedDoc = async (field, html) => {
    setSaving(true);
    try {
      const { application } = await updateApplication(id, { [field]: html });
      setApp((prev) => ({ ...prev, ...application }));
      addNotification(t('common.success'), 'success');
      setCvEditing(false);
      setClEditing(false);
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-detail">
        <div className="app-detail-loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!app) {
    return <div className="empty-state"><h3>{t('common.noResults')}</h3></div>;
  }

  const matchAnalysis = typeof app.match_analysis === 'string'
    ? (() => { try { return JSON.parse(app.match_analysis); } catch { return null; } })()
    : app.match_analysis;

  const tabs = [
    { key: 'overview', label: t('applicationDetail.tabOverview') },
    { key: 'jobPosting', label: t('applicationDetail.tabJobPosting'), dot: !!(app.job_posting_text || matchAnalysis) },
    { key: 'cv', label: t('applicationDetail.tabCV'), dot: !!app.generated_cv_html },
    { key: 'coverLetter', label: t('applicationDetail.tabCoverLetter'), dot: !!app.generated_cover_letter_html },
    { key: 'documents', label: t('applications.documents'), badge: app.documents?.length || 0 },
    { key: 'timeline', label: t('applicationDetail.tabTimeline') },
    { key: 'interviews', label: t('interviews.tabTitle'), badge: app.interview_events?.length || 0 },
    ...(app.status === 'interview' ? [{ key: 'interviewPrep', label: t('applicationDetail.tabInterviewPrep'), dot: !!interviewPrep }] : []),
  ];

  return (
    <div className="app-detail">
      {/* Header */}
      <div className="app-detail-header">
        <div>
          <Link to="/applications" className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}>&larr; {t('common.back')}</Link>
          <h1>{app.role}</h1>
          <p className="app-detail-company">{app.company}</p>
        </div>
        <div className="app-detail-actions">
          <StatusSelect value={app.status} onChange={handleStatusChange} />
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(!editing)}>
            {editing ? t('common.cancel') : t('common.edit')}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowDelete(true)} style={{ color: 'var(--error)' }}>
            {t('common.delete')}
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="card" style={{ marginBottom: 24, padding: 24 }}>
          <ApplicationForm initialData={app} onSubmit={handleUpdate} loading={saving} />
        </div>
      )}

      {/* Tab bar */}
      {!editing && (
        <>
          <div className="tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {tab.dot && <span className="tab-dot" />}
                {tab.badge > 0 && <span className="tab-badge">{tab.badge}</span>}
              </button>
            ))}
          </div>

          {/* === TAB: Overview === */}
          {activeTab === 'overview' && (
            <div className="tab-content">
              {/* Quick info */}
              <div className="app-detail-info">
                {app.location && <div className="info-item"><span className="info-label">{t('applications.location')}</span><span>{app.location}</span></div>}
                <div className="info-item"><span className="info-label">{t('applications.appliedDate')}</span><span>{new Date(app.applied_date).toLocaleDateString()}</span></div>
                {app.deadline && <div className="info-item"><span className="info-label">{t('applications.deadline')}</span><span>{new Date(app.deadline).toLocaleDateString()}</span></div>}
                {app.match_score != null && <div className="info-item"><span className="info-label">{t('applications.matchScore')}</span><span>{app.match_score}/10</span></div>}
                {app.salary_min && app.salary_max && (
                  <div className="info-item"><span className="info-label">{t('applications.salary')}</span><span>{app.salary_min.toLocaleString()}-{app.salary_max.toLocaleString()} {app.salary_currency}</span></div>
                )}
                {app.url && (
                  <div className="info-item"><span className="info-label">Link</span><a href={app.url} target="_blank" rel="noopener noreferrer">↗</a></div>
                )}
              </div>

              {/* View original posting button */}
              {app.job_posting_text && (
                <button className="btn btn-secondary btn-original-posting" onClick={() => setShowOriginalPosting(true)}>
                  <span className="material-icon">description</span>
                  {t('applicationDetail.viewOriginalPosting')}
                </button>
              )}

              {/* Notes and description */}
              {(app.job_description || app.notes) && (
                <div className="detail-sections">
                  {app.job_description && (
                    <div className="card detail-section">
                      <h3>{t('applications.role')}</h3>
                      <p className="detail-text">{app.job_description}</p>
                    </div>
                  )}
                  {app.notes && (
                    <div className="card detail-section">
                      <h3>{t('applications.notes')}</h3>
                      <p className="detail-text">{app.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* AI Summary */}
              <div className="card detail-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>{t('applicationDetail.aiSummary')}</h3>
                  <button className="btn btn-sm btn-secondary" onClick={handleSummarize} disabled={summarizing}>
                    {summarizing ? <><span className="spinner" /> {t('common.generating')}</> : t('common.generating').replace('...', '')}
                  </button>
                </div>
                {app.ai_summary ? (
                  <p className="detail-text" style={{ marginTop: 12 }}>{app.ai_summary}</p>
                ) : (
                  <p className="detail-text" style={{ marginTop: 8, color: 'var(--text-muted)' }}>—</p>
                )}
              </div>

              {/* Reminders */}
              <div className="card detail-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3>{t('applications.reminders')}</h3>
                  <button className="btn btn-sm btn-secondary" onClick={() => setShowReminder(true)}>+</button>
                </div>
                {app.reminders && app.reminders.length > 0 ? (
                  <div className="reminders-list">
                    {app.reminders.map((r) => (
                      <div key={r.id} className={`reminder-item ${r.is_dismissed ? 'dismissed' : ''}`}>
                        <div>
                          <span className="reminder-message">{r.message}</span>
                          <span className="reminder-date">{new Date(r.remind_at).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {!r.is_dismissed && (
                            <button className="btn btn-sm btn-ghost" onClick={() => handleDismissReminder(r.id)}>{t('common.close')}</button>
                          )}
                          <button className="btn btn-sm btn-ghost" style={{ color: 'var(--error)' }} onClick={() => handleDeleteReminder(r.id)}>{t('common.delete')}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</p>
                )}
              </div>
            </div>
          )}

          {/* === TAB: Job Posting === */}
          {activeTab === 'jobPosting' && (
            <div className="tab-content">
              {/* Original job posting */}
              <div className="card detail-section">
                <h3>{t('applicationDetail.jobPostingOriginal')}</h3>
                {app.job_posting_text ? (
                  <div className="job-posting-text">{app.job_posting_text}</div>
                ) : (
                  <p className="generated-doc-empty">{t('applicationDetail.noJobPosting')}</p>
                )}
              </div>

              {/* Match analysis */}
              <div className="card detail-section">
                <h3>{t('applicationDetail.matchAnalysis')}</h3>
                {matchAnalysis ? (
                  <>
                    <div className="match-score-section">
                      <div className="score-circle" style={{ borderColor: scoreColor(matchAnalysis.match_score) }}>
                        <span className="score-value">{matchAnalysis.match_score}</span>
                        <span className="score-label">/10</span>
                      </div>
                      {matchAnalysis.recommendation && (
                        <p className="match-recommendation">{matchAnalysis.recommendation}</p>
                      )}
                    </div>

                    <div className="match-columns">
                      {matchAnalysis.strengths && matchAnalysis.strengths.length > 0 && (
                        <div className="match-column strengths">
                          <h4>{t('applicationDetail.strengths')}</h4>
                          <ul>
                            {matchAnalysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {matchAnalysis.gaps && matchAnalysis.gaps.length > 0 && (
                        <div className="match-column gaps">
                          <h4>{t('applicationDetail.gaps')}</h4>
                          <ul>
                            {matchAnalysis.gaps.map((g, i) => <li key={i}>{g}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="generated-doc-empty">{t('applicationDetail.noMatchAnalysis')}</p>
                )}
              </div>
            </div>
          )}

          {/* === TAB: CV === */}
          {activeTab === 'cv' && (
            <div className="tab-content">
              <div className="doc-mode-toggle">
                <button className={`doc-mode-btn ${cvMode === 'generated' ? 'active' : ''}`} onClick={() => setCvMode('generated')}>
                  {t('applicationDetail.useGenerated')}
                </button>
                <button className={`doc-mode-btn ${cvMode === 'upload' ? 'active' : ''}`} onClick={() => setCvMode('upload')}>
                  {t('applicationDetail.uploadOwn')}
                </button>
              </div>

              {cvMode === 'generated' ? (
                <>
                <div className="card detail-section cv-template-panel">
                  <h3>{t('applicationDetail.cvTemplateTitle')}</h3>
                  <div className="cv-template-grid">
                    {[
                      { id: 'classic', icon: 'article', label: t('applicationDetail.templateClassic'), desc: t('applicationDetail.templateClassicDesc') },
                      { id: 'modern', icon: 'view_sidebar', label: t('applicationDetail.templateModern'), desc: t('applicationDetail.templateModernDesc') },
                      { id: 'creative', icon: 'palette', label: t('applicationDetail.templateCreative'), desc: t('applicationDetail.templateCreativeDesc') },
                      { id: 'minimal', icon: 'space_dashboard', label: t('applicationDetail.templateMinimal'), desc: t('applicationDetail.templateMinimalDesc') },
                    ].map((tmpl) => (
                      <button
                        key={tmpl.id}
                        className={`cv-template-card ${templateId === tmpl.id ? 'active' : ''}`}
                        onClick={() => setTemplateId(tmpl.id)}
                      >
                        <span className="material-icon">{tmpl.icon}</span>
                        <span className="cv-template-name">{tmpl.label}</span>
                        <span className="cv-template-desc">{tmpl.desc}</span>
                      </button>
                    ))}
                  </div>

                  <div className="cv-options-row">
                    <label className="cv-option-check">
                      <input type="checkbox" checked={includePhoto} onChange={(e) => setIncludePhoto(e.target.checked)} />
                      <span>{t('applicationDetail.includePhoto')}</span>
                    </label>

                    <div className="cv-toggle-group">
                      <span className="cv-toggle-label">{t('applicationDetail.maxPages')}</span>
                      <button className={`cv-toggle-btn ${maxPages === 1 ? 'active' : ''}`} onClick={() => setMaxPages(1)}>
                        {t('applicationDetail.onePage')}
                      </button>
                      <button className={`cv-toggle-btn ${maxPages === 2 ? 'active' : ''}`} onClick={() => setMaxPages(2)}>
                        {t('applicationDetail.twoPages')}
                      </button>
                    </div>

                    <div className="cv-toggle-group">
                      <span className="cv-toggle-label">{t('applicationDetail.skillsFormat')}</span>
                      <button className={`cv-toggle-btn ${skillsFormat === 'tags' ? 'active' : ''}`} onClick={() => setSkillsFormat('tags')}>
                        {t('applicationDetail.skillsTags')}
                      </button>
                      <button className={`cv-toggle-btn ${skillsFormat === 'bars' ? 'active' : ''}`} onClick={() => setSkillsFormat('bars')}>
                        {t('applicationDetail.skillsBars')}
                      </button>
                      <button className={`cv-toggle-btn ${skillsFormat === 'list' ? 'active' : ''}`} onClick={() => setSkillsFormat('list')}>
                        {t('applicationDetail.skillsList')}
                      </button>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={handleGenerateTemplatedCv}
                    disabled={generatingCv || !app.job_posting_text}
                    style={{ marginTop: 16 }}
                  >
                    {generatingCv ? (
                      <><span className="spinner" /> {t('common.generating')}</>
                    ) : (
                      <><span className="material-icon" style={{ fontSize: 18 }}>auto_awesome</span> {t('applicationDetail.generateWithTemplate')}</>
                    )}
                  </button>
                </div>

                <div className="card detail-section">
                  <h3>{t('applicationDetail.generatedCV')}</h3>
                  {app.generated_cv_html ? (
                    <>
                      <div className="doc-viewer">
                        <RichTextEditor
                          content={cvEditing ? editedCvHtml : app.generated_cv_html}
                          onChange={cvEditing ? setEditedCvHtml : undefined}
                          editable={cvEditing}
                        />
                      </div>
                      <div className="doc-viewer-actions">
                        {!cvEditing ? (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => handleExportPdf(app.generated_cv_html, 'cv')} disabled={exportingPdf}>
                              {exportingPdf ? <><span className="spinner" /></> : t('applicationDetail.exportPdf')}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setEditedCvHtml(app.generated_cv_html); setCvEditing(true); }}>
                              {t('applicationDetail.editDocument')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => handleSaveGeneratedDoc('generated_cv_html', editedCvHtml)} disabled={saving}>
                              {saving ? <span className="spinner" /> : t('applicationDetail.saveChanges')}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setCvEditing(false)}>
                              {t('applicationDetail.cancelEdit')}
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="generated-doc-empty">{t('applicationDetail.noGeneratedCV')}</p>
                  )}
                </div>
                </>
              ) : (
                <div className="card detail-section">
                  <FileUpload onUpload={handleUpload} loading={uploading} fixedCategory="cv" />
                  <FileList documents={app.documents} onDelete={handleDeleteDoc} filterCategory="cv" />
                </div>
              )}
            </div>
          )}

          {/* === TAB: Cover Letter === */}
          {activeTab === 'coverLetter' && (
            <div className="tab-content">
              <div className="doc-mode-toggle">
                <button className={`doc-mode-btn ${clMode === 'generated' ? 'active' : ''}`} onClick={() => setClMode('generated')}>
                  {t('applicationDetail.useGenerated')}
                </button>
                <button className={`doc-mode-btn ${clMode === 'upload' ? 'active' : ''}`} onClick={() => setClMode('upload')}>
                  {t('applicationDetail.uploadOwn')}
                </button>
              </div>

              {clMode === 'generated' ? (
                <div className="card detail-section">
                  <h3>{t('applicationDetail.generatedCoverLetter')}</h3>
                  {app.generated_cover_letter_html ? (
                    <>
                      <div className="doc-viewer">
                        <RichTextEditor
                          content={clEditing ? editedClHtml : app.generated_cover_letter_html}
                          onChange={clEditing ? setEditedClHtml : undefined}
                          editable={clEditing}
                        />
                      </div>
                      <div className="doc-viewer-actions">
                        {!clEditing ? (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => handleExportPdf(app.generated_cover_letter_html, 'cover_letter')} disabled={exportingPdf}>
                              {exportingPdf ? <><span className="spinner" /></> : t('applicationDetail.exportPdf')}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setEditedClHtml(app.generated_cover_letter_html); setClEditing(true); }}>
                              {t('applicationDetail.editDocument')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => handleSaveGeneratedDoc('generated_cover_letter_html', editedClHtml)} disabled={saving}>
                              {saving ? <span className="spinner" /> : t('applicationDetail.saveChanges')}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setClEditing(false)}>
                              {t('applicationDetail.cancelEdit')}
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="generated-doc-empty">{t('applicationDetail.noGeneratedCoverLetter')}</p>
                  )}
                </div>
              ) : (
                <div className="card detail-section">
                  <FileUpload onUpload={handleUpload} loading={uploading} fixedCategory="cover_letter" />
                  <FileList documents={app.documents} onDelete={handleDeleteDoc} filterCategory="cover_letter" />
                </div>
              )}
            </div>
          )}

          {/* === TAB: Documents === */}
          {activeTab === 'documents' && (
            <div className="tab-content">
              <div className="card detail-section">
                <h3 style={{ marginBottom: 12 }}>{t('applications.documents')}</h3>
                <FileUpload onUpload={handleUpload} loading={uploading} />
                <FileList documents={app.documents} onDelete={handleDeleteDoc} />
              </div>
            </div>
          )}

          {/* === TAB: Timeline === */}
          {activeTab === 'timeline' && (
            <div className="tab-content">
              <UnifiedTimeline
                app={app}
                onInterviewClick={() => setActiveTab('interviews')}
              />
            </div>
          )}

          {/* === TAB: Interviews === */}
          {activeTab === 'interviews' && (
            <div className="tab-content">
              <div className="card detail-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3>{t('interviews.tabTitle')}</h3>
                  <button className="btn btn-sm btn-primary" onClick={() => { setEditingInterview(null); setShowInterviewForm(true); }}>
                    <span className="material-icon" style={{ fontSize: 16 }}>add</span> {t('interviews.addInterview')}
                  </button>
                </div>

                {app.interview_events && app.interview_events.length > 0 ? (
                  <div className="interview-events-list">
                    {app.interview_events.map((ie) => (
                      <div key={ie.id} className={`interview-event-card outcome-${ie.outcome}`}>
                        <div className="interview-event-header">
                          <div className="interview-event-phase">
                            <span className="material-icon">groups</span>
                            {t('interviews.phaseLabel', { n: ie.phase_number })}
                          </div>
                          <span className={`interview-outcome-badge ${ie.outcome}`}>
                            {t(`interviews.outcomes.${ie.outcome}`)}
                          </span>
                        </div>
                        <div className="interview-event-meta">
                          <span className="interview-event-date">
                            <span className="material-icon">event</span>
                            {new Date(ie.interview_date).toLocaleString()}
                          </span>
                          {ie.interview_type && (
                            <span className="interview-event-type">
                              <span className="material-icon">category</span>
                              {t(`interviews.types.${ie.interview_type}`)}
                            </span>
                          )}
                          {ie.location && (
                            <span className="interview-event-location">
                              <span className="material-icon">location_on</span>
                              {ie.location}
                            </span>
                          )}
                        </div>
                        {ie.salary_offered && (
                          <div className="interview-event-salary">
                            <span className="material-icon">payments</span>
                            {t('interviews.salaryOffered')}: <strong>{ie.salary_offered}</strong>
                          </div>
                        )}
                        {ie.notes && <p className="interview-event-notes">{ie.notes}</p>}
                        <div className="interview-event-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditingInterview(ie); setShowInterviewForm(true); }}>
                            {t('common.edit')}
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDeleteInterview(ie.id)}>
                            {t('common.delete')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 24 }}>
                    <span className="material-icon" style={{ fontSize: 40, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>event_available</span>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('interviews.noInterviews')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === TAB: Interview Prep === */}
          {activeTab === 'interviewPrep' && (
            <div className="tab-content">
              <div className="card detail-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>{t('applicationDetail.interviewPrepTitle')}</h3>
                  <button className="btn btn-sm btn-primary" onClick={handleGeneratePrep} disabled={generatingPrep}>
                    {generatingPrep ? <><span className="spinner" /> {t('applicationDetail.generatingPrep')}</> : t('applicationDetail.generatePrep')}
                  </button>
                </div>

                {!interviewPrep && !generatingPrep && (
                  <p className="generated-doc-empty" style={{ marginTop: 12 }}>{t('applicationDetail.interviewPrepEmpty')}</p>
                )}

                {interviewPrep && (
                  <div className="interview-prep-content">
                    {/* Likely Questions */}
                    {interviewPrep.likely_questions && interviewPrep.likely_questions.length > 0 && (
                      <div className="prep-section">
                        <button className="prep-section-header" onClick={() => toggleSection('questions')}>
                          <h4>{t('applicationDetail.likelyQuestions')}</h4>
                          <span className={`prep-toggle ${expandedSections.questions ? 'open' : ''}`}>&#9660;</span>
                        </button>
                        {expandedSections.questions && (
                          <div className="prep-section-body">
                            {interviewPrep.likely_questions.map((q, i) => (
                              <div key={i} className="prep-question-card">
                                <div className="prep-question-top">
                                  <span className={`prep-difficulty prep-difficulty-${q.difficulty}`}>{DIFFICULTY_MAP[q.difficulty] || q.difficulty}</span>
                                  <span className="prep-category">{CATEGORY_MAP[q.category] || q.category}</span>
                                </div>
                                <p className="prep-question-text">{q.question}</p>
                                {q.why_asked && <p className="prep-why-asked"><strong>{t('applicationDetail.prepWhyAsked')}:</strong> {q.why_asked}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* STAR Answers */}
                    {interviewPrep.star_answers && interviewPrep.star_answers.length > 0 && (
                      <div className="prep-section">
                        <button className="prep-section-header" onClick={() => toggleSection('star')}>
                          <h4>{t('applicationDetail.starAnswers')}</h4>
                          <span className={`prep-toggle ${expandedSections.star ? 'open' : ''}`}>&#9660;</span>
                        </button>
                        {expandedSections.star && (
                          <div className="prep-section-body">
                            {interviewPrep.star_answers.map((s, i) => (
                              <div key={i} className="prep-star-card">
                                <p className="prep-star-question">{s.question}</p>
                                <div className="star-grid">
                                  <div className="star-item"><span className="star-letter star-s">S</span><p>{s.situation}</p></div>
                                  <div className="star-item"><span className="star-letter star-t">T</span><p>{s.task}</p></div>
                                  <div className="star-item"><span className="star-letter star-a">A</span><p>{s.action}</p></div>
                                  <div className="star-item"><span className="star-letter star-r">R</span><p>{s.result}</p></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Company Tips */}
                    {interviewPrep.company_tips && interviewPrep.company_tips.length > 0 && (
                      <div className="prep-section">
                        <button className="prep-section-header" onClick={() => toggleSection('tips')}>
                          <h4>{t('applicationDetail.companyTips')}</h4>
                          <span className={`prep-toggle ${expandedSections.tips ? 'open' : ''}`}>&#9660;</span>
                        </button>
                        {expandedSections.tips && (
                          <div className="prep-section-body">
                            {interviewPrep.company_tips.map((tip, i) => (
                              <div key={i} className="prep-tip-card">
                                <span className="prep-tip-category">{TIP_CATEGORY_MAP[tip.category] || tip.category}</span>
                                <p>{tip.tip}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* General Advice */}
                    {interviewPrep.general_advice && interviewPrep.general_advice.length > 0 && (
                      <div className="prep-section">
                        <button className="prep-section-header" onClick={() => toggleSection('advice')}>
                          <h4>{t('applicationDetail.generalAdvice')}</h4>
                          <span className={`prep-toggle ${expandedSections.advice ? 'open' : ''}`}>&#9660;</span>
                        </button>
                        {expandedSections.advice && (
                          <div className="prep-section-body">
                            <ul className="prep-advice-list">
                              {interviewPrep.general_advice.map((a, i) => <li key={i}>{a}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title={t('common.delete')}
        message={t('applications.deleteConfirm')}
      />

      <Modal isOpen={showReminder} onClose={() => setShowReminder(false)} title={t('applications.reminders')}>
        <form onSubmit={handleCreateReminder}>
          <div className="form-group">
            <label>{t('profile.startDate')}</label>
            <input
              className="form-input"
              type="datetime-local"
              value={reminderForm.remind_at}
              onChange={(e) => setReminderForm((p) => ({ ...p, remind_at: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('applications.notes')}</label>
            <input
              className="form-input"
              value={reminderForm.message}
              onChange={(e) => setReminderForm((p) => ({ ...p, message: e.target.value }))}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowReminder(false)}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Modal>

      {/* Original posting modal */}
      <Modal isOpen={showOriginalPosting} onClose={() => setShowOriginalPosting(false)} title={t('applicationDetail.viewOriginalPosting')}>
        <div className="job-posting-text">{app?.job_posting_text}</div>
      </Modal>

      {/* Interview form modal */}
      <InterviewForm
        isOpen={showInterviewForm}
        onClose={() => { setShowInterviewForm(false); setEditingInterview(null); }}
        onSave={handleSaveInterview}
        interview={editingInterview}
        applicationId={id}
      />
    </div>
  );
}
