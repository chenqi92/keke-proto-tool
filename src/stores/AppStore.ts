import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import {
  SessionState,
  SessionConfig,
  WorkspaceState,
  Message,
  ConnectionStatus,
  SessionStatistics,
  ClientConnection,
  MQTTSubscription,
  SSEEventFilter
} from '@/types';
import { logSessionStateChange, validateSessionStateIsolation } from '@/utils/sessionStateDebug';
import { statusBarService } from '@/services/StatusBarService';

interface AppStore extends WorkspaceState {
  // State properties
  sessions: Record<string, SessionState>;
  activeSessionId: string | null;
  selectedNodeId: string | null;
  selectedNodeType: 'workspace' | 'session' | 'connection' | null;
  selectedNodeData: any;

  // View State
  showSidebar: boolean;
  showInspector: boolean;
  showStatusBar: boolean;
  zoomLevel: number;

  // Session Management
  createSession: (config: SessionConfig) => void;
  updateSession: (sessionId: string, updates: Partial<SessionState>) => void;
  deleteSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;

  // Connection Management
  updateSessionStatus: (sessionId: string, status: ConnectionStatus, error?: string) => void;
  updateSessionConfig: (sessionId: string, configUpdates: any) => void;
  addMessage: (sessionId: string, message: Message) => void;
  clearMessages: (sessionId: string) => void;
  updateStatistics: (sessionId: string, stats: Partial<SessionStatistics>) => void;

  // Recording Management
  startRecording: (sessionId: string) => void;
  stopRecording: (sessionId: string) => void;

  // Client Connection Management (for server sessions)
  addClientConnection: (sessionId: string, client: ClientConnection) => void;
  removeClientConnection: (sessionId: string, clientId: string) => void;
  updateClientConnection: (sessionId: string, clientId: string, updates: Partial<ClientConnection>) => void;
  getClientConnections: (sessionId: string) => ClientConnection[];
  getClientConnection: (sessionId: string, clientId: string) => ClientConnection | undefined;

  // MQTT Subscription Management
  addMQTTSubscription: (sessionId: string, subscription: MQTTSubscription) => void;
  removeMQTTSubscription: (sessionId: string, topic: string) => void;
  updateMQTTSubscription: (sessionId: string, subscriptionId: string, updates: Partial<MQTTSubscription>) => void;
  getMQTTSubscriptions: (sessionId: string) => MQTTSubscription[];
  incrementMQTTSubscriptionMessageCount: (sessionId: string, topic: string) => void;

  // SSE Event Filter Management
  addSSEEventFilter: (sessionId: string, eventFilter: SSEEventFilter) => void;
  removeSSEEventFilter: (sessionId: string, eventType: string) => void;
  updateSSEEventFilter: (sessionId: string, filterId: string, updates: Partial<SSEEventFilter>) => void;
  getSSEEventFilters: (sessionId: string) => SSEEventFilter[];
  incrementSSEEventFilterMessageCount: (sessionId: string, eventType: string) => void;
  updateSSELastEventId: (sessionId: string, lastEventId: string) => void;

  // Node Selection
  setSelectedNode: (nodeId: string | null, nodeType: 'workspace' | 'session' | 'connection' | null, nodeData?: any) => void;

  // Workspace Management
  clearAllSessions: () => void;
  loadSessions: (sessions: Record<string, SessionState>) => void;

  // View Management
  toggleSidebar: () => void;
  toggleInspector: () => void;
  toggleStatusBar: () => void;
  setZoomLevel: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // Utility Methods
  getSession: (sessionId: string) => SessionState | undefined;
  getActiveSession: () => SessionState | undefined;
  getAllSessions: () => SessionState[];
  getSessionsByProtocol: (protocol: string) => SessionState[];
  matchMQTTTopic: (topic: string, filter: string) => boolean;
}

const createInitialStatistics = (): SessionStatistics => ({
  messagesReceived: 0,
  messagesSent: 0,
  bytesReceived: 0,
  bytesSent: 0,
  errors: 0,
  uptime: 0,
  connectionCount: 0,
});

const createInitialSessionState = (config: SessionConfig): SessionState => ({
  config: {
    ...config,
    // Ensure reasonable timeout defaults for better user experience
    timeout: config.timeout || 10000, // 10 seconds default
    retryAttempts: config.retryAttempts || 3,
    retryDelay: config.retryDelay || 1000, // 1 second default
  },
  status: 'disconnected',
  isRecording: false,
  messages: [],
  statistics: createInitialStatistics(),
});

// 持久化配置
const persistConfig = {
  name: 'keke-proto-tool-workspace', // 存储键名
  storage: createJSONStorage(() => localStorage),
  version: 1, // 数据版本
  partialize: (state: AppStore) => ({
    // 只持久化需要的状态，排除临时状态
    sessions: state.sessions,
    activeSessionId: state.activeSessionId,
    selectedNodeId: state.selectedNodeId,
    selectedNodeType: state.selectedNodeType,
    // 持久化视图状态
    showSidebar: state.showSidebar,
    showInspector: state.showInspector,
    showStatusBar: state.showStatusBar,
    zoomLevel: state.zoomLevel,
  }),
  onRehydrateStorage: () => (state: AppStore | undefined) => {
    // 数据恢复后的处理
    if (state) {
      console.log('工作区数据已恢复');

      // Reset all session statuses to disconnected on app startup
      // This prevents sessions from being restored in connecting/connected states
      const resetSessions: Record<string, SessionState> = {};
      Object.entries(state.sessions).forEach(([sessionId, session]) => {
        // Convert timestamp strings back to Date objects in messages
        const messagesWithDates = (session.messages || []).map(message => ({
          ...message,
          timestamp: typeof message.timestamp === 'string' ? new Date(message.timestamp) : message.timestamp,
        }));

        // Convert other date fields
        const lastActivity = session.lastActivity
          ? (typeof session.lastActivity === 'string' ? new Date(session.lastActivity) : session.lastActivity)
          : undefined;

        const connectedAt = session.connectedAt
          ? (typeof session.connectedAt === 'string' ? new Date(session.connectedAt) : session.connectedAt)
          : undefined;

        // Convert MQTT subscription dates if they exist
        const mqttSubscriptions = session.mqttSubscriptions ?
          Object.fromEntries(
            Object.entries(session.mqttSubscriptions).map(([id, sub]) => [
              id,
              {
                ...sub,
                subscribedAt: typeof sub.subscribedAt === 'string' ? new Date(sub.subscribedAt) : sub.subscribedAt,
                lastMessageAt: sub.lastMessageAt && typeof sub.lastMessageAt === 'string'
                  ? new Date(sub.lastMessageAt)
                  : sub.lastMessageAt,
              }
            ])
          ) : undefined;

        resetSessions[sessionId] = {
          ...session,
          status: 'disconnected',
          connectedAt: undefined,
          error: undefined,
          lastActivity,
          // Clear message history on app restart to prevent stale data
          messages: [],
          statistics: session.statistics || createInitialStatistics(),
          mqttSubscriptions,
        };
        console.log(`AppStore: Reset session ${sessionId} status to disconnected on startup`);
      });

      // Update the state with reset sessions
      state.sessions = resetSessions;
      console.log(`AppStore: Reset ${Object.keys(resetSessions).length} sessions to disconnected state`);
    }
  },
  migrate: (persistedState: any, version: number) => {
    // 数据版本迁移逻辑
    if (version === 0) {
      // 从版本0迁移到版本1的逻辑
      return persistedState;
    }
    return persistedState;
  },
};

export const useAppStore = create<AppStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
    // Initial state
    sessions: {},
    activeSessionId: null,
    selectedNodeId: null,
    selectedNodeType: null,
    selectedNodeData: null,

    // View state
    showSidebar: true,
    showInspector: false,
    showStatusBar: true,
    zoomLevel: 100,

    // Session Management
    createSession: (config: SessionConfig) => {
      const sessionState = createInitialSessionState(config);
      set((state) => ({
        sessions: {
          ...state.sessions,
          [config.id]: sessionState,
        },
      }));
    },

    updateSession: (sessionId: string, updates: Partial<SessionState>) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session) return state;

        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              ...updates,
            },
          },
        };
      });
    },

    deleteSession: (sessionId: string) => {
      set((state) => {
        const { [sessionId]: _deleted, ...remainingSessions } = state.sessions;
        return {
          sessions: remainingSessions,
          activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
          selectedNodeId: state.selectedNodeId === sessionId ? null : state.selectedNodeId,
        };
      });
    },

    setActiveSession: (sessionId: string | null) => {
      set({ activeSessionId: sessionId });
    },

    // Connection Management
    updateSessionStatus: (sessionId: string, status: ConnectionStatus, error?: string) => {
      console.log(`🏪 AppStore: Updating session ${sessionId} status to ${status}`, error ? `with error: ${error}` : '');

      set((state) => {
        const session = state.sessions[sessionId];
        if (!session) {
          console.warn(`❌ AppStore: Session ${sessionId} not found when updating status`);
          console.log(`📋 AppStore: Available sessions:`, Object.keys(state.sessions));
          return state;
        }

        console.log(`📊 AppStore: Session ${sessionId} details before update:`, {
          name: session.config.name,
          protocol: session.config.protocol,
          connectionType: session.config.connectionType,
          host: session.config.host,
          port: session.config.port,
          currentStatus: session.status,
          newStatus: status
        });

        // 使用专门的状态隔离验证工具
        const validation = validateSessionStateIsolation(state.sessions, sessionId, status);
        if (!validation.isValid) {
          console.warn(`⚠️ AppStore: State isolation issues detected for session ${sessionId}:`);
          validation.warnings.forEach(warning => console.warn(`  - ${warning}`));

          // 如果有冲突的会话，记录详细信息
          validation.conflictingSessions.forEach(conflictId => {
            const conflictSession = state.sessions[conflictId];
            console.warn(`  🔥 Conflicting session ${conflictId}: ${conflictSession.config.name} (${conflictSession.config.protocol} ${conflictSession.config.connectionType})`);
          });
        }

        // Prevent unnecessary updates if status hasn't changed
        if (session.status === status && session.error === error) {
          console.log(`⏭️ AppStore: Session ${sessionId} status unchanged, skipping update`);
          return state;
        }

        // 记录状态变化
        logSessionStateChange(sessionId, session.status, status, session, state.sessions);

        const updates: Partial<SessionState> = {
          status,
          error,
        };

        if (status === 'connected') {
          updates.connectedAt = new Date();
          updates.error = undefined;
          console.log(`AppStore: Session ${sessionId} marked as connected`);
        }

        if (status === 'disconnected') {
          updates.connectedAt = undefined;
          console.log(`AppStore: Session ${sessionId} marked as disconnected`);
        }

        if (status === 'error') {
          console.log(`AppStore: Session ${sessionId} marked as error:`, error);
        }

        const updatedSession = {
          ...session,
          ...updates,
        };

        console.log(`AppStore: Session ${sessionId} status updated from ${session.status} to ${status}`);

        // Trigger status bar update when connection status changes
        setTimeout(() => {
          statusBarService.forceUpdate();
        }, 0);

        return {
          sessions: {
            ...state.sessions,
            [sessionId]: updatedSession,
          },
        };
      });
    },

    updateSessionConfig: (sessionId: string, configUpdates: any) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session) {
          console.warn(`AppStore: Session ${sessionId} not found for config update`);
          return state;
        }

        const updatedConfig = {
          ...session.config,
          ...configUpdates,
        };

        const updatedSession = {
          ...session,
          config: updatedConfig,
        };

        console.log(`AppStore: Session ${sessionId} config updated:`, configUpdates);

        return {
          sessions: {
            ...state.sessions,
            [sessionId]: updatedSession,
          },
        };
      });
    },

    addMessage: (sessionId: string, message: Message) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session) return state;

        const updatedMessages = [...session.messages, message];
        const updatedStats = { ...session.statistics };

        // Update statistics
        if (message.direction === 'in') {
          updatedStats.messagesReceived++;
          updatedStats.bytesReceived += message.size;
        } else {
          updatedStats.messagesSent++;
          updatedStats.bytesSent += message.size;
        }

        if (message.status === 'error') {
          updatedStats.errors++;
          updatedStats.lastError = `Message ${message.id} failed`;
        }

        const updatedSession = {
          ...session,
          messages: updatedMessages,
          statistics: updatedStats,
          lastActivity: new Date(),
        };

        // Update status bar service with throughput data immediately
        statusBarService.updateThroughputData(
          sessionId,
          updatedStats.bytesReceived,
          updatedStats.bytesSent
        );

        // Also trigger a status bar update to refresh the display
        setTimeout(() => {
          statusBarService.forceUpdate();
        }, 0);

        return {
          sessions: {
            ...state.sessions,
            [sessionId]: updatedSession,
          },
        };
      });
    },

    clearMessages: (sessionId: string) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session) return state;

        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              messages: [],
            },
          },
        };
      });
    },

    updateStatistics: (sessionId: string, stats: Partial<SessionStatistics>) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session) return state;

        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              statistics: {
                ...session.statistics,
                ...stats,
              },
            },
          },
        };
      });
    },

    // Recording Management
    startRecording: (sessionId: string) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session) return state;

        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              isRecording: true,
            },
          },
        };
      });
    },

    stopRecording: (sessionId: string) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session) return state;

        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              isRecording: false,
            },
          },
        };
      });
    },

    // Node Selection
    setSelectedNode: (nodeId: string | null, nodeType: 'workspace' | 'session' | 'connection' | null, nodeData?: any) => {
      set({
        selectedNodeId: nodeId,
        selectedNodeType: nodeType,
        selectedNodeData: nodeData,
      });
    },

    // Client Connection Management (for server sessions)
    addClientConnection: (sessionId: string, client: ClientConnection) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session) return state;

        return {
          ...state,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              clientConnections: {
                ...session.clientConnections,
                [client.id]: client,
              },
              statistics: {
                ...session.statistics,
                connectionCount: Object.keys(session.clientConnections || {}).length + 1,
              },
            },
          },
        };
      });
    },

    removeClientConnection: (sessionId: string, clientId: string) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session || !session.clientConnections) return state;

        const { [clientId]: _removed, ...remainingConnections } = session.clientConnections;

        return {
          ...state,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              clientConnections: remainingConnections,
              statistics: {
                ...session.statistics,
                connectionCount: Object.keys(remainingConnections).length,
              },
            },
          },
        };
      });
    },

    updateClientConnection: (sessionId: string, clientId: string, updates: Partial<ClientConnection>) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session || !session.clientConnections?.[clientId]) return state;

        return {
          ...state,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              clientConnections: {
                ...session.clientConnections,
                [clientId]: {
                  ...session.clientConnections[clientId],
                  ...updates,
                },
              },
            },
          },
        };
      });
    },

    getClientConnections: (sessionId: string) => {
      const session = get().sessions[sessionId];
      return session?.clientConnections ? Object.values(session.clientConnections) : [];
    },

    getClientConnection: (sessionId: string, clientId: string) => {
      const session = get().sessions[sessionId];
      return session?.clientConnections?.[clientId];
    },

    // MQTT Subscription Management
    addMQTTSubscription: (sessionId: string, subscription: MQTTSubscription) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session) return state;

        return {
          ...state,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              mqttSubscriptions: {
                ...session.mqttSubscriptions,
                [subscription.id]: subscription,
              },
            },
          },
        };
      });
    },

    removeMQTTSubscription: (sessionId: string, topic: string) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session || !session.mqttSubscriptions) return state;

        // 找到匹配主题的订阅
        const subscriptionToRemove = Object.values(session.mqttSubscriptions).find(
          (sub: MQTTSubscription) => sub.topic === topic
        );

        if (!subscriptionToRemove) return state;

        const { [subscriptionToRemove.id]: _removed, ...remainingSubscriptions } = session.mqttSubscriptions;

        return {
          ...state,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              mqttSubscriptions: remainingSubscriptions,
            },
          },
        };
      });
    },

    updateMQTTSubscription: (sessionId: string, subscriptionId: string, updates: Partial<MQTTSubscription>) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session || !session.mqttSubscriptions || !session.mqttSubscriptions[subscriptionId]) {
          return state;
        }

        return {
          ...state,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              mqttSubscriptions: {
                ...session.mqttSubscriptions,
                [subscriptionId]: {
                  ...session.mqttSubscriptions[subscriptionId],
                  ...updates,
                },
              },
            },
          },
        };
      });
    },

    getMQTTSubscriptions: (sessionId: string) => {
      const session = get().sessions[sessionId];
      if (!session || !session.mqttSubscriptions) {
        return [];
      }
      return Object.values(session.mqttSubscriptions);
    },

    incrementMQTTSubscriptionMessageCount: (sessionId: string, topic: string) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session || !session.mqttSubscriptions) return state;

        // 找到匹配主题的订阅（支持通配符匹配）
        const matchingSubscriptions = Object.values(session.mqttSubscriptions).filter(
          (sub: MQTTSubscription) => get().matchMQTTTopic(topic, sub.topic)
        );

        if (matchingSubscriptions.length === 0) return state;

        const updatedSubscriptions = { ...session.mqttSubscriptions };
        matchingSubscriptions.forEach((sub: MQTTSubscription) => {
          updatedSubscriptions[sub.id] = {
            ...sub,
            messageCount: sub.messageCount + 1,
            lastMessageAt: new Date(),
          };
        });

        return {
          ...state,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              mqttSubscriptions: updatedSubscriptions,
            },
          },
        };
      });
    },

    // Utility Methods
    getSession: (sessionId: string) => {
      return get().sessions[sessionId];
    },

    getActiveSession: () => {
      const { activeSessionId, sessions } = get();
      return activeSessionId ? sessions[activeSessionId] : undefined;
    },

    getAllSessions: () => {
      return Object.values(get().sessions);
    },

    getSessionsByProtocol: (protocol: string) => {
      return Object.values(get().sessions).filter(
        (session) => session.config.protocol === protocol
      );
    },

    // MQTT主题匹配辅助方法
    matchMQTTTopic: (topic: string, filter: string) => {
      // 简单的MQTT主题匹配实现
      // 支持 + (单级通配符) 和 # (多级通配符)

      if (filter === topic) return true;

      // 将主题和过滤器分割成段
      const topicParts = topic.split('/');
      const filterParts = filter.split('/');

      // 如果过滤器以 # 结尾，匹配所有剩余段
      if (filterParts[filterParts.length - 1] === '#') {
        const baseFilterParts = filterParts.slice(0, -1);
        if (topicParts.length < baseFilterParts.length) return false;

        for (let i = 0; i < baseFilterParts.length; i++) {
          if (baseFilterParts[i] !== '+' && baseFilterParts[i] !== topicParts[i]) {
            return false;
          }
        }
        return true;
      }

      // 段数必须相等（除非有 # 通配符）
      if (topicParts.length !== filterParts.length) return false;

      // 逐段匹配
      for (let i = 0; i < filterParts.length; i++) {
        if (filterParts[i] !== '+' && filterParts[i] !== topicParts[i]) {
          return false;
        }
      }

      return true;
    },

    // ==================== SSE Event Filter Management ====================

    // SSE Event Filter Management
    addSSEEventFilter: (sessionId: string, eventFilter: SSEEventFilter) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session) return state;

        return {
          ...state,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              sseEventFilters: {
                ...session.sseEventFilters,
                [eventFilter.id]: eventFilter,
              },
            },
          },
        };
      });
    },

    removeSSEEventFilter: (sessionId: string, eventType: string) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session || !session.sseEventFilters) return state;

        // Find the filter to remove by event type
        const filterToRemove = Object.entries(session.sseEventFilters).find(
          ([_, filter]: [string, SSEEventFilter]) => filter.eventType === eventType
        );

        if (!filterToRemove) return state;

        const updatedFilters = { ...session.sseEventFilters };
        delete updatedFilters[filterToRemove[0]];

        return {
          ...state,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              sseEventFilters: updatedFilters,
            },
          },
        };
      });
    },

    updateSSEEventFilter: (sessionId: string, filterId: string, updates: Partial<SSEEventFilter>) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session || !session.sseEventFilters || !session.sseEventFilters[filterId]) {
          return state;
        }

        return {
          ...state,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              sseEventFilters: {
                ...session.sseEventFilters,
                [filterId]: {
                  ...session.sseEventFilters[filterId],
                  ...updates,
                },
              },
            },
          },
        };
      });
    },

    getSSEEventFilters: (sessionId: string) => {
      const session = get().sessions[sessionId];
      if (!session || !session.sseEventFilters) {
        return [];
      }
      return Object.values(session.sseEventFilters) as SSEEventFilter[];
    },

    incrementSSEEventFilterMessageCount: (sessionId: string, eventType: string) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session || !session.sseEventFilters) return state;

        const filterEntry = Object.entries(session.sseEventFilters).find(
          ([_filterId, filter]: [string, SSEEventFilter]) => filter.eventType === eventType || filter.eventType === '*'
        );

        if (!filterEntry) return state;

        const [filterId, filter] = filterEntry;

        return {
          ...state,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              sseEventFilters: {
                ...session.sseEventFilters,
                [filterId]: {
                  ...filter,
                  messageCount: filter.messageCount + 1,
                  lastMessageAt: new Date(),
                },
              },
            },
          },
        };
      });
    },

    updateSSELastEventId: (sessionId: string, lastEventId: string) => {
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session) return state;

        return {
          ...state,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              sseLastEventId: lastEventId,
            },
          },
        };
      });
    },

    // Workspace Management
    clearAllSessions: () => {
      console.log('[AppStore] Clearing all sessions');
      set({
        sessions: {},
        activeSessionId: null,
        selectedNodeId: null,
        selectedNodeType: null,
        selectedNodeData: null,
      });
    },

    loadSessions: (sessions: Record<string, SessionState>) => {
      console.log('[AppStore] Loading sessions:', Object.keys(sessions).length);
      set({
        sessions: sessions,
        activeSessionId: null,
        selectedNodeId: null,
        selectedNodeType: null,
        selectedNodeData: null,
      });
    },

    // View Management
    toggleSidebar: () => {
      set((state) => {
        const newValue = !state.showSidebar;
        console.log('[AppStore] Toggle sidebar:', newValue);
        return { showSidebar: newValue };
      });
    },

    toggleInspector: () => {
      set((state) => {
        const newValue = !state.showInspector;
        console.log('[AppStore] Toggle inspector:', newValue);
        return { showInspector: newValue };
      });
    },

    toggleStatusBar: () => {
      set((state) => {
        const newValue = !state.showStatusBar;
        console.log('[AppStore] Toggle status bar:', newValue);
        return { showStatusBar: newValue };
      });
    },

    setZoomLevel: (level: number) => {
      const clampedLevel = Math.max(50, Math.min(200, level));
      console.log('[AppStore] Set zoom level:', clampedLevel);
      set({ zoomLevel: clampedLevel });
      document.documentElement.style.fontSize = `${clampedLevel}%`;
    },

    zoomIn: () => {
      const currentLevel = get().zoomLevel;
      const newLevel = Math.min(200, currentLevel + 10);
      get().setZoomLevel(newLevel);
    },

    zoomOut: () => {
      const currentLevel = get().zoomLevel;
      const newLevel = Math.max(50, currentLevel - 10);
      get().setZoomLevel(newLevel);
    },

    resetZoom: () => {
      get().setZoomLevel(100);
    },
  })),
  persistConfig
  )
);

// Selectors for common use cases
export const useSessionById = (sessionId: string | null) =>
  useAppStore((state) => sessionId ? state.sessions[sessionId] : undefined);

export const useActiveSession = () =>
  useAppStore((state) => state.activeSessionId ? state.sessions[state.activeSessionId] : undefined);

// Fixed: Use shallow comparison to prevent unnecessary re-renders
export const useAllSessions = () =>
  useAppStore((state) => Object.values(state.sessions), (a, b) => {
    // Compare arrays by length and content
    if (a.length !== b.length) return false;
    return a.every((session, index) => session === b[index]);
  });

export const useSessionCount = () =>
  useAppStore((state) => Object.keys(state.sessions).length);

// Fixed: Use shallow comparison for filtered sessions
export const useConnectedSessions = () =>
  useAppStore((state) =>
    Object.values(state.sessions).filter(session => session.status === 'connected'),
    (a, b) => {
      // Compare arrays by length and content
      if (a.length !== b.length) return false;
      return a.every((session, index) => session === b[index]);
    }
  );
