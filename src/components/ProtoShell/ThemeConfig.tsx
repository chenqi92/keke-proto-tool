// Theme Configuration for ProtoShell
// Supports multiple themes, monochrome mode, and custom color schemes

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ShellTheme = 'default' | 'monochrome' | 'solarized-dark' | 'solarized-light' | 'dracula' | 'nord';

export interface ShellThemeColors {
  // Syntax highlighting colors
  command: string;
  argument: string;
  string: string;
  operator: string;
  error: string;
  comment: string;
  
  // UI colors
  background: string;
  foreground: string;
  border: string;
  accent: string;
  success: string;
  warning: string;
  errorBg: string;
  
  // Status colors
  statusSuccess: string;
  statusError: string;
  statusInfo: string;
  statusWarning: string;
}

export interface ShellThemeConfig {
  theme: ShellTheme;
  colors: ShellThemeColors;
  disableColors: boolean;
  disableEmoji: boolean;
  monochromeMode: boolean;
}

// Theme presets
const THEME_PRESETS: Record<ShellTheme, ShellThemeColors> = {
  default: {
    command: '#3b82f6',      // blue-500
    argument: '#6b7280',     // gray-500
    string: '#10b981',       // green-500
    operator: '#f59e0b',     // amber-500
    error: '#ef4444',        // red-500
    comment: '#9ca3af',      // gray-400
    background: 'transparent',
    foreground: 'inherit',
    border: 'hsl(var(--border))',
    accent: 'hsl(var(--accent))',
    success: '#10b981',
    warning: '#f59e0b',
    errorBg: '#ef4444',
    statusSuccess: '#10b981',
    statusError: '#ef4444',
    statusInfo: '#3b82f6',
    statusWarning: '#f59e0b',
  },
  
  monochrome: {
    command: 'inherit',
    argument: 'inherit',
    string: 'inherit',
    operator: 'inherit',
    error: 'inherit',
    comment: 'inherit',
    background: 'transparent',
    foreground: 'inherit',
    border: 'currentColor',
    accent: 'currentColor',
    success: 'inherit',
    warning: 'inherit',
    errorBg: 'inherit',
    statusSuccess: 'inherit',
    statusError: 'inherit',
    statusInfo: 'inherit',
    statusWarning: 'inherit',
  },
  
  'solarized-dark': {
    command: '#268bd2',      // blue
    argument: '#93a1a1',     // base1
    string: '#2aa198',       // cyan
    operator: '#cb4b16',     // orange
    error: '#dc322f',        // red
    comment: '#586e75',      // base01
    background: '#002b36',   // base03
    foreground: '#839496',   // base0
    border: '#073642',       // base02
    accent: '#268bd2',       // blue
    success: '#859900',      // green
    warning: '#b58900',      // yellow
    errorBg: '#dc322f',      // red
    statusSuccess: '#859900',
    statusError: '#dc322f',
    statusInfo: '#268bd2',
    statusWarning: '#b58900',
  },
  
  'solarized-light': {
    command: '#268bd2',      // blue
    argument: '#586e75',     // base01
    string: '#2aa198',       // cyan
    operator: '#cb4b16',     // orange
    error: '#dc322f',        // red
    comment: '#93a1a1',      // base1
    background: '#fdf6e3',   // base3
    foreground: '#657b83',   // base00
    border: '#eee8d5',       // base2
    accent: '#268bd2',       // blue
    success: '#859900',      // green
    warning: '#b58900',      // yellow
    errorBg: '#dc322f',      // red
    statusSuccess: '#859900',
    statusError: '#dc322f',
    statusInfo: '#268bd2',
    statusWarning: '#b58900',
  },
  
  dracula: {
    command: '#8be9fd',      // cyan
    argument: '#f8f8f2',     // foreground
    string: '#50fa7b',       // green
    operator: '#ffb86c',     // orange
    error: '#ff5555',        // red
    comment: '#6272a4',      // comment
    background: '#282a36',   // background
    foreground: '#f8f8f2',   // foreground
    border: '#44475a',       // current line
    accent: '#bd93f9',       // purple
    success: '#50fa7b',      // green
    warning: '#f1fa8c',      // yellow
    errorBg: '#ff5555',      // red
    statusSuccess: '#50fa7b',
    statusError: '#ff5555',
    statusInfo: '#8be9fd',
    statusWarning: '#f1fa8c',
  },
  
  nord: {
    command: '#88c0d0',      // nord8 (cyan)
    argument: '#d8dee9',     // nord4
    string: '#a3be8c',       // nord14 (green)
    operator: '#d08770',     // nord12 (orange)
    error: '#bf616a',        // nord11 (red)
    comment: '#616e88',      // nord3
    background: '#2e3440',   // nord0
    foreground: '#eceff4',   // nord6
    border: '#3b4252',       // nord1
    accent: '#5e81ac',       // nord10 (blue)
    success: '#a3be8c',      // nord14
    warning: '#ebcb8b',      // nord13 (yellow)
    errorBg: '#bf616a',      // nord11
    statusSuccess: '#a3be8c',
    statusError: '#bf616a',
    statusInfo: '#88c0d0',
    statusWarning: '#ebcb8b',
  },
};

// Theme Context
interface ThemeContextType {
  config: ShellThemeConfig;
  setTheme: (theme: ShellTheme) => void;
  setDisableColors: (disable: boolean) => void;
  setDisableEmoji: (disable: boolean) => void;
  setMonochromeMode: (enable: boolean) => void;
  getColor: (colorKey: keyof ShellThemeColors) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme Provider
export const ShellThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<ShellThemeConfig>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('prototool-shell-theme');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          colors: THEME_PRESETS[parsed.theme as ShellTheme] || THEME_PRESETS.default,
        };
      } catch {
        // Fallback to default
      }
    }
    
    return {
      theme: 'default',
      colors: THEME_PRESETS.default,
      disableColors: false,
      disableEmoji: false,
      monochromeMode: false,
    };
  });

  // Save to localStorage when config changes
  useEffect(() => {
    localStorage.setItem('prototool-shell-theme', JSON.stringify({
      theme: config.theme,
      disableColors: config.disableColors,
      disableEmoji: config.disableEmoji,
      monochromeMode: config.monochromeMode,
    }));
  }, [config]);

  const setTheme = (theme: ShellTheme) => {
    console.log('[ShellTheme] Changing theme to:', theme);
    const newColors = THEME_PRESETS[theme];
    console.log('[ShellTheme] New colors:', newColors);
    setConfig(prev => {
      const newConfig = {
        ...prev,
        theme,
        colors: newColors,
        monochromeMode: theme === 'monochrome',
      };
      console.log('[ShellTheme] New config:', newConfig);
      return newConfig;
    });
  };

  const setDisableColors = (disable: boolean) => {
    setConfig(prev => ({ ...prev, disableColors: disable }));
  };

  const setDisableEmoji = (disable: boolean) => {
    setConfig(prev => ({ ...prev, disableEmoji: disable }));
  };

  const setMonochromeMode = (enable: boolean) => {
    setConfig(prev => ({
      ...prev,
      monochromeMode: enable,
      theme: enable ? 'monochrome' : 'default',
      colors: enable ? THEME_PRESETS.monochrome : THEME_PRESETS[prev.theme === 'monochrome' ? 'default' : prev.theme],
    }));
  };

  const getColor = React.useCallback((colorKey: keyof ShellThemeColors): string => {
    if (config.disableColors || config.monochromeMode) {
      return 'inherit';
    }
    const color = config.colors[colorKey];
    console.log(`[ShellTheme] getColor(${colorKey}) = ${color}, theme: ${config.theme}`);
    return color;
  }, [config.disableColors, config.monochromeMode, config.colors, config.theme]);

  return (
    <ThemeContext.Provider value={{
      config,
      setTheme,
      setDisableColors,
      setDisableEmoji,
      setMonochromeMode,
      getColor,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use theme
export const useShellTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    console.error('[ShellTheme] useShellTheme called outside of ShellThemeProvider!');
    throw new Error('useShellTheme must be used within ShellThemeProvider');
  }
  console.log('[ShellTheme] useShellTheme called, current theme:', context.config.theme);
  return context;
};

// Helper to get emoji or fallback
export const getEmoji = (emoji: string, fallback: string, disableEmoji: boolean): string => {
  return disableEmoji ? fallback : emoji;
};

