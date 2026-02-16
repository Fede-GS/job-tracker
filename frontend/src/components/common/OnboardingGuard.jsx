import { Navigate } from 'react-router-dom';
import { useProfile } from '../../context/ProfileContext';

export default function OnboardingGuard({ children }) {
  const { onboardingCompleted, loading } = useProfile();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        gap: '16px',
      }}>
        <div className="logo-icon" style={{
          width: 48, height: 48, fontSize: 18,
          animation: 'pulseGlow 2s ease infinite',
        }}>JT</div>
        <span className="spinner" />
      </div>
    );
  }

  if (!onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
