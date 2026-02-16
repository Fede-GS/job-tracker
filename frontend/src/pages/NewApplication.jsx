import { useState, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../context/ProfileContext';
import { useNotification } from '../context/NotificationContext';
import { createApplication, getApplications } from '../api/applications';
import { parseJobPost } from '../api/ai';
import { matchAnalysis, tailorCv, tailorCoverLetter, generatePdf } from '../api/profile';
import RichTextEditor from '../components/editor/RichTextEditor';
import ChatSidebar from '../components/chat/ChatSidebar';
import CelebrationOverlay from '../components/common/CelebrationOverlay';
import { useMilestones } from '../hooks/useMilestones';
import './NewApplication.css';

const STEPS = ['paste', 'match', 'decide', 'cv', 'coverLetter', 'summary'];

const initialState = {
  step: 0,
  jobPostingText: '',
  parsedJob: null,
  matchResult: null,
  cvHtml: '',
  coverLetterHtml: '',
  notes: '',
  deadline: '',
  loading: false,
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
  const [state, dispatch] = useReducer(reducer, initialState);
  const [chatOpen, setChatOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const { checkMilestone } = useMilestones();

  const set = (field, value) => dispatch({ type: 'SET_FIELD', field, value });

  // Step 1: Parse job posting
  const handleParse = async () => {
    if (!state.jobPostingText.trim()) return;
    dispatch({ type: 'SET_LOADING', value: true });
    try {
      const { parsed } = await parseJobPost(state.jobPostingText);
      set('parsedJob', parsed);
      dispatch({ type: 'NEXT_STEP' });
    } catch (err) {
      addNotification(err.message || 'Errore nell\'analisi', 'error');
    } finally {
      dispatch({ type: 'SET_LOADING', value: false });
    }
  };

  // Step 2: Match analysis
  const handleMatchAnalysis = async () => {
    dispatch({ type: 'SET_LOADING', value: true });
    try {
      const { analysis } = await matchAnalysis(state.jobPostingText, profile);
      set('matchResult', analysis);
    } catch (err) {
      addNotification(err.message || 'Errore nell\'analisi match', 'error');
    } finally {
      dispatch({ type: 'SET_LOADING', value: false });
    }
  };

  // Step 4: Generate tailored CV
  const handleGenerateCV = async () => {
    dispatch({ type: 'SET_LOADING', value: true });
    try {
      const { html } = await tailorCv(state.jobPostingText, profile);
      set('cvHtml', html);
    } catch (err) {
      addNotification(err.message || 'Errore nella generazione CV', 'error');
    } finally {
      dispatch({ type: 'SET_LOADING', value: false });
    }
  };

  // Step 5: Generate cover letter
  const handleGenerateCoverLetter = async () => {
    dispatch({ type: 'SET_LOADING', value: true });
    try {
      const { html } = await tailorCoverLetter(
        state.jobPostingText, profile,
        state.parsedJob?.company || '', state.parsedJob?.role || ''
      );
      set('coverLetterHtml', html);
    } catch (err) {
      addNotification(err.message || 'Errore nella generazione', 'error');
    } finally {
      dispatch({ type: 'SET_LOADING', value: false });
    }
  };

  // Export PDF
  const handleExportPdf = async (html, docType) => {
    try {
      await generatePdf(html, docType);
      addNotification('PDF generato!', 'success');
    } catch (err) {
      addNotification(err.message || 'Errore nella generazione PDF', 'error');
    }
  };

  // Step 6: Save application
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
        url: '',
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
      // Check milestones
      try {
        const listData = await getApplications({ page: 1, per_page: 1 });
        const milestone = checkMilestone(listData.total);
        if (milestone) {
          setCelebration(milestone);
          // Delay navigation so user sees celebration
          setTimeout(() => navigate(`/applications/${application.id}`), 3200);
          return;
        }
      } catch { /* ignore milestone errors */ }
      navigate(`/applications/${application.id}`);
    } catch (err) {
      addNotification(err.message || 'Errore nel salvataggio', 'error');
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

  return (
    <div className="new-application-page">
      <div className="wizard-main">
        {/* Step Indicator */}
        <div className="step-indicator">
          {STEPS.map((s, i) => (
            <div key={s} className={`step-dot ${i === state.step ? 'active' : ''} ${i < state.step ? 'completed' : ''}`}
              onClick={() => i < state.step && dispatch({ type: 'GO_TO_STEP', step: i })}>
              <span className="step-number">{i < state.step ? '✓' : i + 1}</span>
              <span className="step-label">{t(`newApplication.step${i + 1}Title`)}</span>
            </div>
          ))}
        </div>

        <div className="wizard-content">
          {/* STEP 1: Paste Job Posting */}
          {state.step === 0 && (
            <div className="wizard-step">
              <h2>{t('newApplication.step1Title')}</h2>
              <p className="step-desc">{t('newApplication.step1Desc')}</p>
              <textarea
                className="form-input job-posting-textarea"
                rows={12}
                value={state.jobPostingText}
                onChange={e => set('jobPostingText', e.target.value)}
                placeholder={t('newApplication.pasteJobPosting')}
              />
              <div className="step-actions">
                <button className="btn btn-primary" onClick={handleParse}
                  disabled={state.loading || !state.jobPostingText.trim()}>
                  {state.loading ? <><span className="spinner" /> {t('common.analyzing')}</> : t('newApplication.analyzeWithAI')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Match Analysis */}
          {state.step === 1 && (
            <div className="wizard-step">
              <h2>{t('newApplication.step2Title')}</h2>
              <p className="step-desc">{t('newApplication.step2Desc')}</p>

              {state.parsedJob && (
                <div className="parsed-preview card">
                  <h3>{state.parsedJob.role} @ {state.parsedJob.company}</h3>
                  <p><strong>{t('applications.location')}:</strong> {state.parsedJob.location || 'N/A'}</p>
                  {state.parsedJob.salary_min && <p><strong>{t('applications.salary')}:</strong> {state.parsedJob.salary_min}-{state.parsedJob.salary_max} {state.parsedJob.salary_currency}</p>}
                  {state.parsedJob.deadline && <p><strong>{t('applications.deadline')}:</strong> {state.parsedJob.deadline}</p>}
                  {state.parsedJob.key_skills && (
                    <div className="skill-tags" style={{ marginTop: 8 }}>
                      {state.parsedJob.key_skills.map((s, i) => <span key={i} className="skill-tag">{s}</span>)}
                    </div>
                  )}
                </div>
              )}

              {!state.matchResult ? (
                <div className="step-actions">
                  <button className="btn btn-ghost" onClick={() => dispatch({ type: 'PREV_STEP' })}>{t('common.back')}</button>
                  <button className="btn btn-primary" onClick={handleMatchAnalysis} disabled={state.loading}>
                    {state.loading ? <><span className="spinner" /> {t('common.analyzing')}</> : t('common.next') + ' - ' + t('newApplication.matchScore')}
                  </button>
                </div>
              ) : (
                <>
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

                    <div className="match-details">
                      <div className="match-column">
                        <h4>✅ {t('newApplication.strengths')}</h4>
                        <ul>{(state.matchResult.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </div>
                      <div className="match-column">
                        <h4>⚠️ {t('newApplication.gaps')}</h4>
                        <ul>{(state.matchResult.gaps || []).map((g, i) => <li key={i}>{g}</li>)}</ul>
                      </div>
                    </div>
                  </div>

                  <div className="step-actions">
                    <button className="btn btn-ghost" onClick={() => dispatch({ type: 'PREV_STEP' })}>{t('common.back')}</button>
                    <button className="btn btn-primary" onClick={() => dispatch({ type: 'NEXT_STEP' })}>{t('common.next')}</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 3: Decision */}
          {state.step === 2 && (
            <div className="wizard-step">
              <h2>{t('newApplication.step3Title')}</h2>
              <p className="step-desc">{t('newApplication.step3Desc')}</p>
              <div className="decision-actions">
                <button className="btn btn-primary btn-lg" onClick={() => dispatch({ type: 'NEXT_STEP' })}>
                  🚀 {t('newApplication.proceed')}
                </button>
                <button className="btn btn-secondary" onClick={() => handleSave('draft')}>
                  📝 {t('newApplication.saveDraft')}
                </button>
                <button className="btn btn-ghost" onClick={() => navigate('/applications')}>
                  ❌ {t('newApplication.discard')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: CV Tailoring */}
          {state.step === 3 && (
            <div className="wizard-step">
              <h2>{t('newApplication.step4Title')}</h2>
              <p className="step-desc">{t('newApplication.step4Desc')}</p>

              {!state.cvHtml ? (
                <div className="generate-prompt">
                  <button className="btn btn-primary" onClick={handleGenerateCV} disabled={state.loading}>
                    {state.loading ? <><span className="spinner" /> {t('common.generating')}</> : t('newApplication.generateCV')}
                  </button>
                </div>
              ) : (
                <>
                  <RichTextEditor content={state.cvHtml} onChange={(html) => set('cvHtml', html)} />
                  <div className="editor-actions">
                    <button className="btn btn-secondary btn-sm" onClick={handleGenerateCV} disabled={state.loading}>
                      🔄 {t('common.generating').replace('...', '')}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleExportPdf(state.cvHtml, 'cv')}>
                      📄 {t('newApplication.exportPDF')}
                    </button>
                  </div>
                </>
              )}

              <div className="step-actions">
                <button className="btn btn-ghost" onClick={() => dispatch({ type: 'PREV_STEP' })}>{t('common.back')}</button>
                <button className="btn btn-primary" onClick={() => dispatch({ type: 'NEXT_STEP' })}>{t('common.next')}</button>
              </div>
            </div>
          )}

          {/* STEP 5: Cover Letter */}
          {state.step === 4 && (
            <div className="wizard-step">
              <h2>{t('newApplication.step5Title')}</h2>
              <p className="step-desc">{t('newApplication.step5Desc')}</p>

              {!state.coverLetterHtml ? (
                <div className="generate-prompt">
                  <button className="btn btn-primary" onClick={handleGenerateCoverLetter} disabled={state.loading}>
                    {state.loading ? <><span className="spinner" /> {t('common.generating')}</> : t('newApplication.generateCoverLetter')}
                  </button>
                </div>
              ) : (
                <>
                  <RichTextEditor content={state.coverLetterHtml} onChange={(html) => set('coverLetterHtml', html)} />
                  <div className="editor-actions">
                    <button className="btn btn-secondary btn-sm" onClick={handleGenerateCoverLetter} disabled={state.loading}>
                      🔄 {t('common.generating').replace('...', '')}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleExportPdf(state.coverLetterHtml, 'cover_letter')}>
                      📄 {t('newApplication.exportPDF')}
                    </button>
                  </div>
                </>
              )}

              <div className="step-actions">
                <button className="btn btn-ghost" onClick={() => dispatch({ type: 'PREV_STEP' })}>{t('common.back')}</button>
                <button className="btn btn-primary" onClick={() => dispatch({ type: 'NEXT_STEP' })}>{t('common.next')}</button>
              </div>
            </div>
          )}

          {/* STEP 6: Summary */}
          {state.step === 5 && (
            <div className="wizard-step">
              <h2>{t('newApplication.step6Title')}</h2>
              <p className="step-desc">{t('newApplication.step6Desc')}</p>

              <div className="summary-card card">
                <div className="summary-grid">
                  <div><strong>{t('applications.company')}:</strong> {state.parsedJob?.company || 'N/A'}</div>
                  <div><strong>{t('applications.role')}:</strong> {state.parsedJob?.role || 'N/A'}</div>
                  <div><strong>{t('applications.location')}:</strong> {state.parsedJob?.location || 'N/A'}</div>
                  <div><strong>{t('applications.matchScore')}:</strong> {state.matchResult?.match_score || 'N/A'}/10</div>
                  <div><strong>CV:</strong> {state.cvHtml ? '✅' : '❌'}</div>
                  <div><strong>Cover Letter:</strong> {state.coverLetterHtml ? '✅' : '❌'}</div>
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

              <div className="step-actions">
                <button className="btn btn-ghost" onClick={() => dispatch({ type: 'PREV_STEP' })}>{t('common.back')}</button>
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
