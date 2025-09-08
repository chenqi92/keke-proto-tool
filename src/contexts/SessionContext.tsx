import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface SessionConfig {
  protocol: 'TCP' | 'UDP' | 'WebSocket' | 'MQTT' | 'SSE';
  connectionType: 'client' | 'server';
  host?: string;
  port?: number;
  websocketSubprotocol?: string;
  mqttTopic?: string;
  sseEventTypes?: string[];
}

interface SessionContextType {
  currentSession: SessionConfig | null;
  setCurrentSession: (session: SessionConfig | null) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
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
  const [currentSession, setCurrentSession] = useState<SessionConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const value: SessionContextType = {
    currentSession,
    setCurrentSession,
    sessionId,
    setSessionId,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

// Default session configurations for different protocols
export const getDefaultSessionConfig = (protocol: string, sessionId: string): SessionConfig => {
  switch (protocol) {
    case 'TCP':
      return {
        protocol: 'TCP',
        connectionType: sessionId.includes('客户端') ? 'client' : 'server',
        host: sessionId.includes('客户端') ? '192.168.1.100' : '0.0.0.0',
        port: 8080
      };
    case 'UDP':
      return {
        protocol: 'UDP',
        connectionType: sessionId.includes('客户端') ? 'client' : 'server',
        host: sessionId.includes('客户端') ? '192.168.1.100' : '0.0.0.0',
        port: 9090
      };
    case 'WebSocket':
      return {
        protocol: 'WebSocket',
        connectionType: sessionId.includes('客户端') ? 'client' : 'server',
        host: sessionId.includes('客户端') ? 'localhost' : '0.0.0.0',
        port: 8080,
        websocketSubprotocol: 'chat'
      };
    case 'MQTT':
      return {
        protocol: 'MQTT',
        connectionType: 'client',
        host: 'broker.hivemq.com',
        port: 1883,
        mqttTopic: 'test/topic'
      };
    case 'SSE':
      return {
        protocol: 'SSE',
        connectionType: 'client',
        host: 'localhost',
        port: 3000,
        sseEventTypes: ['message', 'update', 'notification']
      };
    default:
      return {
        protocol: 'TCP',
        connectionType: 'client',
        host: 'localhost',
        port: 8080
      };
  }
};
