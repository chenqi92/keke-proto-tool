import React, { createContext, useContext, ReactNode } from 'react';
import { useAppStore } from '@/stores/AppStore';
import { SessionConfig, ProtocolType } from '@/types';

export interface SelectedNode {
  id: string;
  type: 'workspace' | 'session' | 'connection';
  protocol?: ProtocolType;
  label: string;
  config?: SessionConfig;
  viewType?: string;
  connectionType?: 'client' | 'server';
  sessionData?: any;
}

interface SessionContextType {
  currentSession: SessionConfig | null;
  setCurrentSession: (session: SessionConfig | null) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  selectedNode: SelectedNode | null;
  setSelectedNode: (node: SelectedNode | null) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const activeSessionId = useAppStore(state => state.activeSessionId);
  const selectedNodeId = useAppStore(state => state.selectedNodeId);
  const selectedNodeType = useAppStore(state => state.selectedNodeType);
  const selectedNodeData = useAppStore(state => state.selectedNodeData);
  const setActiveSession = useAppStore(state => state.setActiveSession);
  const setSelectedNode = useAppStore(state => state.setSelectedNode);
  const getSession = useAppStore(state => state.getSession);

  const currentSession = activeSessionId ? getSession(activeSessionId)?.config || null : null;

  const selectedNode: SelectedNode | null = selectedNodeId && selectedNodeData ? {
    id: selectedNodeId,
    type: selectedNodeType || 'workspace',
    label: selectedNodeData.label || (selectedNodeId === 'workspace-1' ? '默认工作区' : selectedNodeId),
    protocol: selectedNodeData.protocol || currentSession?.protocol,
    config: selectedNodeData.config || currentSession || undefined,
    viewType: selectedNodeData.viewType || (selectedNodeId === 'workspace-1' ? 'workspace-overview' : undefined),
    connectionType: selectedNodeData.connectionType,
    sessionData: selectedNodeData.sessionData,
  } : {
    // Default to workspace overview if no node is selected
    id: 'workspace-1',
    type: 'workspace',
    label: '默认工作区',
    viewType: 'workspace-overview'
  };

  const value: SessionContextType = {
    currentSession,
    setCurrentSession: (session: SessionConfig | null) => {
      if (session) {
        setActiveSession(session.id);
      } else {
        setActiveSession(null);
      }
    },
    sessionId: activeSessionId,
    setSessionId: setActiveSession,
    selectedNode,
    setSelectedNode: (node: SelectedNode | null) => {
      if (node) {
        setSelectedNode(node.id, node.type);
      } else {
        setSelectedNode(null, null);
      }
    },
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

// Default session configurations for different protocols
export const getDefaultSessionConfig = (protocol: string, sessionId?: string): SessionConfig => {
  const id = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const isClient = !sessionId || sessionId.includes('客户端') || sessionId.includes('Client');

  const baseConfig: SessionConfig = {
    id,
    name: '',
    protocol: protocol as ProtocolType,
    connectionType: isClient ? 'client' : 'server',
    host: isClient ? 'localhost' : '0.0.0.0',
    port: 8080,
    autoReconnect: false,
    keepAlive: true,
    timeout: 30000,
    retryAttempts: 3,
  };

  switch (protocol) {
    case 'TCP':
      return {
        ...baseConfig,
        port: 8080,
        name: `TCP ${isClient ? 'Client' : 'Server'} - ${baseConfig.host}:8080`
      };
    case 'UDP':
      return {
        ...baseConfig,
        port: 9090,
        name: `UDP ${isClient ? 'Client' : 'Server'} - ${baseConfig.host}:9090`
      };
    case 'WebSocket':
      return {
        ...baseConfig,
        port: 8080,
        name: `WebSocket ${isClient ? 'Client' : 'Server'} - ${baseConfig.host}:8080`,
        websocketSubprotocol: 'chat'
      };
    case 'MQTT':
      return {
        ...baseConfig,
        connectionType: 'client',
        host: 'broker.hivemq.com',
        port: 1883,
        name: 'MQTT Client - broker.hivemq.com:1883',
        mqttTopic: 'test/topic'
      };
    case 'SSE':
      return {
        ...baseConfig,
        connectionType: 'client',
        port: 3000,
        name: `SSE Client - ${baseConfig.host}:3000`,
        sseEventTypes: ['message', 'update', 'notification']
      };
    default:
      return {
        ...baseConfig,
        name: `TCP Client - ${baseConfig.host}:8080`
      };
  }
};
