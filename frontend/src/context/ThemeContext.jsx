import { createContext, useContext, useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../api/settings';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Only fetch server settings if the user is logged in
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    getSettings()
      .then(({ settings }) => {
        if (settings.theme) {
          setTheme(settings.theme);
        }
      })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    updateSettings({ theme: newTheme }).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
