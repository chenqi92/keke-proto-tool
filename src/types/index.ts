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
