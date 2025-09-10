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
  MQTTSubscription
} from '@/types';

interface AppStore extends WorkspaceState {
  // Session Management
  createSession: (config: SessionConfig) => void;
  updateSession: (sessionId: string, updates: Partial<SessionState>) => void;
  deleteSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;
  
  // Connection Management
  updateSessionStatus: (sessionId: string, status: ConnectionStatus, error?: string) => void;
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

  // MQTT Subscription Management
  addMQTTSubscription: (sessionId: string, subscription: MQTTSubscription) => void;
  removeMQTTSubscription: (sessionId: string, topic: string) => void;
  updateMQTTSubscription: (sessionId: string, subscriptionId: string, updates: Partial<MQTTSubscription>) => void;
  getMQTTSubscriptions: (sessionId: string) => MQTTSubscription[];
  incrementMQTTSubscriptionMessageCount: (sessionId: string, topic: string) => void;

  // Node Selection
  setSelectedNode: (nodeId: string | null, nodeType: 'workspace' | 'session' | 'connection' | null) => void;
  
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
  config,
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
  }),
  onRehydrateStorage: () => (state: AppStore | undefined) => {
    // 数据恢复后的处理
    if (state) {
      console.log('工作区数据已恢复');
      // 可以在这里添加数据迁移逻辑
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
        const { [sessionId]: deleted, ...remainingSessions } = state.sessions;
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
      set((state) => {
        const session = state.sessions[sessionId];
        if (!session) return state;

        const updates: Partial<SessionState> = {
          status,
          error,
        };

        if (status === 'connected') {
          updates.connectedAt = new Date();
          updates.error = undefined;
        }

        if (status === 'disconnected') {
          updates.connectedAt = undefined;
        }

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

        return {
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              messages: updatedMessages,
              statistics: updatedStats,
              lastActivity: new Date(),
            },
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
    setSelectedNode: (nodeId: string | null, nodeType: 'workspace' | 'session' | 'connection' | null) => {
      set({
        selectedNodeId: nodeId,
        selectedNodeType: nodeType,
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

        const { [clientId]: removed, ...remainingConnections } = session.clientConnections;

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
          sub => sub.topic === topic
        );

        if (!subscriptionToRemove) return state;

        const { [subscriptionToRemove.id]: removed, ...remainingSubscriptions } = session.mqttSubscriptions;

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
          sub => get().matchMQTTTopic(topic, sub.topic)
        );

        if (matchingSubscriptions.length === 0) return state;

        const updatedSubscriptions = { ...session.mqttSubscriptions };
        matchingSubscriptions.forEach(sub => {
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
  })),
  persistConfig
  )
);

// Selectors for common use cases
export const useSessionById = (sessionId: string | null) => 
  useAppStore((state) => sessionId ? state.sessions[sessionId] : undefined);

export const useActiveSession = () => 
  useAppStore((state) => state.activeSessionId ? state.sessions[state.activeSessionId] : undefined);

export const useAllSessions = () => 
  useAppStore((state) => Object.values(state.sessions));

export const useSessionCount = () => 
  useAppStore((state) => Object.keys(state.sessions).length);

export const useConnectedSessions = () => 
  useAppStore((state) => 
    Object.values(state.sessions).filter(session => session.status === 'connected')
  );
