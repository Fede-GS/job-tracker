import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getProfile, getOnboardingStatus } from '../api/profile';
import { useAuth } from './AuthContext';

const ProfileContext = createContext();

export function ProfileProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const { profile: p } = await getProfile();
      setProfile(p);
      return p;
    } catch {
      return null;
    }
  }, []);

  const checkOnboarding = useCallback(async () => {
    try {
      const { completed } = await getOnboardingStatus();
      setOnboardingCompleted(completed);
      return completed;
    } catch {
      setOnboardingCompleted(false);
      return false;
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setProfile(null);
      setOnboardingCompleted(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([fetchProfile(), checkOnboarding()]).finally(() => setLoading(false));
  }, [isAuthenticated, authLoading, fetchProfile, checkOnboarding]);

  return (
    <ProfileContext.Provider value={{
      profile,
      setProfile,
      onboardingCompleted,
      setOnboardingCompleted,
      loading: loading || authLoading,
      fetchProfile,
      checkOnboarding,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
