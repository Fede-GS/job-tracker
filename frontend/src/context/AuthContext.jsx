import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getMe } from '../api/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then(({ user: u }) => {
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
      })
      .catch(() => {
        // Token invalid/expired
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { user: u, access_token } = await apiLogin(email, password);
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (email, password) => {
    const { user: u, access_token } = await apiRegister(email, password);
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch { /* ignore */ }
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
