import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getStats, getTimeline, getRecent, getDeadlineAlerts, getFunnel, getFollowupSuggestions } from '../api/dashboard';
import { generateFollowup } from '../api/ai';
import { STATUS_CONFIG } from '../components/applications/StatusBadge';
import StatusBadge from '../components/applications/StatusBadge';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/common/Modal';
import { SkeletonBlock, SkeletonStatCard, SkeletonChartCard } from '../components/common/Skeleton';
import SmartTip from '../components/common/SmartTip';
import './Dashboard.css';

const COLORS = {
  draft: '#8b5cf6',
  sent: '#6366f1',
  interview: '#f59e0b',
  rejected: '#ef4444',
};

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [stats, setStats] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [recent, setRecent] = useState({ recent_applications: [], recent_status_changes: [] });
  const [deadlines, setDeadlines] = useState({ upcoming: [], overdue: [] });
  const [funnel, setFunnel] = useState(null);
  const [followups, setFollowups] = useState([]);
  const [followupModal, setFollowupModal] = useState(null);
  const [generatingFollowup, setGeneratingFollowup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getStats(),
      getTimeline(),
      getRecent(),
      getDeadlineAlerts().catch(() => ({ upcoming: [], overdue: [] })),
      getFunnel().catch(() => null),
      getFollowupSuggestions().catch(() => ({ suggestions: [] })),
    ])
      .then(([statsData, timelineData, recentData, deadlineData, funnelData, followupData]) => {
        setStats(statsData);
        setTimeline(timelineData.data || []);
        setRecent(recentData);
        setDeadlines(deadlineData);
        setFunnel(funnelData);
        setFollowups(followupData?.suggestions || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateFollowup = async (suggestion) => {
    setGeneratingFollowup(suggestion.application.id);
    try {
      const data = await generateFollowup(suggestion.application.id, suggestion.context);
      setFollowupModal({ ...data.followup, application: suggestion.application });
    } catch (err) {
      addNotification(t('common.error'), 'error');
    } finally {
      setGeneratingFollowup(null);
    }
  };

  const handleCopyFollowup = () => {
    if (followupModal) {
      const text = `${t('dashboard.followupSubject')}: ${followupModal.subject}\n\n${followupModal.body}`;
      navigator.clipboard.writeText(text);
      addNotification(t('dashboard.followupCopied'), 'success');
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <SkeletonBlock width="200px" height={24} />
          <SkeletonBlock width="280px" height={14} style={{ marginTop: 8 }} />
        </div>
        <div className="stats-grid">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
        <div className="charts-grid">
          <SkeletonChartCard />
          <SkeletonChartCard />
        </div>
      </div>
    );
  }

  const pieData = stats?.by_status
    ? Object.entries(stats.by_status)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value, key: name }))
    : [];

  const hasDeadlines = deadlines.upcoming?.length > 0 || deadlines.overdue?.length > 0;

  // Smart tips based on data
  const smartTips = useMemo(() => {
    const tips = [];
    if (stats && stats.total_applications > 0) {
      if (stats.this_week === 0) {
        tips.push({ icon: 'schedule', messageKey: 'tips.noAppsThisWeek', actionKey: 'tips.applyNow', to: '/applications/new' });
      }
      if (followups.length > 0) {
        tips.push({ icon: 'mail', messageKey: 'tips.pendingFollowups', count: followups.length });
      }
      if (stats.avg_match_score && stats.avg_match_score >= 7) {
        tips.push({ icon: 'trending_up', messageKey: 'tips.goodMatchScore' });
      }
    }
    return tips;
  }, [stats, followups]);

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>{t('dashboard.title')}</h1>
        <p>{t('dashboard.subtitle')}</p>
      </div>

      {/* Smart Tips */}
      {smartTips.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {smartTips.slice(0, 2).map((tip, i) => (
            <SmartTip
              key={i}
              icon={tip.icon}
              message={t(tip.messageKey, { count: tip.count })}
              action={tip.actionKey ? t(tip.actionKey) : undefined}
              onAction={tip.to ? () => navigate(tip.to) : undefined}
            />
          ))}
        </div>
      )}

      {/* Deadline Alerts */}
      {hasDeadlines && (
        <div className="deadline-alerts">
          {(deadlines.overdue || []).map((d) => (
            <Link key={d.id} to={`/applications/${d.id}`} className="deadline-alert overdue">
              <div className="deadline-alert-content">
                <strong>{d.company} - {d.role}</strong>
                <span>{t('dashboard.overdueBy')} {d.days_overdue} {t('dashboard.days')}</span>
              </div>
              <span className="deadline-badge">{t('dashboard.overdue')}</span>
            </Link>
          ))}
          {(deadlines.upcoming || []).map((d) => (
            <Link key={d.id} to={`/applications/${d.id}`} className="deadline-alert upcoming">
              <div className="deadline-alert-content">
                <strong>{d.company} - {d.role}</strong>
                <span>{t('dashboard.dueIn')} {d.days_until} {t('dashboard.days')}</span>
              </div>
              <span className="deadline-badge">{t('dashboard.upcoming')}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><span className="material-icon">description</span></div>
          <span className="stat-label">{t('dashboard.totalApplications')}</span>
          <span className="stat-value">{stats?.total_applications || 0}</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><span className="material-icon">trending_up</span></div>
          <span className="stat-label">{t('dashboard.responseRate')}</span>
          <span className="stat-value">{stats?.response_rate || 0}%</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><span className="material-icon">target</span></div>
          <span className="stat-label">{t('dashboard.avgMatchScore')}</span>
          <span className="stat-value">{stats?.avg_match_score ? `${stats.avg_match_score}/10` : 'N/A'}</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><span className="material-icon">calendar_today</span></div>
          <span className="stat-label">{t('dashboard.thisWeek')}</span>
          <span className="stat-value">{stats?.this_week || 0}</span>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card chart-card">
          <h3>{t('dashboard.byStatus')}</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>{t('common.noResults')}</p></div>
          )}
        </div>

        <div className="card chart-card">
          <h3>{t('dashboard.timeline')}</h3>
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={timeline}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>{t('common.noResults')}</p></div>
          )}
        </div>
      </div>

      {/* Funnel Analytics */}
      {funnel && funnel.funnel && (
        <div className="funnel-section">
          <div className="card chart-card">
            <h3>{t('dashboard.funnelTitle')}</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={funnel.funnel.map((f) => ({ ...f, name: t(f.label_key) }))}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {funnel.funnel.map((entry) => (
                    <Cell key={entry.stage} fill={COLORS[entry.stage]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="funnel-conversion-cards">
            <div className="conversion-card">
              <span className="conversion-label">{t('dashboard.draftToSent')}</span>
              <span className="conversion-value">{funnel.conversion_rates?.draft_to_sent || 0}%</span>
            </div>
            <div className="conversion-card">
              <span className="conversion-label">{t('dashboard.sentToInterview')}</span>
              <span className="conversion-value">{funnel.conversion_rates?.sent_to_interview || 0}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Suggestions */}
      {followups.length > 0 && (
        <div className="card followup-section">
          <h3>{t('dashboard.followupTitle')}</h3>
          <p className="followup-subtitle">{t('dashboard.followupSubtitle')}</p>
          <div className="followup-list">
            {followups.map((s) => (
              <div key={s.application.id} className="followup-item">
                <Link to={`/applications/${s.application.id}`} className="followup-info">
                  <span className="followup-role">{s.application.role}</span>
                  <span className="followup-company">{s.application.company}</span>
                </Link>
                <div className="followup-meta">
                  <span className="followup-days">{s.days_waiting} {t('dashboard.days')}</span>
                  <StatusBadge status={s.application.status} />
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleGenerateFollowup(s)}
                    disabled={generatingFollowup === s.application.id}
                  >
                    {generatingFollowup === s.application.id
                      ? <span className="spinner" />
                      : t('dashboard.generateFollowup')
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>{t('dashboard.recentApplications')}</h3>
          <Link to="/applications" className="btn btn-sm btn-ghost">{t('applications.title')}</Link>
        </div>
        {recent.recent_applications.length > 0 ? (
          <div className="recent-list">
            {recent.recent_applications.map((app) => (
              <Link key={app.id} to={`/applications/${app.id}`} className="recent-item">
                <div>
                  <span className="recent-role">{app.role}</span>
                  <span className="recent-company">{app.company}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {app.match_score != null && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.match_score}/10</span>
                  )}
                  <StatusBadge status={app.status} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="material-icon">rocket_launch</span>
            <h3>{t('dashboard.noApplications')}</h3>
            <p>{t('dashboard.startTracking')}</p>
            <Link to="/applications/new" className="btn btn-primary" style={{ marginTop: 16 }}>+ {t('applications.new')}</Link>
          </div>
        )}
      </div>

      {/* Follow-up Modal */}
      <Modal isOpen={!!followupModal} onClose={() => setFollowupModal(null)} title={t('dashboard.followupModalTitle')}>
        {followupModal && (
          <div className="followup-modal-content">
            <div className="followup-modal-app">
              <strong>{followupModal.application?.role}</strong> — {followupModal.application?.company}
            </div>
            <div className="followup-field">
              <label>{t('dashboard.followupSubject')}</label>
              <div className="followup-subject">{followupModal.subject}</div>
            </div>
            <div className="followup-field">
              <label>{t('dashboard.followupBody')}</label>
              <div className="followup-body">{followupModal.body}</div>
            </div>
            {followupModal.tips && followupModal.tips.length > 0 && (
              <div className="followup-field">
                <label>{t('dashboard.followupTips')}</label>
                <ul className="followup-tips">
                  {followupModal.tips.map((tip, i) => <li key={i}>{tip}</li>)}
                </ul>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setFollowupModal(null)}>{t('common.close')}</button>
              <button className="btn btn-primary" onClick={handleCopyFollowup}>{t('dashboard.copyFollowup')}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
