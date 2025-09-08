import React from 'react';
import { cn } from '@/utils';
import { 
  Network, 
  Wrench, 
  FileText, 
  Play, 
  Puzzle, 
  Settings,
  Plus,
  Save,
  FolderOpen,
  Search,
  Zap,
  Activity
} from 'lucide-react';

interface ToolBarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  className?: string;
}

interface ToolBarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
}

const toolBarItems: ToolBarItem[] = [
  {
    id: 'new-session',
    label: '新建会话',
    icon: Plus,
    shortcut: 'Ctrl+N',
    action: () => console.log('New Session')
  },
  {
    id: 'open',
    label: '打开',
    icon: FolderOpen,
    shortcut: 'Ctrl+O',
    action: () => console.log('Open')
  },
  {
    id: 'save',
    label: '保存',
    icon: Save,
    shortcut: 'Ctrl+S',
    action: () => console.log('Save')
  },
  { separator: true },
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
  { separator: true },
  {
    id: 'sessions',
    label: '会话',
    icon: Network
  },
  {
    id: 'toolbox',
    label: '工具箱',
    icon: Wrench
  },
  {
    id: 'logs',
    label: '日志',
    icon: FileText
  },
  {
    id: 'playback',
    label: '回放',
    icon: Play
  },
  {
    id: 'plugins',
    label: '插件',
    icon: Puzzle
  },
  { separator: true },
  {
    id: 'search',
    label: '搜索',
    icon: Search,
    shortcut: 'Ctrl+F',
    action: () => console.log('Search')
  },
  {
    id: 'settings',
    label: '设置',
    icon: Settings
  }
];

export const ToolBar: React.FC<ToolBarProps> = ({ 
  activeView, 
  onViewChange, 
  className 
}) => {
  const handleItemClick = (item: ToolBarItem) => {
    if (item.action) {
      item.action();
    } else if (item.id) {
      onViewChange(item.id);
    }
  };

  const renderToolBarItem = (item: ToolBarItem, index: number) => {
    if (item.separator) {
      return (
        <div key={`separator-${index}`} className="w-px h-6 bg-border mx-1" />
      );
    }

    const Icon = item.icon;
    const isActive = activeView === item.id;
    const isViewItem = !item.action; // 区分视图切换按钮和动作按钮

    return (
      <button
        key={item.id}
        onClick={() => handleItemClick(item)}
        className={cn(
          "flex flex-col items-center justify-center px-3 py-2 text-xs rounded-md transition-colors min-w-16 h-12",
          isViewItem && isActive 
            ? "bg-primary text-primary-foreground" 
            : "hover:bg-accent text-muted-foreground hover:text-foreground",
          item.action && "hover:bg-accent/80" // 动作按钮的特殊样式
        )}
        title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
      >
        <Icon className="w-4 h-4 mb-1" />
        <span className="leading-none">{item.label}</span>
      </button>
    );
  };

  return (
    <div className={cn(
      "h-16 bg-card border-b border-border flex items-center px-4 space-x-1",
      className
    )}>
      {/* Left side - Action buttons */}
      <div className="flex items-center space-x-1">
        {toolBarItems
          .filter(item => item.action || item.separator)
          .map((item, index) => renderToolBarItem(item, index))}
      </div>

      {/* Center - View navigation */}
      <div className="flex-1 flex items-center justify-center space-x-1">
        {toolBarItems
          .filter(item => !item.action && !item.separator)
          .map((item, index) => renderToolBarItem(item, index))}
      </div>

      {/* Right side - Additional info or controls */}
      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>就绪</span>
        </div>
        <div>版本 0.0.1</div>
      </div>
    </div>
  );
};
