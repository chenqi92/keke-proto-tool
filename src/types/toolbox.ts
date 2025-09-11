import React from 'react';
import { DataFormat } from '@/components/DataFormatSelector';

// Re-export DataFormat for convenience
export { DataFormat };

// Tool Categories
export type ToolCategory =
  | 'generation'
  | 'parsing'
  | 'conversion'
  | 'validation'
  | 'analysis'
  | 'visualization'
  | 'security'
  | 'utility'
  | 'security';

// Protocol Types
export type Protocol = 'TCP' | 'UDP' | 'WebSocket' | 'MQTT' | 'SSE' | 'HTTP' | 'Custom';

// Connection Status
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Tool Input/Output Types
export interface ToolInput {
  data?: Uint8Array;
  format?: DataFormat;
  metadata?: Record<string, any>;
  context?: Record<string, any>;
}

export interface ToolOutput {
  data?: Uint8Array;
  format?: DataFormat;
  result?: any;
  metadata?: Record<string, any>;
  error?: string;
}

// Tool Action for quick access
export interface ToolAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  handler: (context: ToolContext) => Promise<void>;
}

// Context menu item
export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  separator?: boolean;
  disabled?: boolean;
  handler: (data: any) => Promise<void>;
}

// Tool Context - provides access to application services
export interface ToolContext {
  // Session information
  sessionId?: string;
  protocol?: Protocol;
  connectionStatus: ConnectionStatus;
  
  // Data context
  selectedData?: Uint8Array;
  dataFormat?: DataFormat;
  
  // Services (will be injected)
  networkService?: any; // NetworkService
  dataService?: any;    // DataService
  stateService?: any;   // StateService
  
  // Event handling
  on(event: string, handler: Function): void;
  emit(event: string, data: any): void;
  off(event: string, handler: Function): void;
  
  // UI utilities
  showNotification(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
  showDialog(options: DialogOptions): Promise<any>;
}

// Dialog options for tool interactions
export interface DialogOptions {
  title: string;
  message?: string;
  type?: 'confirm' | 'prompt' | 'custom';
  defaultValue?: string;
  component?: React.ComponentType<any>;
}

// Base Tool Interface
export interface BaseTool {
  // Metadata
  id: string;
  name: string;
  description: string;
  version: string;
  category: ToolCategory;
  icon: React.ComponentType<{ className?: string }>;
  author?: string;
  
  // Capabilities
  supportedFormats: DataFormat[];
  supportedProtocols: readonly Protocol[];
  requiresConnection: boolean;
  canProcessStreaming: boolean;
  
  // Configuration
  defaultConfig?: Record<string, any>;
  configSchema?: any; // JSON Schema for configuration
  
  // Lifecycle methods
  initialize(context: ToolContext): Promise<void>;
  execute(input: ToolInput): Promise<ToolOutput>;
  cleanup(): Promise<void>;
  
  // UI methods
  renderUI(container: HTMLElement, context: ToolContext): React.ReactElement;
  getQuickActions(context: ToolContext): ToolAction[];
  getContextMenuItems(data: any, context: ToolContext): ContextMenuItem[];
  
  // State management
  saveState?(): Record<string, any>;
  loadState?(state: Record<string, any>): void;
}

// Tool Registration Info
export interface ToolRegistration {
  tool: BaseTool;
  enabled: boolean;
  config: Record<string, any>;
  lastUsed?: Date;
  usageCount: number;
  favorite: boolean;
}

// Tool Execution Result
export interface ToolExecutionResult {
  success: boolean;
  output?: ToolOutput;
  error?: string;
  executionTime: number;
  toolId: string;
}

// Tool State
export interface ToolState {
  toolId: string;
  sessionId?: string;
  state: Record<string, any>;
  lastModified: Date;
}

// Event types for tool system
export type ToolEvent = 
  | 'tool-registered'
  | 'tool-unregistered'
  | 'tool-executed'
  | 'tool-error'
  | 'tool-state-changed'
  | 'context-changed';

// Tool Event Data
export interface ToolEventData {
  type: ToolEvent;
  toolId?: string;
  data?: any;
  error?: string;
  timestamp: Date;
}

// Tool Registry Interface
export interface ToolRegistry {
  // Registration
  register(tool: BaseTool, config?: Record<string, any>): void;
  unregister(toolId: string): void;
  
  // Discovery
  getAll(): ToolRegistration[];
  getByCategory(category: ToolCategory): ToolRegistration[];
  getByProtocol(protocol: Protocol): ToolRegistration[];
  getById(toolId: string): ToolRegistration | undefined;
  
  // Search and filtering
  search(query: string): ToolRegistration[];
  filter(predicate: (tool: ToolRegistration) => boolean): ToolRegistration[];
  
  // Configuration
  updateConfig(toolId: string, config: Record<string, any>): void;
  getConfig(toolId: string): Record<string, any>;
  
  // Usage tracking
  markUsed(toolId: string): void;
  toggleFavorite(toolId: string): void;
  getRecentlyUsed(limit?: number): ToolRegistration[];
  getFavorites(): ToolRegistration[];
}

// Tool Executor Interface
export interface ToolExecutor {
  execute(toolId: string, input: ToolInput, context: ToolContext): Promise<ToolExecutionResult>;
  executeInBackground(toolId: string, input: ToolInput, context: ToolContext): Promise<string>; // Returns execution ID
  getExecutionStatus(executionId: string): 'running' | 'completed' | 'failed' | 'cancelled';
  cancelExecution(executionId: string): void;
}

// State Manager Interface
export interface StateManager {
  saveToolState(toolId: string, sessionId: string | undefined, state: Record<string, any>): void;
  loadToolState(toolId: string, sessionId?: string): Record<string, any> | undefined;
  clearToolState(toolId: string, sessionId?: string): void;
  getAllStates(sessionId?: string): ToolState[];
}

// Integration Bridge Interfaces
export interface ProtocolBridge {
  getSuggestedTools(protocol: Protocol, data?: Uint8Array): string[];
  canProcessProtocol(toolId: string, protocol: Protocol): boolean;
  getProtocolContext(protocol: Protocol, sessionId: string): Record<string, any>;
}

export interface DataBridge {
  convertFormat(data: Uint8Array, fromFormat: DataFormat, toFormat: DataFormat): Uint8Array;
  validateFormat(data: string, format: DataFormat): boolean;
  getDataMetadata(data: Uint8Array): Record<string, any>;
}

export interface SessionBridge {
  getCurrentSession(): any; // Session object
  getSessionData(sessionId: string): any;
  sendToSession(sessionId: string, data: Uint8Array): Promise<boolean>;
  subscribeToSessionEvents(sessionId: string, callback: (event: any) => void): () => void;
}

// Event Bus Interface
export interface EventBus {
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  emit(event: string, data: any): void;
  once(event: string, handler: Function): void;
}

// Tool UI Props
export interface ToolUIProps {
  tool: BaseTool;
  context: ToolContext;
  onExecute: (input: ToolInput) => Promise<ToolOutput>;
  onStateChange: (state: Record<string, any>) => void;
}

// Quick Access Configuration
export interface QuickAccessConfig {
  enabled: boolean;
  maxItems: number;
  showRecent: boolean;
  showFavorites: boolean;
  customTools: string[];
}

// Toolbox Configuration
export interface ToolboxConfig {
  quickAccess: QuickAccessConfig;
  defaultCategory: ToolCategory;
  enableContextMenu: boolean;
  enableKeyboardShortcuts: boolean;
  maxConcurrentExecutions: number;
  cacheResults: boolean;
  autoSaveState: boolean;
}
