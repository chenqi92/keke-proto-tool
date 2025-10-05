import { useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

// 使用 Zustand 创建全局主题状态
interface ThemeStore {
  theme: Theme;
  colorTheme: ColorTheme;
  setThemeState: (theme: Theme) => void;
  setColorThemeState: (colorTheme: ColorTheme) => void;
}

const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      colorTheme: 'default',
      setThemeState: (theme) => {
        console.log('[useThemeStore] setThemeState called with:', theme);
        set({ theme });
      },
      setColorThemeState: (colorTheme) => {
        console.log('[useThemeStore] setColorThemeState called with:', colorTheme);
        set({ colorTheme });
      },
    }),
    {
      name: 'keke-proto-tool-theme-storage',
    }
  )
);

export const useTheme = () => {
  const theme = useThemeStore((state) => state.theme);
  const colorTheme = useThemeStore((state) => state.colorTheme);
  const setThemeState = useThemeStore((state) => state.setThemeState);
  const setColorThemeState = useThemeStore((state) => state.setColorThemeState);

  const setTheme = useCallback((newTheme: Theme) => {
    console.log('[useTheme] setTheme called with:', newTheme, 'current theme:', theme);
    setThemeState(newTheme);
    console.log('[useTheme] Theme state updated');
    // 更新菜单状态
    invoke('update_theme_menu_state', { theme: newTheme }).catch(console.error);
  }, [theme, setThemeState]);

  const setColorTheme = useCallback((newColorTheme: ColorTheme) => {
    console.log('[useTheme] setColorTheme called with:', newColorTheme, 'current colorTheme:', colorTheme);
    setColorThemeState(newColorTheme);
    console.log('[useTheme] Color theme state updated');
    // 更新菜单状态
    invoke('update_color_theme_menu_state', { color: newColorTheme }).catch(console.error);
  }, [colorTheme, setColorThemeState]);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(nextTheme);
  }, [theme, setTheme]);

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
