import React, { useState } from 'react';
import { cn } from '@/utils';
import {
  Settings,
  Palette,
  Network,
  Shield,
  Database,
  Keyboard,
  Bell,
  Moon,
  Sun,
  Laptop,
  Info
} from 'lucide-react';
import { VERSION_INFO, getFullVersionString } from '@/constants/version';
import { useTheme, ColorTheme } from '@/hooks/useTheme';

interface SettingsSection {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SettingsPageProps {
  defaultSection?: string;
}

const settingsSections: SettingsSection[] = [
  { id: 'appearance', name: '外观', icon: Palette },
  { id: 'network', name: '网络', icon: Network },
  { id: 'security', name: '安全', icon: Shield },
  { id: 'storage', name: '存储', icon: Database },
  { id: 'shortcuts', name: '快捷键', icon: Keyboard },
  { id: 'notifications', name: '通知', icon: Bell },
  { id: 'about', name: '关于', icon: Info },
];

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

export const SettingsPage: React.FC<SettingsPageProps> = ({ defaultSection = 'appearance' }) => {
  const [activeSection, setActiveSection] = useState(defaultSection);
  const { theme, colorTheme, setTheme, setColorTheme } = useTheme();
  const [fontSize, setFontSize] = useState(14);
  const [language, setLanguage] = useState('zh-CN');

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">外观设置</h3>
        
        {/* Theme */}
        <div className="space-y-3">
          <label className="text-sm font-medium">主题风格</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setTheme('light')}
              className={cn(
                "p-3 border rounded-lg flex flex-col items-center space-y-2 transition-colors",
                theme === 'light' ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
              )}
            >
              <Sun className="w-6 h-6" />
              <span className="text-sm">浅色</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                "p-3 border rounded-lg flex flex-col items-center space-y-2 transition-colors",
                theme === 'dark' ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
              )}
            >
              <Moon className="w-6 h-6" />
              <span className="text-sm">深色</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={cn(
                "p-3 border rounded-lg flex flex-col items-center space-y-2 transition-colors",
                theme === 'system' ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
              )}
            >
              <Laptop className="w-6 h-6" />
              <span className="text-sm">跟随系统</span>
            </button>
          </div>
        </div>

        {/* Color Theme */}
        <div className="space-y-3">
          <label className="text-sm font-medium">主题色</label>
          <div className="grid grid-cols-6 gap-2">
            {colorThemes.map((ct) => (
              <button
                key={ct.value}
                onClick={() => setColorTheme(ct.value)}
                className={cn(
                  "p-3 border rounded-lg flex flex-col items-center space-y-2 transition-colors",
                  colorTheme === ct.value ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                )}
                title={ct.label}
              >
                <div
                  className="w-6 h-6 rounded-full border border-border"
                  style={{ backgroundColor: ct.color }}
                />
                <span className="text-xs">{ct.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="space-y-3">
          <label className="text-sm font-medium">字体大小</label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min={12}
              max={18}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm w-12">{fontSize}px</span>
          </div>
          <p className="text-xs text-muted-foreground">
            调整界面文字大小
          </p>
        </div>

        {/* Language */}
        <div className="space-y-3">
          <label className="text-sm font-medium">语言</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full p-2 border border-border rounded-md bg-background"
          >
            <option value="zh-CN">简体中文</option>
            <option value="zh-TW">繁體中文</option>
            <option value="en-US">English</option>
            <option value="ja-JP">日本語</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderNetworkSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">网络设置</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">连接超时 (秒)</label>
            <input
              type="number"
              defaultValue={30}
              className="w-full p-2 border border-border rounded-md bg-background"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">读取超时 (秒)</label>
            <input
              type="number"
              defaultValue={10}
              className="w-full p-2 border border-border rounded-md bg-background"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">缓冲区大小 (KB)</label>
            <input
              type="number"
              defaultValue={64}
              className="w-full p-2 border border-border rounded-md bg-background"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="keepalive" defaultChecked />
            <label htmlFor="keepalive" className="text-sm">启用 Keep-Alive</label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="nagle" />
            <label htmlFor="nagle" className="text-sm">禁用 Nagle 算法</label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">安全设置</h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="plugin-verify" defaultChecked />
            <label htmlFor="plugin-verify" className="text-sm">验证插件签名</label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="auto-update" defaultChecked />
            <label htmlFor="auto-update" className="text-sm">自动检查更新</label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="telemetry" />
            <label htmlFor="telemetry" className="text-sm">发送匿名使用统计</label>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">数据脱敏级别</label>
            <select className="w-full p-2 border border-border rounded-md bg-background">
              <option value="none">无</option>
              <option value="basic">基础</option>
              <option value="strict">严格</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStorageSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">存储设置</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">数据保留期 (天)</label>
            <input
              type="number"
              defaultValue={30}
              className="w-full p-2 border border-border rounded-md bg-background"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">最大存储空间 (GB)</label>
            <input
              type="number"
              defaultValue={10}
              className="w-full p-2 border border-border rounded-md bg-background"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="auto-archive" defaultChecked />
            <label htmlFor="auto-archive" className="text-sm">自动归档旧数据</label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="compress" defaultChecked />
            <label htmlFor="compress" className="text-sm">压缩存储数据</label>
          </div>
          
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">存储使用情况</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>会话数据:</span>
                <span>2.3 GB</span>
              </div>
              <div className="flex justify-between">
                <span>日志文件:</span>
                <span>1.1 GB</span>
              </div>
              <div className="flex justify-between">
                <span>插件数据:</span>
                <span>256 MB</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>总计:</span>
                <span>3.7 GB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderShortcutsSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">快捷键设置</h3>
        
        <div className="space-y-3">
          {[
            { action: '新建会话', shortcut: 'Ctrl+N' },
            { action: '打开文件', shortcut: 'Ctrl+O' },
            { action: '保存', shortcut: 'Ctrl+S' },
            { action: '查找', shortcut: 'Ctrl+F' },
            { action: '连接/断开', shortcut: 'Ctrl+Enter' },
            { action: '开始/停止录制', shortcut: 'Ctrl+R' },
            { action: '命令面板', shortcut: 'Ctrl+K' },
            { action: '切换主题', shortcut: 'Ctrl+J' },
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <span className="text-sm">{item.action}</span>
              <div className="flex items-center space-x-2">
                <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
                  {item.shortcut}
                </kbd>
                <button className="text-xs text-primary hover:underline">
                  修改
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNotificationsSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">通知设置</h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="connection-notify" defaultChecked />
            <label htmlFor="connection-notify" className="text-sm">连接状态变化</label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="error-notify" defaultChecked />
            <label htmlFor="error-notify" className="text-sm">错误和警告</label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="update-notify" defaultChecked />
            <label htmlFor="update-notify" className="text-sm">软件更新</label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input type="checkbox" id="plugin-notify" />
            <label htmlFor="plugin-notify" className="text-sm">插件活动</label>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">通知持续时间 (秒)</label>
            <input
              type="number"
              defaultValue={5}
              className="w-full p-2 border border-border rounded-md bg-background"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderAboutSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">关于 ProtoTool</h3>

        <div className="space-y-4">
          <div className="p-6 border border-border rounded-lg bg-card">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-primary/20 rounded-lg flex items-center justify-center">
                <Network className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h4 className="text-xl font-semibold">{VERSION_INFO.name}</h4>
                <p className="text-muted-foreground">{getFullVersionString()}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {VERSION_INFO.description}
            </p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">版本:</span>
                <span className="ml-2 text-muted-foreground">{VERSION_INFO.version}</span>
              </div>
              <div>
                <span className="font-medium">构建日期:</span>
                <span className="ml-2 text-muted-foreground">{VERSION_INFO.buildDate}</span>
              </div>
            </div>
          </div>

          <div className="p-4 border border-border rounded-lg">
            <h5 className="font-medium mb-2">开发团队</h5>
            <p className="text-sm text-muted-foreground">
              ProtoTool 由 programApe 开发和维护
            </p>
          </div>

          <div className="p-4 border border-border rounded-lg">
            <h5 className="font-medium mb-2">开源许可</h5>
            <p className="text-sm text-muted-foreground">
              本软件基于 MIT 许可证开源，您可以自由使用、修改和分发。
            </p>
          </div>

          <div className="flex space-x-2">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              检查更新
            </button>
            <button className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors">
              查看源码
            </button>
            <button className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors">
              报告问题
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'appearance':
        return renderAppearanceSettings();
      case 'network':
        return renderNetworkSettings();
      case 'security':
        return renderSecuritySettings();
      case 'storage':
        return renderStorageSettings();
      case 'shortcuts':
        return renderShortcutsSettings();
      case 'notifications':
        return renderNotificationsSettings();
      case 'about':
        return renderAboutSettings();
      default:
        return renderAppearanceSettings();
    }
  };

  return (
    <div className="h-full flex">
      {/* Settings Navigation */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border shrink-0">
          <h2 className="font-semibold flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>设置</span>
          </h2>
        </div>
        <div className="p-2 flex-1 overflow-y-auto">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-md transition-colors text-left",
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{section.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-2xl">
            {renderContent()}
          </div>
        </div>

        {/* Save Button - Fixed at bottom */}
        <div className="shrink-0 p-6 border-t border-border bg-card">
          <div className="flex items-center space-x-3 max-w-2xl">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              保存设置
            </button>
            <button className="px-4 py-2 border border-border rounded-md hover:bg-accent">
              重置为默认
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
