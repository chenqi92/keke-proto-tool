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
import { getVersionDisplayText } from '@/constants/version';

interface ToolBarProps {
  className?: string;
  onOpenModal: (modalType: string) => void;
}

interface ToolBarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
}

const createToolBarItems = (onOpenModal: (modalType: string) => void): ToolBarItem[] => [
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
  },
  { separator: true },
  {
    id: 'toolbox',
    label: '工具箱',
    icon: Wrench,
    action: () => onOpenModal('toolbox')
  },
  {
    id: 'logs',
    label: '日志管理',
    icon: FileText,
    action: () => onOpenModal('logs')
  },
  {
    id: 'plugins',
    label: '插件管理',
    icon: Puzzle,
    action: () => onOpenModal('plugins')
  },
  {
    id: 'settings',
    label: '设置',
    icon: Settings,
    action: () => onOpenModal('settings')
  }
];

export const ToolBar: React.FC<ToolBarProps> = ({ className, onOpenModal }) => {
  const layoutConfig = useLayoutConfig();
  const toolBarItems = createToolBarItems(onOpenModal);

  const handleItemClick = (item: ToolBarItem) => {
    if (item.action) {
      item.action();
    }
  };

  // 根据屏幕尺寸决定显示哪些按钮
  const getVisibleItems = () => {
    if (layoutConfig.toolbar.showAllButtons) {
      return toolBarItems;
    } else if (layoutConfig.toolbar.showEssentialButtons) {
      // 平板：显示核心功能
      return toolBarItems.filter(item =>
        ['new-session', 'connect', 'capture', 'search'].includes(item.id)
      );
    } else {
      // 移动端：只显示最重要的功能
      return toolBarItems.filter(item =>
        ['new-session', 'connect'].includes(item.id)
      );
    }
  };

  const visibleItems = getVisibleItems();
  const _hiddenItems = toolBarItems.filter(item => !visibleItems.includes(item));

  const renderToolBarItem = (item: ToolBarItem, index: number, compact = false) => {
    if (item.separator) {
      return (
        <div key={`separator-${index}`} className="w-px h-6 bg-border mx-1" />
      );
    }

    const Icon = item.icon;

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
      "h-16 bg-card border-b border-border flex items-center px-4 space-x-1",
      layoutConfig.isMobile && "px-2 h-14",
      className
    )}>
      {/* Action buttons */}
      <div className="flex items-center space-x-1">
        {visibleItems.map((item, index) => renderToolBarItem(item, index))}

        {/* 更多按钮（当有隐藏项目时） - 暂时禁用以测试响应式功能 */}
        {/* {hiddenItems.length > 0 && (
          <div className="relative group">
            <button
              className={cn(
                "flex items-center justify-center p-2 rounded-md transition-colors",
                "hover:bg-accent text-muted-foreground hover:text-foreground"
              )}
              title="更多工具"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="py-1 min-w-32">
                {hiddenItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="w-full flex items-center px-3 py-2 text-sm hover:bg-accent text-left"
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )} */}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side - Status info */}
      {layoutConfig.statusBar.showAllInfo && (
        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>就绪</span>
          </div>
          <div>{getVersionDisplayText()}</div>
        </div>
      )}

      {layoutConfig.statusBar.showEssentialInfo && !layoutConfig.statusBar.showAllInfo && (
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>就绪</span>
        </div>
      )}
    </div>
  );
};
