import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './PageTutorial.css';

/**
 * Per-page tutorial tip banner.
 * Shows on first visit to a page AFTER the global tour is completed.
 *
 * Props:
 *  - pageKey: string (e.g. 'dashboard', 'applications')
 *  - icon: string (Material icon name)
 */
export default function PageTutorial({ pageKey, icon }) {
  const { t } = useTranslation();
  const storageKey = `tutorial_page_${pageKey}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const tourDone = localStorage.getItem('tutorial_completed');
    const pageSeen = localStorage.getItem(storageKey);
    if (tourDone && !pageSeen) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="page-tutorial-banner">
      <div className="page-tutorial-icon-wrapper">
        <span className="material-icon page-tutorial-icon">{icon}</span>
      </div>
      <div className="page-tutorial-text">
        <h4 className="page-tutorial-title">{t(`tutorial.page.${pageKey}.title`)}</h4>
        <p className="page-tutorial-desc">{t(`tutorial.page.${pageKey}.desc`)}</p>
      </div>
      <button className="btn btn-sm btn-secondary page-tutorial-dismiss" onClick={handleDismiss}>
        {t('tutorial.gotIt')}
      </button>
    </div>
  );
}
