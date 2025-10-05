import React from 'react';
import { cn } from '@/utils';
import {
  Plus,
  Settings,
  Edit3,
  Terminal,
  Command,
  Wrench,
  FileText,
  Puzzle,
  Database
} from 'lucide-react';
import { useLayoutConfig } from '@/hooks/useResponsive';
import { usePlatform } from '@/hooks/usePlatform';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ThemeToggle } from '@/components/ThemeToggle';
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
  onOpenCommandPalette: () => void,
  onOpenProtoShell: () => void
): ToolBarItem[] => [
  // 核心操作区
  {
    id: 'new-session',
    label: '新建会话',
    icon: Plus,
    shortcut: 'Ctrl+N',
    action: () => onOpenModal('new-session')
  },
  {
    id: 'edit-protocol',
    label: '编辑协议',
    icon: Edit3,
    action: () => onOpenModal('edit-protocol')
  },
  // 工具区
  {
    id: 'toolbox',
    label: '工具箱',
    icon: Wrench,
    shortcut: 'Ctrl+2',
    action: () => onOpenModal('toolbox')
  },
  {
    id: 'proto-shell',
    label: 'ProtoShell',
    icon: Terminal,
    action: onOpenProtoShell
  },
  {
    id: 'command-palette',
    label: '快捷命令',
    icon: Command,
    shortcut: 'Ctrl+K',
    action: onOpenCommandPalette
  },
  // 管理区
  {
    id: 'plugins',
    label: '协议仓库',
    icon: Puzzle,
    shortcut: 'Ctrl+4',
    action: () => onOpenModal('plugins')
  },
  {
    id: 'logs',
    label: '日志管理',
    icon: FileText,
    shortcut: 'Ctrl+3',
    action: () => onOpenModal('logs')
  },
  {
    id: 'storage',
    label: '储存方式',
    icon: Database,
    shortcut: 'Ctrl+5',
    action: () => onOpenModal('storage')
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

  // Initialize command palette
  useCommandPalette({
    onOpenModal,
    onOpenToolbox: () => onOpenModal('toolbox')
  });

  // 快捷命令处理函数
  const handleOpenCommandPalette = () => {
    commandPaletteService.open();
  };

  // ProtoShell 处理函数
  const handleOpenProtoShell = () => {
    console.log('Opening ProtoShell...');
    onOpenModal('proto-shell');
  };

  // 注册键盘快捷键
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      handler: () => {
        handleOpenCommandPalette();
      },
      description: '打开快捷命令'
    },
    {
      key: '2',
      ctrl: true,
      handler: () => {
        onOpenModal('toolbox');
      },
      description: '打开工具箱'
    },
    {
      key: '3',
      ctrl: true,
      handler: () => {
        onOpenModal('logs');
      },
      description: '打开日志管理'
    },
    {
      key: '4',
      ctrl: true,
      handler: () => {
        onOpenModal('plugins');
      },
      description: '打开协议仓库'
    },
    {
      key: '5',
      ctrl: true,
      handler: () => {
        onOpenModal('storage');
      },
      description: '打开储存方式'
    }
  ]);

  const leftItems = createLeftToolBarItems(
    onOpenModal,
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
      // 平板：显示核心功能
      return leftItems.filter(item =>
        item.id && ['new-session', 'edit-protocol', 'command-palette', 'proto-shell', 'toolbox', 'logs'].includes(item.id)
      );
    } else {
      // 移动端：只显示最重要的功能
      return leftItems.filter(item =>
        item.id && ['new-session', 'command-palette', 'toolbox'].includes(item.id)
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

    return (
      <button
        key={item.id}
        onClick={() => handleItemClick(item)}
        disabled={item.disabled}
        className={cn(
          "flex flex-col items-center justify-center px-3 py-2 text-xs rounded-md transition-colors min-w-16 h-12",
          "hover:bg-accent text-muted-foreground hover:text-foreground",
          layoutConfig.isMobile && "min-w-12 px-2",
          item.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
        )}
        title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
      >
        <Icon className="w-4 h-4 mb-1" />
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

      {/* 快捷命令 */}
      <CommandPalette />
    </>
  );
};
