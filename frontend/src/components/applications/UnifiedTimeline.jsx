import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import StatusBadge from './StatusBadge';
import './UnifiedTimeline.css';

const EVENT_CONFIG = {
  status_change: { icon: 'swap_horiz', color: '#6366f1' },
  interview: { icon: 'groups', color: '#8b5cf6' },
  document: { icon: 'attach_file', color: '#64748b' },
  reminder: { icon: 'alarm', color: '#f59e0b' },
  created: { icon: 'add_circle', color: '#10b981' },
};

export default function UnifiedTimeline({ app, onInterviewClick }) {
  const { t } = useTranslation();

  const events = useMemo(() => {
    const items = [];

    // Creation event
    if (app.created_at) {
      items.push({
        type: 'created',
        date: new Date(app.created_at),
        title: t('timeline.created'),
        description: `${app.role} — ${app.company}`,
      });
    }

    // Status history
    (app.status_history || []).forEach((h) => {
      items.push({
        type: 'status_change',
        date: new Date(h.changed_at),
        title: t('timeline.statusChange'),
        from_status: h.from_status,
        to_status: h.to_status,
        note: h.note,
      });
    });

    // Interview events
    (app.interview_events || []).forEach((ie) => {
      items.push({
        type: 'interview',
        date: new Date(ie.interview_date),
        title: `${t('interviews.phaseLabel', { n: ie.phase_number })} — ${t(`interviews.types.${ie.interview_type || 'other'}`)}`,
        description: ie.notes || '',
        outcome: ie.outcome,
        salary: ie.salary_offered,
        interviewId: ie.id,
        applicationId: ie.application_id,
      });
    });

    // Documents
    (app.documents || []).forEach((d) => {
      items.push({
        type: 'document',
        date: new Date(d.uploaded_at),
        title: t('timeline.documentUploaded'),
        description: d.filename,
        category: d.doc_category,
      });
    });

    // Reminders
    (app.reminders || []).forEach((r) => {
      items.push({
        type: 'reminder',
        date: new Date(r.remind_at),
        title: t('timeline.reminder'),
        description: r.message,
        dismissed: r.is_dismissed,
      });
    });

    // Sort by date descending (newest first)
    items.sort((a, b) => b.date - a.date);
    return items;
  }, [app, t]);

  if (events.length === 0) {
    return (
      <div className="card detail-section" style={{ textAlign: 'center', padding: 32 }}>
        <span className="material-icon" style={{ fontSize: 40, color: 'var(--text-muted)' }}>timeline</span>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{t('timeline.empty')}</p>
      </div>
    );
  }

  return (
    <div className="unified-timeline">
      {events.map((event, i) => {
        const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.created;
        return (
          <div
            key={i}
            className={`ut-event ${event.type}${event.type === 'interview' && onInterviewClick ? ' clickable' : ''}`}
            onClick={event.type === 'interview' && onInterviewClick ? () => onInterviewClick(event.applicationId) : undefined}
          >
            <div className="ut-line">
              <div className="ut-dot" style={{ background: config.color }}>
                <span className="material-icon">{config.icon}</span>
              </div>
              {i < events.length - 1 && <div className="ut-connector" />}
            </div>
            <div className="ut-content">
              <div className="ut-header">
                <span className="ut-title">{event.title}</span>
                <span className="ut-date">{event.date.toLocaleString()}</span>
              </div>

              {event.type === 'status_change' && (
                <div className="ut-status-change">
                  {event.from_status ? <StatusBadge status={event.from_status} /> : <span className="ut-dash">—</span>}
                  <span className="ut-arrow">&rarr;</span>
                  <StatusBadge status={event.to_status} />
                  {event.note && <span className="ut-note">{event.note}</span>}
                </div>
              )}

              {event.type === 'interview' && (
                <div className="ut-interview-info">
                  {event.outcome && (
                    <span className={`interview-outcome-badge ${event.outcome}`}>
                      {t(`interviews.outcomes.${event.outcome}`)}
                    </span>
                  )}
                  {event.salary && <span className="ut-salary"><span className="material-icon">payments</span> {event.salary}</span>}
                  {event.description && <p className="ut-desc">{event.description}</p>}
                </div>
              )}

              {event.type === 'document' && event.description && (
                <p className="ut-desc"><span className="material-icon" style={{ fontSize: 14 }}>description</span> {event.description}</p>
              )}

              {event.type === 'reminder' && event.description && (
                <p className={`ut-desc ${event.dismissed ? 'dismissed' : ''}`}>{event.description}</p>
              )}

              {event.type === 'created' && event.description && (
                <p className="ut-desc">{event.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
