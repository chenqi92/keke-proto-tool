import { 
  BaseTool, 
  ToolRegistration, 
  ToolRegistry as IToolRegistry, 
  ToolCategory, 
  Protocol,
  ToolEvent,
  ToolEventData
} from '@/types/toolbox';

export class ToolRegistry implements IToolRegistry {
  private tools = new Map<string, ToolRegistration>();
  private eventListeners = new Map<ToolEvent, ((...args: any[]) => any)[]>();

  constructor() {
    // Load persisted tool configurations from localStorage
    this.loadPersistedData();
  }

  // Registration methods
  register(tool: BaseTool, config: Record<string, any> = {}): void {
    if (this.tools.has(tool.id)) {
      console.warn(`Tool ${tool.id} is already registered. Updating registration.`);
    }

    const registration: ToolRegistration = {
      tool,
      enabled: true,
      config: { ...tool.defaultConfig, ...config },
      usageCount: 0,
      favorite: false,
      lastUsed: undefined
    };

    // Apply any persisted metadata
    this.applyPersistedMetadata(tool.id, registration);

    this.tools.set(tool.id, registration);
    this.persistData();
    this.emit('tool-registered', { toolId: tool.id, tool });

    console.log(`Tool registered: ${tool.name} (${tool.id})`);
  }

  registerLazy(toolId: string, metadata: {
    name: string;
    description: string;
    category: ToolCategory;
    icon: any;
    priority: number;
    tags: string[];
    isLoaded: boolean;
  }): void {
    // Store lazy tool metadata for discovery
    const lazyRegistration = {
      tool: null as any, // Will be loaded later
      enabled: true,
      config: {},
      usageCount: 0,
      favorite: false,
      lastUsed: undefined,
      ...metadata
    };

    this.tools.set(toolId, lazyRegistration);
    console.log(`Lazy tool registered: ${metadata.name} (${toolId})`);
  }

  updateLazyStatus(toolId: string, isLoaded: boolean): void {
    const registration = this.tools.get(toolId);
    if (registration) {
      (registration as any).isLoaded = isLoaded;
    }
  }

  clear(): void {
    this.tools.clear();
    this.persistData();
  }

  unregister(toolId: string): void {
    const registration = this.tools.get(toolId);
    if (!registration) {
      console.warn(`Tool ${toolId} is not registered`);
      return;
    }

    this.tools.delete(toolId);
    this.persistData();
    this.emit('tool-unregistered', { toolId });

    console.log(`Tool unregistered: ${toolId}`);
  }

  // Discovery methods
  getAll(): ToolRegistration[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: ToolCategory): ToolRegistration[] {
    return this.getAll().filter(reg => reg.tool.category === category);
  }

  getByProtocol(protocol: Protocol): ToolRegistration[] {
    return this.getAll().filter(reg => 
      reg.tool.supportedProtocols.includes(protocol) || 
      reg.tool.supportedProtocols.includes('Custom')
    );
  }

  getById(toolId: string): ToolRegistration | undefined {
    return this.tools.get(toolId);
  }

  // Search and filtering
  search(query: string): ToolRegistration[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(reg => 
      reg.tool.name.toLowerCase().includes(lowerQuery) ||
      reg.tool.description.toLowerCase().includes(lowerQuery) ||
      reg.tool.category.toLowerCase().includes(lowerQuery)
    );
  }

  filter(predicate: (tool: ToolRegistration) => boolean): ToolRegistration[] {
    return this.getAll().filter(predicate);
  }

  // Configuration management
  updateConfig(toolId: string, config: Record<string, any>): void {
    const registration = this.tools.get(toolId);
    if (!registration) {
      console.warn(`Tool ${toolId} is not registered`);
      return;
    }

    registration.config = { ...registration.config, ...config };
    this.persistData();
    this.emit('tool-state-changed', { toolId, config });
  }

  getConfig(toolId: string): Record<string, any> {
    const registration = this.tools.get(toolId);
    return registration?.config || {};
  }

  // Usage tracking
  markUsed(toolId: string): void {
    const registration = this.tools.get(toolId);
    if (!registration) {
      console.warn(`Tool ${toolId} is not registered`);
      return;
    }

    registration.usageCount++;
    registration.lastUsed = new Date();
    this.persistData();
  }

  toggleFavorite(toolId: string): void {
    const registration = this.tools.get(toolId);
    if (!registration) {
      console.warn(`Tool ${toolId} is not registered`);
      return;
    }

    registration.favorite = !registration.favorite;
    this.persistData();
    this.emit('tool-state-changed', { toolId, favorite: registration.favorite });
  }

  getRecentlyUsed(limit: number = 10): ToolRegistration[] {
    return this.getAll()
      .filter(reg => reg.lastUsed)
      .sort((a, b) => (b.lastUsed!.getTime() - a.lastUsed!.getTime()))
      .slice(0, limit);
  }

  getFavorites(): ToolRegistration[] {
    return this.getAll().filter(reg => reg.favorite);
  }

  // Event handling
  on(event: ToolEvent, handler: (...args: any[]) => any): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  off(event: ToolEvent, handler: (...args: any[]) => any): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: ToolEvent, data: any): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      const eventData: ToolEventData = {
        type: event,
        data,
        timestamp: new Date(),
        ...data
      };
      handlers.forEach(handler => {
        try {
          handler(eventData);
        } catch (error) {
          console.error(`Error in tool event handler for ${event}:`, error);
        }
      });
    }
  }

  // Persistence
  private persistData(): void {
    try {
      const data = {
        tools: Array.from(this.tools.entries()).map(([id, reg]) => ({
          id,
          enabled: reg.enabled,
          config: reg.config,
          usageCount: reg.usageCount,
          favorite: reg.favorite,
          lastUsed: reg.lastUsed?.toISOString()
        }))
      };
      localStorage.setItem('prototool-toolbox-registry', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist tool registry data:', error);
    }
  }

  private loadPersistedData(): void {
    try {
      const data = localStorage.getItem('prototool-toolbox-registry');
      if (data) {
        const parsed = JSON.parse(data);
        // Note: This only loads metadata, actual tools need to be registered separately
        // This is used to restore usage counts, favorites, etc.
        this.persistedMetadata = new Map(
          parsed.tools.map((item: any) => [item.id, {
            enabled: item.enabled,
            config: item.config,
            usageCount: item.usageCount,
            favorite: item.favorite,
            lastUsed: item.lastUsed ? new Date(item.lastUsed) : undefined
          }])
        );
      }
    } catch (error) {
      console.error('Failed to load persisted tool registry data:', error);
    }
  }

  private persistedMetadata = new Map<string, Partial<ToolRegistration>>();

  // Apply persisted metadata when a tool is registered
  private applyPersistedMetadata(toolId: string, registration: ToolRegistration): void {
    const metadata = this.persistedMetadata.get(toolId);
    if (metadata) {
      registration.enabled = metadata.enabled ?? registration.enabled;
      registration.config = { ...registration.config, ...metadata.config };
      registration.usageCount = metadata.usageCount ?? registration.usageCount;
      registration.favorite = metadata.favorite ?? registration.favorite;
      registration.lastUsed = metadata.lastUsed ?? registration.lastUsed;
    }
  }

  // Utility methods
  getEnabledTools(): ToolRegistration[] {
    return this.getAll().filter(reg => reg.enabled);
  }

  getToolsByUsage(): ToolRegistration[] {
    return this.getAll().sort((a, b) => b.usageCount - a.usageCount);
  }

  getCategories(): ToolCategory[] {
    const categories = new Set<ToolCategory>();
    this.getAll().forEach(reg => categories.add(reg.tool.category));
    return Array.from(categories);
  }

  getProtocols(): Protocol[] {
    const protocols = new Set<Protocol>();
    this.getAll().forEach(reg => {
      reg.tool.supportedProtocols.forEach(protocol => protocols.add(protocol));
    });
    return Array.from(protocols);
  }

  // Statistics
  getStats() {
    const all = this.getAll();
    return {
      totalTools: all.length,
      enabledTools: all.filter(reg => reg.enabled).length,
      favoriteTools: all.filter(reg => reg.favorite).length,
      totalUsage: all.reduce((sum, reg) => sum + reg.usageCount, 0),
      categoryCounts: this.getCategories().reduce((counts, category) => {
        counts[category] = this.getByCategory(category).length;
        return counts;
      }, {} as Record<ToolCategory, number>)
    };
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();
