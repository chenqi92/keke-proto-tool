import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import { useAppStore } from '@/stores/AppStore';
import {
  Home,
  Wrench,
  FileText,
  Puzzle,
  ChevronLeft,
  ChevronRight,
  Folder,
  Wifi,
  MessageSquare,
  Globe,
  Radio,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';

export type TabId = 'workspace' | 'toolbox' | 'logs' | 'plugins';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  className?: string;
}

const tabs: Tab[] = [
  {
    id: 'workspace',
    label: '工作区',
    icon: Home,
    shortcut: 'Ctrl+1'
  },
  {
    id: 'toolbox',
    label: '工具箱',
    icon: Wrench,
    shortcut: 'Ctrl+2'
  },
  {
    id: 'logs',
    label: '日志管理',
    icon: FileText,
    shortcut: 'Ctrl+3'
  },
  {
    id: 'plugins',
    label: '插件管理',
    icon: Puzzle,
    shortcut: 'Ctrl+4'
  }
];

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  className
}) => {
  const [isScrollable, setIsScrollable] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  // 获取选中节点信息
  const { selectedNodeId, selectedNodeType, selectedNodeData } = useAppStore();



  // 检查是否需要滚动
  useEffect(() => {
    const checkScrollable = () => {
      const container = document.getElementById('tab-container');
      if (container) {
        setIsScrollable(container.scrollWidth > container.clientWidth);
      }
    };

    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, []);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        const tabIndex = parseInt(event.key) - 1;
        if (tabIndex >= 0 && tabIndex < tabs.length) {
          event.preventDefault();
          onTabChange(tabs[tabIndex].id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onTabChange]);

  const scrollTabs = (direction: 'left' | 'right') => {
    const container = document.getElementById('tab-container');
    if (container) {
      const scrollAmount = 200;
      const newPosition = direction === 'left'
        ? Math.max(0, scrollPosition - scrollAmount)
        : Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount);

      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  // 获取节点图标
  const getNodeIcon = (nodeType: string, protocol?: string) => {
    if (nodeType === 'workspace') return Folder;

    switch (protocol) {
      case 'TCP':
      case 'UDP':
        return Wifi;
      case 'MQTT':
        return MessageSquare;
      case 'WebSocket':
        return Globe;
      case 'SSE':
        return Radio;
      default:
        return Wifi;
    }
  };

  // 获取节点显示名称
  const getNodeDisplayName = (nodeData: any) => {
    if (!nodeData) return '';

    switch (nodeData.viewType) {
      case 'workspace-overview':
        return '工作区概览';
      case 'protocol-type-overview':
        return `${nodeData.protocol} ${nodeData.connectionType === 'client' ? '客户端' : '服务端'}`;
      case 'session-detail':
        return nodeData.label || '会话详情';
      case 'connection-detail':
        return '连接详情';
      default:
        return nodeData.label || '';
    }
  };

  return (
    <div className={cn("flex items-center bg-background border-b border-border", className)}>
      {/* 左滚动按钮 */}
      {isScrollable && scrollPosition > 0 && (
        <button
          onClick={() => scrollTabs('left')}
          className="flex-shrink-0 p-2 hover:bg-accent transition-colors"
          title="向左滚动"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Tab容器 */}
      <div
        id="tab-container"
        className="flex-1 flex overflow-x-auto scrollbar-hide"
        onScroll={(e) => setScrollPosition(e.currentTarget.scrollLeft)}
      >
        <div className="flex min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;


            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap",
                  "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset",
                  isActive
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                title={`${tab.label} (${tab.shortcut})`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 节点面包屑导航 */}
      {activeTab === 'workspace' && selectedNodeData && selectedNodeData.viewType && (
        <div className="flex items-center space-x-2 px-4 py-2 bg-muted/30 border-l border-border">
          <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center space-x-2">
            {(() => {
              const NodeIcon = getNodeIcon(selectedNodeType || '', selectedNodeData.protocol);
              return <NodeIcon className="w-4 h-4 text-muted-foreground" />;
            })()}
            <span className="text-sm text-muted-foreground">
              {getNodeDisplayName(selectedNodeData)}
            </span>
          </div>
        </div>
      )}

      {/* 右滚动按钮 */}
      {isScrollable && (
        <button
          onClick={() => scrollTabs('right')}
          className="flex-shrink-0 p-2 hover:bg-accent transition-colors"
          title="向右滚动"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
