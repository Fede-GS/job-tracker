import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../context/ProfileContext';
import { useNotification } from '../context/NotificationContext';
import { uploadCV, extractCvProfile, updateProfile, completeOnboarding } from '../api/profile';
import './Onboarding.css';

export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setProfile, setOnboardingCompleted } = useProfile();
  const { addNotification } = useNotification();
  const fileRef = useRef();

  const [mode, setMode] = useState(null); // null | 'upload' | 'manual' | 'review'
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', location: '',
    professional_summary: '', skills: [],
    work_experiences: [], education: [], languages: [],
    certifications: [], linkedin_url: '', portfolio_url: '',
  });
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFileUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      addNotification('PDF only', 'error');
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
    try {
      await completeOnboarding();
      setOnboardingCompleted(true);
      navigate('/');
    } catch { /* ignore */ }
  };

  const updateField = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const addSkill = () => {
    if (skillInput.trim() && !form.skills.includes(skillInput.trim())) {
      setForm(p => ({ ...p, skills: [...p.skills, skillInput.trim()] }));
      setSkillInput('');
    }
  };

  const removeSkill = (s) => setForm(p => ({ ...p, skills: p.skills.filter(x => x !== s) }));

  const addExperience = () => setForm(p => ({
    ...p, work_experiences: [...p.work_experiences, { job_title: '', company: '', start_date: '', end_date: '', description: '' }]
  }));

  const updateExperience = (i, field, value) => setForm(p => {
    const exps = [...p.work_experiences];
    exps[i] = { ...exps[i], [field]: value };
    return { ...p, work_experiences: exps };
  });

  const removeExperience = (i) => setForm(p => ({
    ...p, work_experiences: p.work_experiences.filter((_, j) => j !== i)
  }));

  const addEducation = () => setForm(p => ({
    ...p, education: [...p.education, { degree: '', institution: '', year: '' }]
  }));

  const updateEducation = (i, field, value) => setForm(p => {
    const edu = [...p.education];
    edu[i] = { ...edu[i], [field]: value };
    return { ...p, education: edu };
  });

  const removeEducation = (i) => setForm(p => ({
    ...p, education: p.education.filter((_, j) => j !== i)
  }));

  // Mode selection screen
  if (!mode) {
    return (
      <div className="onboarding-page">
        <div className="onboarding-container">
          <h1>{t('onboarding.welcome')}</h1>
          <p className="onboarding-subtitle">{t('onboarding.subtitle')}</p>

          <div className="onboarding-choices">
            <div className="onboarding-choice" onClick={() => setMode('upload')}>
              <span className="choice-icon">📄</span>
              <h3>{t('onboarding.uploadCV')}</h3>
              <p>{t('onboarding.uploadDesc')}</p>
            </div>

            <span className="choice-divider">{t('common.or')}</span>

            <div className="onboarding-choice" onClick={() => setMode('manual')}>
              <span className="choice-icon">✏️</span>
              <h3>{t('onboarding.manualEntry')}</h3>
              <p>{t('onboarding.manualDesc')}</p>
            </div>
          </div>

          <button className="btn btn-ghost" onClick={handleSkip} style={{ marginTop: 24 }}>
            {t('onboarding.skip')}
          </button>
        </div>
      </div>
    );
  }

  // Upload mode
  if (mode === 'upload') {
    return (
      <div className="onboarding-page">
        <div className="onboarding-container">
          <h1>{t('onboarding.uploadCV')}</h1>

          <div
            className="drop-zone"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <div className="drop-zone-content">
                <span className="spinner" />
                <p>{t('onboarding.extracting')}</p>
              </div>
            ) : (
              <div className="drop-zone-content">
                <span className="drop-icon">📁</span>
                <p>{t('onboarding.dragDrop')}</p>
                <button className="btn btn-secondary btn-sm">{t('onboarding.browseFiles')}</button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              hidden
              onChange={e => e.target.files[0] && handleFileUpload(e.target.files[0])}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button className="btn btn-ghost" onClick={() => setMode(null)}>{t('common.back')}</button>
            <button className="btn btn-ghost" onClick={() => setMode('manual')}>{t('onboarding.manualEntry')}</button>
          </div>
        </div>
      </div>
    );
  }

  // Review / Manual mode (same form)
  return (
    <div className="onboarding-page">
      <div className="onboarding-container wide">
        <h1>{mode === 'review' ? t('onboarding.reviewData') : t('onboarding.manualEntry')}</h1>
        {mode === 'review' && <p className="onboarding-subtitle">{t('onboarding.extracted')}</p>}

        <div className="onboarding-form">
          {/* Personal Info */}
          <div className="form-section">
            <h3>{t('profile.personalInfo')}</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>{t('profile.fullName')}</label>
                <input className="form-input" value={form.full_name} onChange={e => updateField('full_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('profile.email')}</label>
                <input className="form-input" type="email" value={form.email} onChange={e => updateField('email', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('profile.phone')}</label>
                <input className="form-input" value={form.phone} onChange={e => updateField('phone', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('profile.location')}</label>
                <input className="form-input" value={form.location} onChange={e => updateField('location', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('profile.linkedin')}</label>
                <input className="form-input" value={form.linkedin_url} onChange={e => updateField('linkedin_url', e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('profile.portfolio')}</label>
                <input className="form-input" value={form.portfolio_url} onChange={e => updateField('portfolio_url', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>{t('profile.professionalSummary')}</label>
              <textarea className="form-input" rows={4} value={form.professional_summary} onChange={e => updateField('professional_summary', e.target.value)} />
            </div>
          </div>

          {/* Skills */}
          <div className="form-section">
            <h3>{t('profile.skills')}</h3>
            <div className="skill-tags" style={{ marginBottom: 12 }}>
              {form.skills.map(s => (
                <span key={s} className="skill-tag removable" onClick={() => removeSkill(s)}>
                  {s} &times;
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder={t('profile.addSkill')}
                style={{ maxWidth: 250 }}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={addSkill}>+</button>
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
                    <input className="form-input" value={exp.job_title} onChange={e => updateExperience(i, 'job_title', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>{t('profile.company')}</label>
                    <input className="form-input" value={exp.company} onChange={e => updateExperience(i, 'company', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>{t('profile.startDate')}</label>
                    <input className="form-input" value={exp.start_date} onChange={e => updateExperience(i, 'start_date', e.target.value)} placeholder="YYYY-MM" />
                  </div>
                  <div className="form-group">
                    <label>{t('profile.endDate')}</label>
                    <input className="form-input" value={exp.end_date} onChange={e => updateExperience(i, 'end_date', e.target.value)} placeholder={t('profile.present')} />
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
