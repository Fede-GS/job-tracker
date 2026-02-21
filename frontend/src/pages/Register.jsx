import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      await register(form.email, form.password, form.fullName);
      navigate('/onboarding');
    } catch (err) {
      setError(err.message || t('auth.registerError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="auth-logo-icon">&#128188;</span>
            <h1>Job Tracker</h1>
          </div>
          <p className="auth-subtitle">{t('auth.registerSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <label htmlFor="fullName">{t('auth.fullName')}</label>
            <input
              id="fullName"
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder={t('auth.fullNamePlaceholder')}
              required
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={t('auth.emailPlaceholder')}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={t('auth.passwordPlaceholder')}
              required
              minLength={6}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? t('auth.registering') : t('auth.register')}
          </button>
        </form>

        <div className="auth-footer">
          <span>{t('auth.hasAccount')}</span>
          <Link to="/login">{t('auth.loginLink')}</Link>
        </div>
      </div>
    </div>
  );
}
