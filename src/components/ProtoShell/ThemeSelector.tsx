// Theme Selector Component for ProtoShell
// Allows users to switch themes and configure display options

import React, { useState } from 'react';
import { X, Palette, Check } from 'lucide-react';
import { useShellTheme, ShellTheme } from './ThemeConfig';
import { cn } from '@/utils';

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEME_OPTIONS: Array<{ value: ShellTheme; label: string; description: string }> = [
  { value: 'default', label: 'Default', description: 'Modern colorful theme' },
  { value: 'monochrome', label: 'Monochrome', description: 'Black and white only' },
  { value: 'solarized-dark', label: 'Solarized Dark', description: 'Popular dark theme' },
  { value: 'solarized-light', label: 'Solarized Light', description: 'Popular light theme' },
  { value: 'dracula', label: 'Dracula', description: 'Dark theme with vibrant colors' },
  { value: 'nord', label: 'Nord', description: 'Arctic-inspired color palette' },
];

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ isOpen, onClose }) => {
  const { config, setTheme, setDisableColors, setDisableEmoji, setMonochromeMode } = useShellTheme();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-x-4 top-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[500px] z-[60]">
        <div className="bg-background border border-border rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center space-x-2">
              <Palette className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Shell Theme Settings</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-accent rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {/* Theme Selection */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3">Color Scheme</h4>
              <div className="grid grid-cols-1 gap-2">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors text-left",
                      config.theme === option.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-accent"
                    )}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                    {config.theme === option.value && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Display Options */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3">Display Options</h4>
              <div className="space-y-3">
                {/* Monochrome Mode */}
                <label className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors">
                  <div className="flex-1">
                    <div className="font-medium text-sm">Monochrome Mode</div>
                    <div className="text-xs text-muted-foreground">
                      Use only black and white colors
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.monochromeMode}
                    onChange={(e) => setMonochromeMode(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                </label>

                {/* Disable Colors */}
                <label className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors">
                  <div className="flex-1">
                    <div className="font-medium text-sm">Disable All Colors</div>
                    <div className="text-xs text-muted-foreground">
                      Turn off syntax highlighting colors
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.disableColors}
                    onChange={(e) => setDisableColors(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                </label>

                {/* Disable Emoji */}
                <label className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors">
                  <div className="flex-1">
                    <div className="font-medium text-sm">Disable Emoji</div>
                    <div className="text-xs text-muted-foreground">
                      Use text symbols instead of emoji
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.disableEmoji}
                    onChange={(e) => setDisableEmoji(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                </label>
              </div>
            </div>

            {/* Preview */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-3">Preview</h4>
              <div className="p-4 rounded-lg border border-border bg-black/5 dark:bg-black/20 font-mono text-sm">
                <div className="mb-2">
                  <span style={{ color: config.colors.command, fontWeight: 'bold' }}>
                    proto
                  </span>
                  {' '}
                  <span style={{ color: config.colors.argument }}>
                    connect
                  </span>
                  {' '}
                  <span style={{ color: config.colors.string }}>
                    "tcp-client-1"
                  </span>
                </div>
                <div className="mb-2">
                  <span style={{ color: config.colors.command, fontWeight: 'bold' }}>
                    echo
                  </span>
                  {' '}
                  <span style={{ color: config.colors.string }}>
                    "Hello World"
                  </span>
                  {' '}
                  <span style={{ color: config.colors.operator }}>
                    &gt;
                  </span>
                  {' '}
                  <span style={{ color: config.colors.argument }}>
                    output.txt
                  </span>
                </div>
                <div>
                  <span style={{ color: config.colors.error }}>
                    Error: Command not found
                  </span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
              <p className="mb-1">
                <strong>Tip:</strong> Theme settings are saved automatically and persist across sessions.
              </p>
              <p>
                Monochrome mode is useful for accessibility or when using a terminal with limited color support.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

