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
  Monitor,
  Moon,
  Sun,
  Laptop
} from 'lucide-react';

interface SettingsSection {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const settingsSections: SettingsSection[] = [
  { id: 'appearance', name: '外观', icon: Palette },
  { id: 'network', name: '网络', icon: Network },
  { id: 'security', name: '安全', icon: Shield },
  { id: 'storage', name: '存储', icon: Database },
  { id: 'shortcuts', name: '快捷键', icon: Keyboard },
  { id: 'notifications', name: '通知', icon: Bell },
];

export const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('appearance');
  const [theme, setTheme] = useState('system');
  const [fontSize, setFontSize] = useState(14);
  const [language, setLanguage] = useState('zh-CN');

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">外观设置</h3>
        
        {/* Theme */}
        <div className="space-y-3">
          <label className="text-sm font-medium">主题</label>
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
      default:
        return renderAppearanceSettings();
    }
  };

  return (
    <div className="h-full flex">
      {/* Settings Navigation */}
      <div className="w-64 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>设置</span>
          </h2>
        </div>
        <div className="p-2">
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
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-2xl">
          {renderContent()}
          
          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center space-x-3">
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
    </div>
  );
};
