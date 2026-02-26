import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../context/ProfileContext';
import { useNotification } from '../context/NotificationContext';
import { uploadCV, extractCvProfile, updateProfile, completeOnboarding, importLinkedIn } from '../api/profile';
import './Onboarding.css';

export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setProfile, setOnboardingCompleted } = useProfile();
  const { addNotification } = useNotification();
  const fileRef = useRef();

  // mode: null | 'upload' | 'linkedin' | 'manual' | 'review'
  const [mode, setMode] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [linkedinInput, setLinkedinInput] = useState('');
  const [linkedinMode, setLinkedinMode] = useState('url'); // 'url' | 'text'
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', location: '',
    professional_summary: '', skills: [],
    work_experiences: [], education: [], languages: [],
    certifications: [], linkedin_url: '', portfolio_url: '',
  });
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);

  // ── CV Upload ──────────────────────────────────────────────
  const handleFileUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      addNotification('Please upload a PDF file', 'error');
      return;
    }
    setUploading(true);
    try {
      const { extracted_text } = await uploadCV(file);
      const { profile } = await extractCvProfile(extracted_text);
      setForm(prev => ({
        ...prev,
        ...profile,
        skills: profile.skills || [],
        work_experiences: profile.work_experiences || [],
        education: profile.education || [],
        languages: profile.languages || [],
        certifications: profile.certifications || [],
      }));
      setMode('review');
    } catch (err) {
      addNotification(err.message || t('common.error'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file) handleFileUpload(file);
  };

  // ── LinkedIn Import ────────────────────────────────────────
  const handleLinkedInImport = async () => {
    if (!linkedinInput.trim()) {
      addNotification('Please enter your LinkedIn URL or paste your profile text', 'error');
      return;
    }
    setUploading(true);
    try {
      const { profile } = await importLinkedIn(linkedinInput.trim());
      setForm(prev => ({
        ...prev,
        ...profile,
        skills: profile.skills || [],
        work_experiences: profile.work_experiences || [],
        education: profile.education || [],
        languages: profile.languages || [],
        certifications: profile.certifications || [],
      }));
      setMode('review');
      addNotification('LinkedIn profile imported successfully!', 'success');
    } catch (err) {
      addNotification(err.message || 'Failed to import LinkedIn profile', 'error');
    } finally {
      setUploading(false);
    }
  };

  // ── Save Profile ───────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const { profile } = await updateProfile(form);
      setProfile(profile);
      await completeOnboarding();
      setOnboardingCompleted(true);
      addNotification(t('common.success'), 'success');
      navigate('/');
    } catch (err) {
      addNotification(err.message || t('common.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await completeOnboarding();
      setOnboardingCompleted(true);
      navigate('/');
    } catch {
      navigate('/');
    } finally {
      setSaving(false);
    }
  };

  // ── Form helpers ───────────────────────────────────────────
  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) {
      setForm(p => ({ ...p, skills: [...p.skills, s] }));
    }
    setSkillInput('');
  };

  const removeSkill = (s) => setForm(p => ({ ...p, skills: p.skills.filter(x => x !== s) }));

  const addExperience = () => setForm(p => ({
    ...p,
    work_experiences: [...p.work_experiences, { title: '', company: '', start_date: '', end_date: '', description: '' }],
  }));
  const removeExperience = (i) => setForm(p => ({ ...p, work_experiences: p.work_experiences.filter((_, idx) => idx !== i) }));
  const updateExperience = (i, field, val) => setForm(p => ({
    ...p,
    work_experiences: p.work_experiences.map((e, idx) => idx === i ? { ...e, [field]: val } : e),
  }));

  const addEducation = () => setForm(p => ({
    ...p,
    education: [...p.education, { degree: '', institution: '', year: '' }],
  }));
  const removeEducation = (i) => setForm(p => ({ ...p, education: p.education.filter((_, idx) => idx !== i) }));
  const updateEducation = (i, field, val) => setForm(p => ({
    ...p,
    education: p.education.map((e, idx) => idx === i ? { ...e, [field]: val } : e),
  }));

  // ── RENDER: Choice screen ──────────────────────────────────
  if (!mode) {
    return (
      <div className="onboarding-page">
        <div className="onboarding-container">
          <div className="onboarding-header">
            <img src="/logo2.png" alt="FinixJob" style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 16 }} />
            <h1>{t('onboarding.title')}</h1>
            <p>{t('onboarding.subtitle')}</p>
          </div>

          <div className="onboarding-choices three-choices">
            {/* Option 1: Upload CV */}
            <div className="onboarding-choice" onClick={() => setMode('upload')}>
              <span className="choice-icon">📄</span>
              <h3>{t('onboarding.uploadCV')}</h3>
              <p>{t('onboarding.uploadCVDesc')}</p>
              <div className="choice-badge ai-badge">🤖 AI Auto-fill</div>
            </div>

            {/* Option 2: LinkedIn */}
            <div className="onboarding-choice linkedin-choice" onClick={() => setMode('linkedin')}>
              <span className="choice-icon">💼</span>
              <h3>LinkedIn Profile</h3>
              <p>Import your profile from LinkedIn URL or paste your profile text</p>
              <div className="choice-badge ai-badge">🤖 AI Auto-fill</div>
            </div>

            {/* Option 3: Manual */}
            <div className="onboarding-choice" onClick={() => setMode('manual')}>
              <span className="choice-icon">✏️</span>
              <h3>{t('onboarding.manual')}</h3>
              <p>{t('onboarding.manualDesc')}</p>
              <div className="choice-badge">Manual</div>
            </div>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={handleSkip} style={{ marginTop: 8 }}>
            {t('onboarding.skip')}
          </button>
        </div>
      </div>
    );
  }

  // ── RENDER: Upload CV ──────────────────────────────────────
  if (mode === 'upload') {
    return (
      <div className="onboarding-page">
        <div className="onboarding-container">
          <div className="onboarding-header">
            <h1>📄 {t('onboarding.uploadCV')}</h1>
            <p>Upload your CV and our AI will automatically fill in your profile</p>
          </div>

          <div className="upload-section">
            {uploading ? (
              <div className="upload-loading">
                <span className="spinner" style={{ width: 40, height: 40 }} />
                <p>🤖 AI is reading your CV...</p>
              </div>
            ) : (
              <div
                className="drop-zone"
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
              >
                <div className="drop-zone-content">
                  <span className="drop-icon">📁</span>
                  <p><strong>Drop your PDF here</strong> or click to browse</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>PDF files only · Max 16MB</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files[0] && handleFileUpload(e.target.files[0])}
                />
              </div>
            )}
          </div>

          <div className="onboarding-actions" style={{ marginTop: 24 }}>
            <button className="btn btn-ghost" onClick={() => setMode(null)}>{t('common.back')}</button>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: LinkedIn Import ────────────────────────────────
  if (mode === 'linkedin') {
    return (
      <div className="onboarding-page">
        <div className="onboarding-container" style={{ maxWidth: 560 }}>
          <div className="onboarding-header">
            <h1>💼 LinkedIn Profile Import</h1>
            <p>Let AI extract your professional profile from LinkedIn</p>
          </div>

          {/* Toggle: URL vs Paste text */}
          <div className="linkedin-mode-toggle">
            <button
              className={`linkedin-toggle-btn ${linkedinMode === 'url' ? 'active' : ''}`}
              onClick={() => setLinkedinMode('url')}
            >
              🔗 LinkedIn URL
            </button>
            <button
              className={`linkedin-toggle-btn ${linkedinMode === 'text' ? 'active' : ''}`}
              onClick={() => setLinkedinMode('text')}
            >
              📋 Paste Profile Text
            </button>
          </div>

          {linkedinMode === 'url' ? (
            <div className="linkedin-url-section">
              <div className="linkedin-info-box">
                <p>⚠️ <strong>Note:</strong> LinkedIn may block automated access. If the URL import fails, use the "Paste Profile Text" option instead.</p>
              </div>
              <div className="form-group">
                <label>Your LinkedIn Profile URL</label>
                <input
                  className="form-input"
                  type="url"
                  placeholder="https://www.linkedin.com/in/your-profile"
                  value={linkedinInput}
                  onChange={e => setLinkedinInput(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="linkedin-text-section">
              <div className="linkedin-info-box">
                <p>📋 <strong>How to copy your LinkedIn profile:</strong></p>
                <ol>
                  <li>Go to your LinkedIn profile page</li>
                  <li>Select all text on the page (Ctrl+A / Cmd+A)</li>
                  <li>Copy it (Ctrl+C / Cmd+C)</li>
                  <li>Paste it below</li>
                </ol>
              </div>
              <div className="form-group">
                <label>Paste your LinkedIn profile text</label>
                <textarea
                  className="form-input"
                  rows={10}
                  placeholder="Paste your LinkedIn profile content here..."
                  value={linkedinInput}
                  onChange={e => setLinkedinInput(e.target.value)}
                  style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
                />
              </div>
            </div>
          )}

          <div className="onboarding-actions" style={{ marginTop: 24 }}>
            <button className="btn btn-ghost" onClick={() => setMode(null)}>{t('common.back')}</button>
            <button
              className="btn btn-primary"
              onClick={handleLinkedInImport}
              disabled={uploading || !linkedinInput.trim()}
            >
              {uploading
                ? <><span className="spinner" /> Importing...</>
                : '🤖 Import with AI'
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: Review / Manual form ───────────────────────────
  return (
    <div className="onboarding-page">
      <div className="onboarding-container wide">
        <div className="onboarding-header" style={{ textAlign: 'left' }}>
          <h1>
            {mode === 'review' ? '✅ Review Your Profile' : `✏️ ${t('onboarding.manual')}`}
          </h1>
          <p>
            {mode === 'review'
              ? 'AI has filled in your profile. Review and edit as needed.'
              : 'Fill in your professional details manually.'}
          </p>
        </div>

        {mode === 'review' && (
          <div className="extracted-banner">
            ✅ Profile extracted successfully! Review and edit the fields below before saving.
          </div>
        )}

        <div className="onboarding-form">
          {/* Basic Info */}
          <div className="form-section">
            <h3>{t('profile.basicInfo')}</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>{t('profile.fullName')}</label>
                <input className="form-input" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>{t('profile.email')}</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>{t('profile.phone')}</label>
                <input className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>{t('profile.location')}</label>
                <input className="form-input" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>LinkedIn URL</label>
                <input className="form-input" value={form.linkedin_url} onChange={e => setForm(p => ({ ...p, linkedin_url: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>{t('profile.portfolioUrl')}</label>
                <input className="form-input" value={form.portfolio_url} onChange={e => setForm(p => ({ ...p, portfolio_url: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>{t('profile.professionalSummary')}</label>
              <textarea className="form-input" rows={3} value={form.professional_summary} onChange={e => setForm(p => ({ ...p, professional_summary: e.target.value }))} />
            </div>
          </div>

          {/* Skills */}
          <div className="form-section">
            <h3>{t('profile.skills')}</h3>
            <div className="extracted-skills">
              <div className="skill-tags">
                {form.skills.map((s, i) => (
                  <span key={i} className="skill-tag removable" onClick={() => removeSkill(s)}>
                    {s} ×
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  className="form-input"
                  placeholder={t('profile.addSkill')}
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-secondary" onClick={addSkill}>+</button>
              </div>
            </div>
          </div>

          {/* Work Experience */}
          <div className="form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{t('profile.workExperience')}</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addExperience}>
                + {t('profile.addExperience')}
              </button>
            </div>
            {form.work_experiences.map((exp, i) => (
              <div key={i} className="card" style={{ marginTop: 12, position: 'relative' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => removeExperience(i)}
                  style={{ position: 'absolute', top: 8, right: 8, color: 'var(--error)' }}>&times;</button>
                <div className="form-grid">
                  <div className="form-group">
                    <label>{t('profile.jobTitle')}</label>
                    <input className="form-input" value={exp.title} onChange={e => updateExperience(i, 'title', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>{t('profile.company')}</label>
                    <input className="form-input" value={exp.company} onChange={e => updateExperience(i, 'company', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>{t('profile.startDate')}</label>
                    <input className="form-input" value={exp.start_date} onChange={e => updateExperience(i, 'start_date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>{t('profile.endDate')}</label>
                    <input className="form-input" value={exp.end_date} onChange={e => updateExperience(i, 'end_date', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('profile.description')}</label>
                  <textarea className="form-input" rows={3} value={exp.description} onChange={e => updateExperience(i, 'description', e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          {/* Education */}
          <div className="form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{t('profile.education')}</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addEducation}>
                + {t('profile.addEducation')}
              </button>
            </div>
            {form.education.map((edu, i) => (
              <div key={i} className="card" style={{ marginTop: 12, position: 'relative' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => removeEducation(i)}
                  style={{ position: 'absolute', top: 8, right: 8, color: 'var(--error)' }}>&times;</button>
                <div className="form-grid">
                  <div className="form-group">
                    <label>{t('profile.degree')}</label>
                    <input className="form-input" value={edu.degree} onChange={e => updateEducation(i, 'degree', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>{t('profile.institution')}</label>
                    <input className="form-input" value={edu.institution} onChange={e => updateEducation(i, 'institution', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>{t('profile.year')}</label>
                    <input className="form-input" value={edu.year} onChange={e => updateEducation(i, 'year', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="onboarding-actions">
            <button className="btn btn-ghost" onClick={() => setMode(null)}>{t('common.back')}</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={handleSkip}>{t('onboarding.skip')}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" /> {t('common.saving')}</> : t('onboarding.completeSetup')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
