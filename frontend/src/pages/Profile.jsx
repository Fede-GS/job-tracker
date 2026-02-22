import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../context/ProfileContext';
import { useNotification } from '../context/NotificationContext';
import { updateProfile, uploadCV, extractCvProfile } from '../api/profile';
import PageTutorial from '../components/common/PageTutorial';
import './Profile.css';

export default function Profile() {
  const { t } = useTranslation();
  const { profile, setProfile } = useProfile();
  const { addNotification } = useNotification();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (profile) setForm({ ...profile });
  }, [profile]);

  if (!form) return null;

  const updateField = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { profile: p } = await updateProfile(form);
      setProfile(p);
      addNotification(t('profile.savedSuccess'), 'success');
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadCV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { extracted_text } = await uploadCV(file);
      const { profile: data } = await extractCvProfile(extracted_text);
      setForm(prev => ({ ...prev, ...data }));
      addNotification(t('onboarding.extracted'), 'success');
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      updateField('skills', [...(form.skills || []), newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (idx) => {
    updateField('skills', form.skills.filter((_, i) => i !== idx));
  };

  const addExperience = () => {
    updateField('work_experiences', [...(form.work_experiences || []), { title: '', company: '', location: '', start_date: '', end_date: '', description: '' }]);
  };

  const updateExperience = (idx, field, value) => {
    const exps = [...(form.work_experiences || [])];
    exps[idx] = { ...exps[idx], [field]: value };
    updateField('work_experiences', exps);
  };

  const removeExperience = (idx) => {
    updateField('work_experiences', form.work_experiences.filter((_, i) => i !== idx));
  };

  const addEducation = () => {
    updateField('education', [...(form.education || []), { degree: '', institution: '', year: '', description: '' }]);
  };

  const updateEducation = (idx, field, value) => {
    const eds = [...(form.education || [])];
    eds[idx] = { ...eds[idx], [field]: value };
    updateField('education', eds);
  };

  const removeEducation = (idx) => {
    updateField('education', form.education.filter((_, i) => i !== idx));
  };
  return (
    <div className="profile-page">
      <PageTutorial pageKey="profile" icon="person" />
      <div className="page-header">
        <div>
          <h1>{t('profile.title')}</h1>
          <p>{t('profile.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            {uploading ? <><span className="spinner" /> Uploading...</> : 'Re-upload CV'}
            <input type="file" accept=".pdf" hidden onChange={handleUploadCV} />
          </label>
        </div>
      </div>

      <div className="card settings-section">
        <h3>{t('profile.personalInfo')}</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>{t('profile.fullName')}</label>
            <input className="form-input" value={form.full_name || ''} onChange={e => updateField('full_name', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('profile.email')}</label>
            <input className="form-input" type="email" value={form.email || ''} onChange={e => updateField('email', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('profile.phone')}</label>
            <input className="form-input" value={form.phone || ''} onChange={e => updateField('phone', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('profile.location')}</label>
            <input className="form-input" value={form.location || ''} onChange={e => updateField('location', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('profile.linkedin')}</label>
            <input className="form-input" value={form.linkedin_url || ''} onChange={e => updateField('linkedin_url', e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('profile.portfolio')}</label>
            <input className="form-input" value={form.portfolio_url || ''} onChange={e => updateField('portfolio_url', e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>{t('profile.professionalSummary')}</label>
          <textarea className="form-input" rows={4} value={form.professional_summary || ''} onChange={e => updateField('professional_summary', e.target.value)} />
        </div>
      </div>

      <div className="card settings-section">
        <div className="section-header">
          <h3>{t('profile.skills')}</h3>
        </div>
        <div className="skill-tags" style={{ marginBottom: 12 }}>
          {(form.skills || []).map((s, i) => (
            <span key={i} className="skill-tag">
              {typeof s === 'string' ? s : s.name || ''}
              <button className="skill-remove" onClick={() => removeSkill(i)}>&times;</button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder={t('profile.addSkill')} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
          <button className="btn btn-secondary btn-sm" onClick={addSkill}>+</button>
        </div>
      </div>

      <div className="card settings-section">
        <div className="section-header">
          <h3>{t('profile.workExperience')}</h3>
          <button className="btn btn-secondary btn-sm" onClick={addExperience}>+ {t('profile.addExperience')}</button>
        </div>
        {(form.work_experiences || []).map((exp, i) => (
          <div key={i} className="experience-card">
            <button className="remove-btn" onClick={() => removeExperience(i)}>&times;</button>
            <div className="form-grid">
              <div className="form-group"><label>{t('profile.jobTitle')}</label><input className="form-input" value={exp.title || ''} onChange={e => updateExperience(i, 'title', e.target.value)} /></div>
              <div className="form-group"><label>{t('profile.company')}</label><input className="form-input" value={exp.company || ''} onChange={e => updateExperience(i, 'company', e.target.value)} /></div>
              <div className="form-group"><label>{t('profile.startDate')}</label><input className="form-input" value={exp.start_date || ''} onChange={e => updateExperience(i, 'start_date', e.target.value)} /></div>
              <div className="form-group"><label>{t('profile.endDate')}</label><input className="form-input" value={exp.end_date || ''} onChange={e => updateExperience(i, 'end_date', e.target.value)} placeholder={t('profile.present')} /></div>
            </div>
            <div className="form-group"><label>{t('profile.description')}</label><textarea className="form-input" rows={2} value={exp.description || ''} onChange={e => updateExperience(i, 'description', e.target.value)} /></div>
          </div>
        ))}
      </div>

      <div className="card settings-section">
        <div className="section-header">
          <h3>{t('profile.education')}</h3>
          <button className="btn btn-secondary btn-sm" onClick={addEducation}>+ {t('profile.addEducation')}</button>
        </div>
        {(form.education || []).map((edu, i) => (
          <div key={i} className="experience-card">
            <button className="remove-btn" onClick={() => removeEducation(i)}>&times;</button>
            <div className="form-grid">
              <div className="form-group"><label>{t('profile.degree')}</label><input className="form-input" value={edu.degree || ''} onChange={e => updateEducation(i, 'degree', e.target.value)} /></div>
              <div className="form-group"><label>{t('profile.institution')}</label><input className="form-input" value={edu.institution || ''} onChange={e => updateEducation(i, 'institution', e.target.value)} /></div>
              <div className="form-group"><label>{t('profile.year')}</label><input className="form-input" value={edu.year || ''} onChange={e => updateEducation(i, 'year', e.target.value)} /></div>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? <><span className="spinner" /> {t('common.saving')}</> : t('common.save')}
      </button>
    </div>
  );
}
