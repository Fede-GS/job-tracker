import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import './InterviewForm.css';

const INTERVIEW_TYPES = ['phone_screen', 'technical', 'behavioral', 'final', 'other'];
const OUTCOMES = ['pending', 'passed', 'failed', 'offer'];

export default function InterviewForm({ isOpen, onClose, onSave, interview, applicationId }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    interview_date: '',
    interview_type: 'phone_screen',
    phase_number: 1,
    location: '',
    notes: '',
    outcome: 'pending',
    salary_offered: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (interview) {
      setForm({
        interview_date: interview.interview_date ? interview.interview_date.slice(0, 16) : '',
        interview_type: interview.interview_type || 'phone_screen',
        phase_number: interview.phase_number || 1,
        location: interview.location || '',
        notes: interview.notes || '',
        outcome: interview.outcome || 'pending',
        salary_offered: interview.salary_offered || '',
      });
    } else {
      setForm({
        interview_date: '',
        interview_type: 'phone_screen',
        phase_number: 1,
        location: '',
        notes: '',
        outcome: 'pending',
        salary_offered: '',
      });
    }
  }, [interview, isOpen]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.interview_date) return;

    setSaving(true);
    try {
      await onSave({
        ...form,
        interview_date: new Date(form.interview_date).toISOString(),
        phase_number: parseInt(form.phase_number) || 1,
      });
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={interview ? t('interviews.editInterview') : t('interviews.addInterview')}
    >
      <form className="interview-form" onSubmit={handleSubmit}>
        <div className="interview-form-row">
          <div className="interview-form-field">
            <label>{t('interviews.date')} *</label>
            <input
              type="datetime-local"
              className="form-input"
              value={form.interview_date}
              onChange={(e) => handleChange('interview_date', e.target.value)}
              required
            />
          </div>
          <div className="interview-form-field">
            <label>{t('interviews.phase')}</label>
            <input
              type="number"
              className="form-input"
              min="1"
              max="10"
              value={form.phase_number}
              onChange={(e) => handleChange('phase_number', e.target.value)}
            />
          </div>
        </div>

        <div className="interview-form-row">
          <div className="interview-form-field">
            <label>{t('interviews.type')}</label>
            <select
              className="form-select"
              value={form.interview_type}
              onChange={(e) => handleChange('interview_type', e.target.value)}
            >
              {INTERVIEW_TYPES.map((type) => (
                <option key={type} value={type}>{t(`interviews.types.${type}`)}</option>
              ))}
            </select>
          </div>
          <div className="interview-form-field">
            <label>{t('interviews.outcome')}</label>
            <select
              className="form-select"
              value={form.outcome}
              onChange={(e) => handleChange('outcome', e.target.value)}
            >
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>{t(`interviews.outcomes.${o}`)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="interview-form-field">
          <label>{t('interviews.location')}</label>
          <input
            type="text"
            className="form-input"
            placeholder={t('interviews.locationPlaceholder')}
            value={form.location}
            onChange={(e) => handleChange('location', e.target.value)}
          />
        </div>

        <div className="interview-form-field">
          <label>{t('interviews.salaryOffered')}</label>
          <input
            type="text"
            className="form-input"
            placeholder={t('interviews.salaryPlaceholder')}
            value={form.salary_offered}
            onChange={(e) => handleChange('salary_offered', e.target.value)}
          />
        </div>

        <div className="interview-form-field">
          <label>{t('interviews.notes')}</label>
          <textarea
            className="form-input"
            rows={4}
            placeholder={t('interviews.notesPlaceholder')}
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
          />
        </div>

        <div className="interview-form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !form.interview_date}>
            {saving ? <span className="spinner" /> : (interview ? t('common.save') : t('interviews.addInterview'))}
          </button>
        </div>
      </form>
    </Modal>
  );
}
