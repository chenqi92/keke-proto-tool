// Theme Selector Component for ProtoShell
// Allows users to switch themes and configure display options

import React, { useState } from 'react';
import { X, Palette, Check } from 'lucide-react';
import { useShellTheme, ShellTheme } from './ThemeConfig';
import { SyntaxHighlight } from './SyntaxHighlight';
import { cn } from '@/utils';

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEME_OPTIONS: Array<{ value: ShellTheme; label: string; description: string }> = [
  { value: 'default', label: '默认主题', description: '现代彩色主题，适合日常使用' },
  { value: 'monochrome', label: '单色主题', description: '纯黑白配色，适合无障碍访问' },
  { value: 'solarized-dark', label: 'Solarized 深色', description: '流行的深色主题，护眼舒适' },
  { value: 'solarized-light', label: 'Solarized 浅色', description: '流行的浅色主题，清晰明亮' },
  { value: 'dracula', label: 'Dracula', description: '充满活力的深色主题' },
  { value: 'nord', label: 'Nord', description: '北极风格配色，冷色调' },
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
              <h3 className="text-sm font-semibold">Shell 主题设置</h3>
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
              <h4 className="text-sm font-semibold mb-3">配色方案</h4>
              <div className="grid grid-cols-1 gap-2">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      console.log('[ThemeSelector] User clicked theme:', option.value);
                      setTheme(option.value);
                    }}
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
              <h4 className="text-sm font-semibold mb-3">显示选项</h4>
              <div className="space-y-3">
                {/* Monochrome Mode */}
                <label className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors">
                  <div className="flex-1">
                    <div className="font-medium text-sm">单色模式</div>
                    <div className="text-xs text-muted-foreground">
                      仅使用黑白颜色，适合无障碍访问
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
                    <div className="font-medium text-sm">禁用所有颜色</div>
                    <div className="text-xs text-muted-foreground">
                      关闭语法高亮颜色显示
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
                    <div className="font-medium text-sm">禁用表情符号</div>
                    <div className="text-xs text-muted-foreground">
                      使用文本符号代替表情符号
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
              <h4 className="text-sm font-semibold mb-3">预览效果</h4>
              <div className="p-4 rounded-lg border border-border bg-black/5 dark:bg-black/20 font-mono text-sm space-y-2">
                <SyntaxHighlight input='proto connect "tcp-client-1"' />
                <SyntaxHighlight input='echo "Hello World" > output.txt' />
                <div style={{ color: config.colors.error }}>
                  Error: Command not found
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
              <p className="mb-1">
                <strong>提示：</strong> 主题设置会自动保存，并在下次打开时保持。
              </p>
              <p>
                单色模式适用于无障碍访问或颜色支持有限的终端环境。
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

