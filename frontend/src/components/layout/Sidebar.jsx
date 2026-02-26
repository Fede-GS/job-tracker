import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getUpcomingReminders, dismissReminder } from '../../api/reminders';
import './Sidebar.css';

const navItems = [
  { to: '/', icon: 'dashboard', labelKey: 'sidebar.dashboard' },
  { to: '/applications', icon: 'list', labelKey: 'sidebar.applications' },
  { to: '/search', icon: 'travel_explore', labelKey: 'sidebar.jobSearch' },
  { to: '/applications/new', icon: 'add', labelKey: 'sidebar.newApplication' },
  { to: '/profile', icon: 'person', labelKey: 'sidebar.profile' },
  { to: '/career-consultant', icon: 'psychology', labelKey: 'sidebar.careerConsultant' },
  { to: '/ai', icon: 'smart_toy', labelKey: 'sidebar.aiAssistant' },
  { to: '/settings', icon: 'settings', labelKey: 'sidebar.settings' },
];

export default function Sidebar({ onReplayTutorial, collapsed, onToggleCollapse, onToggleAIChat, aiChatOpen, hideAIChat = false }) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [disabledFollowups, setDisabledFollowups] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('disabled_followups') || '[]');
    } catch { return []; }
  });
  const notifRef = useRef(null);

  // Load upcoming reminders
  const loadNotifications = useCallback(async () => {
    try {
      const data = await getUpcomingReminders();
      setNotifications(data.reminders || []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDismiss = async (id) => {
    try {
      await dismissReminder(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // silently fail
    }
  };

  const handleDismissAll = async () => {
    try {
      await Promise.all(notifications.map((n) => dismissReminder(n.id)));
      setNotifications([]);
    } catch {
      // silently fail
    }
  };

  const toggleFollowup = (appId) => {
    setDisabledFollowups((prev) => {
      const next = prev.includes(appId)
        ? prev.filter((id) => id !== appId)
        : [...prev, appId];
      localStorage.setItem('disabled_followups', JSON.stringify(next));
      return next;
    });
  };

  const activeNotifications = notifications.filter(
    (n) => !disabledFollowups.includes(n.application_id)
  );

  const getDaysAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/logo2.png" alt="FinixJob" className="logo-icon" />
          {!collapsed && <span className="logo-text">FinixJob</span>}
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          <span className="material-icon">
            {collapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            data-nav={item.to}
            title={collapsed ? t(item.labelKey) : undefined}
          >
            <span className="material-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{t(item.labelKey)}</span>}
          </NavLink>
        ))}
      </nav>

      {/* AI Chat Button — above notifications, hidden on application section pages */}
      {!hideAIChat && (
        <div className="sidebar-ai-section">
          <button
            className={`sidebar-ai-btn ${aiChatOpen ? 'active' : ''}`}
            onClick={onToggleAIChat}
            title={collapsed ? t('sidebar.aiChat') : undefined}
          >
            <img src="/logo.png" alt="Finix AI" className="sidebar-ai-logo" />
            {!collapsed && (
              <>
                <span className="sidebar-ai-label">{t('sidebar.aiChat')}</span>
                {aiChatOpen && (
                  <span className="material-icon sidebar-ai-close-icon">close</span>
                )}
              </>
            )}
          </button>
        </div>
      )}

      {/* Notification Bell */}
      <div className="sidebar-notifications" ref={notifRef}>
        <button
          className={`notification-bell ${activeNotifications.length > 0 ? 'has-notifications' : ''}`}
          onClick={() => setShowNotifications(!showNotifications)}
          title={t('sidebar.notifications')}
        >
          <span className="material-icon">notifications</span>
          {!collapsed && <span className="nav-label">{t('sidebar.notifications')}</span>}
          {activeNotifications.length > 0 && (
            <span className="notification-badge">{activeNotifications.length}</span>
          )}
        </button>

        {showNotifications && (
          <div className={`notification-dropdown ${collapsed ? 'collapsed-pos' : ''}`}>
            <div className="notification-dropdown-header">
              <h4>{t('sidebar.followupReminders')}</h4>
              {activeNotifications.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={handleDismissAll}>
                  {t('sidebar.dismissAll')}
                </button>
              )}
            </div>
            <div className="notification-dropdown-body">
              {notifications.length === 0 ? (
                <div className="notification-empty">
                  <span className="material-icon" style={{ fontSize: 32, color: 'var(--text-muted)' }}>
                    notifications_none
                  </span>
                  <p>{t('sidebar.noNotifications')}</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isDisabled = disabledFollowups.includes(notif.application_id);
                  const days = getDaysAgo(notif.remind_at);
                  return (
                    <div
                      key={notif.id}
                      className={`notification-item ${isDisabled ? 'disabled' : ''}`}
                    >
                      <div className="notification-item-content">
                        <div className="notification-item-icon">
                          <span className="material-icon">mail</span>
                        </div>
                        <div className="notification-item-info">
                          <p className="notification-item-message">{notif.message}</p>
                          <span className="notification-item-time">
                            {days > 0 ? `${days} ${t('sidebar.daysAgo')}` : t('sidebar.followupDue')}
                          </span>
                        </div>
                      </div>
                      <div className="notification-item-actions">
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => navigate(`/applications/${notif.application_id}`)}
                          title={t('sidebar.viewApplication')}
                        >
                          <span className="material-icon" style={{ fontSize: 16 }}>open_in_new</span>
                        </button>
                        <button
                          className={`btn btn-ghost btn-xs ${isDisabled ? 'followup-off' : 'followup-on'}`}
                          onClick={() => toggleFollowup(notif.application_id)}
                          title={isDisabled ? t('sidebar.enableFollowup') : t('sidebar.disableFollowup')}
                        >
                          <span className="material-icon" style={{ fontSize: 16 }}>
                            {isDisabled ? 'notifications_off' : 'notifications_active'}
                          </span>
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleDismiss(notif.id)}
                          title={t('common.close')}
                        >
                          <span className="material-icon" style={{ fontSize: 16 }}>close</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        {/* User info */}
        {user && (
          <div className="sidebar-user" title={user.email}>
            <div className="sidebar-user-avatar">
              {user.email ? user.email[0].toUpperCase() : '?'}
            </div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-email">{user.email}</span>
                <span className="sidebar-user-role">{user.role || 'user'}</span>
              </div>
            )}
          </div>
        )}

        <button className="theme-toggle" onClick={onReplayTutorial} title={collapsed ? t('sidebar.replayTutorial') : undefined}>
          <span className="material-icon">school</span>
          {!collapsed && <span>{t('sidebar.replayTutorial')}</span>}
        </button>
        <button className="theme-toggle" onClick={toggleTheme} title={collapsed ? (theme === 'light' ? 'Dark Mode' : 'Light Mode') : undefined}>
          <span className="material-icon">
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </span>
          {!collapsed && <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
        </button>
        <button
          className="theme-toggle sidebar-logout-btn"
          onClick={async () => { await logout(); navigate('/login'); }}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <span className="material-icon">logout</span>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
