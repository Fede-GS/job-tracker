import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isSameDay, parseISO } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import StatusBadge from './StatusBadge';
import './DayView.css';

export default function DayView({ apps, currentDate, onAppClick }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'it' ? it : enUS;

  const dayApps = useMemo(() => {
    return apps.filter((app) =>
      isSameDay(parseISO(app.applied_date), currentDate)
    );
  }, [apps, currentDate]);

  return (
    <div className="day-view">
      <div className="day-view-header">
        <h2 className="day-view-date">
          {format(currentDate, 'EEEE d MMMM yyyy', { locale })}
        </h2>
        <span className="day-view-count">
          {dayApps.length} {dayApps.length === 1
            ? t('applications.applicationSingular', 'candidatura')
            : t('applications.applicationPlural', 'candidature')}
        </span>
      </div>

      {dayApps.length > 0 ? (
        <div className="day-view-list">
          {dayApps.map((app) => (
            <div
              key={app.id}
              className={`day-app-card ${app.status}`}
              onClick={() => onAppClick(app.id)}
            >
              <div className="day-app-main">
                <div className="day-app-info">
                  <h3 className="day-app-role">{app.role}</h3>
                  <p className="day-app-company">{app.company}</p>
                </div>
                <StatusBadge status={app.status} />
              </div>
              <div className="day-app-meta">
                {app.location && (
                  <span className="day-app-location">
                    <span className="material-icon" style={{ fontSize: 14 }}>location_on</span>
                    {app.location}
                  </span>
                )}
                {app.deadline && (
                  <span className="day-app-deadline">
                    <span className="material-icon" style={{ fontSize: 14 }}>event</span>
                    {format(parseISO(app.deadline), 'd MMM yyyy', { locale })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="day-view-empty">
          <span className="material-icon" style={{ fontSize: 48, opacity: 0.3 }}>event_busy</span>
          <p>{t('applications.noAppsThisDay')}</p>
        </div>
      )}
    </div>
  );
}
