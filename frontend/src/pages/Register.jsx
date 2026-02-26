import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(form.email.trim().toLowerCase(), form.password);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo">
          <img src="/logo2.png" alt="FinixJob" />
          <h1>FinixJob</h1>
        </div>

        <div className="auth-card">
          <h2>Create your account</h2>
          <p className="auth-subtitle">Start tracking your job applications</p>

          <div className="auth-info-box">
            🎯 <strong>Free to join.</strong> Create your account and set up your profile to get started.
          </div>

          {error && (
            <div className="auth-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading}
            >
              {loading ? <><span className="spinner" /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
