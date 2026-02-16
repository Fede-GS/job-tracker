import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
} from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import './CalendarView.css';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function CalendarView({ apps, currentDate, onDateClick, onAppClick }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'it' ? it : enUS;

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    const result = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
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
    <div className="calendar-view">
      <div className="calendar-header-row">
        {DAY_KEYS.map((key) => (
          <div key={key} className="calendar-header-cell">
            {t(`applications.calendar${key.charAt(0).toUpperCase() + key.slice(1)}`)}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {weeks.map((week, wi) => (
          week.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayApps = appsByDate[dateKey] || [];
            const sameMonth = isSameMonth(day, currentDate);
            const today = isToday(day);

            return (
              <div
                key={dateKey}
                className={`calendar-day${!sameMonth ? ' other-month' : ''}${today ? ' today' : ''}`}
                onClick={() => onDateClick(day)}
              >
                <span className="calendar-day-number">{format(day, 'd')}</span>
                <div className="calendar-day-apps">
                  {dayApps.slice(0, 3).map((app) => (
                    <div
                      key={app.id}
                      className={`calendar-app-pill ${app.status}`}
                      onClick={(e) => { e.stopPropagation(); onAppClick(app.id); }}
                      title={`${app.role} — ${app.company}`}
                    >
                      <span className="pill-company">{app.company}</span>
                    </div>
                  ))}
                  {dayApps.length > 3 && (
                    <div className="calendar-day-more">+{dayApps.length - 3}</div>
                  )}
                </div>
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
}
