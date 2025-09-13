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
      console.log('🎨 [Theme Init] Saved theme from localStorage:', savedTheme);
      console.log('🎨 [Theme Init] Will use theme:', savedTheme || 'system');
      return savedTheme || 'system';
    }
    return 'system';
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    if (typeof window !== 'undefined') {
      const savedColorTheme = localStorage.getItem(COLOR_THEME_STORAGE_KEY) as ColorTheme;
      console.log('Initializing color theme from localStorage:', savedColorTheme);
      return savedColorTheme || 'default';
    }
    return 'default';
  });

  const setTheme = (newTheme: Theme) => {
    console.log('🎨 [Theme Change] Setting theme to:', newTheme);
    console.log('🎨 [Theme Change] Previous theme was:', theme);
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
    console.log(`🎨 [Theme Effect] useEffect triggered - theme: ${theme}, colorTheme: ${colorTheme}`);
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
    console.log(`🎨 [Theme Apply] Starting theme application - theme: ${theme}, colorTheme: ${colorTheme}`);

    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const systemTheme = systemPrefersDark ? 'dark' : 'light';
      console.log(`🎨 [System Theme] prefers-color-scheme: dark = ${systemPrefersDark}, resolved to: ${systemTheme}`);
      root.classList.add(systemTheme);
      effectiveTheme = systemTheme;
    } else {
      console.log(`🎨 [Explicit Theme] Using explicit theme: ${theme}`);
      root.classList.add(theme);
    }

    console.log(`🎨 [Effective Theme] Final effective theme: ${effectiveTheme}`);
    console.log(`🎨 [Tauri Call] About to call set_window_theme with: ${effectiveTheme}`);

    // Apply color theme after dark/light theme
    if (colorTheme !== 'default') {
      root.classList.add(`theme-${colorTheme}`);
      console.log(`Applied color theme: theme-${colorTheme}`);
    } else {
      console.log('Using default color theme');
    }

    // Force style recalculation
    root.style.display = 'none';
    root.offsetHeight; // Trigger reflow
    root.style.display = '';

    // Additional force refresh for better compatibility
    setTimeout(() => {
      // Force all elements to recalculate styles
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.transform = 'translateZ(0)';
          el.offsetHeight; // Force reflow
          el.style.transform = '';
        }
      });
    }, 50);

    // Debug: Log current classes and computed styles
    console.log('=== Theme Debug Info ===');
    console.log('Current root classes:', Array.from(root.classList));
    console.log('Applied theme:', effectiveTheme, 'Color theme:', colorTheme);

    // Wait a bit for styles to apply, then log computed values
    setTimeout(() => {
      const computedStyle = getComputedStyle(root);
      console.log('Current --primary value:', computedStyle.getPropertyValue('--primary').trim());
      console.log('Current --background value:', computedStyle.getPropertyValue('--background').trim());
      console.log('Current --secondary value:', computedStyle.getPropertyValue('--secondary').trim());
      console.log('Current --accent value:', computedStyle.getPropertyValue('--accent').trim());
      console.log('Current --border value:', computedStyle.getPropertyValue('--border').trim());
      console.log('Current --muted value:', computedStyle.getPropertyValue('--muted').trim());
      console.log('========================');
    }, 100);

    // Update Tauri window theme for proper window chrome theming
    console.log(`🎨 [Tauri] Setting Tauri window theme to: ${effectiveTheme}`);
    console.log(`🎨 [Tauri] Calling invoke('set_window_theme', { theme: '${effectiveTheme}' })`);
    invoke('set_window_theme', { theme: effectiveTheme })
      .then(() => console.log(`🎨 [Tauri] ✅ Successfully set Tauri window theme to: ${effectiveTheme}`))
      .catch(err => console.error('🎨 [Tauri] ❌ Failed to set window theme:', err));
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
