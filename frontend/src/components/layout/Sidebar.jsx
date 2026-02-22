import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const navItems = [
  { to: '/', icon: 'dashboard', labelKey: 'sidebar.dashboard' },
  { to: '/applications', icon: 'list', labelKey: 'sidebar.applications' },
  { to: '/search', icon: 'travel_explore', labelKey: 'sidebar.jobSearch' },
  { to: '/applications/new', icon: 'add', labelKey: 'sidebar.newApplication' },
  { to: '/profile', icon: 'person', labelKey: 'sidebar.profile' },
  { to: '/ai', icon: 'smart_toy', labelKey: 'sidebar.aiAssistant' },
  { to: '/settings', icon: 'settings', labelKey: 'sidebar.settings' },
];

export default function Sidebar({ onReplayTutorial }) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/logo2.png" alt="FinixJob" className="logo-icon" />
          <span className="logo-text">FinixJob</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            data-nav={item.to}
          >
            <span className="material-icon">{item.icon}</span>
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            <span className="material-icon">account_circle</span>
            <span className="sidebar-user-name">{user.full_name || user.email}</span>
          </div>
        )}
        <button className="theme-toggle" onClick={onReplayTutorial}>
          <span className="material-icon">school</span>
          <span>{t('sidebar.replayTutorial')}</span>
        </button>
        <button className="theme-toggle" onClick={toggleTheme}>
          <span className="material-icon">
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </span>
          <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
        <button className="theme-toggle logout-btn" onClick={handleLogout}>
          <span className="material-icon">logout</span>
          <span>{t('auth.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
