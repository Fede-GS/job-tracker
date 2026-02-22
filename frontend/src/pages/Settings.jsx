import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getSettings, updateSettings } from '../api/settings';
import { useNotification } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import PageTutorial from '../components/common/PageTutorial';
import './Settings.css';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { addNotification } = useNotification();
  const { theme, toggleTheme } = useTheme();
  const [form, setForm] = useState({ jsearch_api_key: '', default_currency: 'EUR', language: i18n.language });
  const [showJSearchKey, setShowJSearchKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharedApiKeys, setSharedApiKeys] = useState(false);

  useEffect(() => {
    getSettings()
      .then(({ settings }) => {
        setForm({
          jsearch_api_key: settings.jsearch_api_key || '',
          default_currency: settings.default_currency || 'EUR',
          language: settings.language || i18n.language,
        });
        setSharedApiKeys(settings.shared_api_keys || false);
      })
      .catch(() => {});
  }, []);

  const handleLanguageChange = (lang) => {
    setForm((p) => ({ ...p, language: lang }));
    i18n.changeLanguage(lang);
    localStorage.setItem('app-language', lang);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(form);
      addNotification(t('settings.saved'), 'success');
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <PageTutorial pageKey="settings" icon="settings" />
      <div className="page-header">
        <h1>{t('settings.title')}</h1>
        <p>{t('settings.subtitle')}</p>
      </div>

      <form onSubmit={handleSave}>
        <div className="card settings-section">
          <h3>{t('settings.apiKey')}</h3>
          <div className="api-status-badge">
            {sharedApiKeys ? (
              <span className="badge badge-success">{t('settings.apiKeysActive')}</span>
            ) : (
              <span className="badge badge-warning">{t('settings.apiKeysInactive')}</span>
            )}
          </div>
          <p className="settings-desc">{t('settings.apiKeysSharedDesc')}</p>
        </div>

        <div className="card settings-section">
          <h3>{t('settings.jsearchApi')}</h3>
          <p className="settings-desc">
            {t('settings.jsearchApiDesc')}
            {' — '}
            <a href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch" target="_blank" rel="noopener noreferrer">rapidapi.com</a>
          </p>

          <div className="form-group">
            <label>{t('settings.jsearchApiKey')}</label>
            <div className="api-key-input">
              <input
                className="form-input"
                type={showJSearchKey ? 'text' : 'password'}
                value={form.jsearch_api_key}
                onChange={(e) => setForm((p) => ({ ...p, jsearch_api_key: e.target.value }))}
                placeholder="abc123def456..."
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowJSearchKey(!showJSearchKey)}>
                {showJSearchKey ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
        </div>

        <div className="card settings-section">
          <h3>{t('settings.appearance')}</h3>
          <div className="theme-selector">
            <button
              type="button"
              className={`theme-option ${theme === 'light' ? 'active' : ''}`}
              onClick={() => theme !== 'light' && toggleTheme()}
            >
              <span className="theme-preview light-preview" />
              <span>{t('settings.light')}</span>
            </button>
            <button
              type="button"
              className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => theme !== 'dark' && toggleTheme()}
            >
              <span className="theme-preview dark-preview" />
              <span>{t('settings.dark')}</span>
            </button>
          </div>
        </div>

        <div className="card settings-section">
          <h3>{t('settings.preferences')}</h3>

          <div className="form-group">
            <label>{t('settings.language')}</label>
            <select className="form-select" value={form.language} onChange={(e) => handleLanguageChange(e.target.value)} style={{ maxWidth: 200 }}>
              <option value="it">Italiano</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('settings.defaultCurrency')}</label>
            <select className="form-select" value={form.default_currency} onChange={(e) => setForm((p) => ({ ...p, default_currency: e.target.value }))} style={{ maxWidth: 160 }}>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="CHF">CHF</option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <><span className="spinner" /> {t('common.saving')}</> : t('settings.saveSettings')}
        </button>
      </form>
    </div>
  );
}
