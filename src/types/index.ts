// 基础类型定义

export interface AppConfig {
  theme: 'light' | 'dark' | 'system'
  language: 'zh-CN' | 'en-US'
  autoSave: boolean
  maxLogEntries: number
}

export interface ConnectionConfig {
  id: string
  name: string
  type: 'tcp' | 'udp' | 'serial'
  host?: string
  port?: number
  serialPort?: string
  baudRate?: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ProtocolRule {
  id: string
  name: string
  description: string
  version: string
  author: string
  filePath: string
  isEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PacketData {
  id: string
  connectionId: string
  timestamp: Date
  direction: 'incoming' | 'outgoing'
  rawData: Uint8Array
  parsedData?: any
  protocol?: string
  size: number
}

export interface ProtoPlugin {
  id: string
  name: string
  version: string
  description: string
  author: string
  filePath: string
  isEnabled: boolean
  permissions: string[]
  createdAt: Date
  updatedAt: Date
}

// Tauri API 相关类型
export interface TauriCommand {
  command: string
  payload?: any
}

export interface TauriResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// 事件类型
export type AppEvent =
  | { type: 'CONNECTION_ESTABLISHED'; payload: ConnectionConfig }
  | { type: 'CONNECTION_LOST'; payload: { connectionId: string } }
  | { type: 'PACKET_RECEIVED'; payload: PacketData }
  | { type: 'PROTOCOL_LOADED'; payload: ProtocolRule }
  | { type: 'PLUGIN_LOADED'; payload: ProtoPlugin }
  | { type: 'ERROR'; payload: { message: string; details?: any } }

// UI 状态类型
export interface UIState {
  sidebarCollapsed: boolean
  activeView: 'connections' | 'packets' | 'protocols' | 'plugins' | 'settings'
  selectedConnection?: string
  selectedPacket?: string
}

// 导出相关类型
export interface ExportOptions {
  format: 'json' | 'csv' | 'pcap' | 'txt'
  includeRawData: boolean
  includeParsedData: boolean
  dateRange?: {
    start: Date
    end: Date
  }
  connectionIds?: string[]
  protocols?: string[]
}

// Enhanced types for real functionality
export type DataFormat = 'ascii' | 'binary' | 'octal' | 'decimal' | 'hex' | 'base64' | 'json' | 'utf8';
export type ProtocolType = 'TCP' | 'UDP' | 'WebSocket' | 'MQTT' | 'SSE';
export type ConnectionType = 'client' | 'server';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// WebSocket特有类型
export type WebSocketFrameType = 'text' | 'binary' | 'ping' | 'pong' | 'close' | 'continuation';
export type WebSocketErrorType = 'connection_timeout' | 'protocol_error' | 'invalid_frame' | 'message_too_large' | 'compression_error' | 'pong_timeout';

export interface WebSocketConfig {
  url?: string; // 完整的WebSocket URL (ws:// 或 wss://)
  subprotocols?: string[]; // 子协议列表
  extensions?: string[]; // 扩展列表
  pingInterval?: number; // ping间隔（毫秒）
  pongTimeout?: number; // pong超时（毫秒）
  maxMessageSize?: number; // 最大消息大小（字节）
  compressionEnabled?: boolean; // 是否启用压缩
  autoReconnect?: boolean; // 是否自动重连
  reconnectInterval?: number; // 重连间隔（毫秒）
  maxReconnectAttempts?: number; // 最大重连次数
}

export interface NetworkAddress {
  host: string;
  port: number;
}

export interface Message {
  id: string;
  timestamp: Date;
  direction: 'in' | 'out';
  protocol: ProtocolType;
  size: number;
  data: Uint8Array;
  status: 'success' | 'error' | 'pending';
  raw?: string;
  parsed?: any;
  // UDP特有字段：来源/目标地址
  sourceAddress?: NetworkAddress;
  targetAddress?: NetworkAddress;
  // WebSocket特有字段
  frameType?: 'text' | 'binary' | 'ping' | 'pong' | 'close' | 'continuation';
  isFragmented?: boolean; // 是否为分片消息
  fragmentIndex?: number; // 分片索引
  totalFragments?: number; // 总分片数
  compressed?: boolean; // 是否压缩
  // WebSocket服务端特有字段
  targetClientId?: string; // 目标客户端ID（用于单播消息）
  sourceClientId?: string; // 来源客户端ID（用于接收消息）
}

export interface SessionConfig {
  id: string;
  name: string;
  protocol: ProtocolType;
  connectionType: ConnectionType;
  host: string;
  port: number;
  autoReconnect: boolean;
  keepAlive: boolean;
  timeout: number;
  retryAttempts: number;
  // Protocol-specific configs
  websocketSubprotocol?: string;
  websocketExtensions?: string[];
  websocketPingInterval?: number; // ping间隔（秒）
  websocketMaxMessageSize?: number; // 最大消息大小（字节）
  websocketCompressionEnabled?: boolean; // 是否启用压缩
  mqttTopic?: string;
  sseEventTypes?: string[];
}

export interface SessionState {
  config: SessionConfig;
  status: ConnectionStatus;
  connectedAt?: Date;
  lastActivity?: Date;
  isRecording: boolean;
  messages: Message[];
  statistics: SessionStatistics;
  error?: string;
  clientConnections?: Record<string, ClientConnection>; // For server sessions
}

export interface SessionStatistics {
  messagesReceived: number;
  messagesSent: number;
  bytesReceived: number;
  bytesSent: number;
  errors: number;
  uptime: number; // in seconds
  connectionCount: number;
  lastError?: string;
}

export interface WorkspaceState {
  sessions: Record<string, SessionState>;
  activeSessionId: string | null;
  selectedNodeId: string | null;
  selectedNodeType: 'workspace' | 'session' | 'connection' | null;
}

export interface NetworkConnection {
  id: string;
  sessionId: string;
  socket?: any; // Will be WebSocket, net.Socket, or dgram.Socket
  isConnected: boolean;
  lastPing?: Date;
  remoteAddress?: string;
  remotePort?: number;
}

export interface ClientConnection {
  id: string;
  sessionId: string;
  remoteAddress: string;
  remotePort: number;
  connectedAt: Date;
  lastActivity: Date;
  bytesReceived: number;
  bytesSent: number;
  isActive: boolean;
}
