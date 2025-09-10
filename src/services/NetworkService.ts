import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Message, ConnectionStatus, NetworkConnection, WebSocketErrorType, MQTTQoSLevel, MQTTErrorType, MQTTSubscription, MQTTPublishOptions } from '@/types';
import { useAppStore } from '@/stores/AppStore';

export interface NetworkEvent {
  sessionId: string;
  type: 'connected' | 'disconnected' | 'message' | 'error';
  data?: any;
  error?: string;
}

class NetworkService {
  private connections: Map<string, NetworkConnection> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  // WebSocket特有属性
  private websocketPingTimers: Map<string, NodeJS.Timeout> = new Map();
  private websocketPongTimers: Map<string, NodeJS.Timeout> = new Map();
  private websocketReconnectAttempts: Map<string, number> = new Map();

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

      // WebSocket特有的连接前验证
      if (config.protocol === 'WebSocket') {
        // 构建WebSocket URL
        const protocol = config.host?.startsWith('localhost') || config.host?.startsWith('127.0.0.1') ? 'ws' : 'wss';
        const wsUrl = `${protocol}://${config.host}:${config.port}`;

        // 验证WebSocket URL
        const validation = this.validateWebSocketUrl(wsUrl);
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid WebSocket URL');
        }
      }

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
          websocketExtensions: config.websocketExtensions,
          websocketPingInterval: config.websocketPingInterval,
          websocketMaxMessageSize: config.websocketMaxMessageSize,
          websocketCompressionEnabled: config.websocketCompressionEnabled,
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

        // WebSocket特有的连接后处理
        if (config.protocol === 'WebSocket') {
          // 启动心跳机制
          const pingInterval = config.websocketPingInterval || 30000;
          this.startWebSocketHeartbeat(sessionId, pingInterval);

          // 重置重连计数
          this.websocketReconnectAttempts.delete(sessionId);
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      useAppStore.getState().updateSessionStatus(sessionId, 'error', errorMessage);

      // WebSocket特有的错误处理
      const sessionForError = useAppStore.getState().getSession(sessionId);
      if (sessionForError?.config.protocol === 'WebSocket') {
        if (errorMessage.includes('timeout')) {
          this.handleWebSocketError(sessionId, 'connection_timeout', errorMessage);
        } else if (errorMessage.includes('protocol')) {
          this.handleWebSocketError(sessionId, 'protocol_error', errorMessage);
        }
      }

      return false;
    }
  }

  async disconnect(sessionId: string): Promise<boolean> {
    try {
      const session = useAppStore.getState().getSession(sessionId);

      // WebSocket特有的断开前处理
      if (session?.config.protocol === 'WebSocket') {
        // 停止心跳机制
        this.stopWebSocketHeartbeat(sessionId);

        // 清除重连计数
        this.websocketReconnectAttempts.delete(sessionId);

        // 发送close帧（可选）
        try {
          await invoke<boolean>('send_websocket_close', {
            sessionId,
            code: 1000, // Normal closure
            reason: 'Client initiated disconnect'
          });
        } catch (error) {
          console.warn('Failed to send WebSocket close frame:', error);
        }
      }

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

  // WebSocket特定方法：验证WebSocket URL
  validateWebSocketUrl(url: string): { isValid: boolean; error?: string } {
    try {
      const urlObj = new URL(url);

      // 检查协议
      if (urlObj.protocol !== 'ws:' && urlObj.protocol !== 'wss:') {
        return { isValid: false, error: 'WebSocket URL必须使用ws://或wss://协议' };
      }

      // 检查主机名
      if (!urlObj.hostname) {
        return { isValid: false, error: 'WebSocket URL必须包含有效的主机名' };
      }

      // 检查端口（如果指定）
      if (urlObj.port) {
        const port = parseInt(urlObj.port);
        if (isNaN(port) || port < 1 || port > 65535) {
          return { isValid: false, error: 'WebSocket端口必须在1-65535范围内' };
        }
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'WebSocket URL格式无效' };
    }
  }

  // WebSocket特定方法：启动心跳机制
  private startWebSocketHeartbeat(sessionId: string, pingInterval: number = 30000) {
    // 清除现有的心跳定时器
    this.stopWebSocketHeartbeat(sessionId);

    const pingTimer = setInterval(async () => {
      try {
        await this.sendWebSocketPing(sessionId);
      } catch (error) {
        console.error('WebSocket ping failed:', error);
        this.stopWebSocketHeartbeat(sessionId);
      }
    }, pingInterval);

    this.websocketPingTimers.set(sessionId, pingTimer as any);
  }

  // WebSocket特定方法：停止心跳机制
  private stopWebSocketHeartbeat(sessionId: string) {
    const pingTimer = this.websocketPingTimers.get(sessionId);
    if (pingTimer) {
      clearInterval(pingTimer);
      this.websocketPingTimers.delete(sessionId);
    }

    const pongTimer = this.websocketPongTimers.get(sessionId);
    if (pongTimer) {
      clearTimeout(pongTimer);
      this.websocketPongTimers.delete(sessionId);
    }
  }

  // WebSocket特定方法：发送ping帧
  async sendWebSocketPing(sessionId: string): Promise<boolean> {
    try {
      const session = useAppStore.getState().getSession(sessionId);
      if (!session || session.config.protocol !== 'WebSocket') {
        throw new Error('Session is not a WebSocket session or not found');
      }

      // Call Tauri backend to send ping frame
      const result = await invoke<boolean>('send_websocket_ping', { sessionId });

      if (result) {
        // 设置pong超时定时器
        const pongTimeout = setTimeout(() => {
          console.warn('WebSocket pong timeout for session:', sessionId);
          // 可以选择断开连接或重连
          this.handleWebSocketError(sessionId, 'pong_timeout', 'Pong response timeout');
        }, 10000); // 10秒pong超时

        this.websocketPongTimers.set(sessionId, pongTimeout as any);

        // 添加ping消息到消息流
        const pingMessage: Message = {
          id: `ping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          direction: 'out',
          protocol: 'WebSocket',
          size: 0,
          data: new Uint8Array(),
          status: 'success',
          raw: '[PING]',
          frameType: 'ping',
        };

        useAppStore.getState().addMessage(sessionId, pingMessage);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Send WebSocket ping failed:', error);
      return false;
    }
  }

  // WebSocket特定方法：处理pong帧
  handleWebSocketPong(sessionId: string) {
    // 清除pong超时定时器
    const pongTimer = this.websocketPongTimers.get(sessionId);
    if (pongTimer) {
      clearTimeout(pongTimer);
      this.websocketPongTimers.delete(sessionId);
    }

    // 添加pong消息到消息流
    const pongMessage: Message = {
      id: `pong_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      direction: 'in',
      protocol: 'WebSocket',
      size: 0,
      data: new Uint8Array(),
      status: 'success',
      raw: '[PONG]',
      frameType: 'pong',
    };

    useAppStore.getState().addMessage(sessionId, pongMessage);
  }

  // WebSocket服务端特定方法：断开指定客户端连接
  async disconnectWebSocketClient(sessionId: string, clientId: string, code: number = 1000, reason: string = 'Server initiated disconnect'): Promise<boolean> {
    try {
      const session = useAppStore.getState().getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.config.protocol !== 'WebSocket') {
        throw new Error('Session is not a WebSocket session');
      }

      if (session.config.connectionType !== 'server') {
        throw new Error('Session is not a WebSocket server');
      }

      // Call Tauri backend to disconnect specific WebSocket client
      const result = await invoke<boolean>('disconnect_websocket_client', {
        sessionId,
        clientId,
        code,
        reason,
      });

      if (result) {
        // Remove client from store
        useAppStore.getState().removeClientConnection(sessionId, clientId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Disconnect WebSocket client failed:', error);
      return false;
    }
  }

  // WebSocket服务端特定方法：获取WebSocket客户端连接信息
  async getWebSocketClientInfo(sessionId: string, clientId: string): Promise<any> {
    try {
      const session = useAppStore.getState().getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.config.protocol !== 'WebSocket') {
        throw new Error('Session is not a WebSocket session');
      }

      if (session.config.connectionType !== 'server') {
        throw new Error('Session is not a WebSocket server');
      }

      // Call Tauri backend to get WebSocket client info
      const result = await invoke<any>('get_websocket_client_info', {
        sessionId,
        clientId,
      });

      return result;
    } catch (error) {
      console.error('Get WebSocket client info failed:', error);
      return null;
    }
  }

  // WebSocket服务端特定方法：向指定客户端发送ping帧
  async sendWebSocketPingToClient(sessionId: string, clientId: string): Promise<boolean> {
    try {
      const session = useAppStore.getState().getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.config.protocol !== 'WebSocket') {
        throw new Error('Session is not a WebSocket session');
      }

      if (session.config.connectionType !== 'server') {
        throw new Error('Session is not a WebSocket server');
      }

      // Call Tauri backend to send ping to specific client
      const result = await invoke<boolean>('send_websocket_ping_to_client', {
        sessionId,
        clientId,
      });

      if (result) {
        // Add ping message to store
        const message: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          direction: 'out',
          protocol: 'WebSocket',
          size: 0,
          data: new Uint8Array(),
          status: 'success',
          raw: '[PING 帧]',
          frameType: 'ping',
          targetClientId: clientId,
        };

        useAppStore.getState().addMessage(sessionId, message);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Send WebSocket ping to client failed:', error);
      return false;
    }
  }

  // WebSocket服务端特定方法：向所有客户端广播ping帧
  async broadcastWebSocketPing(sessionId: string): Promise<boolean> {
    try {
      const session = useAppStore.getState().getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.config.protocol !== 'WebSocket') {
        throw new Error('Session is not a WebSocket session');
      }

      if (session.config.connectionType !== 'server') {
        throw new Error('Session is not a WebSocket server');
      }

      // Call Tauri backend to broadcast ping to all clients
      const result = await invoke<boolean>('broadcast_websocket_ping', {
        sessionId,
      });

      if (result) {
        // Add ping message to store
        const message: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          direction: 'out',
          protocol: 'WebSocket',
          size: 0,
          data: new Uint8Array(),
          status: 'success',
          raw: '[PING 帧 - 广播]',
          frameType: 'ping',
        };

        useAppStore.getState().addMessage(sessionId, message);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Broadcast WebSocket ping failed:', error);
      return false;
    }
  }

  // WebSocket特定方法：处理WebSocket错误
  private handleWebSocketError(sessionId: string, errorType: WebSocketErrorType, errorMessage: string) {
    console.error(`WebSocket error [${errorType}]:`, errorMessage);

    // 停止心跳
    this.stopWebSocketHeartbeat(sessionId);

    // 更新会话状态
    useAppStore.getState().updateSessionStatus(sessionId, 'error', `${errorType}: ${errorMessage}`);

    // 根据错误类型决定是否重连
    if (errorType === 'connection_timeout' || errorType === 'pong_timeout') {
      this.handleWebSocketReconnect(sessionId);
    }
  }

  // WebSocket特定方法：处理重连
  private async handleWebSocketReconnect(sessionId: string) {
    const session = useAppStore.getState().getSession(sessionId);
    if (!session || !session.config.autoReconnect) return;

    // 服务端模式和客户端模式的重连处理不同
    if (session.config.connectionType === 'server') {
      this.handleWebSocketServerReconnect(sessionId);
    } else {
      this.handleWebSocketClientReconnect(sessionId);
    }
  }

  // WebSocket服务端特定方法：处理WebSocket重连（服务端模式下重启监听）
  private handleWebSocketServerReconnect(sessionId: string) {
    const session = useAppStore.getState().getSession(sessionId);
    if (!session || session.config.connectionType !== 'server') {
      return;
    }

    // 获取重连次数
    const attempts = this.websocketReconnectAttempts.get(sessionId) || 0;
    const maxAttempts = 5; // 最大重连次数

    if (attempts >= maxAttempts) {
      console.warn(`WebSocket server ${sessionId} reached maximum reconnect attempts`);
      this.handleWebSocketError(sessionId, 'connection_timeout', 'Maximum reconnect attempts reached');
      return;
    }

    // 增加重连次数
    this.websocketReconnectAttempts.set(sessionId, attempts + 1);

    // 延迟重连
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // 指数退避，最大30秒
    setTimeout(() => {
      console.log(`Attempting to restart WebSocket server ${sessionId} (attempt ${attempts + 1}/${maxAttempts})`);
      this.connect(sessionId);
    }, delay);
  }

  // WebSocket客户端特定方法：处理WebSocket重连
  private async handleWebSocketClientReconnect(sessionId: string) {
    const session = useAppStore.getState().getSession(sessionId);
    if (!session || session.config.connectionType !== 'client') return;

    const attempts = this.websocketReconnectAttempts.get(sessionId) || 0;
    const maxAttempts = session.config.retryAttempts || 5;

    if (attempts >= maxAttempts) {
      console.log(`WebSocket client max reconnect attempts reached for session: ${sessionId}`);
      this.websocketReconnectAttempts.delete(sessionId);
      return;
    }

    this.websocketReconnectAttempts.set(sessionId, attempts + 1);

    // 延迟重连
    const reconnectDelay = Math.min(1000 * Math.pow(2, attempts), 30000); // 指数退避，最大30秒

    setTimeout(async () => {
      console.log(`WebSocket client reconnecting attempt ${attempts + 1} for session: ${sessionId}`);
      const success = await this.connect(sessionId);

      if (success) {
        this.websocketReconnectAttempts.delete(sessionId);
        console.log(`WebSocket client reconnected successfully for session: ${sessionId}`);
      }
    }, reconnectDelay);
  }

  // WebSocket服务端特定方法：广播WebSocket消息到所有客户端
  async broadcastWebSocketMessage(sessionId: string, data: string | Uint8Array, messageType: 'text' | 'binary'): Promise<boolean> {
    try {
      const session = useAppStore.getState().getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.config.protocol !== 'WebSocket') {
        throw new Error('Session is not a WebSocket session');
      }

      if (session.config.connectionType !== 'server') {
        throw new Error('Session is not a WebSocket server');
      }

      // 验证消息数据
      let messageData: Uint8Array;
      if (messageType === 'text') {
        if (typeof data !== 'string') {
          throw new Error('Text message data must be a string');
        }
        messageData = new TextEncoder().encode(data);
      } else {
        if (typeof data === 'string') {
          messageData = new TextEncoder().encode(data);
        } else {
          messageData = data;
        }
      }

      // 检查消息大小限制
      const maxMessageSize = session.config.websocketMaxMessageSize || 1024 * 1024; // 默认1MB
      if (messageData.length > maxMessageSize) {
        throw new Error(`Message size (${messageData.length} bytes) exceeds maximum allowed size (${maxMessageSize} bytes)`);
      }

      // Call Tauri backend to broadcast WebSocket message
      const result = await invoke<boolean>('broadcast_websocket_message', {
        sessionId,
        data: messageType === 'text' ? data : Array.from(messageData),
        messageType,
      });

      if (result) {
        // Add outgoing message to store
        const message: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          direction: 'out',
          protocol: 'WebSocket',
          size: messageData.length,
          data: messageData,
          status: 'success',
          raw: this.uint8ArrayToString(messageData),
          frameType: messageType,
        };

        useAppStore.getState().addMessage(sessionId, message);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Broadcast WebSocket message failed:', error);

      // Add failed message to store
      const messageData = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        direction: 'out',
        protocol: 'WebSocket',
        size: messageData.length,
        data: messageData,
        status: 'error',
        raw: this.uint8ArrayToString(messageData),
        frameType: messageType,
      };

      useAppStore.getState().addMessage(sessionId, message);

      // 根据错误类型进行特定处理
      if (error instanceof Error) {
        if (error.message.includes('size')) {
          this.handleWebSocketError(sessionId, 'message_too_large', error.message);
        } else if (error.message.includes('connection')) {
          this.handleWebSocketError(sessionId, 'connection_timeout', error.message);
        } else {
          this.handleWebSocketError(sessionId, 'protocol_error', error.message);
        }
      }

      return false;
    }
  }

  // WebSocket服务端特定方法：发送WebSocket消息到指定客户端
  async sendWebSocketMessageToClient(sessionId: string, clientId: string, data: string | Uint8Array, messageType: 'text' | 'binary' = 'text'): Promise<boolean> {
    try {
      const session = useAppStore.getState().getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.config.protocol !== 'WebSocket') {
        throw new Error('Session is not a WebSocket session');
      }

      if (session.config.connectionType !== 'server') {
        throw new Error('Session is not a WebSocket server');
      }

      // 验证消息数据
      let messageData: Uint8Array;
      if (messageType === 'text') {
        if (typeof data !== 'string') {
          throw new Error('Text message data must be a string');
        }
        messageData = new TextEncoder().encode(data);
      } else {
        if (typeof data === 'string') {
          messageData = new TextEncoder().encode(data);
        } else {
          messageData = data;
        }
      }

      // 检查消息大小限制
      const maxMessageSize = session.config.websocketMaxMessageSize || 1024 * 1024; // 默认1MB
      if (messageData.length > maxMessageSize) {
        throw new Error(`Message size (${messageData.length} bytes) exceeds maximum allowed size (${maxMessageSize} bytes)`);
      }

      // Call Tauri backend to send WebSocket message to specific client
      const result = await invoke<boolean>('send_websocket_message_to_client', {
        sessionId,
        clientId,
        data: messageType === 'text' ? data : Array.from(messageData),
        messageType,
      });

      if (result) {
        // Add outgoing message to store
        const message: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          direction: 'out',
          protocol: 'WebSocket',
          size: messageData.length,
          data: messageData,
          status: 'success',
          raw: this.uint8ArrayToString(messageData),
          frameType: messageType,
          targetClientId: clientId,
        };

        useAppStore.getState().addMessage(sessionId, message);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Send WebSocket message to client failed:', error);

      // Add failed message to store
      const messageData = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        direction: 'out',
        protocol: 'WebSocket',
        size: messageData.length,
        data: messageData,
        status: 'error',
        raw: this.uint8ArrayToString(messageData),
        frameType: messageType,
        targetClientId: clientId,
      };

      useAppStore.getState().addMessage(sessionId, message);

      // 根据错误类型进行特定处理
      if (error instanceof Error) {
        if (error.message.includes('size')) {
          this.handleWebSocketError(sessionId, 'message_too_large', error.message);
        } else if (error.message.includes('connection')) {
          this.handleWebSocketError(sessionId, 'connection_timeout', error.message);
        } else {
          this.handleWebSocketError(sessionId, 'protocol_error', error.message);
        }
      }

      return false;
    }
  }

  // WebSocket特定方法：发送WebSocket消息
  async sendWebSocketMessage(sessionId: string, data: string | Uint8Array, messageType: 'text' | 'binary' = 'text'): Promise<boolean> {
    try {
      const session = useAppStore.getState().getSession(sessionId);
      if (!session || session.config.protocol !== 'WebSocket') {
        throw new Error('Session is not a WebSocket session or not found');
      }

      // 检查连接状态
      if (session.status !== 'connected') {
        throw new Error('WebSocket connection is not established');
      }

      // 准备消息数据
      const messageData = messageType === 'text'
        ? new TextEncoder().encode(data as string)
        : data as Uint8Array;

      // 检查消息大小限制
      const maxMessageSize = session.config.websocketMaxMessageSize || 1024 * 1024; // 默认1MB
      if (messageData.length > maxMessageSize) {
        throw new Error(`Message size (${messageData.length} bytes) exceeds maximum allowed size (${maxMessageSize} bytes)`);
      }

      // Call Tauri backend to send WebSocket message
      const result = await invoke<boolean>('send_websocket_message', {
        sessionId,
        data: messageType === 'text' ? data : Array.from(messageData),
        messageType,
      });

      if (result) {
        // Add outgoing message to store with WebSocket-specific fields
        const message: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          direction: 'out',
          protocol: 'WebSocket',
          size: messageData.length,
          data: messageData,
          status: 'success',
          raw: this.uint8ArrayToString(messageData),
          frameType: messageType,
          compressed: session.config.websocketCompressionEnabled || false,
        };

        useAppStore.getState().addMessage(sessionId, message);
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
        frameType: messageType,
      };

      useAppStore.getState().addMessage(sessionId, message);

      // 根据错误类型进行特定处理
      if (error instanceof Error) {
        if (error.message.includes('size')) {
          this.handleWebSocketError(sessionId, 'message_too_large', error.message);
        } else if (error.message.includes('connection')) {
          this.handleWebSocketError(sessionId, 'connection_timeout', error.message);
        } else {
          this.handleWebSocketError(sessionId, 'protocol_error', error.message);
        }
      }

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

    // Clear WebSocket-specific timers
    this.websocketPingTimers.forEach(timer => clearInterval(timer));
    this.websocketPingTimers.clear();

    this.websocketPongTimers.forEach(timer => clearTimeout(timer));
    this.websocketPongTimers.clear();

    this.websocketReconnectAttempts.clear();

    // Disconnect all connections
    this.connections.forEach((_, sessionId) => {
      this.disconnect(sessionId);
    });
    this.connections.clear();
  }

  // ==================== MQTT特定方法 ====================

  // MQTT特定方法：订阅主题
  async subscribeMQTTTopic(sessionId: string, topic: string, qos: MQTTQoSLevel = 0): Promise<boolean> {
    try {
      const session = useAppStore.getState().getSession(sessionId);
      if (!session || session.config.protocol !== 'MQTT') {
        throw new Error('Session is not an MQTT session or not found');
      }

      // 检查连接状态
      if (session.status !== 'connected') {
        throw new Error('MQTT connection is not established');
      }

      // 验证主题格式
      if (!this.validateMQTTTopic(topic, 'subscribe')) {
        throw new Error('Invalid MQTT topic filter');
      }

      // Call Tauri backend to subscribe to MQTT topic
      const result = await invoke<boolean>('subscribe_mqtt_topic', {
        sessionId,
        topic,
        qos,
      });

      if (result) {
        // 添加订阅到状态管理
        const subscription: MQTTSubscription = {
          id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          topic,
          qos,
          subscribedAt: new Date(),
          messageCount: 0,
          isActive: true,
        };

        useAppStore.getState().addMQTTSubscription(sessionId, subscription);

        // 添加订阅成功消息到消息流
        const message: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          direction: 'out',
          protocol: 'MQTT',
          size: topic.length,
          data: new TextEncoder().encode(`SUBSCRIBE: ${topic} (QoS ${qos})`),
          status: 'success',
          raw: `SUBSCRIBE: ${topic} (QoS ${qos})`,
          mqttTopic: topic,
          mqttQos: qos,
        };

        useAppStore.getState().addMessage(sessionId, message);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Subscribe MQTT topic failed:', error);

      // 添加失败消息到消息流
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        direction: 'out',
        protocol: 'MQTT',
        size: topic.length,
        data: new TextEncoder().encode(`SUBSCRIBE FAILED: ${topic} (QoS ${qos})`),
        status: 'error',
        raw: `SUBSCRIBE FAILED: ${topic} (QoS ${qos})`,
        mqttTopic: topic,
        mqttQos: qos,
      };

      useAppStore.getState().addMessage(sessionId, message);

      // 根据错误类型进行特定处理
      if (error instanceof Error) {
        if (error.message.includes('topic')) {
          this.handleMQTTError(sessionId, 'topic_filter_invalid', error.message);
        } else if (error.message.includes('connection')) {
          this.handleMQTTError(sessionId, 'connection_refused', error.message);
        } else {
          this.handleMQTTError(sessionId, 'protocol_error', error.message);
        }
      }

      return false;
    }
  }

  // MQTT特定方法：取消订阅主题
  async unsubscribeMQTTTopic(sessionId: string, topic: string): Promise<boolean> {
    try {
      const session = useAppStore.getState().getSession(sessionId);
      if (!session || session.config.protocol !== 'MQTT') {
        throw new Error('Session is not an MQTT session or not found');
      }

      // 检查连接状态
      if (session.status !== 'connected') {
        throw new Error('MQTT connection is not established');
      }

      // Call Tauri backend to unsubscribe from MQTT topic
      const result = await invoke<boolean>('unsubscribe_mqtt_topic', {
        sessionId,
        topic,
      });

      if (result) {
        // 从状态管理中移除订阅
        useAppStore.getState().removeMQTTSubscription(sessionId, topic);

        // 添加取消订阅成功消息到消息流
        const message: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          direction: 'out',
          protocol: 'MQTT',
          size: topic.length,
          data: new TextEncoder().encode(`UNSUBSCRIBE: ${topic}`),
          status: 'success',
          raw: `UNSUBSCRIBE: ${topic}`,
          mqttTopic: topic,
        };

        useAppStore.getState().addMessage(sessionId, message);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Unsubscribe MQTT topic failed:', error);

      // 添加失败消息到消息流
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        direction: 'out',
        protocol: 'MQTT',
        size: topic.length,
        data: new TextEncoder().encode(`UNSUBSCRIBE FAILED: ${topic}`),
        status: 'error',
        raw: `UNSUBSCRIBE FAILED: ${topic}`,
        mqttTopic: topic,
      };

      useAppStore.getState().addMessage(sessionId, message);

      // 根据错误类型进行特定处理
      if (error instanceof Error) {
        this.handleMQTTError(sessionId, 'protocol_error', error.message);
      }

      return false;
    }
  }

  // MQTT特定方法：发布消息
  async publishMQTTMessage(sessionId: string, topic: string, payload: string | Uint8Array, options: MQTTPublishOptions = { qos: 0, retain: false }): Promise<boolean> {
    try {
      const session = useAppStore.getState().getSession(sessionId);
      if (!session || session.config.protocol !== 'MQTT') {
        throw new Error('Session is not an MQTT session or not found');
      }

      // 检查连接状态
      if (session.status !== 'connected') {
        throw new Error('MQTT connection is not established');
      }

      // 验证主题格式
      if (!this.validateMQTTTopic(topic, 'publish')) {
        throw new Error('Invalid MQTT topic name');
      }

      // 准备消息数据
      const messageData = typeof payload === 'string'
        ? new TextEncoder().encode(payload)
        : payload;

      // Call Tauri backend to publish MQTT message
      const result = await invoke<boolean>('publish_mqtt_message', {
        sessionId,
        topic,
        payload: Array.from(messageData),
        qos: options.qos,
        retain: options.retain,
        dup: options.dup || false,
      });

      if (result) {
        // 添加发布成功消息到消息流
        const message: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          direction: 'out',
          protocol: 'MQTT',
          size: messageData.length,
          data: messageData,
          status: 'success',
          raw: this.uint8ArrayToString(messageData),
          mqttTopic: topic,
          mqttQos: options.qos,
          mqttRetain: options.retain,
          mqttDup: options.dup,
        };

        useAppStore.getState().addMessage(sessionId, message);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Publish MQTT message failed:', error);

      // 准备消息数据用于错误记录
      const messageData = typeof payload === 'string'
        ? new TextEncoder().encode(payload)
        : payload;

      // 添加失败消息到消息流
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        direction: 'out',
        protocol: 'MQTT',
        size: messageData.length,
        data: messageData,
        status: 'error',
        raw: this.uint8ArrayToString(messageData),
        mqttTopic: topic,
        mqttQos: options.qos,
        mqttRetain: options.retain,
        mqttDup: options.dup,
      };

      useAppStore.getState().addMessage(sessionId, message);

      // 根据错误类型进行特定处理
      if (error instanceof Error) {
        if (error.message.includes('topic')) {
          this.handleMQTTError(sessionId, 'topic_name_invalid', error.message);
        } else if (error.message.includes('size') || error.message.includes('large')) {
          this.handleMQTTError(sessionId, 'packet_too_large', error.message);
        } else if (error.message.includes('connection')) {
          this.handleMQTTError(sessionId, 'connection_refused', error.message);
        } else {
          this.handleMQTTError(sessionId, 'protocol_error', error.message);
        }
      }

      return false;
    }
  }

  // MQTT特定方法：验证主题格式
  private validateMQTTTopic(topic: string, type: 'publish' | 'subscribe'): boolean {
    if (!topic || topic.length === 0) {
      return false;
    }

    // MQTT主题长度限制（通常为65535字节）
    if (topic.length > 65535) {
      return false;
    }

    // 发布主题不能包含通配符
    if (type === 'publish') {
      if (topic.includes('+') || topic.includes('#')) {
        return false;
      }
    }

    // 订阅主题可以包含通配符，但需要符合规则
    if (type === 'subscribe') {
      // # 通配符只能出现在主题末尾，且前面必须是 /
      const hashIndex = topic.indexOf('#');
      if (hashIndex !== -1) {
        if (hashIndex !== topic.length - 1) {
          return false; // # 不在末尾
        }
        if (hashIndex > 0 && topic[hashIndex - 1] !== '/') {
          return false; // # 前面不是 /
        }
      }

      // + 通配符必须占据完整的主题级别
      const parts = topic.split('/');
      for (const part of parts) {
        if (part.includes('+') && part !== '+') {
          return false; // + 不能与其他字符混合
        }
      }
    }

    // 主题不能包含空字符
    if (topic.includes('\0')) {
      return false;
    }

    return true;
  }

  // MQTT特定方法：处理MQTT错误
  private handleMQTTError(sessionId: string, errorType: MQTTErrorType, errorMessage: string) {
    console.error(`MQTT Error [${errorType}]:`, errorMessage);

    // 更新会话错误状态
    useAppStore.getState().updateSessionStatus(sessionId, 'error', `MQTT ${errorType}: ${errorMessage}`);

    // 根据错误类型决定是否需要重连
    const reconnectableErrors: MQTTErrorType[] = [
      'connection_refused',
      'server_unavailable',
      'connection_rate_exceeded',
      'maximum_connect_time'
    ];

    if (reconnectableErrors.includes(errorType)) {
      // 触发重连逻辑
      this.handleMQTTReconnect(sessionId);
    }
  }

  // MQTT特定方法：处理MQTT重连
  private handleMQTTReconnect(sessionId: string) {
    const session = useAppStore.getState().getSession(sessionId);
    if (!session || session.config.protocol !== 'MQTT' || !session.config.autoReconnect) {
      return;
    }

    // 设置重连延迟（指数退避）
    const baseDelay = 1000; // 1秒
    const maxDelay = 30000; // 30秒
    const attempt = session.statistics.connectionCount || 0;
    const reconnectDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

    console.log(`MQTT reconnecting in ${reconnectDelay}ms for session: ${sessionId}`);

    setTimeout(async () => {
      const currentSession = useAppStore.getState().getSession(sessionId);
      if (currentSession && currentSession.status === 'error') {
        console.log(`Attempting MQTT reconnection for session: ${sessionId}`);
        const success = await this.connect(sessionId);
        if (success) {
          console.log(`MQTT reconnected successfully for session: ${sessionId}`);

          // 重新订阅之前的主题
          const subscriptions = currentSession.mqttSubscriptions;
          if (subscriptions) {
            for (const subscription of Object.values(subscriptions)) {
              if (subscription.isActive) {
                await this.subscribeMQTTTopic(sessionId, subscription.topic, subscription.qos);
              }
            }
          }
        }
      }
    }, reconnectDelay);
  }
}

// Export singleton instance
export const networkService = new NetworkService();

// Export for cleanup on app unmount
export const cleanupNetworkService = () => {
  networkService.cleanup();
};
