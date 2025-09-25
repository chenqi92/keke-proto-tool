import { BaseTool, ToolInput, ToolOutput, ToolContext, ContextMenuItem } from '@/types/toolbox';
import { toolRegistry } from './ToolRegistry';
import { toolExecutor } from './ToolExecutor';
import { toolEventBus } from './ToolEventBus';


export interface ToolIntegrationConfig {
  enableContextMenus: boolean;
  enableQuickActions: boolean;
  enableAutoSuggestions: boolean;
  maxSuggestions: number;
  suggestionThreshold: number;
}

export interface ToolSuggestion {
  toolId: string;
  tool: BaseTool;
  confidence: number;
  reason: string;
  quickAction?: boolean;
}

export interface IntegrationContext {
  sessionId?: string;
  protocol?: string;
  dataFormat?: string;
  selectedData?: Uint8Array;
  connectionState?: 'connected' | 'disconnected' | 'connecting';
  messageDirection?: 'send' | 'receive';
}

class ToolIntegrationManager {
  private config: ToolIntegrationConfig = {
    enableContextMenus: true,
    enableQuickActions: true,
    enableAutoSuggestions: true,
    maxSuggestions: 5,
    suggestionThreshold: 0.3
  };

  private integrationHandlers = new Map<string, (...args: any[]) => any>();
  private contextMenuCache = new Map<string, ContextMenuItem[]>();

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Initialize the integration manager
   */
  async initialize(): Promise<void> {
    console.log('Tool Integration Manager initialized');
  }

  /**
   * Get tool suggestions based on context
   */
  async getToolSuggestions(context: IntegrationContext): Promise<ToolSuggestion[]> {
    if (!this.config.enableAutoSuggestions) {
      return [];
    }

    const suggestions: ToolSuggestion[] = [];
    const enabledTools = toolRegistry.getEnabledTools();

    for (const registration of enabledTools) {
      const tool = registration.tool;
      const confidence = this.calculateToolRelevance(tool, context);

      if (confidence >= this.config.suggestionThreshold) {
        suggestions.push({
          toolId: tool.id,
          tool,
          confidence,
          reason: this.getRelevanceReason(tool, context),
          quickAction: this.hasQuickAction(tool, context)
        });
      }
    }

    // Sort by confidence and limit results
    suggestions.sort((a, b) => b.confidence - a.confidence);
    return suggestions.slice(0, this.config.maxSuggestions);
  }

  /**
   * Get context menu items for selected data
   */
  async getContextMenuItems(data: Uint8Array, context: IntegrationContext): Promise<ContextMenuItem[]> {
    if (!this.config.enableContextMenus) {
      return [];
    }

    const cacheKey = this.getCacheKey(data, context);
    if (this.contextMenuCache.has(cacheKey)) {
      return this.contextMenuCache.get(cacheKey)!;
    }

    const menuItems: ContextMenuItem[] = [];
    const enabledTools = toolRegistry.getEnabledTools();

    for (const registration of enabledTools) {
      const tool = registration.tool;
      
      // Check if tool can process this data
      if (this.canToolProcessData(tool, data, context)) {
        try {
          const toolContext = this.createToolContext(context);
          const items = tool.getContextMenuItems?.(data, toolContext) || [];
          menuItems.push(...items);
        } catch (error) {
          console.warn(`Failed to get context menu items from tool ${tool.id}:`, error);
        }
      }
    }

    // Cache the result
    this.contextMenuCache.set(cacheKey, menuItems);
    
    // Clear cache after 5 minutes
    setTimeout(() => {
      this.contextMenuCache.delete(cacheKey);
    }, 5 * 60 * 1000);

    return menuItems;
  }

  /**
   * Execute tool with integration context
   */
  async executeToolWithContext(
    toolId: string, 
    input: ToolInput, 
    context: IntegrationContext
  ): Promise<ToolOutput> {
    const toolContext = this.createToolContext(context);
    
    // Enhance input with context information
    const enhancedInput: ToolInput = {
      ...input,
      metadata: {
        ...input.metadata,
        integrationContext: context,
        sessionId: context.sessionId,
        protocol: context.protocol,
        dataFormat: context.dataFormat
      }
    };

    const result = await toolExecutor.execute(toolId, enhancedInput, toolContext);

    // Handle integration-specific post-processing
    await this.handleToolResult(toolId, result, context);

    return result.output || { data: new Uint8Array(), format: 'ascii', metadata: {} };
  }

  /**
   * Register integration handler for specific scenarios
   */
  registerIntegrationHandler(scenario: string, handler: (...args: any[]) => any): void {
    this.integrationHandlers.set(scenario, handler);
  }

  /**
   * Trigger integration handler
   */
  async triggerIntegration(scenario: string, data: any): Promise<void> {
    const handler = this.integrationHandlers.get(scenario);
    if (handler) {
      try {
        await handler(data);
      } catch (error) {
        console.error(`Integration handler failed for scenario ${scenario}:`, error);
      }
    }
  }

  /**
   * Update integration configuration
   */
  updateConfig(newConfig: Partial<ToolIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    toolEventBus.emit('integration-config-updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): ToolIntegrationConfig {
    return { ...this.config };
  }

  // Private helper methods
  private setupEventListeners(): void {
    // Listen for data selection events
    toolEventBus.on('data-selected', async (data: Uint8Array, context: IntegrationContext) => {
      if (this.config.enableAutoSuggestions) {
        const suggestions = await this.getToolSuggestions({ ...context, selectedData: data });
        toolEventBus.emit('tool-suggestions', suggestions);
      }
    });

    // Listen for protocol changes
    toolEventBus.on('protocol-changed', async (protocol: string, context: IntegrationContext) => {
      const suggestions = await this.getToolSuggestions({ ...context, protocol });
      toolEventBus.emit('tool-suggestions', suggestions);
    });

    // Listen for connection state changes
    toolEventBus.on('connection-state-changed', async (state: string, context: IntegrationContext) => {
      const suggestions = await this.getToolSuggestions({ 
        ...context, 
        connectionState: state as any 
      });
      toolEventBus.emit('tool-suggestions', suggestions);
    });
  }

  private calculateToolRelevance(tool: BaseTool, context: IntegrationContext): number {
    let confidence = 0;

    // Protocol compatibility
    if (context.protocol && tool.supportedProtocols.includes(context.protocol as any)) {
      confidence += 0.4;
    }

    // Data format compatibility
    if (context.dataFormat && tool.supportedFormats.includes(context.dataFormat as any)) {
      confidence += 0.3;
    }

    // Connection requirement
    if (tool.requiresConnection && context.connectionState === 'connected') {
      confidence += 0.2;
    } else if (!tool.requiresConnection) {
      confidence += 0.1;
    }

    // Message direction relevance
    if (context.messageDirection) {
      if (tool.category === 'generation' && context.messageDirection === 'send') {
        confidence += 0.2;
      } else if (tool.category === 'parsing' && context.messageDirection === 'receive') {
        confidence += 0.2;
      }
    }

    // Selected data availability
    if (context.selectedData && context.selectedData.length > 0) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private getRelevanceReason(tool: BaseTool, context: IntegrationContext): string {
    const reasons: string[] = [];

    if (context.protocol && tool.supportedProtocols.includes(context.protocol as any)) {
      reasons.push(`支持 ${context.protocol} 协议`);
    }

    if (context.dataFormat && tool.supportedFormats.includes(context.dataFormat as any)) {
      reasons.push(`支持 ${context.dataFormat} 格式`);
    }

    if (context.selectedData && context.selectedData.length > 0) {
      reasons.push('可处理选中数据');
    }

    return reasons.length > 0 ? reasons.join(', ') : '通用工具';
  }

  private hasQuickAction(tool: BaseTool, context: IntegrationContext): boolean {
    if (!this.config.enableQuickActions) return false;
    
    try {
      const toolContext = this.createToolContext(context);
      const actions = tool.getQuickActions?.(toolContext) || [];
      return actions.length > 0;
    } catch (error) {
      return false;
    }
  }

  private canToolProcessData(tool: BaseTool, data: Uint8Array, context: IntegrationContext): boolean {
    // Check if tool supports the data format
    if (context.dataFormat && !tool.supportedFormats.includes(context.dataFormat as any)) {
      return false;
    }

    // Check if tool requires connection
    if (tool.requiresConnection && context.connectionState !== 'connected') {
      return false;
    }

    // Check data size limits (if any)
    if (data.length === 0 && tool.category !== 'generation') {
      return false;
    }

    return true;
  }

  private createToolContext(context: IntegrationContext): ToolContext {
    return {
      sessionId: context.sessionId,
      selectedData: context.selectedData,
      protocol: context.protocol as any,
      connectionStatus: context.connectionState || 'disconnected',
      emit: (event: string, data: any) => toolEventBus.emit(event, data),
      on: (event: string, handler: (...args: any[]) => void) => toolEventBus.on(event, handler),
      off: (event: string, handler: (...args: any[]) => void) => toolEventBus.off(event, handler),
      showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
        toolEventBus.emit('show-notification', { message, type });
      },
      showDialog: (options: any) => Promise.resolve(false)
    };
  }

  private getCacheKey(data: Uint8Array, context: IntegrationContext): string {
    const dataHash = this.simpleHash(data);
    const contextHash = this.simpleHash(new TextEncoder().encode(JSON.stringify(context)));
    return `${dataHash}-${contextHash}`;
  }

  private simpleHash(data: Uint8Array): string {
    let hash = 0;
    for (let i = 0; i < Math.min(data.length, 100); i++) {
      hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
    }
    return hash.toString(36);
  }

  private async handleToolResult(
    toolId: string, 
    result: any, 
    context: IntegrationContext
  ): Promise<void> {
    // Emit tool result event
    toolEventBus.emit('tool-result', {
      toolId,
      result,
      context
    });

    // Handle specific integration scenarios
    if (result.output?.metadata?.shouldSend && context.sessionId) {
      await this.triggerIntegration('auto-send', {
        sessionId: context.sessionId,
        data: result.output.data
      });
    }

    if (result.output?.metadata?.shouldSave) {
      await this.triggerIntegration('auto-save', {
        toolId,
        result: result.output
      });
    }
  }
}

// Export singleton instance
export const toolIntegrationManager = new ToolIntegrationManager();
