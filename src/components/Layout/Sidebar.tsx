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
  Filter,
  MessageSquare,
  Globe,
  Radio
} from 'lucide-react';
import { NewSessionModal, SessionData } from '@/components/NewSessionModal';

interface SidebarProps {
  onCollapse: () => void;
}

interface TreeNode {
  id: string;
  label: string;
  type: 'workspace' | 'session' | 'connection' | 'filter';
  protocol?: 'TCP' | 'UDP' | 'MQTT' | 'WebSocket' | 'SSE';
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
        protocol: 'TCP',
        status: 'connected',
        expanded: true,
        children: [
          {
            id: 'conn-1',
            label: '192.168.1.100:8080',
            type: 'connection',
            protocol: 'TCP',
            status: 'connected'
          }
        ]
      },
      {
        id: 'session-2',
        label: 'UDP 服务端',
        type: 'session',
        protocol: 'UDP',
        status: 'disconnected',
        children: [
          {
            id: 'conn-2',
            label: '0.0.0.0:9090',
            type: 'connection',
            protocol: 'UDP',
            status: 'disconnected'
          }
        ]
      },
      {
        id: 'session-3',
        label: 'MQTT 客户端',
        type: 'session',
        protocol: 'MQTT',
        status: 'connecting',
        children: []
      },
      {
        id: 'session-4',
        label: 'WebSocket 服务端',
        type: 'session',
        protocol: 'WebSocket',
        status: 'disconnected',
        children: []
      },
      {
        id: 'session-5',
        label: 'SSE 客户端',
        type: 'session',
        protocol: 'SSE',
        status: 'disconnected',
        children: []
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

const getProtocolIcon = (protocol?: string) => {
  switch (protocol) {
    case 'TCP':
    case 'UDP':
      return <Wifi className="w-4 h-4" />;
    case 'MQTT':
      return <MessageSquare className="w-4 h-4" />;
    case 'WebSocket':
      return <Globe className="w-4 h-4" />;
    case 'SSE':
      return <Radio className="w-4 h-4" />;
    default:
      return <Wifi className="w-4 h-4" />;
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

        {/* Protocol Icon */}
        {node.type === 'session' && (
          <div className="mr-2">
            {getProtocolIcon(node.protocol)}
          </div>
        )}

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

export const Sidebar: React.FC<SidebarProps> = ({ onCollapse }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [treeData, setTreeData] = useState(mockData);
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);

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

  // 按钮事件处理函数
  const handleNewSession = () => {
    setIsNewSessionModalOpen(true);
  };

  const handleCreateSession = (sessionData: SessionData) => {
    console.log('创建新会话:', sessionData);
    // TODO: 实际创建会话的逻辑
    // 这里可以调用API或更新状态来创建新的会话
  };

  const getSidebarContent = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handleNewSession}
            className="p-1 hover:bg-accent rounded"
            title="新建会话"
          >
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
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-semibold text-sm">
          会话管理
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

      {/* New Session Modal */}
      <NewSessionModal
        isOpen={isNewSessionModalOpen}
        onClose={() => setIsNewSessionModalOpen(false)}
        onConfirm={handleCreateSession}
      />
    </div>
  );
};
