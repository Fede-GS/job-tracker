import { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      authApi.getMe()
        .then((data) => {
          setUser(data.user);
          setOnboardingCompleted(data.onboarding_completed);
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    localStorage.setItem('auth_token', data.token);
    setUser(data.user);
    return data;
  };

  const register = async (email, password, fullName) => {
    const data = await authApi.register({ email, password, full_name: fullName });
    localStorage.setItem('auth_token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setOnboardingCompleted(false);
  };

  const refreshUser = async () => {
    try {
      const data = await authApi.getMe();
      setUser(data.user);
      setOnboardingCompleted(data.onboarding_completed);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      onboardingCompleted,
      setOnboardingCompleted,
      login,
      register,
      logout,
      refreshUser,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
