import {
  ToolContext,
  ToolInput,
  ToolExecutionResult,
  BaseTool,
  ToolboxConfig,
  DialogOptions
} from '@/types/toolbox';
import { toolRegistry } from './ToolRegistry';
import { toolExecutor } from './ToolExecutor';
import { toolStateManager } from './ToolStateManager';
import { toolEventBus } from './ToolEventBus';
import { protocolBridge, dataBridge, sessionBridge } from './ToolBridges';
import { initializeTools } from '@/tools';
import { networkService } from './NetworkService';

export class ToolboxService {
  private config: ToolboxConfig;
  private initialized = false;

  constructor() {
    this.config = this.getDefaultConfig();
    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load configuration
      await this.loadConfiguration();

      // Initialize essential tools
      await initializeTools();

      // Register core tools
      await this.registerCoreTools();

      // Initialize bridges
      await protocolBridge.initialize();
      await dataBridge.initialize();
      await sessionBridge.initialize();

      // Setup cleanup tasks
      this.setupCleanupTasks();

      this.initialized = true;
      toolEventBus.emit('toolbox-initialized');

      console.log('Toolbox service initialized');
    } catch (error) {
      console.error('Failed to initialize toolbox service:', error);
      throw error;
    }
  }

  // Tool execution methods
  async executeTool(toolId: string, input: ToolInput, sessionId?: string): Promise<ToolExecutionResult> {
    if (!this.initialized) {
      throw new Error('Toolbox service not initialized');
    }

    const context = this.createToolContext(sessionId);
    return await toolExecutor.execute(toolId, input, context);
  }

  async executeToolInBackground(toolId: string, input: ToolInput, sessionId?: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Toolbox service not initialized');
    }

    const context = this.createToolContext(sessionId);
    return await toolExecutor.executeInBackground(toolId, input, context);
  }

  // Tool management
  registerTool(tool: BaseTool, config?: Record<string, any>): void {
    toolRegistry.register(tool, config);
  }

  unregisterTool(toolId: string): void {
    toolRegistry.unregister(toolId);
  }

  // Quick access methods
  getQuickAccessTools(sessionId?: string): string[] {
    if (!this.config.quickAccess.enabled) return [];

    const tools: string[] = [];
    const maxItems = this.config.quickAccess.maxItems;

    // Add custom tools
    tools.push(...this.config.quickAccess.customTools);

    // Add favorites if enabled
    if (this.config.quickAccess.showFavorites) {
      const favorites = toolRegistry.getFavorites().map(reg => reg.tool.id);
      tools.push(...favorites);
    }

    // Add recent tools if enabled
    if (this.config.quickAccess.showRecent) {
      const recent = toolRegistry.getRecentlyUsed(5).map(reg => reg.tool.id);
      tools.push(...recent);
    }

    // Add protocol-specific suggestions if session is provided
    if (sessionId) {
      const session = sessionBridge.getSessionData(sessionId);
      if (session) {
        const suggestions = protocolBridge.getSuggestedTools(session.config.protocol);
        tools.push(...suggestions.slice(0, 3));
      }
    }

    // Remove duplicates and limit
    return [...new Set(tools)].slice(0, maxItems);
  }

  getContextMenuTools(data: Uint8Array, sessionId?: string): string[] {
    if (!this.config.enableContextMenu) return [];

    const metadata = dataBridge.getDataMetadata(data);
    const allTools = toolRegistry.getEnabledTools();
    
    // Filter tools that can process this type of data
    const compatibleTools = allTools.filter(reg => {
      const tool = reg.tool;
      
      // Check if tool can process the data format
      if (metadata.isJson && tool.supportedFormats.includes('json')) return true;
      if (metadata.isPrintableAscii && tool.supportedFormats.includes('ascii')) return true;
      if (tool.supportedFormats.includes('hex')) return true; // Most tools support hex
      
      return false;
    });

    return compatibleTools.map(reg => reg.tool.id).slice(0, 8);
  }

  // State management
  saveToolState(toolId: string, state: Record<string, any>, sessionId?: string): void {
    if (this.config.autoSaveState) {
      toolStateManager.saveToolState(toolId, sessionId, state);
    }
  }

  loadToolState(toolId: string, sessionId?: string): Record<string, any> | undefined {
    return toolStateManager.loadToolState(toolId, sessionId);
  }

  clearToolState(toolId: string, sessionId?: string): void {
    toolStateManager.clearToolState(toolId, sessionId);
  }

  // Configuration management
  updateConfig(updates: Partial<ToolboxConfig>): void {
    this.config = { ...this.config, ...updates };
    this.persistConfiguration();
    toolEventBus.emit('toolbox-config-changed', this.config);
  }

  getConfig(): ToolboxConfig {
    return { ...this.config };
  }

  // Event handling
  on(event: string, handler: (...args: any[]) => void): void {
    toolEventBus.on(event, handler);
  }

  off(event: string, handler: (...args: any[]) => void): void {
    toolEventBus.off(event, handler);
  }

  emit(event: string, data?: any): void {
    toolEventBus.emit(event, data);
  }

  // Utility methods
  searchTools(query: string): string[] {
    return toolRegistry.search(query).map(reg => reg.tool.id);
  }

  getToolsByCategory(category: string): string[] {
    return toolRegistry.getByCategory(category as any).map(reg => reg.tool.id);
  }

  getToolInfo(toolId: string): BaseTool | undefined {
    const registration = toolRegistry.getById(toolId);
    return registration?.tool;
  }

  // Statistics and monitoring
  getStats() {
    return {
      registry: toolRegistry.getStats(),
      executor: toolExecutor.getExecutionStats(),
      stateManager: toolStateManager.getStats(),
      eventBus: toolEventBus.getStats()
    };
  }

  // Private methods
  private createToolContext(sessionId?: string): ToolContext {
    const context: ToolContext = {
      sessionId,
      networkService,
      connectionStatus: 'disconnected',

      // Event handling
      on: (event: string, handler: (...args: any[]) => any) => toolEventBus.on(event, handler as any),
      off: (event: string, handler: (...args: any[]) => any) => toolEventBus.off(event, handler as any),
      emit: (event: string, data: any) => toolEventBus.emit(event, data),
      
      // UI utilities
      showNotification: (message: string, type = 'info') => {
        toolEventBus.emit('show-notification', { message, type });
      },
      showDialog: async (options: DialogOptions) => {
        return new Promise((resolve) => {
          toolEventBus.emit('show-dialog', { options, resolve });
        });
      }
    };

    // Add session-specific context
    if (sessionId) {
      const session = sessionBridge.getSessionData(sessionId);
      if (session) {
        context.protocol = session.config.protocol;
        context.connectionStatus = session.status === 'connected' ? 'connected' : 'disconnected';
      }
    }

    return context;
  }

  private async registerCoreTools(): Promise<void> {
    // Core tools will be registered here
    // This is a placeholder - actual tools will be implemented in the next phase
    console.log('Core tools registration placeholder');
  }

  private setupEventHandlers(): void {
    // Handle tool execution events
    toolEventBus.on('tool-executed', (event) => {
      console.log('Tool executed:', event);
    });

    toolEventBus.on('tool-error', (event) => {
      console.error('Tool execution error:', event);
    });
  }

  private setupCleanupTasks(): void {
    // Cleanup expired states every hour
    setInterval(() => {
      toolStateManager.cleanupExpiredStates();
    }, 60 * 60 * 1000);

    // Cleanup execution history every 30 minutes
    setInterval(() => {
      toolExecutor.clearExecutionHistory();
    }, 30 * 60 * 1000);
  }

  private getDefaultConfig(): ToolboxConfig {
    return {
      quickAccess: {
        enabled: true,
        maxItems: 8,
        showRecent: true,
        showFavorites: true,
        customTools: []
      },
      defaultCategory: 'utility',
      enableContextMenu: true,
      enableKeyboardShortcuts: true,
      maxConcurrentExecutions: 5,
      cacheResults: true,
      autoSaveState: true
    };
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const saved = localStorage.getItem('prototool-toolbox-config');
      if (saved) {
        const config = JSON.parse(saved);
        this.config = { ...this.config, ...config };
      }
    } catch (error) {
      console.warn('Failed to load toolbox configuration:', error);
    }
  }

  private persistConfiguration(): void {
    try {
      localStorage.setItem('prototool-toolbox-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to persist toolbox configuration:', error);
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    toolEventBus.cleanup();
    this.initialized = false;
    console.log('Toolbox service cleaned up');
  }
}

// Singleton instance
export const toolboxService = new ToolboxService();
