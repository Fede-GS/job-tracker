import { useState, useReducer, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../context/ProfileContext';
import { useNotification } from '../context/NotificationContext';
import { createApplication, getApplications } from '../api/applications';
import { parseJobPost, extractApplyMethod, scrapeJobUrl } from '../api/ai';
import { matchAnalysis, tailorCv, tailorCoverLetter, generatePdf } from '../api/profile';
import RichTextEditor from '../components/editor/RichTextEditor';
import ChatSidebar from '../components/chat/ChatSidebar';
import CelebrationOverlay from '../components/common/CelebrationOverlay';
import { useMilestones } from '../hooks/useMilestones';
import PageTutorial from '../components/common/PageTutorial';
import './NewApplication.css';

const STEPS = ['paste', 'analysis', 'decide', 'documents', 'summary'];

const initialState = {
  step: 0,
  inputMode: 'text', // 'text' or 'url'
  jobUrl: '',
  jobPostingText: '',
  scraping: false,
  scrapedFrom: null, // { domain, url } when text was scraped from a URL
  parsedJob: null,
  matchResult: null,
  applyMethod: null,
  applyMethodLoading: false,
  cvMode: 'generate',
  clMode: 'generate',
  cvHtml: '',
  coverLetterHtml: '',
  coverLetterLength: 'short',
  cvUploaded: null,
  clUploaded: null,
  cvPdfDoc: null,
  clPdfDoc: null,
  notes: '',
  deadline: '',
  loading: false,
  profileExpanded: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD': return { ...state, [action.field]: action.value };
    case 'NEXT_STEP': return { ...state, step: Math.min(state.step + 1, STEPS.length - 1) };
    case 'PREV_STEP': return { ...state, step: Math.max(state.step - 1, 0) };
    case 'GO_TO_STEP': return { ...state, step: action.step };
    case 'SET_LOADING': return { ...state, loading: action.value };
    default: return state;
  }
}

export default function NewApplication() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { addNotification } = useNotification();
  const location = useLocation();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [chatOpen, setChatOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const { checkMilestone } = useMilestones();
  const cvFileRef = useRef(null);
  const clFileRef = useRef(null);

  const set = (field, value) => dispatch({ type: 'SET_FIELD', field, value });

  // Pre-fill from Job Search navigation state
  useEffect(() => {
    if (location.state?.fromJobSearch) {
      const { jobData, matchAnalysis } = location.state;
      if (jobData) {
        // Set the job posting text (description)
        set('jobPostingText', jobData.description || '');
        // Build a parsedJob object from the job search data
        set('parsedJob', {
          company: jobData.company || '',
          role: jobData.title || '',
          location: jobData.location || '',
          salary_min: jobData.salary_min || '',
          salary_max: jobData.salary_max || '',
          salary_currency: 'EUR',
          url: jobData.url || '',
          job_description_summary: jobData.description || '',
          key_skills: [],
          requirements: [],
        });
      }
      if (matchAnalysis) {
        set('matchResult', matchAnalysis);
      }
      // Jump to step 2 (Analysis results) since analysis is already done
      dispatch({ type: 'GO_TO_STEP', step: 1 });
      // Clear the navigation state to prevent re-triggering on re-render
      window.history.replaceState({}, document.title);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScrapeUrl = async () => {
    if (!state.jobUrl.trim()) return;
    set('scraping', true);
    try {
      const result = await scrapeJobUrl(state.jobUrl.trim());
      if (result.text) {
        set('jobPostingText', result.text);
        set('scrapedFrom', {
          domain: result.metadata?.domain || '',
          url: result.metadata?.url || state.jobUrl,
        });
        // If AI parsing was done server-side, pre-fill parsedJob
        if (result.parsed) {
          set('parsedJob', result.parsed);
        }
        addNotification(t('newApplication.urlSuccess'), 'success');
      }
    } catch (err) {
      addNotification(err.message || t('newApplication.urlError'), 'error');
    } finally {
      set('scraping', false);
    }
  };

  const handleAnalyze = async () => {
    if (!state.jobPostingText.trim()) return;
    dispatch({ type: 'SET_LOADING', value: true });
    try {
      const { parsed } = await parseJobPost(state.jobPostingText);
      set('parsedJob', parsed);
      try {
        const { analysis } = await matchAnalysis(state.jobPostingText, profile);
        set('matchResult', analysis);
      } catch (err) {
        addNotification(err.message || 'Match analysis unavailable', 'warning');
      }
      dispatch({ type: 'NEXT_STEP' });
    } catch (err) {
      addNotification(err.message || 'Error analyzing job posting', 'error');
    } finally {
      dispatch({ type: 'SET_LOADING', value: false });
    }
  };

  const handleGenerateCV = async () => {
    dispatch({ type: 'SET_LOADING', value: true });
    try {
      const { html } = await tailorCv(state.jobPostingText, profile);
      set('cvHtml', html);
    } catch (err) {
      addNotification(err.message || 'Error generating CV', 'error');
    } finally {
      dispatch({ type: 'SET_LOADING', value: false });
    }
  };

  const handleGenerateCoverLetter = async () => {
    dispatch({ type: 'SET_LOADING', value: true });
    const lengthInstructions = {
      short: 'Write a SHORT and concise cover letter, maximum 150 words. Be direct and impactful with only 2-3 short paragraphs.',
      medium: 'Write a MEDIUM-length cover letter, around 200-250 words. Include 3 paragraphs: opening, skills highlight, and closing.',
      long: 'Write a DETAILED cover letter, around 350-400 words. Include 4 paragraphs with thorough explanation of skills and experience.',
    };
    const lengthInstruction = lengthInstructions[state.coverLetterLength] || lengthInstructions.short;
    try {
      const { html } = await tailorCoverLetter(
        state.jobPostingText, profile,
        state.parsedJob?.company || '', state.parsedJob?.role || '',
        lengthInstruction
      );
      set('coverLetterHtml', html);
    } catch (err) {
      addNotification(err.message || 'Error generating cover letter', 'error');
    } finally {
      dispatch({ type: 'SET_LOADING', value: false });
    }
  };

  const handleExportPdf = async (html, docType) => {
    try {
      const result = await generatePdf(html, docType);
      if (docType === 'cv') set('cvPdfDoc', result);
      else set('clPdfDoc', result);
      addNotification('PDF generated!', 'success');
    } catch (err) {
      addNotification(err.message || 'Error generating PDF', 'error');
    }
  };

  const handleFileUpload = (file, type) => {
    if (!file) return;
    if (type === 'cv') {
      set('cvUploaded', file);
    } else {
      set('clUploaded', file);
    }
    addNotification(t('newApplication.fileUploaded'), 'success');
  };

  const handleFetchApplyMethod = async () => {
    if (state.applyMethod || state.applyMethodLoading) return;
    set('applyMethodLoading', true);
    try {
      const { apply_method } = await extractApplyMethod(state.jobPostingText);
      set('applyMethod', apply_method);
    } catch {
      set('applyMethod', { method: 'unknown', instructions: '' });
    } finally {
      set('applyMethodLoading', false);
    }
  };

  const goToSummary = () => {
    dispatch({ type: 'NEXT_STEP' });
    handleFetchApplyMethod();
  };

  const handleSave = async (status = 'draft') => {
    setSaving(true);
    try {
      const p = state.parsedJob || {};
      const { application } = await createApplication({
        company: p.company || '',
        role: p.role || '',
        location: p.location || '',
        status,
        salary_min: p.salary_min,
        salary_max: p.salary_max,
        salary_currency: p.salary_currency || 'EUR',
        url: state.applyMethod?.url || '',
        job_description: p.job_description_summary || '',
        requirements: Array.isArray(p.requirements) ? p.requirements.join(', ') : '',
        notes: state.notes,
        deadline: state.deadline || p.deadline || null,
        match_score: state.matchResult?.match_score,
        match_analysis: state.matchResult,
        job_posting_text: state.jobPostingText,
        generated_cv_html: state.cvHtml,
        generated_cover_letter_html: state.coverLetterHtml,
      });
      addNotification(t('newApplication.applicationSaved'), 'success');
      try {
        const listData = await getApplications({ page: 1, per_page: 1 });
        const milestone = checkMilestone(listData.total);
        if (milestone) {
          setCelebration(milestone);
          setTimeout(() => navigate(`/applications/${application.id}`), 3200);
          return;
        }
      } catch { /* ignore */ }
      navigate(`/applications/${application.id}`);
    } catch (err) {
      addNotification(err.message || 'Error saving application', 'error');
    } finally {
      setSaving(false);
    }
  };

  const chatContext = {
    step: STEPS[state.step],
    company: state.parsedJob?.company || '',
    role: state.parsedJob?.role || '',
    profile,
    jobPosting: state.jobPostingText,
    matchAnalysis: state.matchResult,
  };

  const scoreColor = (score) => {
    if (score >= 7) return 'var(--success)';
    if (score >= 5) return 'var(--warning, #f59e0b)';
    return 'var(--error)';
  };

  const methodIcon = (method) => {
    const icons = { linkedin: '🔗', email: '📧', company_portal: '🏢', external_portal: '🌐', in_person: '🤝' };
    return icons[method] || '📋';
  };

  return (
    <div className="new-application-page">
      <PageTutorial pageKey="newApplication" icon="add_circle" />
      <div className="wizard-main">
        <div className="step-indicator">
          {STEPS.map((s, i) => (
            <div key={s}
              className={`step-dot ${i === state.step ? 'active' : ''} ${i < state.step ? 'completed' : ''}`}
              onClick={() => i < state.step && dispatch({ type: 'GO_TO_STEP', step: i })}
            >
              <span className="step-number">{i < state.step ? '✓' : i + 1}</span>
              <span className="step-label">{t(`newApplication.step${i + 1}Title`)}</span>
            </div>
          ))}
        </div>

        <div className="wizard-content">

          {/* ═══ STEP 1: Paste ═══ */}
          {state.step === 0 && (
            <div className="wizard-step">
              <h2>{t('newApplication.step1Title')}</h2>
              <p className="step-desc">{t('newApplication.step1Desc')}</p>

              {/* Input Mode Toggle */}
              <div className="input-mode-toggle">
                <button
                  className={`input-mode-btn ${state.inputMode === 'text' ? 'active' : ''}`}
                  onClick={() => set('inputMode', 'text')}
                >
                  <span className="material-icon" style={{ fontSize: 18 }}>content_paste</span>
                  {t('newApplication.modeText')}
                </button>
                <button
                  className={`input-mode-btn ${state.inputMode === 'url' ? 'active' : ''}`}
                  onClick={() => set('inputMode', 'url')}
                >
                  <span className="material-icon" style={{ fontSize: 18 }}>link</span>
                  {t('newApplication.modeUrl')}
                </button>
              </div>

              {/* URL Input Mode */}
              {state.inputMode === 'url' && (
                <div className="url-input-section">
                  <div className="url-input-wrapper">
                    <span className="material-icon url-input-icon">language</span>
                    <input
                      type="url"
                      className="form-input url-input"
                      value={state.jobUrl}
                      onChange={e => set('jobUrl', e.target.value)}
                      placeholder={t('newApplication.urlPlaceholder')}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && state.jobUrl.trim()) handleScrapeUrl();
                      }}
                    />
                    {state.jobUrl && (
                      <button
                        className="url-clear-btn"
                        onClick={() => set('jobUrl', '')}
                        title={t('common.close')}
                      >
                        <span className="material-icon" style={{ fontSize: 18 }}>close</span>
                      </button>
                    )}
                  </div>
                  <div className="url-supported-sites">
                    <span className="material-icon" style={{ fontSize: 14, color: 'var(--text-muted)' }}>info</span>
                    <span>{t('newApplication.urlSupportedSites')}</span>
                  </div>
                  <button
                    className="btn btn-primary url-fetch-btn"
                    onClick={handleScrapeUrl}
                    disabled={state.scraping || !state.jobUrl.trim()}
                  >
                    {state.scraping
                      ? <><span className="spinner" /> {t('newApplication.urlFetching')}</>
                      : <><span className="material-icon" style={{ fontSize: 18 }}>download</span> {t('newApplication.urlFetch')}</>}
                  </button>
                </div>
              )}

              {/* Scraped From Badge */}
              {state.scrapedFrom && state.jobPostingText && (
                <div className="scraped-from-badge">
                  <span className="material-icon" style={{ fontSize: 16, color: 'var(--success)' }}>check_circle</span>
                  <span>{t('newApplication.scrapedFrom')} <strong>{state.scrapedFrom.domain}</strong></span>
                  <a href={state.scrapedFrom.url} target="_blank" rel="noopener noreferrer" className="scraped-link">
                    <span className="material-icon" style={{ fontSize: 14 }}>open_in_new</span>
                  </a>
                </div>
              )}

              {/* Text Input (always visible, auto-filled when scraping) */}
              {(state.inputMode === 'text' || state.jobPostingText) && (
                <textarea
                  className="form-input job-posting-textarea"
                  rows={state.inputMode === 'url' && state.jobPostingText ? 8 : 12}
                  value={state.jobPostingText}
                  onChange={e => set('jobPostingText', e.target.value)}
                  placeholder={t('newApplication.pasteJobPosting')}
                />
              )}

              <div className="step-actions">
                <span />
                <button className="btn btn-primary" onClick={handleAnalyze}
                  disabled={state.loading || !state.jobPostingText.trim()}>
                  {state.loading
                    ? <><span className="spinner" /> {t('common.analyzing')}</>
                    : t('newApplication.analyzeWithAI')}
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Analysis ═══ */}
          {state.step === 1 && (
            <div className="wizard-step">
              <h2>{t('newApplication.step2Title')}</h2>
              <p className="step-desc">{t('newApplication.step2Desc')}</p>

              {state.parsedJob && (
                <div className="analysis-section">
                  <h3 className="section-title">
                    <span className="material-icon" style={{ fontSize: 20 }}>work</span>
                    {t('newApplication.jobSummary')}
                  </h3>
                  <div className="parsed-preview card">
                    <h4>{state.parsedJob.role} @ {state.parsedJob.company}</h4>
                    <div className="parsed-details">
                      <p><strong>{t('applications.location')}:</strong> {state.parsedJob.location || 'N/A'}</p>
                      {state.parsedJob.employment_type && (
                        <p><strong>Type:</strong> {state.parsedJob.employment_type}</p>
                      )}
                      {state.parsedJob.salary_min && (
                        <p><strong>{t('applications.salary')}:</strong> {state.parsedJob.salary_min}–{state.parsedJob.salary_max} {state.parsedJob.salary_currency}</p>
                      )}
                      {state.parsedJob.experience_years && (
                        <p><strong>Experience:</strong> {state.parsedJob.experience_years}</p>
                      )}
                      {state.parsedJob.deadline && (
                        <p><strong>{t('applications.deadline')}:</strong> {state.parsedJob.deadline}</p>
                      )}
                    </div>
                    {state.parsedJob.job_description_summary && (
                      <p className="job-summary-text">{state.parsedJob.job_description_summary}</p>
                    )}
                    {state.parsedJob.key_skills && state.parsedJob.key_skills.length > 0 && (
                      <div className="skill-tags" style={{ marginTop: 8 }}>
                        {state.parsedJob.key_skills.map((sk, i) => (
                          <span key={i} className="skill-tag">{sk}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {state.matchResult && (
                <div className="analysis-section">
                  <h3 className="section-title">
                    <span className="material-icon" style={{ fontSize: 20 }}>analytics</span>
                    {t('newApplication.matchScore')}
                  </h3>
                  <div className="match-result card">
                    <div className="match-score-display">
                      <div className="score-circle" style={{ borderColor: scoreColor(state.matchResult.match_score) }}>
                        <span className="score-value" style={{ color: scoreColor(state.matchResult.match_score) }}>
                          {state.matchResult.match_score}
                        </span>
                        <span className="score-label">/10</span>
                      </div>
                      <p className="match-recommendation">{state.matchResult.recommendation}</p>
                    </div>
                  </div>
                </div>
              )}

              {state.matchResult && (
                <div className="analysis-section">
                  <h3 className="section-title">
                    <span className="material-icon" style={{ fontSize: 20 }}>balance</span>
                    {t('newApplication.prosAndCons')}
                  </h3>
                  <div className="pros-cons-grid">
                    <div className="pros-column card">
                      <h4 className="pros-title">✅ {t('newApplication.pros')}</h4>
                      <ul>
                        {(state.matchResult.strengths || []).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="cons-column card">
                      <h4 className="cons-title">⚠️ {t('newApplication.cons')}</h4>
                      <ul>
                        {(state.matchResult.gaps || []).map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="step-actions">
                <button className="btn btn-ghost" onClick={() => dispatch({ type: 'PREV_STEP' })}>
                  {t('common.back')}
                </button>
                <button className="btn btn-primary" onClick={() => dispatch({ type: 'NEXT_STEP' })}>
                  {t('common.next')}
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Decision ═══ */}
          {state.step === 2 && (
            <div className="wizard-step">
              <h2>{t('newApplication.step3Title')}</h2>
              <p className="step-desc">{t('newApplication.step3Desc')}</p>

              {state.matchResult && (
                <div className="decision-recap card">
                  <div className="decision-recap-score">
                    <div className="score-circle score-circle-sm" style={{ borderColor: scoreColor(state.matchResult.match_score) }}>
                      <span className="score-value" style={{ color: scoreColor(state.matchResult.match_score), fontSize: 20 }}>
                        {state.matchResult.match_score}
                      </span>
                      <span className="score-label" style={{ fontSize: 11 }}>/10</span>
                    </div>
                  </div>
                  <div className="decision-recap-info">
                    <h4>{state.parsedJob?.role} @ {state.parsedJob?.company}</h4>
                    <p>{state.matchResult.recommendation}</p>
                  </div>
                </div>
              )}

              <div className="decision-actions">
                <button className="btn btn-primary btn-lg" onClick={() => dispatch({ type: 'NEXT_STEP' })}>
                  🚀 {t('newApplication.proceed')}
                </button>
                <button className="btn btn-secondary" onClick={() => handleSave('draft')} disabled={saving}>
                  📝 {t('newApplication.saveDraft')}
                </button>
                <button className="btn btn-ghost" onClick={() => navigate('/applications')}>
                  ❌ {t('newApplication.discard')}
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 4: Documents ═══ */}
          {state.step === 3 && (
            <div className="wizard-step">
              <h2>{t('newApplication.step4Title')}</h2>
              <p className="step-desc">{t('newApplication.step4Desc')}</p>

              {/* CV Section */}
              <div className="document-section">
                <div className="document-section-header">
                  <h3>📄 {t('newApplication.cvSection')}</h3>
                  <div className="doc-mode-toggle">
                    <button className={`toggle-btn ${state.cvMode === 'generate' ? 'active' : ''}`}
                      onClick={() => set('cvMode', 'generate')}>
                      <span className="material-icon" style={{ fontSize: 16 }}>auto_awesome</span> AI
                    </button>
                    <button className={`toggle-btn ${state.cvMode === 'upload' ? 'active' : ''}`}
                      onClick={() => set('cvMode', 'upload')}>
                      <span className="material-icon" style={{ fontSize: 16 }}>upload_file</span> {t('newApplication.uploadOwn')}
                    </button>
                  </div>
                </div>

                {state.cvMode === 'generate' ? (
                  <div className="doc-generate-area">
                    {!state.cvHtml ? (
                      <div className="generate-prompt">
                        <button className="btn btn-primary" onClick={handleGenerateCV} disabled={state.loading}>
                          {state.loading
                            ? <><span className="spinner" /> {t('common.generating')}</>
                            : t('newApplication.generateCV')}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <RichTextEditor content={state.cvHtml} onChange={(html) => set('cvHtml', html)} />
                        <div className="editor-actions">
                          <button className="btn btn-secondary btn-sm" onClick={handleGenerateCV} disabled={state.loading}>
                            🔄 {t('newApplication.regenerate')}
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleExportPdf(state.cvHtml, 'cv')}>
                            📄 {t('newApplication.exportPDF')}
                          </button>
                          {state.cvPdfDoc && (
                            <a href={state.cvPdfDoc.download_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                              ⬇️ {t('newApplication.downloadPDF')}
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="doc-upload-area">
                    <input type="file" ref={cvFileRef} accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                      onChange={e => handleFileUpload(e.target.files[0], 'cv')} />
                    {state.cvUploaded ? (
                      <div className="uploaded-file card">
                        <span className="material-icon" style={{ color: 'var(--success)', fontSize: 24 }}>check_circle</span>
                        <div>
                          <p className="uploaded-filename">{state.cvUploaded.name}</p>
                          <p className="uploaded-size">{(state.cvUploaded.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => { set('cvUploaded', null); if (cvFileRef.current) cvFileRef.current.value = ''; }}>✕</button>
                      </div>
                    ) : (
                      <div className="upload-dropzone" onClick={() => cvFileRef.current?.click()}>
                        <span className="material-icon" style={{ fontSize: 40, color: 'var(--text-muted)' }}>cloud_upload</span>
                        <p>{t('newApplication.uploadCV')}</p>
                        <p className="upload-hint">PDF, DOC, DOCX</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cover Letter Section */}
              <div className="document-section">
                <div className="document-section-header">
                  <h3>✉️ {t('newApplication.coverLetterSection')}</h3>
                  <div className="doc-mode-toggle">
                    <button className={`toggle-btn ${state.clMode === 'generate' ? 'active' : ''}`}
                      onClick={() => set('clMode', 'generate')}>
                      <span className="material-icon" style={{ fontSize: 16 }}>auto_awesome</span> AI
                    </button>
                    <button className={`toggle-btn ${state.clMode === 'upload' ? 'active' : ''}`}
                      onClick={() => set('clMode', 'upload')}>
                      <span className="material-icon" style={{ fontSize: 16 }}>upload_file</span> {t('newApplication.uploadOwn')}
                    </button>
                  </div>
                </div>

                {state.clMode === 'generate' ? (
                  <div className="doc-generate-area">
                    {!state.coverLetterHtml ? (
                      <div className="generate-prompt">
                        <div className="cl-length-selector">
                          <label className="cl-length-label">{t('newApplication.coverLetterLength')}</label>
                          <div className="cl-length-options">
                            {['short', 'medium', 'long'].map((len) => (
                              <button
                                key={len}
                                className={`cl-length-btn ${state.coverLetterLength === len ? 'active' : ''}`}
                                onClick={() => set('coverLetterLength', len)}
                              >
                                <span className="cl-length-btn-label">{t(`newApplication.length${len.charAt(0).toUpperCase() + len.slice(1)}`)}</span>
                                <span className="cl-length-btn-desc">{t(`newApplication.length${len.charAt(0).toUpperCase() + len.slice(1)}Desc`)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <button className="btn btn-primary" onClick={handleGenerateCoverLetter} disabled={state.loading}>
                          {state.loading
                            ? <><span className="spinner" /> {t('common.generating')}</>
                            : t('newApplication.generateCoverLetter')}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <RichTextEditor content={state.coverLetterHtml} onChange={(html) => set('coverLetterHtml', html)} />
                        <div className="editor-actions">
                          <button className="btn btn-secondary btn-sm" onClick={handleGenerateCoverLetter} disabled={state.loading}>
                            🔄 {t('newApplication.regenerate')}
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleExportPdf(state.coverLetterHtml, 'cover_letter')}>
                            📄 {t('newApplication.exportPDF')}
                          </button>
                          {state.clPdfDoc && (
                            <a href={state.clPdfDoc.download_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                              ⬇️ {t('newApplication.downloadPDF')}
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="doc-upload-area">
                    <input type="file" ref={clFileRef} accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                      onChange={e => handleFileUpload(e.target.files[0], 'cl')} />
                    {state.clUploaded ? (
                      <div className="uploaded-file card">
                        <span className="material-icon" style={{ color: 'var(--success)', fontSize: 24 }}>check_circle</span>
                        <div>
                          <p className="uploaded-filename">{state.clUploaded.name}</p>
                          <p className="uploaded-size">{(state.clUploaded.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => { set('clUploaded', null); if (clFileRef.current) clFileRef.current.value = ''; }}>✕</button>
                      </div>
                    ) : (
                      <div className="upload-dropzone" onClick={() => clFileRef.current?.click()}>
                        <span className="material-icon" style={{ fontSize: 40, color: 'var(--text-muted)' }}>cloud_upload</span>
                        <p>{t('newApplication.uploadCoverLetter')}</p>
                        <p className="upload-hint">PDF, DOC, DOCX</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="step-actions">
                <button className="btn btn-ghost" onClick={() => dispatch({ type: 'PREV_STEP' })}>
                  {t('common.back')}
                </button>
                <button className="btn btn-primary" onClick={goToSummary}>
                  {t('common.next')}
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 5: Summary ═══ */}
          {state.step === 4 && (
            <div className="wizard-step">
              <h2>{t('newApplication.step5Title')}</h2>
              <p className="step-desc">{t('newApplication.step5Desc')}</p>

              {/* Summary Card */}
              <div className="summary-card card">
                <div className="summary-grid">
                  <div><strong>{t('applications.company')}:</strong> {state.parsedJob?.company || 'N/A'}</div>
                  <div><strong>{t('applications.role')}:</strong> {state.parsedJob?.role || 'N/A'}</div>
                  <div><strong>{t('applications.location')}:</strong> {state.parsedJob?.location || 'N/A'}</div>
                  <div><strong>{t('applications.matchScore')}:</strong> {state.matchResult?.match_score || 'N/A'}/10</div>
                  <div><strong>CV:</strong> {state.cvHtml || state.cvUploaded ? '✅' : '❌'}</div>
                  <div><strong>Cover Letter:</strong> {state.coverLetterHtml || state.clUploaded ? '✅' : '❌'}</div>
                </div>

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label>{t('applications.deadline')}</label>
                  <input type="date" className="form-input" style={{ maxWidth: 200 }}
                    value={state.deadline || state.parsedJob?.deadline || ''}
                    onChange={e => set('deadline', e.target.value)} />
                </div>

                <div className="form-group" style={{ marginTop: 12 }}>
                  <label>{t('applications.notes')}</label>
                  <textarea className="form-input" rows={3} value={state.notes}
                    onChange={e => set('notes', e.target.value)} />
                </div>
              </div>

              {/* Profile Preview */}
              {profile && (
                <div className="profile-preview-section">
                  <div className="profile-preview-header" onClick={() => set('profileExpanded', !state.profileExpanded)}>
                    <div className="profile-preview-summary">
                      <span className="material-icon" style={{ fontSize: 24, color: 'var(--accent)' }}>person</span>
                      <div>
                        <h4>{t('newApplication.profilePreview')}</h4>
                        <p className="profile-preview-name">{profile.full_name || 'N/A'} — {profile.location || ''}</p>
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm">
                      <span className="material-icon">{state.profileExpanded ? 'expand_less' : 'expand_more'}</span>
                      {state.profileExpanded ? t('newApplication.collapseProfile') : t('newApplication.expandProfile')}
                    </button>
                  </div>

                  {state.profileExpanded && (
                    <div className="profile-preview-body card">
                      {profile.professional_summary && (
                        <div className="profile-section">
                          <h5>{t('profile.professionalSummary')}</h5>
                          <p>{profile.professional_summary}</p>
                        </div>
                      )}
                      {profile.skills && profile.skills.length > 0 && (
                        <div className="profile-section">
                          <h5>{t('profile.skills')}</h5>
                          <div className="skill-tags">
                            {profile.skills.map((sk, i) => <span key={i} className="skill-tag">{sk}</span>)}
                          </div>
                        </div>
                      )}
                      {profile.work_experiences && profile.work_experiences.length > 0 && (
                        <div className="profile-section">
                          <h5>{t('profile.workExperience')}</h5>
                          {profile.work_experiences.slice(0, 3).map((exp, i) => (
                            <div key={i} className="profile-exp-item">
                              <strong>{exp.title || exp.job_title}</strong> — {exp.company}
                              <br />
                              <small>{exp.start_date} – {exp.end_date || t('profile.present')}</small>
                            </div>
                          ))}
                        </div>
                      )}
                      {profile.education && profile.education.length > 0 && (
                        <div className="profile-section">
                          <h5>{t('profile.education')}</h5>
                          {profile.education.slice(0, 2).map((edu, i) => (
                            <div key={i} className="profile-exp-item">
                              <strong>{edu.degree}</strong> — {edu.institution}
                              {edu.year && <small> ({edu.year})</small>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* How to Apply */}
              <div className="how-to-apply-section card">
                <h3 className="section-title">
                  <span className="material-icon" style={{ fontSize: 20 }}>send</span>
                  {t('newApplication.howToApply')}
                </h3>
                <p className="step-desc" style={{ marginBottom: 16 }}>{t('newApplication.howToApplyDesc')}</p>

                {state.applyMethodLoading ? (
                  <div className="apply-method-loading">
                    <span className="spinner" />
                    <p>{t('newApplication.loadingApplyMethod')}</p>
                  </div>
                ) : state.applyMethod && state.applyMethod.method !== 'unknown' ? (
                  <div className="apply-method-result">
                    <div className="apply-method-badge">
                      <span className="apply-method-icon">{methodIcon(state.applyMethod.method)}</span>
                      <div>
                        <strong>{t('newApplication.applyVia')} {state.applyMethod.platform_name || state.applyMethod.method}</strong>
                        {state.applyMethod.url && (
                          <a href={state.applyMethod.url} target="_blank" rel="noopener noreferrer" className="apply-link">
                            {state.applyMethod.url}
                          </a>
                        )}
                        {state.applyMethod.email && (
                          <a href={`mailto:${state.applyMethod.email}`} className="apply-link">
                            {state.applyMethod.email}
                          </a>
                        )}
                      </div>
                    </div>
                    {state.applyMethod.instructions && (
                      <p className="apply-instructions">{state.applyMethod.instructions}</p>
                    )}
                    {state.applyMethod.additional_notes && (
                      <p className="apply-notes">{state.applyMethod.additional_notes}</p>
                    )}
                  </div>
                ) : (
                  <div className="apply-method-unknown">
                    <p>{t('newApplication.applyMethodUnknown')}</p>
                    <ul className="apply-tips">
                      <li>{t('newApplication.applyTip1')}</li>
                      <li>{t('newApplication.applyTip2')}</li>
                      <li>{t('newApplication.applyTip3')}</li>
                    </ul>
                  </div>
                )}

                <p className="ready-to-apply">{t('newApplication.readyToApply')}</p>
              </div>

              <div className="step-actions">
                <button className="btn btn-ghost" onClick={() => dispatch({ type: 'PREV_STEP' })}>
                  {t('common.back')}
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary" onClick={() => handleSave('draft')} disabled={saving}>
                    {t('newApplication.saveDraft')}
                  </button>
                  <button className="btn btn-primary" onClick={() => handleSave('sent')} disabled={saving}>
                    {saving ? <><span className="spinner" /> {t('common.saving')}</> : t('newApplication.saveApplication')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Sidebar */}
      <ChatSidebar
        context={chatContext}
        collapsed={!chatOpen}
        onToggle={() => setChatOpen(!chatOpen)}
      />

      <CelebrationOverlay
        show={!!celebration}
        icon={celebration?.icon}
        title={celebration ? t(celebration.titleKey) : ''}
        message={celebration ? t(celebration.messageKey) : ''}
        onDone={() => setCelebration(null)}
      />
    </div>
  );
}
