import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
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

export default function Sidebar() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">JT</span>
          <span className="logo-text">Job Tracker</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="material-icon">{item.icon}</span>
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="theme-toggle" onClick={toggleTheme}>
          <span className="material-icon">
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </span>
          <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
      </div>
    </aside>
  );
}
