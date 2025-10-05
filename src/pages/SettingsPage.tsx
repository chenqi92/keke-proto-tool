import React, { useState, useEffect } from 'react';
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
  Info,
  Download,
  RefreshCw
} from 'lucide-react';
import { VERSION_INFO, getFullVersionString } from '@/constants/version';
import { useTheme, ColorTheme } from '@/hooks/useTheme';
import { versionUpdateService, UpdateInfo } from '@/services/VersionUpdateService';
import { formatVersionForDisplay } from '@/utils/version';

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
  { id: 'updates', name: '更新', icon: Download },
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

  // Network settings state
  const [connectionTimeout, setConnectionTimeout] = useState(30);
  const [readTimeout, setReadTimeout] = useState(10);
  const [bufferSize, setBufferSize] = useState(64);
  const [keepAliveEnabled, setKeepAliveEnabled] = useState(true);
  const [nagleDisabled, setNagleDisabled] = useState(false);

  // Security settings state
  const [pluginVerifyEnabled, setPluginVerifyEnabled] = useState(true);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);
  const [dataMaskingLevel, setDataMaskingLevel] = useState('basic');

  // Storage settings state
  const [dataRetentionDays, setDataRetentionDays] = useState(30);
  const [maxStorageGB, setMaxStorageGB] = useState(10);
  const [autoArchiveEnabled, setAutoArchiveEnabled] = useState(true);
  const [compressionEnabled, setCompressionEnabled] = useState(true);

  // Notification settings state
  const [connectionNotifyEnabled, setConnectionNotifyEnabled] = useState(true);
  const [errorNotifyEnabled, setErrorNotifyEnabled] = useState(true);
  const [updateNotifyEnabled, setUpdateNotifyEnabled] = useState(true);
  const [pluginNotifyEnabled, setPluginNotifyEnabled] = useState(false);
  const [notificationDuration, setNotificationDuration] = useState(5);
  const [singleNotificationMode, setSingleNotificationMode] = useState(true);

  // Updates settings state
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);
  const [checkInterval, setCheckInterval] = useState(24); // hours
  const [includePrerelease, setIncludePrerelease] = useState(false);

  // Load all settings from localStorage
  useEffect(() => {
    // Load appearance settings
    const savedFontSize = localStorage.getItem('prototool-font-size');
    const savedLanguage = localStorage.getItem('prototool-language');

    if (savedFontSize) setFontSize(Number(savedFontSize));
    if (savedLanguage) setLanguage(savedLanguage);

    // Load network settings
    const savedConnectionTimeout = localStorage.getItem('prototool-connection-timeout');
    const savedReadTimeout = localStorage.getItem('prototool-read-timeout');
    const savedBufferSize = localStorage.getItem('prototool-buffer-size');
    const savedKeepAlive = localStorage.getItem('prototool-keep-alive');
    const savedNagle = localStorage.getItem('prototool-nagle-disabled');

    if (savedConnectionTimeout) setConnectionTimeout(Number(savedConnectionTimeout));
    if (savedReadTimeout) setReadTimeout(Number(savedReadTimeout));
    if (savedBufferSize) setBufferSize(Number(savedBufferSize));
    if (savedKeepAlive !== null) setKeepAliveEnabled(JSON.parse(savedKeepAlive));
    if (savedNagle !== null) setNagleDisabled(JSON.parse(savedNagle));

    // Load security settings
    const savedPluginVerify = localStorage.getItem('prototool-plugin-verify');
    const savedAutoUpdate = localStorage.getItem('prototool-auto-update');
    const savedTelemetry = localStorage.getItem('prototool-telemetry');
    const savedDataMasking = localStorage.getItem('prototool-data-masking');

    if (savedPluginVerify !== null) setPluginVerifyEnabled(JSON.parse(savedPluginVerify));
    if (savedAutoUpdate !== null) setAutoUpdateEnabled(JSON.parse(savedAutoUpdate));
    if (savedTelemetry !== null) setTelemetryEnabled(JSON.parse(savedTelemetry));
    if (savedDataMasking) setDataMaskingLevel(savedDataMasking);

    // Load storage settings
    const savedRetentionDays = localStorage.getItem('prototool-retention-days');
    const savedMaxStorage = localStorage.getItem('prototool-max-storage');
    const savedAutoArchive = localStorage.getItem('prototool-auto-archive');
    const savedCompression = localStorage.getItem('prototool-compression');

    if (savedRetentionDays) setDataRetentionDays(Number(savedRetentionDays));
    if (savedMaxStorage) setMaxStorageGB(Number(savedMaxStorage));
    if (savedAutoArchive !== null) setAutoArchiveEnabled(JSON.parse(savedAutoArchive));
    if (savedCompression !== null) setCompressionEnabled(JSON.parse(savedCompression));

    // Load notification settings
    const savedConnectionNotify = localStorage.getItem('prototool-connection-notify');
    const savedErrorNotify = localStorage.getItem('prototool-error-notify');
    const savedUpdateNotify = localStorage.getItem('prototool-update-notify');
    const savedPluginNotify = localStorage.getItem('prototool-plugin-notify');
    const savedNotificationDuration = localStorage.getItem('prototool-notification-duration');
    const savedSingleNotificationMode = localStorage.getItem('prototool-single-notification-mode');

    if (savedConnectionNotify !== null) setConnectionNotifyEnabled(JSON.parse(savedConnectionNotify));
    if (savedErrorNotify !== null) setErrorNotifyEnabled(JSON.parse(savedErrorNotify));
    if (savedUpdateNotify !== null) setUpdateNotifyEnabled(JSON.parse(savedUpdateNotify));
    if (savedPluginNotify !== null) setPluginNotifyEnabled(JSON.parse(savedPluginNotify));
    if (savedNotificationDuration) setNotificationDuration(Number(savedNotificationDuration));
    if (savedSingleNotificationMode !== null) setSingleNotificationMode(JSON.parse(savedSingleNotificationMode));

    // Load update settings
    const currentInfo = versionUpdateService.getCurrentUpdateInfo();
    if (currentInfo) {
      setUpdateInfo(currentInfo);
    }

    const savedAutoCheck = localStorage.getItem('prototool-auto-check-updates');
    const savedInterval = localStorage.getItem('prototool-check-interval');
    const savedPrerelease = localStorage.getItem('prototool-include-prerelease');

    if (savedAutoCheck !== null) setAutoCheckEnabled(JSON.parse(savedAutoCheck));
    if (savedInterval !== null) setCheckInterval(Number(savedInterval));
    if (savedPrerelease !== null) setIncludePrerelease(JSON.parse(savedPrerelease));
  }, []);

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
                "h-20 px-4 py-3 border rounded-lg flex flex-col items-center justify-center space-y-2 transition-colors",
                theme === 'light' ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
              )}
            >
              <Sun className="w-6 h-6" />
              <span className="text-sm">浅色</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                "h-20 px-4 py-3 border rounded-lg flex flex-col items-center justify-center space-y-2 transition-colors",
                theme === 'dark' ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
              )}
            >
              <Moon className="w-6 h-6" />
              <span className="text-sm">深色</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={cn(
                "h-20 px-4 py-3 border rounded-lg flex flex-col items-center justify-center space-y-2 transition-colors",
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
                  "h-20 px-3 py-3 border rounded-lg flex flex-col items-center justify-center space-y-2 transition-colors",
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
              className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-sm w-12 font-mono">{fontSize}px</span>
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
            className="w-full h-9 px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
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
              value={connectionTimeout}
              onChange={(e) => setConnectionTimeout(Number(e.target.value))}
              className="w-full h-9 px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">读取超时 (秒)</label>
            <input
              type="number"
              value={readTimeout}
              onChange={(e) => setReadTimeout(Number(e.target.value))}
              className="w-full h-9 px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">缓冲区大小 (KB)</label>
            <input
              type="number"
              value={bufferSize}
              onChange={(e) => setBufferSize(Number(e.target.value))}
              className="w-full h-9 px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            />
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="keepalive"
              checked={keepAliveEnabled}
              onChange={(e) => setKeepAliveEnabled(e.target.checked)}
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            />
            <label htmlFor="keepalive" className="text-sm">启用 Keep-Alive</label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="nagle"
              checked={nagleDisabled}
              onChange={(e) => setNagleDisabled(e.target.checked)}
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            />
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
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="plugin-verify"
              checked={pluginVerifyEnabled}
              onChange={(e) => setPluginVerifyEnabled(e.target.checked)}
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            />
            <label htmlFor="plugin-verify" className="text-sm">验证插件签名</label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="auto-update"
              checked={autoUpdateEnabled}
              onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            />
            <label htmlFor="auto-update" className="text-sm">自动检查更新</label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="telemetry"
              checked={telemetryEnabled}
              onChange={(e) => setTelemetryEnabled(e.target.checked)}
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            />
            <label htmlFor="telemetry" className="text-sm">发送匿名使用统计</label>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">数据脱敏级别</label>
            <select
              value={dataMaskingLevel}
              onChange={(e) => setDataMaskingLevel(e.target.value)}
              className="w-full h-9 px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            >
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
              value={dataRetentionDays}
              onChange={(e) => setDataRetentionDays(Number(e.target.value))}
              className="w-full h-9 px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">最大存储空间 (GB)</label>
            <input
              type="number"
              value={maxStorageGB}
              onChange={(e) => setMaxStorageGB(Number(e.target.value))}
              className="w-full h-9 px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            />
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="auto-archive"
              checked={autoArchiveEnabled}
              onChange={(e) => setAutoArchiveEnabled(e.target.checked)}
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            />
            <label htmlFor="auto-archive" className="text-sm">自动归档旧数据</label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="compress"
              checked={compressionEnabled}
              onChange={(e) => setCompressionEnabled(e.target.checked)}
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            />
            <label htmlFor="compress" className="text-sm">压缩存储数据</label>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <h4 className="font-medium mb-3">存储使用情况</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>会话数据:</span>
                <span className="font-mono">2.3 GB</span>
              </div>
              <div className="flex justify-between">
                <span>日志文件:</span>
                <span className="font-mono">1.1 GB</span>
              </div>
              <div className="flex justify-between">
                <span>插件数据:</span>
                <span className="font-mono">256 MB</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t border-border">
                <span>总计:</span>
                <span className="font-mono">3.7 GB</span>
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
            { action: '快捷命令', shortcut: 'Ctrl+K' },
            { action: '切换主题', shortcut: 'Ctrl+J' },
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors">
              <span className="text-sm font-medium">{item.action}</span>
              <div className="flex items-center space-x-3">
                <kbd className="px-3 py-1.5 bg-muted border border-border rounded text-xs font-mono">
                  {item.shortcut}
                </kbd>
                <button
                  onClick={() => {
                    // TODO: Implement shortcut modification functionality
                    console.log(`Modify shortcut for: ${item.action}`);
                  }}
                  className="px-3 py-1.5 text-xs text-primary hover:bg-primary/10 rounded-md transition-colors border border-transparent hover:border-primary/20"
                >
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
          {/* Single Notification Mode */}
          <div className="p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="single-notification" className="text-sm font-medium">一次只显示一条通知</label>
                <p className="text-xs text-muted-foreground mt-1">新通知出现时自动隐藏之前的通知</p>
              </div>
              <input
                type="checkbox"
                id="single-notification"
                checked={singleNotificationMode}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setSingleNotificationMode(newValue);
                  localStorage.setItem('prototool-single-notification-mode', JSON.stringify(newValue));
                }}
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
              />
            </div>
          </div>

          {/* Notification Types */}
          <div className="space-y-3">
            <label className="text-sm font-medium block">通知类型</label>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="connection-notify"
                checked={connectionNotifyEnabled}
                onChange={(e) => setConnectionNotifyEnabled(e.target.checked)}
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
              />
              <label htmlFor="connection-notify" className="text-sm">连接状态变化</label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="error-notify"
                checked={errorNotifyEnabled}
                onChange={(e) => setErrorNotifyEnabled(e.target.checked)}
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
              />
              <label htmlFor="error-notify" className="text-sm">错误和警告</label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="update-notify"
                checked={updateNotifyEnabled}
                onChange={(e) => setUpdateNotifyEnabled(e.target.checked)}
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
              />
              <label htmlFor="update-notify" className="text-sm">软件更新</label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="plugin-notify"
                checked={pluginNotifyEnabled}
                onChange={(e) => setPluginNotifyEnabled(e.target.checked)}
                className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
              />
              <label htmlFor="plugin-notify" className="text-sm">插件活动</label>
            </div>
          </div>

          {/* Notification Duration */}
          <div>
            <label className="text-sm font-medium mb-2 block">通知持续时间 (秒)</label>
            <input
              type="number"
              value={notificationDuration}
              onChange={(e) => setNotificationDuration(Number(e.target.value))}
              className="w-full h-9 px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            />
            <p className="text-xs text-muted-foreground mt-1">
              设置为 0 表示通知不会自动消失
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      const info = await versionUpdateService.checkForUpdates();
      setUpdateInfo(info);
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleUpdateSettings = () => {
    try {
      // Save appearance settings
      localStorage.setItem('prototool-font-size', fontSize.toString());
      localStorage.setItem('prototool-language', language);

      // Save network settings
      localStorage.setItem('prototool-connection-timeout', connectionTimeout.toString());
      localStorage.setItem('prototool-read-timeout', readTimeout.toString());
      localStorage.setItem('prototool-buffer-size', bufferSize.toString());
      localStorage.setItem('prototool-keep-alive', JSON.stringify(keepAliveEnabled));
      localStorage.setItem('prototool-nagle-disabled', JSON.stringify(nagleDisabled));

      // Save security settings
      localStorage.setItem('prototool-plugin-verify', JSON.stringify(pluginVerifyEnabled));
      localStorage.setItem('prototool-auto-update', JSON.stringify(autoUpdateEnabled));
      localStorage.setItem('prototool-telemetry', JSON.stringify(telemetryEnabled));
      localStorage.setItem('prototool-data-masking', dataMaskingLevel);

      // Save storage settings
      localStorage.setItem('prototool-retention-days', dataRetentionDays.toString());
      localStorage.setItem('prototool-max-storage', maxStorageGB.toString());
      localStorage.setItem('prototool-auto-archive', JSON.stringify(autoArchiveEnabled));
      localStorage.setItem('prototool-compression', JSON.stringify(compressionEnabled));

      // Save notification settings
      localStorage.setItem('prototool-connection-notify', JSON.stringify(connectionNotifyEnabled));
      localStorage.setItem('prototool-error-notify', JSON.stringify(errorNotifyEnabled));
      localStorage.setItem('prototool-update-notify', JSON.stringify(updateNotifyEnabled));
      localStorage.setItem('prototool-plugin-notify', JSON.stringify(pluginNotifyEnabled));
      localStorage.setItem('prototool-notification-duration', notificationDuration.toString());
      localStorage.setItem('prototool-single-notification-mode', JSON.stringify(singleNotificationMode));

      // Save update settings
      localStorage.setItem('prototool-auto-check-updates', JSON.stringify(autoCheckEnabled));
      localStorage.setItem('prototool-check-interval', checkInterval.toString());
      localStorage.setItem('prototool-include-prerelease', JSON.stringify(includePrerelease));

      // Update service configuration
      versionUpdateService.updateConfig({
        checkInterval: checkInterval * 60 * 60 * 1000, // Convert hours to milliseconds
        includePrerelease,
      });

      if (autoCheckEnabled) {
        versionUpdateService.startAutomaticChecking();
      } else {
        versionUpdateService.stopAutomaticChecking();
      }

      // Show success feedback (you could add a toast notification here)
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const renderUpdatesSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">更新设置</h3>

        {/* Current Version */}
        <div className="p-4 bg-muted/50 rounded-lg border border-border mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">当前版本</h4>
              <p className="text-sm text-muted-foreground">
                {getFullVersionString()}
              </p>
            </div>
            <button
              onClick={handleCheckForUpdates}
              disabled={isCheckingUpdates}
              className={cn(
                "h-9 flex items-center space-x-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", isCheckingUpdates && "animate-spin")} />
              <span>{isCheckingUpdates ? '检查中...' : '检查更新'}</span>
            </button>
          </div>

          {updateInfo && (
            <div className="mt-4 pt-4 border-t border-border">
              {updateInfo.hasUpdate ? (
                <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                  <Download className="w-4 h-4" />
                  <span>发现新版本: {formatVersionForDisplay(updateInfo.latestVersion)}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Info className="w-4 h-4" />
                  <span>已是最新版本</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                最后检查: {updateInfo.lastChecked.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Auto Check Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
            <div>
              <label className="text-sm font-medium">自动检查更新</label>
              <p className="text-xs text-muted-foreground">启动时自动检查新版本</p>
            </div>
            <input
              type="checkbox"
              checked={autoCheckEnabled}
              onChange={(e) => setAutoCheckEnabled(e.target.checked)}
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            />
          </div>

          {autoCheckEnabled && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">检查频率</label>
                <select
                  value={checkInterval}
                  onChange={(e) => setCheckInterval(Number(e.target.value))}
                  className="w-full h-9 px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                >
                  <option value={1}>每小时</option>
                  <option value={6}>每6小时</option>
                  <option value={12}>每12小时</option>
                  <option value={24}>每天</option>
                  <option value={168}>每周</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
                <div>
                  <label className="text-sm font-medium">包含预发布版本</label>
                  <p className="text-xs text-muted-foreground">检查测试版本和预发布版本</p>
                </div>
                <input
                  type="checkbox"
                  checked={includePrerelease}
                  onChange={(e) => setIncludePrerelease(e.target.checked)}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                />
              </div>
            </>
          )}


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

          <div className="flex space-x-3">
            <button
              onClick={() => {
                // TODO: Implement view source functionality
                window.open('https://github.com/chenqi92/keke-proto-tool', '_blank');
              }}
              className="h-9 px-4 py-1.5 text-sm font-medium border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
            >
              查看源码
            </button>
            <button
              onClick={() => {
                // TODO: Implement report issue functionality
                window.open('https://github.com/chenqi92/keke-proto-tool/issues', '_blank');
              }}
              className="h-9 px-4 py-1.5 text-sm font-medium border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
            >
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
      case 'updates':
        return renderUpdatesSettings();
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
            <div className="animate-in fade-in-0 duration-200">
              {renderContent()}
            </div>
          </div>
        </div>

        {/* Save Button - Fixed at bottom */}
        <div className="shrink-0 p-6 border-t border-border bg-card">
          <div className="flex items-center space-x-3 max-w-2xl">
            <button
              onClick={handleUpdateSettings}
              className="h-9 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
            >
              保存设置
            </button>
            <button
              onClick={() => {
                // Reset all settings to defaults
                setFontSize(14);
                setLanguage('zh-CN');
                setConnectionTimeout(30);
                setReadTimeout(10);
                setBufferSize(64);
                setKeepAliveEnabled(true);
                setNagleDisabled(false);
                setPluginVerifyEnabled(true);
                setAutoUpdateEnabled(true);
                setTelemetryEnabled(false);
                setDataMaskingLevel('basic');
                setDataRetentionDays(30);
                setMaxStorageGB(10);
                setAutoArchiveEnabled(true);
                setCompressionEnabled(true);
                setConnectionNotifyEnabled(true);
                setErrorNotifyEnabled(true);
                setUpdateNotifyEnabled(true);
                setPluginNotifyEnabled(false);
                setNotificationDuration(5);
                setSingleNotificationMode(true);
                setAutoCheckEnabled(true);
                setCheckInterval(24);
                setIncludePrerelease(false);
                console.log('Settings reset to defaults');
              }}
              className="h-9 px-4 py-1.5 text-sm font-medium border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
            >
              重置为默认
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
