import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getApplications } from '../api/applications';
import { generateCV, generateCoverLetter, improveText } from '../api/ai';
import { useNotification } from '../context/NotificationContext';
import './AIAssistant.css';

export default function AIAssistant() {
  const { t } = useTranslation();
  const { addNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('cv');
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [instructions, setInstructions] = useState('');
  const [currentCv, setCurrentCv] = useState('');
  const [textToImprove, setTextToImprove] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getApplications({ per_page: 100 })
      .then((data) => setApps(data.applications))
      .catch(() => {});
  }, []);

  const handleSelectApp = (e) => {
    const appId = e.target.value;
    const app = apps.find((a) => a.id === parseInt(appId));
    setSelectedApp(app || null);
  };

  const handleGenerateCV = async () => {
    if (!selectedApp?.job_description) {
      addNotification(t('common.error'), 'warning');
      return;
    }
    setLoading(true);
    try {
      const { content } = await generateCV({
        job_description: selectedApp.job_description,
        current_cv_text: currentCv || undefined,
        instructions: instructions || undefined,
      });
      setOutput(content);
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!selectedApp) {
      addNotification(t('common.error'), 'warning');
      return;
    }
    setLoading(true);
    try {
      const { content } = await generateCoverLetter({
        job_description: selectedApp.job_description || '',
        company: selectedApp.company,
        role: selectedApp.role,
        instructions: instructions || undefined,
      });
      setOutput(content);
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImproveText = async () => {
    if (!textToImprove.trim()) {
      addNotification(t('common.error'), 'warning');
      return;
    }
    setLoading(true);
    try {
      const { content } = await improveText(textToImprove, instructions || undefined);
      setOutput(content);
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    addNotification(t('common.success'), 'success');
  };

  return (
    <div className="ai-page">
      <div className="page-header">
        <h1>{t('sidebar.aiAssistant')}</h1>
        <p>{t('chat.title')}</p>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'cv' ? 'active' : ''}`} onClick={() => { setActiveTab('cv'); setOutput(''); }}>
          CV Generator
        </button>
        <button className={`tab ${activeTab === 'cover' ? 'active' : ''}`} onClick={() => { setActiveTab('cover'); setOutput(''); }}>
          Cover Letter
        </button>
        <button className={`tab ${activeTab === 'improve' ? 'active' : ''}`} onClick={() => { setActiveTab('improve'); setOutput(''); }}>
          Text Improver
        </button>
      </div>

      <div className="ai-layout">
        <div className="ai-input-panel">
          {(activeTab === 'cv' || activeTab === 'cover') && (
            <div className="form-group">
              <label>{t('applications.title')}</label>
              <select className="form-select" onChange={handleSelectApp} value={selectedApp?.id || ''}>
                <option value="">-- {t('common.search')} --</option>
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>{a.company} - {a.role}</option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'cv' && (
            <div className="form-group">
              <label>CV ({t('common.optional')})</label>
              <textarea
                className="form-textarea"
                value={currentCv}
                onChange={(e) => setCurrentCv(e.target.value)}
                rows={6}
              />
            </div>
          )}

          {activeTab === 'improve' && (
            <div className="form-group">
              <label>Text</label>
              <textarea
                className="form-textarea"
                value={textToImprove}
                onChange={(e) => setTextToImprove(e.target.value)}
                rows={8}
              />
            </div>
          )}

          <div className="form-group">
            <label>{t('common.optional')}</label>
            <textarea
              className="form-textarea"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={activeTab === 'cv' ? handleGenerateCV : activeTab === 'cover' ? handleGenerateCoverLetter : handleImproveText}
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner" /> {t('common.generating')}</>
            ) : (
              t('common.generating').replace('...', '')
            )}
          </button>
        </div>

        <div className="ai-output-panel">
          <div className="ai-output-header">
            <h3>Output</h3>
            {output && (
              <button className="btn btn-sm btn-secondary" onClick={handleCopy}>{t('common.download')}</button>
            )}
          </div>
          <div className="ai-output-content">
            {output ? (
              <pre className="ai-output-text">{output}</pre>
            ) : (
              <div className="empty-state" style={{ padding: 40 }}>
                <p>{t('common.noResults')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
