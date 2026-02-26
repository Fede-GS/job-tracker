import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AuthGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        gap: '16px',
        background: 'var(--bg-primary)',
      }}>
        <img
          src="/logo2.png"
          alt="FinixJob"
          style={{ width: 64, height: 64, borderRadius: 16, animation: 'pulseGlow 2s ease infinite' }}
        />
        <span className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
