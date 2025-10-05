import React, { useState } from 'react';
import { cn } from '@/utils';
import {
  Plus,
  Search,
  Zap,
  Activity,
  Wrench,
  FileText,
  Settings,
  Puzzle,
  Edit3,
  Terminal,
  Command
} from 'lucide-react';
import { useLayoutConfig } from '@/hooks/useResponsive';
import { usePlatform } from '@/hooks/usePlatform';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSession } from '@/contexts/SessionContext';
import { networkService } from '@/services/NetworkService';
import { useAppStore } from '@/stores/AppStore';
import { MessageSearchDialog } from '@/components/MessageSearch';
import { CommandPalette } from '@/components/CommandPalette/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { commandPaletteService } from '@/services/CommandPalette';

interface ToolBarProps {
  className?: string;
  onOpenModal: (modalType: string) => void;
}

interface ToolBarItem {
  id?: string;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  disabled?: boolean;
}

// 左侧主要功能按钮
const createLeftToolBarItems = (
  onOpenModal: (modalType: string) => void,
  onConnect: () => void,
  canConnect: boolean,
  connectButtonLabel: string,
  onToggleCapture: () => void,
  isCapturing: boolean,
  captureButtonLabel: string,
  canCapture: boolean,
  onOpenSearch: () => void,
  canSearch: boolean,
  onOpenCommandPalette: () => void,
  onOpenProtoShell: () => void
): ToolBarItem[] => [
  {
    id: 'new-session',
    label: '新建会话',
    icon: Plus,
    shortcut: 'Ctrl+N',
    action: () => onOpenModal('new-session')
  },
  {
    id: 'connect',
    label: connectButtonLabel,
    icon: Zap,
    shortcut: 'Ctrl+Enter',
    action: onConnect,
    disabled: !canConnect
  },
  {
    id: 'capture',
    label: captureButtonLabel,
    icon: Activity,
    shortcut: 'Ctrl+R',
    action: onToggleCapture,
    disabled: !canCapture
  },
  {
    id: 'search',
    label: '搜索',
    icon: Search,
    shortcut: 'Ctrl+F',
    action: onOpenSearch,
    disabled: !canSearch
  },
  {
    id: 'edit-protocol',
    label: '编辑协议',
    icon: Edit3,
    action: () => onOpenModal('edit-protocol')
  },
  {
    id: 'command-palette',
    label: '快捷命令',
    icon: Command,
    shortcut: 'Ctrl+K',
    action: onOpenCommandPalette
  },
  {
    id: 'proto-shell',
    label: 'ProtoShell',
    icon: Terminal,
    action: onOpenProtoShell
  }
];

// 右侧工具和设置按钮
const createRightToolBarItems = (onOpenModal: (modalType: string) => void): ToolBarItem[] => [
  {
    id: 'settings',
    label: '设置',
    icon: Settings,
    action: () => onOpenModal('settings')
  }
];

export const ToolBar: React.FC<ToolBarProps> = ({ className, onOpenModal }) => {
  const layoutConfig = useLayoutConfig();
  const { isMacOS } = usePlatform();
  const { selectedNode } = useSession();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Initialize command palette
  useCommandPalette({
    onOpenModal,
    onOpenToolbox: () => onOpenModal('toolbox')
  });

  // 使用 Zustand 选择器直接订阅会话状态变化，确保状态更新时组件重新渲染
  const currentSession = useAppStore(state =>
    selectedNode?.config ? state.sessions[selectedNode.config.id] : null
  );

  // 获取 store 方法
  const startRecording = useAppStore(state => state.startRecording);
  const stopRecording = useAppStore(state => state.stopRecording);

  // 判断是否可以连接：选中的节点必须是会话类型且有连接类型
  const canConnect = Boolean(selectedNode &&
    selectedNode.type === 'session' &&
    selectedNode.connectionType &&
    ['client', 'server'].includes(selectedNode.connectionType));

  // 获取当前会话的连接状态
  const isConnected = currentSession?.status === 'connected';

  // 根据连接状态确定按钮文本
  const connectButtonLabel = isConnected ? '断开连接' : '连接';



  // 连接处理函数
  const handleConnect = async () => {
    if (!selectedNode || !selectedNode.config) {
      console.warn('No valid node selected for connection');
      return;
    }

    try {
      const sessionId = selectedNode.config.id;

      if (!currentSession) {
        console.error('Session not found:', sessionId);
        return;
      }

      // 检查当前连接状态
      const isCurrentlyConnected = currentSession.status === 'connected';

      if (isCurrentlyConnected) {
        // 如果已连接，则断开连接
        await networkService.disconnect(sessionId);
        console.log('Disconnected from session:', sessionId);
      } else {
        // 如果未连接，则建立连接
        await networkService.connect(sessionId);
        console.log('Connected to session:', sessionId);
      }
    } catch (error) {
      console.error('Connection operation failed:', error);
    }
  };

  // 抓包处理函数
  const handleToggleCapture = () => {
    if (!selectedNode || !selectedNode.config) {
      console.warn('No valid node selected for capture');
      return;
    }

    const sessionId = selectedNode.config.id;
    const isRecording = currentSession?.isRecording || false;

    if (isRecording) {
      stopRecording(sessionId);
      console.log('Stopped recording session:', sessionId);
    } else {
      startRecording(sessionId);
      console.log('Started recording session:', sessionId);
    }
  };

  // 搜索处理函数
  const handleOpenSearch = () => {
    setIsSearchOpen(true);
  };

  // 快捷命令处理函数
  const handleOpenCommandPalette = () => {
    commandPaletteService.open();
  };

  // ProtoShell 处理函数
  const handleOpenProtoShell = () => {
    // TODO: 实现 ProtoShell 功能
    console.log('Opening ProtoShell...');
    onOpenModal('proto-shell');
  };

  // 判断是否可以抓包：必须有选中的会话
  const canCapture = Boolean(selectedNode && selectedNode.type === 'session');
  const isCapturing = currentSession?.isRecording || false;
  const captureButtonLabel = isCapturing ? '停止抓包' : '开始抓包';

  // 判断是否可以搜索：必须有选中的会话且有消息
  const canSearch = Boolean(
    selectedNode &&
    selectedNode.type === 'session' &&
    currentSession &&
    currentSession.messages.length > 0
  );

  // 注册键盘快捷键
  useKeyboardShortcuts([
    {
      key: 'r',
      ctrl: true,
      handler: () => {
        if (canCapture) {
          handleToggleCapture();
        }
      },
      description: '开始/停止抓包'
    },
    {
      key: 'f',
      ctrl: true,
      handler: () => {
        if (canSearch) {
          handleOpenSearch();
        }
      },
      description: '搜索消息'
    },
    {
      key: 'k',
      ctrl: true,
      handler: () => {
        handleOpenCommandPalette();
      },
      description: '打开控制面板'
    }
  ]);

  const leftItems = createLeftToolBarItems(
    onOpenModal,
    handleConnect,
    canConnect,
    connectButtonLabel,
    handleToggleCapture,
    isCapturing,
    captureButtonLabel,
    canCapture,
    handleOpenSearch,
    canSearch,
    handleOpenCommandPalette,
    handleOpenProtoShell
  );
  const rightItems = createRightToolBarItems(onOpenModal);

  const handleItemClick = (item: ToolBarItem) => {
    if (item.disabled) {
      return;
    }
    if (item.action) {
      item.action();
    }
  };

  // 根据屏幕尺寸决定显示哪些左侧按钮
  const getVisibleLeftItems = () => {
    if (layoutConfig.toolbar.showAllButtons) {
      return leftItems;
    } else if (layoutConfig.toolbar.showEssentialButtons) {
      // 平板：显示核心功能，包括快捷命令和 ProtoShell
      return leftItems.filter(item =>
        item.id && ['new-session', 'connect', 'capture', 'search', 'command-palette', 'proto-shell'].includes(item.id)
      );
    } else {
      // 移动端：只显示最重要的功能
      return leftItems.filter(item =>
        item.id && ['new-session', 'connect'].includes(item.id)
      );
    }
  };

  // 根据屏幕尺寸决定显示哪些右侧按钮
  const getVisibleRightItems = () => {
    // 所有设备都只显示设置按钮，其他功能通过Tab导航访问
    return rightItems;
  };

  const visibleLeftItems = getVisibleLeftItems();
  const visibleRightItems = getVisibleRightItems();

  const renderToolBarItem = (item: ToolBarItem, index: number, compact = false) => {
    if (item.separator) {
      return (
        <div key={`separator-${index}`} className="w-px h-6 bg-border mx-1" />
      );
    }

    const Icon = item.icon;

    if (!Icon) {
      return null;
    }

    if (compact) {
      // 紧凑模式：只显示图标
      return (
        <button
          key={item.id}
          onClick={() => handleItemClick(item)}
          disabled={item.disabled}
          className={cn(
            "flex items-center justify-center p-2 rounded-md transition-colors",
            "hover:bg-accent text-muted-foreground hover:text-foreground",
            item.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
          )}
          title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
        >
          <Icon className="w-4 h-4" />
        </button>
      );
    }

    // 特殊处理抓包按钮，添加动画效果
    const isCapturingButton = item.id === 'capture' && isCapturing;

    return (
      <button
        key={item.id}
        onClick={() => handleItemClick(item)}
        disabled={item.disabled}
        className={cn(
          "flex flex-col items-center justify-center px-3 py-2 text-xs rounded-md transition-colors min-w-16 h-12",
          "hover:bg-accent text-muted-foreground hover:text-foreground",
          layoutConfig.isMobile && "min-w-12 px-2",
          item.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground",
          isCapturingButton && "bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600"
        )}
        title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
      >
        <Icon className={cn(
          "w-4 h-4 mb-1",
          isCapturingButton && "animate-pulse"
        )} />
        {!layoutConfig.isMobile && (
          <span className="leading-none">{item.label}</span>
        )}
      </button>
    );
  };

  return (
    <>
      <div className={cn(
        "h-16 bg-card border-b border-border flex items-center justify-between",
        layoutConfig.isMobile ? "px-2 h-14" : "px-4",
        // Add macOS-specific padding to avoid window controls
        isMacOS && "macos-window-controls-padding",
        // Add small top padding on macOS to account for minimal drag region
        isMacOS && "pt-3",
        className
      )}>


        {/* 左侧主要功能按钮 */}
        <div className="flex items-center space-x-1">
          {visibleLeftItems.map((item, index) => renderToolBarItem(item, index))}
        </div>

        {/* 右侧工具和设置按钮 */}
        <div className="flex items-center space-x-2">
          {/* 主题切换按钮 */}
          <ThemeToggle compact />

          {/* 设置按钮 */}
          <div className="flex items-center space-x-1">
            {visibleRightItems.map((item, index) => renderToolBarItem(item, index))}
          </div>
        </div>
      </div>

      {/* 消息搜索对话框 */}
      <MessageSearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        messages={currentSession?.messages || []}
        onMessageSelect={(messageId) => {
          console.log('Selected message:', messageId);
          // TODO: 实现消息定位功能
        }}
      />

      {/* 快捷命令 */}
      <CommandPalette />
    </>
  );
};
