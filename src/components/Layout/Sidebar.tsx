import React, { useState } from 'react';
import { cn } from '@/utils';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Plus, 
  MoreHorizontal,
  Wifi,
  WifiOff,
  Circle,
  Play,
  Square,
  Filter
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onCollapse: () => void;
}

interface TreeNode {
  id: string;
  label: string;
  type: 'workspace' | 'session' | 'connection' | 'filter';
  status?: 'connected' | 'disconnected' | 'connecting';
  children?: TreeNode[];
  expanded?: boolean;
}

const mockData: TreeNode[] = [
  {
    id: 'workspace-1',
    label: '默认工作区',
    type: 'workspace',
    expanded: true,
    children: [
      {
        id: 'session-1',
        label: 'TCP 客户端',
        type: 'session',
        status: 'connected',
        expanded: true,
        children: [
          {
            id: 'conn-1',
            label: '192.168.1.100:8080',
            type: 'connection',
            status: 'connected'
          }
        ]
      },
      {
        id: 'session-2',
        label: 'UDP 服务端',
        type: 'session',
        status: 'disconnected',
        children: [
          {
            id: 'conn-2',
            label: '0.0.0.0:9090',
            type: 'connection',
            status: 'disconnected'
          }
        ]
      }
    ]
  }
];

const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'connected':
      return <Circle className="w-3 h-3 fill-green-500 text-green-500" />;
    case 'connecting':
      return <Circle className="w-3 h-3 fill-yellow-500 text-yellow-500" />;
    case 'disconnected':
    default:
      return <Circle className="w-3 h-3 fill-gray-400 text-gray-400" />;
  }
};

const TreeItem: React.FC<{
  node: TreeNode;
  level: number;
  onToggle: (id: string) => void;
}> = ({ node, level, onToggle }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = node.expanded;

  return (
    <div>
      <div
        className={cn(
          "flex items-center px-2 py-1 text-sm hover:bg-accent rounded-md cursor-pointer group",
          level > 0 && "ml-4"
        )}
        style={{ paddingLeft: `${8 + level * 16}px` }}
      >
        {/* Expand/Collapse Icon */}
        <button
          onClick={() => hasChildren && onToggle(node.id)}
          className="mr-1 p-0.5 hover:bg-accent rounded"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )
          ) : (
            <div className="w-3 h-3" />
          )}
        </button>

        {/* Status Icon */}
        {node.status && (
          <div className="mr-2">
            {getStatusIcon(node.status)}
          </div>
        )}

        {/* Label */}
        <span className="flex-1 truncate">{node.label}</span>

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
          {node.type === 'session' && (
            <>
              {node.status === 'connected' ? (
                <button className="p-1 hover:bg-accent rounded" title="断开连接">
                  <Square className="w-3 h-3" />
                </button>
              ) : (
                <button className="p-1 hover:bg-accent rounded" title="开始连接">
                  <Play className="w-3 h-3" />
                </button>
              )}
            </>
          )}
          <button className="p-1 hover:bg-accent rounded" title="更多操作">
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onCollapse }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [treeData, setTreeData] = useState(mockData);

  const handleToggle = (id: string) => {
    const toggleNode = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children) {
          return { ...node, children: toggleNode(node.children) };
        }
        return node;
      });
    };
    setTreeData(toggleNode(treeData));
  };

  const getSidebarContent = () => {
    switch (activeView) {
      case 'sessions':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">会话管理</h3>
              <button className="p-1 hover:bg-accent rounded" title="新建会话">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索会话..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Connection Tree */}
            <div className="space-y-1">
              {treeData.map((node) => (
                <TreeItem
                  key={node.id}
                  node={node}
                  level={0}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </div>
        );

      case 'toolbox':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">工具箱</h3>
            <div className="space-y-2">
              <div className="p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <h4 className="font-medium text-sm">报文生成器</h4>
                <p className="text-xs text-muted-foreground mt-1">生成测试报文</p>
              </div>
              <div className="p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <h4 className="font-medium text-sm">CRC 校验</h4>
                <p className="text-xs text-muted-foreground mt-1">计算和验证校验和</p>
              </div>
              <div className="p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <h4 className="font-medium text-sm">时间戳转换</h4>
                <p className="text-xs text-muted-foreground mt-1">时间格式转换</p>
              </div>
            </div>
          </div>
        );

      case 'logs':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">日志检索</h3>
              <button className="p-1 hover:bg-accent rounded" title="过滤器">
                <Filter className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              <button className="w-full text-left p-2 hover:bg-accent rounded-md text-sm">
                今日日志
              </button>
              <button className="w-full text-left p-2 hover:bg-accent rounded-md text-sm">
                24小时内
              </button>
              <button className="w-full text-left p-2 hover:bg-accent rounded-md text-sm">
                7天内
              </button>
              <button className="w-full text-left p-2 hover:bg-accent rounded-md text-sm">
                已保存视图
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">工作台</h3>
            <div className="space-y-2">
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm">快速开始</h4>
                <p className="text-xs text-muted-foreground mt-1">创建第一个连接</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium text-sm">最近项目</h4>
                <p className="text-xs text-muted-foreground mt-1">查看最近使用的项目</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-semibold text-sm">
          {activeView === 'sessions' && '会话'}
          {activeView === 'toolbox' && '工具箱'}
          {activeView === 'logs' && '日志'}
          {activeView === 'workbench' && '工作台'}
          {!['sessions', 'toolbox', 'logs', 'workbench'].includes(activeView) && '侧边栏'}
        </h2>
        <button
          onClick={onCollapse}
          className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        {getSidebarContent()}
      </div>
    </div>
  );
};
