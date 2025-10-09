// 基础类型定义

// Tauri 全局类型声明
declare global {
  interface Window {
    __TAURI__?: {
      invoke: (cmd: string, args?: any) => Promise<any>;
      [key: string]: any;
    };
  }
}

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
export type ProtocolType = 'TCP' | 'UDP' | 'WebSocket' | 'MQTT' | 'SSE' | 'Modbus' | 'Modbus-TCP' | 'Modbus-RTU';
export type ConnectionType = 'client' | 'server' | 'master' | 'slave';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

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

// MQTT特有类型
export type MQTTQoSLevel = 0 | 1 | 2; // QoS级别：0=最多一次，1=至少一次，2=恰好一次
export type MQTTErrorType = 'connection_refused' | 'protocol_error' | 'client_identifier_not_valid' | 'server_unavailable' | 'bad_username_or_password' | 'not_authorized' | 'topic_filter_invalid' | 'topic_name_invalid' | 'packet_identifier_in_use' | 'packet_identifier_not_found' | 'receive_maximum_exceeded' | 'topic_alias_invalid' | 'packet_too_large' | 'message_rate_too_high' | 'quota_exceeded' | 'administrative_action' | 'payload_format_invalid' | 'retain_not_supported' | 'qos_not_supported' | 'use_another_server' | 'server_moved' | 'shared_subscriptions_not_supported' | 'connection_rate_exceeded' | 'maximum_connect_time' | 'subscription_identifiers_not_supported' | 'wildcard_subscriptions_not_supported';

export interface MQTTConfig {
  brokerUrl?: string; // MQTT broker URL (mqtt:// 或 mqtts://)
  clientId?: string; // 客户端ID，如果为空则自动生成
  username?: string; // 用户名
  password?: string; // 密码
  cleanSession?: boolean; // 清理会话标志
  keepAlive?: number; // 保活间隔（秒）
  connectTimeout?: number; // 连接超时（毫秒）
  reconnectPeriod?: number; // 重连间隔（毫秒）
  maxReconnectAttempts?: number; // 最大重连次数
  // 遗嘱消息配置
  will?: {
    topic: string; // 遗嘱主题
    payload: string; // 遗嘱消息内容
    qos: MQTTQoSLevel; // 遗嘱消息QoS级别
    retain: boolean; // 遗嘱消息保留标志
  };
  // SSL/TLS配置
  ssl?: {
    enabled: boolean;
    ca?: string; // CA证书
    cert?: string; // 客户端证书
    key?: string; // 客户端私钥
    rejectUnauthorized?: boolean; // 是否拒绝未授权的连接
  };
}

export interface MQTTSubscription {
  id: string; // 订阅ID
  topic: string; // 主题过滤器
  qos: MQTTQoSLevel; // 订阅QoS级别
  subscribedAt: Date; // 订阅时间
  messageCount: number; // 接收到的消息数量
  lastMessageAt?: Date; // 最后一条消息时间
  isActive: boolean; // 是否活跃
}

export interface MQTTPublishOptions {
  qos: MQTTQoSLevel; // 发布QoS级别
  retain: boolean; // 保留消息标志
  dup?: boolean; // 重复消息标志（通常由客户端库自动设置）
}

// SSE特有类型
export type SSEEventType = 'message' | 'open' | 'error' | 'close' | string; // 支持自定义事件类型
export type SSEReadyState = 'connecting' | 'open' | 'closed';

export interface SSEConfig {
  url?: string; // SSE服务器URL
  withCredentials?: boolean; // 是否发送凭据
  headers?: Record<string, string>; // 自定义请求头
  reconnectTime?: number; // 重连间隔（毫秒）
  maxReconnectAttempts?: number; // 最大重连次数
  eventTypes?: string[]; // 监听的事件类型列表
}

export interface SSEEvent {
  id: string; // 事件ID
  type: string; // 事件类型
  data: string; // 事件数据
  timestamp: Date; // 接收时间
  retry?: number; // 重试间隔
  lastEventId?: string; // 最后事件ID
}

export interface SSEConnectionOptions {
  url: string; // SSE服务器URL
  eventTypes: string[]; // 要监听的事件类型
  headers?: Record<string, string>; // 自定义请求头
  withCredentials?: boolean; // 是否发送凭据
  reconnectTime?: number; // 重连间隔（毫秒）
  maxReconnectAttempts?: number; // 最大重连次数
}

export interface SSEEventFilter {
  id: string; // 过滤器ID
  eventType: string; // 事件类型
  isActive: boolean; // 是否启用
  messageCount: number; // 接收到的消息数量
  lastMessageAt?: Date; // 最后一条消息时间
  createdAt: Date; // 创建时间
}

// Modbus特有类型
export type ModbusFunctionCode =
  | 0x01 // Read Coils
  | 0x02 // Read Discrete Inputs
  | 0x03 // Read Holding Registers
  | 0x04 // Read Input Registers
  | 0x05 // Write Single Coil
  | 0x06 // Write Single Register
  | 0x0F // Write Multiple Coils
  | 0x10 // Write Multiple Registers
  | 0x17; // Read/Write Multiple Registers

export type ModbusVariant = 'TCP' | 'RTU';
export type ModbusMode = 'master' | 'slave';
export type ModbusRegisterType = 'coil' | 'discrete_input' | 'holding_register' | 'input_register';

export interface ModbusConfig {
  variant: ModbusVariant; // TCP or RTU
  mode: ModbusMode; // Master or Slave
  unitId: number; // Modbus unit/slave ID (1-247)

  // TCP-specific
  host?: string;
  port?: number;

  // RTU-specific (Serial)
  serialPort?: string; // COM port or /dev/ttyUSB0
  baudRate?: number; // 9600, 19200, 38400, 57600, 115200
  dataBits?: 5 | 6 | 7 | 8;
  parity?: 'none' | 'even' | 'odd';
  stopBits?: 1 | 2;

  // Common settings
  timeout?: number; // Response timeout in milliseconds
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ModbusRequest {
  functionCode: ModbusFunctionCode;
  address: number; // Starting address
  quantity?: number; // Number of registers/coils to read
  value?: number; // Single value to write
  values?: number[]; // Multiple values to write
  coilValues?: boolean[]; // Coil values for write multiple coils
}

export interface ModbusResponse {
  success: boolean;
  data?: number[]; // Register values
  coilData?: boolean[]; // Coil values
  error?: string;
  timestamp?: Date;
  responseTime?: number; // Response time in milliseconds
}

export interface ModbusRegisterMonitor {
  id: string;
  registerType: ModbusRegisterType;
  startAddress: number;
  quantity: number;
  pollInterval: number; // Polling interval in milliseconds
  isActive: boolean;
  lastValue?: number[] | boolean[];
  lastPollTime?: Date;
  errorCount: number;
}

export interface ModbusStatistics {
  requestsSent: number;
  responsesReceived: number;
  errors: number;
  crcErrors: number;
  timeoutErrors: number;
  exceptionErrors: number;
  averageResponseTime: number;
  lastError?: string;
  lastErrorTime?: Date;
}

// Serial Port types
export interface SerialPortInfo {
  port_name: string;
  port_type: string;
  description?: string;
  manufacturer?: string;
  serial_number?: string;
  vid?: number;
  pid?: number;
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
  // MQTT特有字段
  mqttTopic?: string; // MQTT主题
  mqttQos?: MQTTQoSLevel; // MQTT QoS级别
  mqttRetain?: boolean; // MQTT保留消息标志
  mqttDup?: boolean; // MQTT重复消息标志
  mqttPacketId?: number; // MQTT包标识符（QoS 1和2使用）
  mqttSubscriptionId?: string; // 对应的订阅ID（接收消息时）
  // SSE特有字段
  sseEventType?: string; // SSE事件类型
  sseEventId?: string; // SSE事件ID
  sseRetry?: number; // SSE重试间隔
  sseLastEventId?: string; // SSE最后事件ID
  // Modbus特有字段
  modbusFunctionCode?: ModbusFunctionCode; // Modbus function code
  modbusAddress?: number; // Starting address
  modbusQuantity?: number; // Number of registers/coils
  modbusUnitId?: number; // Unit/slave ID
  modbusException?: number; // Exception code (if error)
  modbusResponseTime?: number; // Response time in milliseconds
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
  // Enhanced connection management (client-only)
  retryDelay?: number; // Initial retry delay in milliseconds (default: 1000)
  maxRetryDelay?: number; // Maximum retry delay in milliseconds (default: 30000)
  // Automatic data sending (client-only)
  autoSendEnabled?: boolean; // Enable automatic cyclic data sending
  autoSendInterval?: number; // Send interval in milliseconds (100ms to 3600000ms)
  autoSendData?: string; // Data to send automatically
  autoSendFormat?: 'text' | 'hex' | 'binary' | 'json'; // Format of auto-send data
  autoSendTemplate?: string; // Predefined message template name
  // Protocol-specific configs
  websocketPath?: string; // WebSocket路径
  websocketSubprotocol?: string;
  websocketExtensions?: string[];
  websocketPingInterval?: number; // ping间隔（秒）
  websocketMaxMessageSize?: number; // 最大消息大小（字节）
  websocketCompressionEnabled?: boolean; // 是否启用压缩
  // MQTT特有配置
  mqttTopic?: string; // MQTT主题
  mqttClientId?: string; // MQTT客户端ID
  mqttUsername?: string; // MQTT用户名
  mqttPassword?: string; // MQTT密码
  mqttCleanSession?: boolean; // MQTT清理会话标志
  mqttKeepAlive?: number; // MQTT保活间隔（秒）
  mqttWillTopic?: string; // MQTT遗嘱主题
  mqttWillPayload?: string; // MQTT遗嘱消息
  mqttWillQos?: MQTTQoSLevel; // MQTT遗嘱QoS级别
  mqttWillRetain?: boolean; // MQTT遗嘱保留标志
  // Modbus特有配置
  modbusVariant?: ModbusVariant; // Modbus variant (TCP or RTU)
  modbusMode?: ModbusMode; // Modbus mode (master or slave)
  modbusUnitId?: number; // Modbus unit/slave ID (1-247)
  modbusSerialPort?: string; // Serial port for RTU
  modbusBaudRate?: number; // Baud rate for RTU
  modbusDataBits?: 5 | 6 | 7 | 8; // Data bits for RTU
  modbusParity?: 'none' | 'even' | 'odd'; // Parity for RTU
  modbusStopBits?: 1 | 2; // Stop bits for RTU
  // 其他协议配置
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
  // Auto-reconnect state tracking
  autoReconnectPaused?: boolean; // Whether auto-reconnect is paused (due to server-initiated disconnect)
  autoReconnectPausedReason?: 'server_disconnect' | 'manual_disconnect' | 'user_action'; // Reason for pause
  // MQTT特有状态
  mqttSubscriptions?: Record<string, MQTTSubscription>; // MQTT订阅列表
  // SSE特有状态
  sseEventFilters?: Record<string, SSEEventFilter>; // SSE事件过滤器列表
  sseLastEventId?: string; // SSE最后事件ID（用于重连）
  // UI state persistence (to maintain state across node switches)
  sendData?: string; // Data to send
  sendFormat?: 'ascii' | 'binary' | 'octal' | 'decimal' | 'hex' | 'base64' | 'json' | 'utf-8'; // Send data format
  receiveFormat?: 'ascii' | 'binary' | 'octal' | 'decimal' | 'hex' | 'base64' | 'json' | 'utf-8'; // Receive data format
  // Auto-send feature
  autoSendEnabled?: boolean; // Whether auto-send is enabled
  autoSendInterval?: number; // Auto-send interval in milliseconds (default: 1000)
  // Server mode auto-send settings
  broadcastMode?: boolean; // Whether to broadcast to all clients (server mode only)
  selectedClientId?: string | null; // Selected client ID for sending (server mode only)
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
  // Auto-send statistics
  autoSentMessages?: number; // Number of automatically sent messages
  autoSendErrors?: number; // Number of auto-send errors
  currentRetryAttempt?: number; // Current reconnection attempt (0 if not reconnecting)
  lastReconnectTime?: Date; // Last reconnection attempt time
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
