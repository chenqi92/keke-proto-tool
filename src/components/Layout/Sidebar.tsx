import React, { useState, useMemo } from 'react';
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
  Radio,
  RefreshCw,
  Folder,
  FolderOpen
} from 'lucide-react';
import { NewSessionModal, SessionData } from '@/components/NewSessionModal';
import { useAppStore, useAllSessions } from '@/stores/AppStore';
import { networkService } from '@/services/NetworkService';
import { SessionConfig } from '@/types';

interface SidebarProps {
  onCollapse: () => void;
  onSessionSelect?: (sessionId: string, protocol: string) => void;
  onNodeSelect?: (nodeId: string, nodeType: 'workspace' | 'session' | 'connection', nodeData: any) => void;
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

// Helper function to create tree data from real sessions
const createTreeDataFromSessions = (sessions: any[]): TreeNode[] => {
  const workspaceNode: TreeNode = {
    id: 'workspace-1',
    label: '默认工作区',
    type: 'workspace',
    expanded: true,
    children: sessions.map(session => ({
      id: session.config.id,
      label: session.config.name,
      type: 'session' as const,
      protocol: session.config.protocol,
      status: session.status,
      expanded: false,
      children: session.status === 'connected' ? [{
        id: `conn-${session.config.id}`,
        label: `${session.config.host}:${session.config.port}`,
        type: 'connection' as const,
        protocol: session.config.protocol,
        status: session.status
      }] : []
    }))
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
          "flex items-center px-2 py-1 text-sm hover:bg-accent rounded-md cursor-auto group",
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingNodes, setConnectingNodes] = useState<Set<string>>(new Set());
  const [recordingNodes, setRecordingNodes] = useState<Set<string>>(new Set());

  // Get real session data from store
  const sessions = useAllSessions();
  const createSession = useAppStore(state => state.createSession);
  const deleteSession = useAppStore(state => state.deleteSession);
  const startRecording = useAppStore(state => state.startRecording);
  const stopRecording = useAppStore(state => state.stopRecording);

  // Generate tree data from real sessions
  const treeData = useMemo(() => createTreeDataFromSessions(sessions), [sessions]);

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['workspace-1']));

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

    // Determine node type based on node properties
    let nodeType: 'workspace' | 'session' | 'connection' = 'workspace';
    if (node.type === 'session') {
      nodeType = 'session';
    } else if (node.type === 'connection') {
      nodeType = 'connection';
    }

    // Call the callback with node information
    if (onNodeSelect) {
      onNodeSelect(node.id, nodeType, {
        label: node.label,
        protocol: node.protocol,
        type: node.type,
        status: node.status
      });
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

    // Show context menu with additional options
    // For now, just log the action
    console.log('More actions for node:', nodeId);

    // In a real implementation, you would show a context menu with options like:
    // - Edit configuration
    // - Duplicate session
    // - Export data
    // - Delete session
    // - View logs
  };

  // 按钮事件处理函数
  const handleNewSession = () => {
    setIsNewSessionModalOpen(true);
  };

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
    </div>
  );
};
