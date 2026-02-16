import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  format, addMonths, subMonths, addWeeks, subWeeks,
  addDays, subDays, startOfWeek, endOfWeek,
} from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import { getApplications, getCalendarApplications } from '../api/applications';
import ApplicationCard from '../components/applications/ApplicationCard';
import CalendarView from '../components/applications/CalendarView';
import WeekView from '../components/applications/WeekView';
import DayView from '../components/applications/DayView';
import { STATUS_CONFIG } from '../components/applications/StatusBadge';
import { SkeletonAppCard } from '../components/common/Skeleton';
import './ApplicationsList.css';

const VIEW_MODES = [
  { key: 'list', icon: 'list', labelKey: 'applications.viewList' },
  { key: 'calendar', icon: 'calendar_month', labelKey: 'applications.viewCalendar' },
  { key: 'week', icon: 'view_week', labelKey: 'applications.viewWeek' },
  { key: 'day', icon: 'today', labelKey: 'applications.viewDay' },
];

export default function ApplicationsList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language === 'it' ? it : enUS;

  // List view state
  const [apps, setApps] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Calendar view state
  const [viewMode, setViewMode] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarApps, setCalendarApps] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Fetch list data
  useEffect(() => {
    if (viewMode !== 'list') return;
    setLoading(true);
    const params = { page, per_page: 15 };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;

    getApplications(params)
      .then((data) => {
        setApps(data.applications);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, statusFilter, page, viewMode]);

  // Fetch calendar data
  useEffect(() => {
    if (viewMode === 'list') return;
    setCalendarLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    getCalendarApplications(year, month, statusFilter || undefined)
      .then((data) => setCalendarApps(data.applications || []))
      .catch(() => setCalendarApps([]))
      .finally(() => setCalendarLoading(false));
  }, [currentDate, statusFilter, viewMode]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  // Navigation handlers
  const goBack = useCallback(() => {
    if (viewMode === 'calendar') setCurrentDate((d) => subMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => subWeeks(d, 1));
    else if (viewMode === 'day') setCurrentDate((d) => subDays(d, 1));
  }, [viewMode]);

  const goForward = useCallback(() => {
    if (viewMode === 'calendar') setCurrentDate((d) => addMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => addWeeks(d, 1));
    else if (viewMode === 'day') setCurrentDate((d) => addDays(d, 1));
  }, [viewMode]);

  const goToday = useCallback(() => setCurrentDate(new Date()), []);

  const handleDateClick = useCallback((day) => {
    setCurrentDate(day);
    setViewMode('day');
  }, []);

  const handleAppClick = useCallback((id) => {
    navigate(`/applications/${id}`);
  }, [navigate]);

  // Period label
  const periodLabel = useMemo(() => {
    if (viewMode === 'calendar') {
      return format(currentDate, 'MMMM yyyy', { locale });
    }
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, 'd MMM', { locale })} — ${format(end, 'd MMM yyyy', { locale })}`;
    }
    if (viewMode === 'day') {
      return format(currentDate, 'EEEE d MMMM yyyy', { locale });
    }
    return '';
  }, [viewMode, currentDate, locale]);

  return (
    <div className="apps-list-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{t('applications.title')}</h1>
          <p>{t('applications.subtitle')}</p>
        </div>
        <Link to="/applications/new" className="btn btn-primary">+ {t('applications.new')}</Link>
      </div>

      <div className="apps-filters">
        {viewMode === 'list' && (
          <input
            className="form-input apps-search"
            placeholder={t('applications.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
        <div className="apps-filters-row">
          <div className="status-pills">
            <button
              className={`status-pill ${statusFilter === '' ? 'active' : ''}`}
              onClick={() => setStatusFilter('')}
            >
              {t('applications.allStatuses')}
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <button
                key={key}
                className={`status-pill ${statusFilter === key ? 'active' : ''}`}
                onClick={() => setStatusFilter(key)}
              >
                {t(config.labelKey)}
              </button>
            ))}
          </div>
          <div className="view-mode-toggle">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.key}
                className={`view-mode-btn ${viewMode === mode.key ? 'active' : ''}`}
                onClick={() => setViewMode(mode.key)}
                title={t(mode.labelKey)}
              >
                <span className="material-icon">{mode.icon}</span>
                <span className="view-mode-label">{t(mode.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar navigation */}
      {viewMode !== 'list' && (
        <div className="calendar-nav">
          <button className="btn btn-icon" onClick={goBack}>
            <span className="material-icon">chevron_left</span>
          </button>
          <h2 className="calendar-nav-title">{periodLabel}</h2>
          <button className="btn btn-icon" onClick={goForward}>
            <span className="material-icon">chevron_right</span>
          </button>
          <button className="btn btn-sm btn-secondary calendar-today-btn" onClick={goToday}>
            {t('applications.today')}
          </button>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        loading ? (
          <div className="apps-grid">
            {[...Array(5)].map((_, i) => <SkeletonAppCard key={i} />)}
          </div>
        ) : apps.length > 0 ? (
          <>
            <div className="apps-grid">
              {apps.map((app) => (
                <ApplicationCard key={app.id} app={app} />
              ))}
            </div>
            {pages > 1 && (
              <div className="pagination">
                <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  {t('common.back')}
                </button>
                <span className="pagination-info">{page} / {pages}</span>
                <button className="btn btn-sm btn-secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                  {t('common.next')}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <span className="material-icon">search_off</span>
            <h3>{t('applications.noApplications')}</h3>
            <Link to="/applications/new" className="btn btn-primary" style={{ marginTop: 16 }}>+ {t('applications.new')}</Link>
          </div>
        )
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        calendarLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <CalendarView
            apps={calendarApps}
            currentDate={currentDate}
            onDateClick={handleDateClick}
            onAppClick={handleAppClick}
          />
        )
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        calendarLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <WeekView
            apps={calendarApps}
            currentDate={currentDate}
            onAppClick={handleAppClick}
          />
        )
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        calendarLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : (
          <DayView
            apps={calendarApps}
            currentDate={currentDate}
            onAppClick={handleAppClick}
          />
        )
      )}
    </div>
  );
}
