import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme() {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return getSystemTheme();
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);
  const [systemDark, setSystemDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  // Listen for OS theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Re-derive theme when system preference changes (only if user hasn't set an explicit preference)
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (!(stored === 'dark' || stored === 'light')) {
      setTheme(systemDark ? 'dark' : 'light');
    }
  }, [systemDark]);

  // Apply theme and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  const setThemeExplicit = useCallback((t) => {
    localStorage.setItem('theme', t);
    setTheme(t);
  }, []);

  const resetToSystem = useCallback(() => {
    localStorage.removeItem('theme');
    setTheme(getSystemTheme());
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme: setThemeExplicit,
        resetToSystem,
        isDefault: !localStorage.getItem('theme'),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
