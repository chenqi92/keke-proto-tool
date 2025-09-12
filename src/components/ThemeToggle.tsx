import React, { useState } from 'react';
import { cn } from '@/utils';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Palette,
  ChevronDown,
  Check
} from 'lucide-react';
import { useTheme, Theme, ColorTheme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

const themeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const themeLabels = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统',
};

const colorThemes: { value: ColorTheme; label: string; color: string }[] = [
  { value: 'default', label: '默认', color: 'hsl(221.2 83.2% 53.3%)' },
  { value: 'slate', label: '石板', color: 'hsl(215.4 16.3% 46.9%)' },
  { value: 'gray', label: '灰色', color: 'hsl(220 8.9% 46.1%)' },
  { value: 'zinc', label: '锌色', color: 'hsl(240 3.8% 46.1%)' },
  { value: 'neutral', label: '中性', color: 'hsl(0 0% 45.1%)' },
  { value: 'stone', label: '石色', color: 'hsl(25 5.3% 44.7%)' },
  { value: 'red', label: '红色', color: 'hsl(0 72.2% 50.6%)' },
  { value: 'orange', label: '橙色', color: 'hsl(24.6 95% 53.1%)' },
  { value: 'amber', label: '琥珀', color: 'hsl(45.4 93.4% 47.5%)' },
  { value: 'yellow', label: '黄色', color: 'hsl(54.5 91.7% 54.3%)' },
  { value: 'lime', label: '青柠', color: 'hsl(84.2 85.2% 60.2%)' },
  { value: 'green', label: '绿色', color: 'hsl(142.1 76.2% 36.3%)' },
  { value: 'emerald', label: '翡翠', color: 'hsl(160.1 84.1% 39.4%)' },
  { value: 'teal', label: '青色', color: 'hsl(173.4 80.4% 40%)' },
  { value: 'cyan', label: '青蓝', color: 'hsl(188.7 85% 53.3%)' },
  { value: 'sky', label: '天蓝', color: 'hsl(198.6 88.7% 48.4%)' },
  { value: 'blue', label: '蓝色', color: 'hsl(221.2 83.2% 53.3%)' },
  { value: 'indigo', label: '靛蓝', color: 'hsl(239.4 84.2% 67.1%)' },
  { value: 'violet', label: '紫罗兰', color: 'hsl(262.1 83.3% 57.8%)' },
  { value: 'purple', label: '紫色', color: 'hsl(270.7 91% 65.1%)' },
  { value: 'fuchsia', label: '紫红', color: 'hsl(292.2 84.1% 60.6%)' },
  { value: 'pink', label: '粉色', color: 'hsl(330.4 81.2% 60.4%)' },
  { value: 'rose', label: '玫瑰', color: 'hsl(346.8 77.2% 49.8%)' },
];

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, compact = false }) => {
  const { theme, colorTheme, setTheme, setColorTheme } = useTheme();
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);

  const ThemeIcon = themeIcons[theme];
  const currentColorTheme = colorThemes.find(ct => ct.value === colorTheme) || colorThemes[0];

  if (compact) {
    return (
      <div className={cn("flex items-center space-x-1", className)}>
        {/* Theme Toggle Button */}
        <div className="relative">
          <button
            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
            className="flex items-center justify-center p-2 rounded-md transition-colors hover:bg-accent text-muted-foreground hover:text-foreground"
            title={`当前主题: ${themeLabels[theme]}`}
          >
            <ThemeIcon className="w-4 h-4" />
          </button>
          
          {showThemeDropdown && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-popover border border-border rounded-md shadow-lg z-50">
              {Object.entries(themeLabels).map(([key, label]) => {
                const Icon = themeIcons[key as Theme];
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setTheme(key as Theme);
                      setShowThemeDropdown(false);
                    }}
                    className={cn(
                      "w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-accent transition-colors",
                      theme === key && "bg-accent"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                    {theme === key && <Check className="w-3 h-3 ml-auto" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Color Theme Toggle Button */}
        <div className="relative">
          <button
            onClick={() => setShowColorDropdown(!showColorDropdown)}
            className="flex items-center justify-center p-2 rounded-md transition-colors hover:bg-accent text-muted-foreground hover:text-foreground"
            title={`当前主题色: ${currentColorTheme.label}`}
          >
            <Palette className="w-4 h-4" />
          </button>
          
          {showColorDropdown && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
              {colorThemes.map((ct) => (
                <button
                  key={ct.value}
                  onClick={() => {
                    setColorTheme(ct.value);
                    setShowColorDropdown(false);
                  }}
                  className={cn(
                    "w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-accent transition-colors",
                    colorTheme === ct.value && "bg-accent"
                  )}
                >
                  <div 
                    className="w-3 h-3 rounded-full border border-border"
                    style={{ backgroundColor: ct.color }}
                  />
                  <span>{ct.label}</span>
                  {colorTheme === ct.value && <Check className="w-3 h-3 ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Theme Selector */}
      <div className="relative">
        <button
          onClick={() => setShowThemeDropdown(!showThemeDropdown)}
          className="flex items-center space-x-2 px-3 py-2 rounded-md transition-colors hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          <ThemeIcon className="w-4 h-4" />
          <span className="text-sm">{themeLabels[theme]}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        
        {showThemeDropdown && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-popover border border-border rounded-md shadow-lg z-50">
            {Object.entries(themeLabels).map(([key, label]) => {
              const Icon = themeIcons[key as Theme];
              return (
                <button
                  key={key}
                  onClick={() => {
                    setTheme(key as Theme);
                    setShowThemeDropdown(false);
                  }}
                  className={cn(
                    "w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-accent transition-colors",
                    theme === key && "bg-accent"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                  {theme === key && <Check className="w-3 h-3 ml-auto" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Color Theme Selector */}
      <div className="relative">
        <button
          onClick={() => setShowColorDropdown(!showColorDropdown)}
          className="flex items-center space-x-2 px-3 py-2 rounded-md transition-colors hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          <div 
            className="w-4 h-4 rounded-full border border-border"
            style={{ backgroundColor: currentColorTheme.color }}
          />
          <span className="text-sm">{currentColorTheme.label}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        
        {showColorDropdown && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
            {colorThemes.map((ct) => (
              <button
                key={ct.value}
                onClick={() => {
                  setColorTheme(ct.value);
                  setShowColorDropdown(false);
                }}
                className={cn(
                  "w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-accent transition-colors",
                  colorTheme === ct.value && "bg-accent"
                )}
              >
                <div 
                  className="w-3 h-3 rounded-full border border-border"
                  style={{ backgroundColor: ct.color }}
                />
                <span>{ct.label}</span>
                {colorTheme === ct.value && <Check className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


