import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export type Theme = 'light' | 'dark' | 'system';

export type ColorTheme = 
  | 'default'
  | 'slate' 
  | 'gray'
  | 'zinc'
  | 'neutral'
  | 'stone'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose';

const THEME_STORAGE_KEY = 'keke-proto-tool-theme';
const COLOR_THEME_STORAGE_KEY = 'keke-proto-tool-color-theme';

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      return savedTheme || 'system';
    }
    return 'system';
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    if (typeof window !== 'undefined') {
      const savedColorTheme = localStorage.getItem(COLOR_THEME_STORAGE_KEY) as ColorTheme;
      return savedColorTheme || 'default';
    }
    return 'default';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  const setColorTheme = (newColorTheme: ColorTheme) => {
    setColorThemeState(newColorTheme);
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, newColorTheme);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(nextTheme);
  };

  // Note: Removed duplicate initial theme application - now handled by main useEffect below

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove all existing theme classes
    root.classList.remove('light', 'dark');

    // Remove all existing color theme classes (excluding 'default' since it's not a CSS class)
    const colorThemes: ColorTheme[] = [
      'slate', 'gray', 'zinc', 'neutral', 'stone',
      'red', 'orange', 'amber', 'yellow', 'lime', 'green',
      'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo',
      'violet', 'purple', 'fuchsia', 'pink', 'rose'
    ];
    colorThemes.forEach(ct => root.classList.remove(`theme-${ct}`));

    // Apply dark/light theme first
    let effectiveTheme = theme;

    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const systemTheme = systemPrefersDark ? 'dark' : 'light';
      root.classList.add(systemTheme);
      effectiveTheme = systemTheme;
    } else {
      root.classList.add(theme);
    }

    // Apply color theme after dark/light theme
    if (colorTheme !== 'default') {
      root.classList.add(`theme-${colorTheme}`);
    }

    // Update Tauri window theme for proper window chrome theming
    invoke('set_window_theme', { theme: effectiveTheme })
      .catch(err => console.error('Failed to set window theme:', err));
  }, [theme, colorTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return {
    theme,
    colorTheme,
    setTheme,
    setColorTheme,
    toggleTheme,
  };
};
