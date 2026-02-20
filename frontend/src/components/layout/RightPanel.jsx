import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './RightPanel.css';

export default function RightPanel({ page, data = {} }) {
  const { t } = useTranslation();

  return (
    <aside className="right-panel">
      {page === 'dashboard' && (
        <>
          <div className="rp-section">
            <h4 className="rp-section-title">{t('rightPanel.quickActions')}</h4>
            <div className="rp-actions">
              <Link to="/applications/new" className="rp-action-btn">
                <span className="material-icon">add</span>
                {t('rightPanel.newApplication')}
              </Link>
              <Link to="/search" className="rp-action-btn">
                <span className="material-icon">travel_explore</span>
                {t('rightPanel.searchJobs')}
              </Link>
              <Link to="/profile" className="rp-action-btn">
                <span className="material-icon">person</span>
                {t('rightPanel.editProfile')}
              </Link>
            </div>
          </div>
          {data.reminders && data.reminders.length > 0 && (
            <div className="rp-section">
              <h4 className="rp-section-title">{t('rightPanel.reminders')}</h4>
              <div className="rp-list">
                {data.reminders.slice(0, 5).map((r, i) => (
                  <div key={i} className="rp-list-item">
                    <span className="material-icon rp-item-icon">notifications</span>
                    <div className="rp-item-content">
                      <span className="rp-item-text">{r.message}</span>
                      <span className="rp-item-meta">{new Date(r.remind_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {page === 'applications' && (
        <div className="rp-section">
          <h4 className="rp-section-title">{t('rightPanel.quickActions')}</h4>
          <div className="rp-actions">
            <Link to="/applications/new" className="rp-action-btn">
              <span className="material-icon">add</span>
              {t('rightPanel.newApplication')}
            </Link>
            <Link to="/search" className="rp-action-btn">
              <span className="material-icon">travel_explore</span>
              {t('rightPanel.searchJobs')}
            </Link>
          </div>
        </div>
      )}

      {page === 'jobSearch' && (
        <div className="rp-section">
          <h4 className="rp-section-title">{t('rightPanel.searchTips')}</h4>
          <div className="rp-tips">
            <div className="rp-tip">
              <span className="material-icon rp-tip-icon">lightbulb</span>
              <span>{t('rightPanel.tip1')}</span>
            </div>
            <div className="rp-tip">
              <span className="material-icon rp-tip-icon">lightbulb</span>
              <span>{t('rightPanel.tip2')}</span>
            </div>
            <div className="rp-tip">
              <span className="material-icon rp-tip-icon">lightbulb</span>
              <span>{t('rightPanel.tip3')}</span>
            </div>
          </div>
        </div>
      )}

      {page === 'applicationDetail' && (
        <div className="rp-section">
          <h4 className="rp-section-title">{t('rightPanel.quickActions')}</h4>
          <div className="rp-actions">
            <Link to="/search" className="rp-action-btn">
              <span className="material-icon">travel_explore</span>
              {t('rightPanel.searchJobs')}
            </Link>
            <Link to="/applications" className="rp-action-btn">
              <span className="material-icon">list</span>
              {t('sidebar.applications')}
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
