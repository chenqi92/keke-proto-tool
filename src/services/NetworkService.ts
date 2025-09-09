import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Message, ConnectionStatus, NetworkConnection } from '@/types';
import { useAppStore } from '@/stores/AppStore';

export interface NetworkEvent {
  sessionId: string;
  type: 'connected' | 'disconnected' | 'message' | 'error';
  data?: any;
  error?: string;
}

class NetworkService {
  private connections: Map<string, NetworkConnection> = new Map();
  private reconnectTimers: Map<string, number> = new Map();

  constructor() {
    this.initializeEventListeners();
  }

  private async initializeEventListeners() {
    // Skip initialization in test environment
    if (typeof window !== 'undefined' && (window as any).__VITEST__) {
      return;
    }

    try {
      // Listen for network events from Tauri backend
      await listen<NetworkEvent>('network-event', (event) => {
        this.handleNetworkEvent(event.payload);
      });

      // Listen for connection status changes
      await listen<{ sessionId: string; status: ConnectionStatus; error?: string }>('connection-status', (event) => {
        const { sessionId, status, error } = event.payload;
        useAppStore.getState().updateSessionStatus(sessionId, status, error);
      });

      // Listen for incoming messages
      await listen<{ sessionId: string; data: Uint8Array; direction: 'in' | 'out' }>('message-received', (event) => {
        const { sessionId, data, direction } = event.payload;
        this.handleIncomingMessage(sessionId, data, direction);
      });

      // Listen for client connection events (for server sessions)
      await listen<{ sessionId: string; clientId: string; remoteAddress: string; remotePort: number }>('client-connected', (event) => {
        const { sessionId, clientId, remoteAddress, remotePort } = event.payload;
        this.handleClientConnected(sessionId, clientId, remoteAddress, remotePort);
      });

      await listen<{ sessionId: string; clientId: string }>('client-disconnected', (event) => {
        const { sessionId, clientId } = event.payload;
        this.handleClientDisconnected(sessionId, clientId);
      });
    } catch (error) {
      console.error('Failed to initialize network event listeners:', error);
    }
  }

  private handleNetworkEvent(event: NetworkEvent) {
    const { sessionId, type, data, error } = event;
    const store = useAppStore.getState();

    switch (type) {
      case 'connected':
        store.updateSessionStatus(sessionId, 'connected');
        break;
      case 'disconnected':
        store.updateSessionStatus(sessionId, 'disconnected');
        this.handleAutoReconnect(sessionId);
        break;
      case 'error':
        store.updateSessionStatus(sessionId, 'error', error);
        break;
      case 'message':
        if (data) {
          this.handleIncomingMessage(sessionId, data, 'in');
        }
        break;
    }
  }

  private handleIncomingMessage(sessionId: string, data: Uint8Array, direction: 'in' | 'out') {
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      direction,
      protocol: useAppStore.getState().getSession(sessionId)?.config.protocol || 'TCP',
      size: data.length,
      data,
      status: 'success',
      raw: this.uint8ArrayToString(data),
    };

    useAppStore.getState().addMessage(sessionId, message);
  }

  private handleClientConnected(sessionId: string, clientId: string, remoteAddress: string, remotePort: number) {
    const clientConnection = {
      id: clientId,
      sessionId,
      remoteAddress,
      remotePort,
      connectedAt: new Date(),
      lastActivity: new Date(),
      bytesReceived: 0,
      bytesSent: 0,
      isActive: true,
    };

    useAppStore.getState().addClientConnection(sessionId, clientConnection);
  }

  private handleClientDisconnected(sessionId: string, clientId: string) {
    useAppStore.getState().removeClientConnection(sessionId, clientId);
  }

  private handleAutoReconnect(sessionId: string) {
    const session = useAppStore.getState().getSession(sessionId);
    if (!session || !session.config.autoReconnect) return;

    // Clear existing timer
    const existingTimer = this.reconnectTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new reconnect timer
    const timer = setTimeout(() => {
      this.connect(sessionId);
    }, 5000); // Reconnect after 5 seconds

    this.reconnectTimers.set(sessionId, timer);
  }

  async connect(sessionId: string): Promise<boolean> {
    try {
      const session = useAppStore.getState().getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const { config } = session;
      useAppStore.getState().updateSessionStatus(sessionId, 'connecting');

      // Call Tauri backend to establish connection
      const result = await invoke<boolean>('connect_session', {
        sessionId,
        config: {
          protocol: config.protocol.toLowerCase(),
          connectionType: config.connectionType,
          host: config.host,
          port: config.port,
          timeout: config.timeout,
          keepAlive: config.keepAlive,
          websocketSubprotocol: config.websocketSubprotocol,
          mqttTopic: config.mqttTopic,
          sseEventTypes: config.sseEventTypes,
        },
      });

      if (result) {
        const connection: NetworkConnection = {
          id: `conn_${sessionId}`,
          sessionId,
          isConnected: true,
          remoteAddress: config.host,
          remotePort: config.port,
        };
        this.connections.set(sessionId, connection);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Connection failed:', error);
      useAppStore.getState().updateSessionStatus(sessionId, 'error', error instanceof Error ? error.message : 'Connection failed');
      return false;
    }
  }

  async disconnect(sessionId: string): Promise<boolean> {
    try {
      // Clear reconnect timer
      const timer = this.reconnectTimers.get(sessionId);
      if (timer) {
        clearTimeout(timer);
        this.reconnectTimers.delete(sessionId);
      }

      // Call Tauri backend to disconnect
      const result = await invoke<boolean>('disconnect_session', { sessionId });

      if (result) {
        this.connections.delete(sessionId);
        useAppStore.getState().updateSessionStatus(sessionId, 'disconnected');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Disconnect failed:', error);
      return false;
    }
  }

  async sendMessage(sessionId: string, data: Uint8Array): Promise<boolean> {
    try {
      const connection = this.connections.get(sessionId);
      if (!connection || !connection.isConnected) {
        throw new Error('Connection not established');
      }

      // Call Tauri backend to send message
      const result = await invoke<boolean>('send_message', {
        sessionId,
        data: Array.from(data), // Convert Uint8Array to regular array for JSON serialization
      });

      if (result) {
        // Add outgoing message to store
        this.handleIncomingMessage(sessionId, data, 'out');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Send message failed:', error);
      
      // Add failed message to store
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        direction: 'out',
        protocol: useAppStore.getState().getSession(sessionId)?.config.protocol || 'TCP',
        size: data.length,
        data,
        status: 'error',
        raw: this.uint8ArrayToString(data),
      };

      useAppStore.getState().addMessage(sessionId, message);
      return false;
    }
  }

  async sendString(sessionId: string, text: string, format: 'ascii' | 'hex' | 'base64' = 'ascii'): Promise<boolean> {
    try {
      let data: Uint8Array;

      switch (format) {
        case 'hex':
          data = this.hexStringToUint8Array(text);
          break;
        case 'base64':
          data = this.base64StringToUint8Array(text);
          break;
        case 'ascii':
        default:
          data = new TextEncoder().encode(text);
          break;
      }

      return await this.sendMessage(sessionId, data);
    } catch (error) {
      console.error('Send string failed:', error);
      return false;
    }
  }

  // 服务端特定方法：广播消息到所有客户端
  async broadcastMessage(sessionId: string, data: Uint8Array): Promise<boolean> {
    try {
      const session = useAppStore.getState().getSession(sessionId);
      if (!session || session.config.connectionType !== 'server') {
        throw new Error('Session is not a server or not found');
      }

      // Call Tauri backend to broadcast message
      const result = await invoke<boolean>('broadcast_message', {
        sessionId,
        data: Array.from(data),
      });

      if (result) {
        // Add outgoing message to store
        this.handleIncomingMessage(sessionId, data, 'out');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Broadcast message failed:', error);

      // Add failed message to store
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        direction: 'out',
        protocol: useAppStore.getState().getSession(sessionId)?.config.protocol || 'TCP',
        size: data.length,
        data,
        status: 'error',
        raw: this.uint8ArrayToString(data),
      };

      useAppStore.getState().addMessage(sessionId, message);
      return false;
    }
  }

  // 服务端特定方法：发送消息到指定客户端
  async sendToClient(sessionId: string, clientId: string, data: Uint8Array): Promise<boolean> {
    try {
      const session = useAppStore.getState().getSession(sessionId);
      if (!session || session.config.connectionType !== 'server') {
        throw new Error('Session is not a server or not found');
      }

      // Call Tauri backend to send message to specific client
      const result = await invoke<boolean>('send_to_client', {
        sessionId,
        clientId,
        data: Array.from(data),
      });

      if (result) {
        // Add outgoing message to store
        this.handleIncomingMessage(sessionId, data, 'out');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Send to client failed:', error);

      // Add failed message to store
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        direction: 'out',
        protocol: useAppStore.getState().getSession(sessionId)?.config.protocol || 'TCP',
        size: data.length,
        data,
        status: 'error',
        raw: this.uint8ArrayToString(data),
      };

      useAppStore.getState().addMessage(sessionId, message);
      return false;
    }
  }

  // UDP特定方法：发送UDP数据报到指定地址
  async sendUDPMessage(sessionId: string, data: Uint8Array, targetHost: string, targetPort: number): Promise<boolean> {
    try {
      const session = useAppStore.getState().getSession(sessionId);
      if (!session || session.config.protocol !== 'UDP') {
        throw new Error('Session is not a UDP session or not found');
      }

      // Call Tauri backend to send UDP message
      const result = await invoke<boolean>('send_udp_message', {
        sessionId,
        data: Array.from(data),
        targetHost,
        targetPort,
      });

      if (result) {
        // Add outgoing message to store
        this.handleIncomingMessage(sessionId, data, 'out');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Send UDP message failed:', error);

      // Add failed message to store
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        direction: 'out',
        protocol: 'UDP',
        size: data.length,
        data,
        status: 'error',
        raw: this.uint8ArrayToString(data),
      };

      useAppStore.getState().addMessage(sessionId, message);
      return false;
    }
  }

  // WebSocket特定方法：发送WebSocket消息
  async sendWebSocketMessage(sessionId: string, data: string | Uint8Array, messageType: 'text' | 'binary'): Promise<boolean> {
    try {
      const session = useAppStore.getState().getSession(sessionId);
      if (!session || session.config.protocol !== 'WebSocket') {
        throw new Error('Session is not a WebSocket session or not found');
      }

      // Call Tauri backend to send WebSocket message
      const result = await invoke<boolean>('send_websocket_message', {
        sessionId,
        data: messageType === 'text' ? data : Array.from(data as Uint8Array),
        messageType,
      });

      if (result) {
        // Add outgoing message to store
        const messageData = messageType === 'text'
          ? new TextEncoder().encode(data as string)
          : data as Uint8Array;
        this.handleIncomingMessage(sessionId, messageData, 'out');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Send WebSocket message failed:', error);

      // Add failed message to store
      const messageData = messageType === 'text'
        ? new TextEncoder().encode(data as string)
        : data as Uint8Array;

      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        direction: 'out',
        protocol: 'WebSocket',
        size: messageData.length,
        data: messageData,
        status: 'error',
        raw: this.uint8ArrayToString(messageData),
      };

      useAppStore.getState().addMessage(sessionId, message);
      return false;
    }
  }

  getConnection(sessionId: string): NetworkConnection | undefined {
    return this.connections.get(sessionId);
  }

  isConnected(sessionId: string): boolean {
    const connection = this.connections.get(sessionId);
    return connection?.isConnected || false;
  }

  // Utility methods
  private uint8ArrayToString(data: Uint8Array): string {
    try {
      return new TextDecoder('utf-8').decode(data);
    } catch {
      // If UTF-8 decoding fails, return hex representation
      return Array.from(data)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join(' ');
    }
  }

  private hexStringToUint8Array(hex: string): Uint8Array {
    const cleanHex = hex.replace(/\s+/g, '');
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
    }
    return bytes;
  }

  private base64StringToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // Cleanup method
  cleanup() {
    // Clear all reconnect timers
    this.reconnectTimers.forEach(timer => clearTimeout(timer));
    this.reconnectTimers.clear();

    // Disconnect all connections
    this.connections.forEach((_, sessionId) => {
      this.disconnect(sessionId);
    });
    this.connections.clear();
  }
}

// Export singleton instance
export const networkService = new NetworkService();

// Export for cleanup on app unmount
export const cleanupNetworkService = () => {
  networkService.cleanup();
};
