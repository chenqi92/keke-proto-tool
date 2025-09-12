import React from 'react';
import { cn } from '@/utils';
import {
  Plus,
  Search,
  Zap,
  Activity,
  Wrench,
  FileText,
  Settings,
  Puzzle
} from 'lucide-react';
import { useLayoutConfig } from '@/hooks/useResponsive';

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
}

// 左侧主要功能按钮
const createLeftToolBarItems = (onOpenModal: (modalType: string) => void): ToolBarItem[] => [
  {
    id: 'new-session',
    label: '新建会话',
    icon: Plus,
    shortcut: 'Ctrl+N',
    action: () => onOpenModal('new-session')
  },
  {
    id: 'connect',
    label: '连接',
    icon: Zap,
    shortcut: 'Ctrl+Enter',
    action: () => console.log('Connect')
  },
  {
    id: 'capture',
    label: '抓包',
    icon: Activity,
    shortcut: 'Ctrl+R',
    action: () => console.log('Start Capture')
  },
  {
    id: 'search',
    label: '搜索',
    icon: Search,
    shortcut: 'Ctrl+F',
    action: () => console.log('Search')
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
  const leftItems = createLeftToolBarItems(onOpenModal);
  const rightItems = createRightToolBarItems(onOpenModal);

  const handleItemClick = (item: ToolBarItem) => {
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
        item.id && ['new-session', 'connect', 'capture', 'search'].includes(item.id)
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
          className={cn(
            "flex items-center justify-center p-2 rounded-md transition-colors",
            "hover:bg-accent text-muted-foreground hover:text-foreground"
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
        className={cn(
          "flex flex-col items-center justify-center px-3 py-2 text-xs rounded-md transition-colors min-w-16 h-12",
          "hover:bg-accent text-muted-foreground hover:text-foreground",
          layoutConfig.isMobile && "min-w-12 px-2"
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
    <div className={cn(
      "h-16 bg-card border-b border-border flex items-center justify-between px-4",
      layoutConfig.isMobile && "px-2 h-14",
      className
    )}>
      {/* 左侧主要功能按钮 */}
      <div className="flex items-center space-x-1">
        {visibleLeftItems.map((item, index) => renderToolBarItem(item, index))}
      </div>

      {/* 右侧工具和设置按钮 */}
      <div className="flex items-center space-x-1">
        {visibleRightItems.map((item, index) => renderToolBarItem(item, index))}
      </div>
    </div>
  );
};
