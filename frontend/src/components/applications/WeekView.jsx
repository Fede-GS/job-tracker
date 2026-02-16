import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameDay, isToday,
} from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import StatusBadge from './StatusBadge';
import './WeekView.css';

export default function WeekView({ apps, currentDate, onAppClick }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'it' ? it : enUS;

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const appsByDate = useMemo(() => {
    const map = {};
    apps.forEach((app) => {
      const key = app.applied_date;
      if (!map[key]) map[key] = [];
      map[key].push(app);
    });
    return map;
  }, [apps]);

  return (
    <div className="week-view">
      {weekDays.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayApps = appsByDate[dateKey] || [];
        const today = isToday(day);

        return (
          <div key={dateKey} className="week-day-section">
            <div className={`week-day-header${today ? ' today' : ''}`}>
              <span className="week-day-name">
                {format(day, 'EEEE', { locale })}
              </span>
              <span className="week-day-date">
                {format(day, 'd MMMM', { locale })}
              </span>
              {dayApps.length > 0 && (
                <span className="week-day-count">{dayApps.length}</span>
              )}
            </div>
            <div className="week-day-apps">
              {dayApps.length > 0 ? (
                dayApps.map((app) => (
                  <div
                    key={app.id}
                    className={`week-app-item ${app.status}`}
                    onClick={() => onAppClick(app.id)}
                  >
                    <div className="week-app-info">
                      <span className="week-app-role">{app.role}</span>
                      <span className="week-app-company">{app.company}</span>
                    </div>
                    <div className="week-app-right">
                      {app.location && <span className="week-app-location">{app.location}</span>}
                      <StatusBadge status={app.status} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="week-day-empty">
                  {t('applications.noAppsThisDay')}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
