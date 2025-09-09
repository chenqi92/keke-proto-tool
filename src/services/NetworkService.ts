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
