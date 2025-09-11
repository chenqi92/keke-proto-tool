import React, { useState, useMemo } from 'react';
import { cn } from '@/utils';
import {
  ChevronDown,
  ChevronRight,
  Search,
  MoreHorizontal,
  Wifi,
  Circle,
  Play,
  Square,
  MessageSquare,
  Globe,
  Radio,
  RefreshCw,
  Folder
} from 'lucide-react';
import { NewSessionModal, SessionData } from '@/components/NewSessionModal';
import { EditConfigModal } from '@/components/EditConfigModal';
import { useAppStore, useAllSessions } from '@/stores/AppStore';
import { networkService } from '@/services/NetworkService';
import { SessionConfig } from '@/types';
import {
  ContextMenu,
  createWorkspaceMenuItems,
  createProtocolTypeMenuItems,
  createSessionMenuItems,
  createConnectionMenuItems,
  useSessionDeleteModal,
  useWorkspaceClearModal
} from '@/components/Common';

interface SidebarProps {
  onCollapse: () => void;
  onSessionSelect?: (sessionId: string, protocol: string) => void;
  onNodeSelect?: (nodeId: string, nodeType: 'workspace' | 'session' | 'connection', nodeData: any) => void;
}

interface TreeNode {
  id: string;
  label: string;
  type: 'workspace' | 'protocol-type' | 'session' | 'connection';
  protocol?: 'TCP' | 'UDP' | 'MQTT' | 'WebSocket' | 'SSE';
  connectionType?: 'client' | 'server';
  status?: 'connected' | 'disconnected' | 'connecting';
  children?: TreeNode[];
  expanded?: boolean;
  sessionData?: any; // For storing session reference
}

// Helper function to create flattened tree data from real sessions
const createTreeDataFromSessions = (sessions: any[]): TreeNode[] => {
  // Group sessions by protocol and connection type combination
  const protocolTypeGroups: { [key: string]: any[] } = {};

  sessions.forEach(session => {
    const protocol = session.config.protocol;
    const connectionType = session.config.connectionType;
    const key = `${protocol}-${connectionType}`;

    if (!protocolTypeGroups[key]) {
      protocolTypeGroups[key] = [];
    }
    protocolTypeGroups[key].push(session);
  });

  // Create protocol-type nodes directly under workspace
  const protocolTypeNodes: TreeNode[] = [];
  const protocolTypes = [
    { protocol: 'TCP', connectionType: 'client', label: 'TCP 客户端' },
    { protocol: 'TCP', connectionType: 'server', label: 'TCP 服务端' },
    { protocol: 'UDP', connectionType: 'client', label: 'UDP 客户端' },
    { protocol: 'UDP', connectionType: 'server', label: 'UDP 服务端' },
    { protocol: 'WebSocket', connectionType: 'client', label: 'WebSocket 客户端' },
    { protocol: 'WebSocket', connectionType: 'server', label: 'WebSocket 服务端' },
    { protocol: 'MQTT', connectionType: 'client', label: 'MQTT 客户端' },
    { protocol: 'SSE', connectionType: 'client', label: 'SSE 客户端' }
  ];

  protocolTypes.forEach(({ protocol, connectionType, label }) => {
    const key = `${protocol}-${connectionType}`;
    const typeSessions = protocolTypeGroups[key] || [];

    // Only create the node if there are sessions or if we want to show empty categories
    if (typeSessions.length > 0) {
      const sessionNodes: TreeNode[] = typeSessions.map(session => {
        let children: TreeNode[] = [];

        if (session.status === 'connected') {
          if (session.config.connectionType === 'server') {
            // 服务端：显示连接的客户端
            const clientConnections = session.clientConnections || {};
            children = Object.values(clientConnections).map((client: any) => ({
              id: `client-${client.id}`,
              label: `${client.remoteAddress}:${client.remotePort}`,
              type: 'connection' as const,
              protocol: session.config.protocol as any,
              status: client.isActive ? 'connected' : 'disconnected',
              sessionData: { ...session, clientConnection: client }
            }));
          } else {
            // 客户端：显示连接的服务器
            children = [{
              id: `conn-${session.config.id}`,
              label: `${session.config.host}:${session.config.port}`,
              type: 'connection' as const,
              protocol: session.config.protocol as any,
              status: session.status,
              sessionData: session
            }];
          }
        }

        return {
          id: session.config.id,
          label: session.config.name,
          type: 'session' as const,
          protocol: session.config.protocol as any,
          connectionType: session.config.connectionType,
          status: session.status,
          sessionData: session,
          children
        };
      });

      protocolTypeNodes.push({
        id: `${protocol.toLowerCase()}-${connectionType}`,
        label,
        type: 'protocol-type',
        protocol: protocol as any,
        connectionType: connectionType as any,
        children: sessionNodes
      });
    }
  });

  const workspaceNode: TreeNode = {
    id: 'workspace-1',
    label: '默认工作区',
    type: 'workspace',
    children: protocolTypeNodes
  };

  return [workspaceNode];
};

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
  onSessionSelect?: (sessionId: string, protocol: string) => void;
  onNodeSelect?: (node: TreeNode) => void;
  selectedNodeId?: string | null;
  onConnect?: (nodeId: string, e: React.MouseEvent) => void;
  onDisconnect?: (nodeId: string, e: React.MouseEvent) => void;
  onToggleRecording?: (nodeId: string, e: React.MouseEvent) => void;
  onMoreActions?: (nodeId: string, e: React.MouseEvent) => void;
  connectingNodes?: Set<string>;
  recordingNodes?: Set<string>;
  expandedNodes?: Set<string>;
}> = ({
  node,
  level,
  onToggle,
  onSessionSelect,
  onNodeSelect,
  selectedNodeId,
  onConnect,
  onDisconnect,
  onToggleRecording,
  onMoreActions,
  connectingNodes = new Set(),
  recordingNodes = new Set(),
  expandedNodes = new Set()
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);

  return (
    <div>
      <div
        className={cn(
          "flex items-center px-2 py-1 text-sm hover:bg-accent rounded-md cursor-default group",
          level > 0 && "ml-4",
          selectedNodeId === node.id && "bg-primary/20 border border-primary/30"
        )}
        style={{ paddingLeft: `${8 + level * 16}px` }}
        onClick={() => {
          if (onNodeSelect) {
            onNodeSelect(node);
          }
          if (node.type === 'session' && node.protocol && onSessionSelect) {
            onSessionSelect(node.id, node.protocol);
          }
        }}
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

        {/* Node Type Icon */}
        <div className="mr-2">
          {node.type === 'workspace' && <Folder className="w-4 h-4" />}
          {node.type === 'protocol-type' && getProtocolIcon(node.protocol)}
          {node.type === 'session' && getProtocolIcon(node.protocol)}
          {node.type === 'connection' && <Globe className="w-4 h-4" />}
        </div>

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
              {connectingNodes.has(node.id) ? (
                <button className="p-1 hover:bg-accent rounded" title="连接中..." disabled>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                </button>
              ) : node.status === 'connected' ? (
                <button
                  className="p-1 hover:bg-accent rounded text-red-500"
                  title="断开连接"
                  onClick={(e) => onDisconnect?.(node.id, e)}
                >
                  <Square className="w-3 h-3" />
                </button>
              ) : (
                <button
                  className="p-1 hover:bg-accent rounded text-green-500"
                  title="开始连接"
                  onClick={(e) => onConnect?.(node.id, e)}
                >
                  <Play className="w-3 h-3" />
                </button>
              )}

              {/* Recording toggle */}
              <button
                className={cn(
                  "p-1 hover:bg-accent rounded",
                  recordingNodes.has(node.id) ? "text-red-500" : "text-muted-foreground"
                )}
                title={recordingNodes.has(node.id) ? "停止录制" : "开始录制"}
                onClick={(e) => onToggleRecording?.(node.id, e)}
              >
                {recordingNodes.has(node.id) ? (
                  <Square className="w-3 h-3" />
                ) : (
                  <Circle className="w-3 h-3" />
                )}
              </button>
            </>
          )}
          <button
            className="p-1 hover:bg-accent rounded"
            title="更多操作"
            onClick={(e) => onMoreActions?.(node.id, e)}
          >
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
              onSessionSelect={onSessionSelect}
              onNodeSelect={onNodeSelect}
              selectedNodeId={selectedNodeId}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
              onToggleRecording={onToggleRecording}
              onMoreActions={onMoreActions}
              connectingNodes={connectingNodes}
              recordingNodes={recordingNodes}
              expandedNodes={expandedNodes}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ onCollapse, onSessionSelect, onNodeSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [isEditConfigModalOpen, setIsEditConfigModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionConfig | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingNodes, setConnectingNodes] = useState<Set<string>>(new Set());
  const [recordingNodes, setRecordingNodes] = useState<Set<string>>(new Set());

  // 上下文菜单状态
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    nodeId: string;
    nodeType: 'workspace' | 'protocol-type' | 'session' | 'connection';
    nodeData: any;
  } | null>(null);

  // 删除确认模态框
  const sessionDeleteModal = useSessionDeleteModal();
  const workspaceClearModal = useWorkspaceClearModal();

  // Get real session data from store
  const sessions = useAllSessions();
  const sessionsMap = useAppStore(state => state.sessions);
  const createSession = useAppStore(state => state.createSession);
  const deleteSession = useAppStore(state => state.deleteSession);
  const startRecording = useAppStore(state => state.startRecording);
  const stopRecording = useAppStore(state => state.stopRecording);

  // Generate tree data from real sessions
  const treeData = useMemo(() => createTreeDataFromSessions(sessions), [sessions]);

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(['workspace-1'])
  );

  const handleToggle = (id: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleNodeSelect = (node: TreeNode) => {
    setSelectedNodeId(node.id);

    // Determine node type and handle different selections
    let nodeType: 'workspace' | 'session' | 'connection' = 'workspace';
    const nodeData: any = {
      protocol: node.protocol,
      label: node.label,
      status: node.status,
      connectionType: node.connectionType,
      sessionData: node.sessionData,
      type: node.type
    };

    switch (node.type) {
      case 'workspace':
        nodeType = 'workspace';
        nodeData.viewType = 'workspace-overview';
        break;
      case 'protocol-type':
        nodeType = 'workspace';
        nodeData.viewType = 'protocol-type-overview';
        nodeData.protocol = node.protocol;
        nodeData.connectionType = node.connectionType;
        break;
      case 'session':
        nodeType = 'session';
        nodeData.viewType = 'session-detail';
        nodeData.sessionId = node.id;
        break;
      case 'connection':
        nodeType = 'connection';
        nodeData.viewType = 'connection-detail';
        nodeData.sessionId = node.sessionData?.config?.id;
        break;
    }

    // Call the callback with node information
    if (onNodeSelect) {
      onNodeSelect(node.id, nodeType, nodeData);
    }

    // Also call the legacy session select callback if it's a session node
    if (node.type === 'session' && onSessionSelect && node.protocol) {
      onSessionSelect(node.id, node.protocol);
    }
  };

  const handleConnect = async (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConnectingNodes(prev => new Set(prev).add(nodeId));

    try {
      const success = await networkService.connect(nodeId);
      if (!success) {
        console.error('Connection failed for session:', nodeId);
      }
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setConnectingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
    }
  };

  const handleDisconnect = async (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await networkService.disconnect(nodeId);
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const handleToggleRecording = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (recordingNodes.has(nodeId)) {
      // Stop recording
      stopRecording(nodeId);
      setRecordingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
    } else {
      // Start recording
      startRecording(nodeId);
      setRecordingNodes(prev => new Set(prev).add(nodeId));
    }
  };

  const handleMoreActions = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // 找到对应的节点
    const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNodeById(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const node = findNodeById(treeData, nodeId);

    if (!node) {
      console.warn('Node not found:', nodeId);
      return;
    }

    // 关闭之前的菜单
    if (contextMenu?.isOpen) {
      setContextMenu(null);
      // 短暂延迟后打开新菜单，避免立即关闭
      setTimeout(() => {
        setContextMenu({
          isOpen: true,
          position: { x: e.clientX, y: e.clientY },
          nodeId,
          nodeType: node.type,
          nodeData: node
        });
      }, 10);
    } else {
      // 设置上下文菜单状态
      setContextMenu({
        isOpen: true,
        position: { x: e.clientX, y: e.clientY },
        nodeId,
        nodeType: node.type,
        nodeData: node
      });
    }
  };

  // 上下文菜单回调函数
  const handleContextMenuAction = {
    // 工作区级别操作
    onNewSession: () => {
      setIsNewSessionModalOpen(true);
    },
    onImportConfig: () => {
      console.log('导入配置');
      // TODO: 实现配置导入功能
    },
    onExportConfig: () => {
      console.log('导出配置');
      // TODO: 实现配置导出功能
    },
    onClearWorkspace: () => {
      workspaceClearModal.openModal(() => {
        // 删除所有会话
        sessions.forEach(session => {
          deleteSession(session.config.id);
        });
      });
    },
    onSettings: () => {
      console.log('工作区设置');
      // TODO: 打开工作区设置
    },

    // 协议类型级别操作
    onNewProtocolSession: (_protocol: string) => {
      setIsNewSessionModalOpen(true);
      // TODO: 预设协议类型
    },
    onBatchOperation: () => {
      console.log('批量操作');
      // TODO: 实现批量操作
    },

    // 会话级别操作
    onEditConfig: (sessionId: string) => {
      const session = sessionsMap[sessionId];
      if (session) {
        setEditingSession(session.config);
        setIsEditConfigModalOpen(true);
      }
    },
    onDuplicateSession: (sessionId: string) => {
      const session = sessionsMap[sessionId];
      if (session) {
        const newSessionConfig: SessionConfig = {
          ...session.config,
          id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: `${session.config.name} (副本)`
        };
        createSession(newSessionConfig);
      }
    },
    onDeleteSession: (sessionId: string) => {
      const session = sessionsMap[sessionId];
      if (session) {
        sessionDeleteModal.openModal(
          sessionId,
          session.config.name,
          () => {
            try {
              deleteSession(sessionId);
              console.log('会话已删除:', sessionId);
            } catch (error) {
              console.error('删除会话失败:', error);
              // Could show a toast notification here instead of alert
            }
          }
        );
      }
    },
    onViewLogs: (sessionId: string) => {
      console.log('查看日志:', sessionId);
      // TODO: 打开日志查看器
    },
    onConnect: async (sessionId: string) => {
      try {
        await networkService.connect(sessionId);
      } catch (error) {
        console.error('连接失败:', error);
      }
    },
    onDisconnect: async (sessionId: string) => {
      try {
        await networkService.disconnect(sessionId);
      } catch (error) {
        console.error('断开连接失败:', error);
      }
    },

    // 连接级别操作
    onViewDetails: (connectionId: string) => {
      // Extract session ID from connection ID
      const sessionId = connectionId.replace('conn-', '');
      const session = sessionsMap[sessionId];
      if (session) {
        const details = `连接详情:\n协议: ${session.config.protocol}\n地址: ${session.config.host}:${session.config.port}\n状态: ${session.status}\n连接类型: ${session.config.connectionType}`;
        alert(details);
      }
    },
    onCopyInfo: (connectionId: string) => {
      // Extract session ID from connection ID
      const sessionId = connectionId.replace('conn-', '');
      const session = sessionsMap[sessionId];
      if (session) {
        const connectionInfo = `${session.config.protocol}://${session.config.host}:${session.config.port}`;
        navigator.clipboard.writeText(connectionInfo).then(() => {
          console.log('连接信息已复制到剪贴板:', connectionInfo);
        }).catch(err => {
          console.error('复制失败:', err);
        });
      }
    },
    onDisconnectConnection: async (connectionId: string) => {
      try {
        await networkService.disconnect(connectionId);
      } catch (error) {
        console.error('断开连接失败:', error);
      }
    }
  };

  // 生成上下文菜单项
  const getContextMenuItems = () => {
    if (!contextMenu) return [];

    const { nodeType, nodeData } = contextMenu;
    console.log('生成上下文菜单项:', { nodeType, nodeData });

    switch (nodeType) {
      case 'workspace':
        return createWorkspaceMenuItems({
          onNewSession: handleContextMenuAction.onNewSession,
          onImportConfig: handleContextMenuAction.onImportConfig,
          onExportConfig: handleContextMenuAction.onExportConfig,
          onClearWorkspace: handleContextMenuAction.onClearWorkspace,
          onSettings: handleContextMenuAction.onSettings
        });

      case 'protocol-type':
        return createProtocolTypeMenuItems(nodeData.protocol || 'TCP', {
          onNewSession: () => handleContextMenuAction.onNewProtocolSession(nodeData.protocol),
          onBatchOperation: handleContextMenuAction.onBatchOperation
        });

      case 'session': {
        const session = sessionsMap[nodeData.id];
        const isConnected = session?.status === 'connected';
        return createSessionMenuItems({
          onEditConfig: () => handleContextMenuAction.onEditConfig(nodeData.id),
          onDuplicateSession: () => handleContextMenuAction.onDuplicateSession(nodeData.id),
          onDeleteSession: () => handleContextMenuAction.onDeleteSession(nodeData.id),
          onViewLogs: () => handleContextMenuAction.onViewLogs(nodeData.id),
          onConnect: () => handleContextMenuAction.onConnect(nodeData.id),
          onDisconnect: () => handleContextMenuAction.onDisconnect(nodeData.id)
        }, isConnected);
      }

      case 'connection':
        return createConnectionMenuItems({
          onDisconnect: () => handleContextMenuAction.onDisconnectConnection(nodeData.id),
          onViewDetails: () => handleContextMenuAction.onViewDetails(nodeData.id),
          onCopyInfo: () => handleContextMenuAction.onCopyInfo(nodeData.id)
        });

      default:
        return [];
    }
  };

  // 按钮事件处理函数

  const handleCreateSession = (sessionData: SessionData) => {
    const sessionConfig: SessionConfig = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: sessionData.name,
      protocol: sessionData.protocol,
      connectionType: sessionData.connectionType,
      host: sessionData.host,
      port: sessionData.port,
      autoReconnect: false,
      keepAlive: true,
      timeout: 30000,
      retryAttempts: 3,
      websocketSubprotocol: sessionData.websocketSubprotocol,
      mqttTopic: sessionData.mqttTopic,
      sseEventTypes: sessionData.sseEventTypes,
    };

    createSession(sessionConfig);
    setIsNewSessionModalOpen(false);
  };

  const handleSaveConfig = (config: SessionConfig) => {
    updateSession(config.id, config);
    setEditingSession(null);
    setIsEditConfigModalOpen(false);
  };

  const getSidebarContent = () => {
    return (
      <div className="space-y-4">
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
                  onSessionSelect={onSessionSelect}
                  onNodeSelect={handleNodeSelect}
                  selectedNodeId={selectedNodeId}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  onToggleRecording={handleToggleRecording}
                  onMoreActions={handleMoreActions}
                  connectingNodes={connectingNodes}
                  recordingNodes={recordingNodes}
                  expandedNodes={expandedNodes}
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

      {/* Edit Configuration Modal */}
      <EditConfigModal
        isOpen={isEditConfigModalOpen}
        onClose={() => {
          setIsEditConfigModalOpen(false);
          setEditingSession(null);
        }}
        onSave={handleSaveConfig}
        config={editingSession}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Delete Confirmation Modals */}
      <sessionDeleteModal.Modal />
      <workspaceClearModal.Modal />
    </div>
  );
};
