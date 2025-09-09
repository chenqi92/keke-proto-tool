import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  SessionState, 
  SessionConfig, 
  WorkspaceState, 
  Message, 
  ConnectionStatus,
  SessionStatistics,
  NetworkConnection
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
  
  // Node Selection
  setSelectedNode: (nodeId: string | null, nodeType: 'workspace' | 'session' | 'connection' | null) => void;
  
  // Utility Methods
  getSession: (sessionId: string) => SessionState | undefined;
  getActiveSession: () => SessionState | undefined;
  getAllSessions: () => SessionState[];
  getSessionsByProtocol: (protocol: string) => SessionState[];
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

export const useAppStore = create<AppStore>()(
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
  }))
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
