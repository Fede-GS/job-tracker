import { useState, useEffect } from 'react';
import './ApplicationForm.css';

const defaultData = {
  company: '',
  role: '',
  location: '',
  status: 'sent',
  salary_min: '',
  salary_max: '',
  salary_currency: 'EUR',
  url: '',
  job_description: '',
  requirements: '',
  notes: '',
  applied_date: new Date().toISOString().split('T')[0],
};

export default function ApplicationForm({ initialData, onSubmit, loading }) {
  const [form, setForm] = useState(defaultData);

  useEffect(() => {
    if (initialData) {
      setForm({
        ...defaultData,
        ...initialData,
        salary_min: initialData.salary_min || '',
        salary_max: initialData.salary_max || '',
        applied_date: initialData.applied_date || new Date().toISOString().split('T')[0],
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (data.salary_min) data.salary_min = parseInt(data.salary_min);
    else data.salary_min = null;
    if (data.salary_max) data.salary_max = parseInt(data.salary_max);
    else data.salary_max = null;
    onSubmit(data);
  };

  return (
    <form className="app-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>Azienda *</label>
          <input className="form-input" name="company" value={form.company} onChange={handleChange} required placeholder="Es. Google" />
        </div>
        <div className="form-group">
          <label>Ruolo *</label>
          <input className="form-input" name="role" value={form.role} onChange={handleChange} required placeholder="Es. Frontend Developer" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Luogo</label>
          <input className="form-input" name="location" value={form.location} onChange={handleChange} placeholder="Es. Milano, Remote" />
        </div>
        <div className="form-group">
          <label>Data invio</label>
          <input className="form-input" type="date" name="applied_date" value={form.applied_date} onChange={handleChange} />
        </div>
      </div>

      <div className="form-row form-row-3">
        <div className="form-group">
          <label>Salario min</label>
          <input className="form-input" type="number" name="salary_min" value={form.salary_min} onChange={handleChange} placeholder="30000" />
        </div>
        <div className="form-group">
          <label>Salario max</label>
          <input className="form-input" type="number" name="salary_max" value={form.salary_max} onChange={handleChange} placeholder="50000" />
        </div>
        <div className="form-group">
          <label>Valuta</label>
          <select className="form-select" name="salary_currency" value={form.salary_currency} onChange={handleChange}>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="CHF">CHF</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>URL annuncio</label>
        <input className="form-input" name="url" value={form.url} onChange={handleChange} placeholder="https://..." />
      </div>

      <div className="form-group">
        <label>Descrizione lavoro</label>
        <textarea className="form-textarea" name="job_description" value={form.job_description} onChange={handleChange} rows={5} placeholder="Incolla qui la descrizione del lavoro..." />
      </div>

      <div className="form-group">
        <label>Requisiti</label>
        <textarea className="form-textarea" name="requirements" value={form.requirements} onChange={handleChange} rows={3} placeholder="Requisiti principali..." />
      </div>

      <div className="form-group">
        <label>Note personali</label>
        <textarea className="form-textarea" name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Le tue note..." />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading && <span className="spinner" />}
          {initialData?.id ? 'Salva modifiche' : 'Crea candidatura'}
        </button>
      </div>
    </form>
  );
}
