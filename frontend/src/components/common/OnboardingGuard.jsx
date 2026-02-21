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
        <img src="/logo2.png" alt="FinixJob" style={{
          width: 64, height: 64,
          animation: 'pulseGlow 2s ease infinite',
        }} />
        <span className="spinner" />
      </div>
    );
  }

  if (!onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
