import { useCallback, useEffect, useRef, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'mcl-theme';

function getInitialTheme(): ThemeMode {
  if (typeof document !== 'undefined') {
    if (document.documentElement.classList.contains('dark')) {
      return 'dark';
    }
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch {
    // Ignore storage access errors in restricted frames
  }
  if (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
}

function persistTheme(next: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Ignore storage access errors
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);
  const shouldPersistRef = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    if (shouldPersistRef.current) {
      shouldPersistRef.current = false;
      persistTheme(theme);
    }
  }, [theme]);

  const setTheme = useCallback((next: ThemeMode) => {
    shouldPersistRef.current = false;
    persistTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    shouldPersistRef.current = true;
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme };
}
