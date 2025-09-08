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
