// Predefined Commands

import {
  Plus,
  FolderOpen,
  Save,
  Search,
  Zap,
  Activity,
  Edit3,
  Settings,
  Palette,
  Sun,
  Moon,
  Laptop,
  PanelLeft,
  PanelRight,
  LayoutGrid,
  Maximize,
  Minimize,
  X,
  HelpCircle,
  Keyboard,
  FileText,
  Bug,
  Download,
  Wrench,
  MessageSquare,
  Code,
  Calculator,
  Clock,
  Database,
  Network,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { Command } from './types';

/**
 * Create file operation commands
 */
export function createFileCommands(handlers: {
  onNewSession: () => void;
  onOpenFile: () => void;
  onSave: () => void;
  onExportLogs: () => void;
}): Command[] {
  return [
    {
      id: 'file.new-session',
      title: '新建会话',
      category: 'file',
      keywords: ['new', 'session', '新建', '会话', 'create'],
      description: '创建一个新的网络会话',
      icon: Plus,
      shortcut: 'Ctrl+N',
      handler: handlers.onNewSession
    },
    {
      id: 'file.open',
      title: '打开文件',
      category: 'file',
      keywords: ['open', 'file', '打开', '文件'],
      description: '打开一个文件',
      icon: FolderOpen,
      shortcut: 'Ctrl+O',
      handler: handlers.onOpenFile
    },
    {
      id: 'file.save',
      title: '保存',
      category: 'file',
      keywords: ['save', '保存'],
      description: '保存当前内容',
      icon: Save,
      shortcut: 'Ctrl+S',
      handler: handlers.onSave
    },
    {
      id: 'file.export-logs',
      title: '导出日志',
      category: 'file',
      keywords: ['export', 'logs', '导出', '日志'],
      description: '导出系统日志',
      icon: Download,
      handler: handlers.onExportLogs
    }
  ];
}

/**
 * Create view operation commands
 */
export function createViewCommands(handlers: {
  onToggleSidebar: () => void;
  onToggleInspector: () => void;
  onToggleStatusBar: () => void;
  onSearch: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFullscreen: () => void;
}): Command[] {
  return [
    {
      id: 'view.toggle-sidebar',
      title: '切换侧边栏',
      category: 'view',
      keywords: ['sidebar', 'toggle', '侧边栏', '切换'],
      description: '显示或隐藏侧边栏',
      icon: PanelLeft,
      shortcut: 'Ctrl+B',
      handler: handlers.onToggleSidebar
    },
    {
      id: 'view.toggle-inspector',
      title: '切换检查器',
      category: 'view',
      keywords: ['inspector', 'toggle', '检查器', '切换'],
      description: '显示或隐藏检查器面板',
      icon: PanelRight,
      handler: handlers.onToggleInspector
    },
    {
      id: 'view.toggle-statusbar',
      title: '切换状态栏',
      category: 'view',
      keywords: ['statusbar', 'toggle', '状态栏', '切换'],
      description: '显示或隐藏状态栏',
      icon: LayoutGrid,
      handler: handlers.onToggleStatusBar
    },
    {
      id: 'view.search',
      title: '搜索',
      category: 'view',
      keywords: ['search', 'find', '搜索', '查找'],
      description: '搜索内容',
      icon: Search,
      shortcut: 'Ctrl+F',
      handler: handlers.onSearch
    },
    {
      id: 'view.zoom-in',
      title: '放大',
      category: 'view',
      keywords: ['zoom', 'in', '放大'],
      description: '放大视图',
      icon: Maximize,
      shortcut: 'Ctrl++',
      handler: handlers.onZoomIn
    },
    {
      id: 'view.zoom-out',
      title: '缩小',
      category: 'view',
      keywords: ['zoom', 'out', '缩小'],
      description: '缩小视图',
      icon: Minimize,
      shortcut: 'Ctrl+-',
      handler: handlers.onZoomOut
    },
    {
      id: 'view.zoom-reset',
      title: '重置缩放',
      category: 'view',
      keywords: ['zoom', 'reset', '重置', '缩放'],
      description: '重置缩放级别',
      icon: Maximize,
      shortcut: 'Ctrl+0',
      handler: handlers.onZoomReset
    },
    {
      id: 'view.fullscreen',
      title: '全屏',
      category: 'view',
      keywords: ['fullscreen', '全屏'],
      description: '切换全屏模式',
      icon: Maximize,
      shortcut: 'F11',
      handler: handlers.onFullscreen
    }
  ];
}

/**
 * Create theme commands
 */
export function createThemeCommands(handlers: {
  onSetTheme: (theme: 'light' | 'dark' | 'system') => void;
  onSetColorTheme?: (theme: string) => void;
}): Command[] {
  return [
    {
      id: 'theme.light',
      title: '浅色主题',
      category: 'view',
      keywords: ['theme', 'light', '主题', '浅色', '亮色'],
      description: '切换到浅色主题',
      icon: Sun,
      handler: () => handlers.onSetTheme('light')
    },
    {
      id: 'theme.dark',
      title: '深色主题',
      category: 'view',
      keywords: ['theme', 'dark', '主题', '深色', '暗色'],
      description: '切换到深色主题',
      icon: Moon,
      handler: () => handlers.onSetTheme('dark')
    },
    {
      id: 'theme.system',
      title: '跟随系统',
      category: 'view',
      keywords: ['theme', 'system', '主题', '系统', '自动'],
      description: '跟随系统主题设置',
      icon: Laptop,
      handler: () => handlers.onSetTheme('system')
    }
  ];
}

/**
 * Create session operation commands
 */
export function createSessionCommands(handlers: {
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleCapture: () => void;
  onEditProtocol: () => void;
}): Command[] {
  return [
    {
      id: 'session.connect',
      title: '连接',
      category: 'session',
      keywords: ['connect', '连接', 'start'],
      description: '连接到当前会话',
      icon: Zap,
      shortcut: 'Ctrl+Enter',
      handler: handlers.onConnect
    },
    {
      id: 'session.disconnect',
      title: '断开连接',
      category: 'session',
      keywords: ['disconnect', '断开', 'stop'],
      description: '断开当前会话连接',
      icon: X,
      dangerLevel: 'warning',
      handler: handlers.onDisconnect
    },
    {
      id: 'session.toggle-capture',
      title: '切换抓包',
      category: 'session',
      keywords: ['capture', 'record', '抓包', '录制', '记录'],
      description: '开始或停止抓包',
      icon: Activity,
      shortcut: 'Ctrl+R',
      handler: handlers.onToggleCapture
    },
    {
      id: 'session.edit-protocol',
      title: '编辑协议',
      category: 'session',
      keywords: ['protocol', 'edit', '协议', '编辑'],
      description: '编辑协议规则',
      icon: Edit3,
      handler: handlers.onEditProtocol
    }
  ];
}

/**
 * Create tools commands
 */
export function createToolsCommands(handlers: {
  onOpenToolbox: () => void;
  onOpenTool: (toolId: string) => void;
}): Command[] {
  return [
    {
      id: 'tools.toolbox',
      title: '打开工具箱',
      category: 'tools',
      keywords: ['toolbox', 'tools', '工具箱', '工具'],
      description: '打开工具箱面板',
      icon: Wrench,
      handler: handlers.onOpenToolbox
    },
    {
      id: 'tools.message-generator',
      title: '消息生成器',
      category: 'tools',
      keywords: ['message', 'generator', '消息', '生成器'],
      description: '打开消息生成器工具',
      icon: MessageSquare,
      handler: () => handlers.onOpenTool('message-generator')
    },
    {
      id: 'tools.protocol-parser',
      title: '协议解析器',
      category: 'tools',
      keywords: ['protocol', 'parser', '协议', '解析器'],
      description: '打开协议解析器工具',
      icon: Code,
      handler: () => handlers.onOpenTool('protocol-parser')
    },
    {
      id: 'tools.crc-calculator',
      title: 'CRC计算器',
      category: 'tools',
      keywords: ['crc', 'calculator', '计算器', '校验'],
      description: '打开CRC计算器工具',
      icon: Calculator,
      handler: () => handlers.onOpenTool('crc-calculator')
    },
    {
      id: 'tools.timestamp-converter',
      title: '时间戳转换器',
      category: 'tools',
      keywords: ['timestamp', 'converter', '时间戳', '转换器'],
      description: '打开时间戳转换器工具',
      icon: Clock,
      handler: () => handlers.onOpenTool('timestamp-converter')
    },
    {
      id: 'tools.data-converter',
      title: '数据转换器',
      category: 'tools',
      keywords: ['data', 'converter', '数据', '转换器', 'hex', 'base64'],
      description: '打开数据转换器工具',
      icon: RefreshCw,
      handler: () => handlers.onOpenTool('data-converter')
    }
  ];
}

/**
 * Create settings commands
 */
export function createSettingsCommands(handlers: {
  onOpenSettings: (section?: string) => void;
}): Command[] {
  return [
    {
      id: 'settings.general',
      title: '打开设置',
      category: 'settings',
      keywords: ['settings', 'preferences', '设置', '偏好'],
      description: '打开设置面板',
      icon: Settings,
      handler: () => handlers.onOpenSettings()
    },
    {
      id: 'settings.appearance',
      title: '外观设置',
      category: 'settings',
      keywords: ['appearance', 'theme', '外观', '主题'],
      description: '打开外观设置',
      icon: Palette,
      handler: () => handlers.onOpenSettings('appearance')
    },
    {
      id: 'settings.network',
      title: '网络设置',
      category: 'settings',
      keywords: ['network', '网络', '连接'],
      description: '打开网络设置',
      icon: Network,
      handler: () => handlers.onOpenSettings('network')
    },
    {
      id: 'settings.storage',
      title: '存储设置',
      category: 'settings',
      keywords: ['storage', 'database', '存储', '数据库'],
      description: '打开存储设置',
      icon: Database,
      handler: () => handlers.onOpenSettings('storage')
    },
    {
      id: 'settings.shortcuts',
      title: '快捷键设置',
      category: 'settings',
      keywords: ['shortcuts', 'keyboard', '快捷键', '键盘'],
      description: '打开快捷键设置',
      icon: Keyboard,
      handler: () => handlers.onOpenSettings('shortcuts')
    }
  ];
}

/**
 * Create help commands
 */
export function createHelpCommands(handlers: {
  onOpenUserGuide: () => void;
  onOpenKeyboardShortcuts: () => void;
  onOpenReleaseNotes: () => void;
  onReportIssue: () => void;
  onCheckUpdates: () => void;
  onAbout: () => void;
}): Command[] {
  return [
    {
      id: 'help.user-guide',
      title: '用户指南',
      category: 'help',
      keywords: ['help', 'guide', 'documentation', '帮助', '指南', '文档'],
      description: '打开用户指南',
      icon: HelpCircle,
      handler: handlers.onOpenUserGuide
    },
    {
      id: 'help.keyboard-shortcuts',
      title: '键盘快捷键',
      category: 'help',
      keywords: ['keyboard', 'shortcuts', '键盘', '快捷键'],
      description: '查看键盘快捷键列表',
      icon: Keyboard,
      handler: handlers.onOpenKeyboardShortcuts
    },
    {
      id: 'help.release-notes',
      title: '版本说明',
      category: 'help',
      keywords: ['release', 'notes', 'changelog', '版本', '更新', '日志'],
      description: '查看版本更新说明',
      icon: FileText,
      handler: handlers.onOpenReleaseNotes
    },
    {
      id: 'help.report-issue',
      title: '报告问题',
      category: 'help',
      keywords: ['report', 'issue', 'bug', '报告', '问题', '反馈'],
      description: '报告问题或提供反馈',
      icon: Bug,
      handler: handlers.onReportIssue
    },
    {
      id: 'help.check-updates',
      title: '检查更新',
      category: 'help',
      keywords: ['update', 'check', '更新', '检查'],
      description: '检查软件更新',
      icon: Download,
      handler: handlers.onCheckUpdates
    }
  ];
}

