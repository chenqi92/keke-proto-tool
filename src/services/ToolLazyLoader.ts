import { BaseTool } from '@/types/toolbox';
import { toolRegistry } from './ToolRegistry';

interface LazyToolDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: any;
  loader: () => Promise<{ default: new() => BaseTool }>;
  priority: number;
  tags: string[];
}

interface LoadedTool {
  tool: BaseTool;
  loadTime: number;
  lastUsed: number;
  usageCount: number;
}

class ToolLazyLoader {
  private lazyTools = new Map<string, LazyToolDefinition>();
  private loadedTools = new Map<string, LoadedTool>();
  private loadingPromises = new Map<string, Promise<BaseTool>>();
  private preloadQueue: string[] = [];
  private maxCachedTools = 10;
  private preloadDelay = 100; // ms between preloads

  /**
   * Register a tool for lazy loading
   */
  registerLazyTool(definition: LazyToolDefinition): void {
    this.lazyTools.set(definition.id, definition);
    
    // Register basic info with tool registry for discovery
    toolRegistry.registerLazy(definition.id, {
      name: definition.name,
      description: definition.description,
      category: definition.category,
      icon: definition.icon,
      priority: definition.priority,
      tags: definition.tags,
      isLoaded: false
    });
  }

  /**
   * Load a tool on demand
   */
  async loadTool(toolId: string): Promise<BaseTool> {
    // Return cached tool if available
    const cached = this.loadedTools.get(toolId);
    if (cached) {
      cached.lastUsed = Date.now();
      cached.usageCount++;
      return cached.tool;
    }

    // Return existing loading promise if in progress
    const existingPromise = this.loadingPromises.get(toolId);
    if (existingPromise) {
      return existingPromise;
    }

    // Start loading
    const loadPromise = this.doLoadTool(toolId);
    this.loadingPromises.set(toolId, loadPromise);

    try {
      const tool = await loadPromise;
      this.loadingPromises.delete(toolId);
      return tool;
    } catch (error) {
      this.loadingPromises.delete(toolId);
      throw error;
    }
  }

  /**
   * Preload tools based on usage patterns
   */
  async preloadTools(toolIds: string[]): Promise<void> {
    this.preloadQueue.push(...toolIds.filter(id => 
      !this.loadedTools.has(id) && 
      !this.loadingPromises.has(id) &&
      this.lazyTools.has(id)
    ));

    this.processPreloadQueue();
  }

  /**
   * Preload tools based on context
   */
  async preloadForContext(context: {
    protocol?: string;
    category?: string;
    tags?: string[];
  }): Promise<void> {
    const relevantTools = Array.from(this.lazyTools.values())
      .filter(def => {
        if (context.category && def.category !== context.category) {
          return false;
        }
        if (context.tags && !context.tags.some(tag => def.tags.includes(tag))) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3) // Preload top 3 relevant tools
      .map(def => def.id);

    await this.preloadTools(relevantTools);
  }

  /**
   * Get tool info without loading
   */
  getToolInfo(toolId: string): Omit<LazyToolDefinition, 'loader'> | null {
    const def = this.lazyTools.get(toolId);
    if (!def) return null;

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      category: def.category,
      icon: def.icon,
      priority: def.priority,
      tags: def.tags
    };
  }

  /**
   * Check if tool is loaded
   */
  isToolLoaded(toolId: string): boolean {
    return this.loadedTools.has(toolId);
  }

  /**
   * Get loading status
   */
  getLoadingStatus(toolId: string): 'not-loaded' | 'loading' | 'loaded' | 'error' {
    if (this.loadedTools.has(toolId)) return 'loaded';
    if (this.loadingPromises.has(toolId)) return 'loading';
    if (this.lazyTools.has(toolId)) return 'not-loaded';
    return 'error';
  }

  /**
   * Unload least recently used tools to free memory
   */
  cleanupCache(): void {
    if (this.loadedTools.size <= this.maxCachedTools) {
      return;
    }

    const sortedTools = Array.from(this.loadedTools.entries())
      .sort(([, a], [, b]) => a.lastUsed - b.lastUsed);

    const toRemove = sortedTools.slice(0, this.loadedTools.size - this.maxCachedTools);
    
    for (const [toolId] of toRemove) {
      const loadedTool = this.loadedTools.get(toolId);
      if (loadedTool) {
        // Call cleanup if available
        loadedTool.tool.cleanup?.();
        this.loadedTools.delete(toolId);
        
        // Update registry
        toolRegistry.updateLazyStatus(toolId, false);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalRegistered: number;
    loaded: number;
    loading: number;
    cacheHitRate: number;
    averageLoadTime: number;
  } {
    const totalUsage = Array.from(this.loadedTools.values())
      .reduce((sum, tool) => sum + tool.usageCount, 0);
    
    const totalLoadTime = Array.from(this.loadedTools.values())
      .reduce((sum, tool) => sum + tool.loadTime, 0);

    return {
      totalRegistered: this.lazyTools.size,
      loaded: this.loadedTools.size,
      loading: this.loadingPromises.size,
      cacheHitRate: totalUsage > 0 ? (totalUsage - this.loadedTools.size) / totalUsage : 0,
      averageLoadTime: this.loadedTools.size > 0 ? totalLoadTime / this.loadedTools.size : 0
    };
  }

  // Private methods
  private async doLoadTool(toolId: string): Promise<BaseTool> {
    const definition = this.lazyTools.get(toolId);
    if (!definition) {
      throw new Error(`Tool ${toolId} not found`);
    }

    const startTime = Date.now();
    
    try {
      // Load the tool module
      const module = await definition.loader();
      const ToolClass = module.default;
      const tool = new ToolClass();

      // Initialize the tool
      await tool.initialize?.({});

      const loadTime = Date.now() - startTime;

      // Cache the loaded tool
      this.loadedTools.set(toolId, {
        tool,
        loadTime,
        lastUsed: Date.now(),
        usageCount: 1
      });

      // Update registry
      toolRegistry.updateLazyStatus(toolId, true);
      toolRegistry.register(tool, {
        enabled: true,
        priority: definition.priority,
        tags: definition.tags
      });

      // Cleanup cache if needed
      this.cleanupCache();

      console.log(`Tool ${toolId} loaded in ${loadTime}ms`);
      return tool;

    } catch (error) {
      console.error(`Failed to load tool ${toolId}:`, error);
      throw new Error(`Failed to load tool ${toolId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processPreloadQueue(): Promise<void> {
    if (this.preloadQueue.length === 0) {
      return;
    }

    const toolId = this.preloadQueue.shift()!;
    
    try {
      await this.loadTool(toolId);
    } catch (error) {
      console.warn(`Failed to preload tool ${toolId}:`, error);
    }

    // Continue processing queue with delay
    if (this.preloadQueue.length > 0) {
      setTimeout(() => this.processPreloadQueue(), this.preloadDelay);
    }
  }
}

// Export singleton instance
export const toolLazyLoader = new ToolLazyLoader();

// Lazy tool definitions for built-in tools
export const lazyToolDefinitions: LazyToolDefinition[] = [
  {
    id: 'message-generator',
    name: '报文生成器',
    description: '生成测试报文和数据包',
    category: 'generation',
    icon: () => import('lucide-react').then(m => m.Zap),
    loader: () => import('@/tools/MessageGeneratorTool'),
    priority: 9,
    tags: ['generation', 'essential', 'protocol']
  },
  {
    id: 'protocol-parser',
    name: '协议解析器',
    description: '解析和分析各种网络协议消息',
    category: 'parsing',
    icon: () => import('lucide-react').then(m => m.FileSearch),
    loader: () => import('@/tools/ProtocolParserTool'),
    priority: 8,
    tags: ['parsing', 'essential', 'protocol']
  },
  {
    id: 'data-converter',
    name: '数据转换器',
    description: '在不同数据格式之间进行转换',
    category: 'conversion',
    icon: () => import('lucide-react').then(m => m.Shuffle),
    loader: () => import('@/tools/DataConverterTool'),
    priority: 7,
    tags: ['conversion', 'essential', 'format']
  },
  {
    id: 'crc-calculator',
    name: 'CRC 校验计算器',
    description: '计算和验证各种CRC校验和',
    category: 'validation',
    icon: () => import('lucide-react').then(m => m.Calculator),
    loader: () => import('@/tools/CRCCalculatorTool'),
    priority: 6,
    tags: ['validation', 'essential', 'checksum']
  },
  {
    id: 'timestamp-converter',
    name: '时间戳转换器',
    description: '在不同时间格式之间进行转换',
    category: 'conversion',
    icon: () => import('lucide-react').then(m => m.Clock),
    loader: () => import('@/tools/TimestampConverterTool'),
    priority: 5,
    tags: ['conversion', 'time', 'format']
  }
];

// Initialize lazy loading for built-in tools
export async function initializeLazyLoading(): Promise<void> {
  console.log('Initializing lazy tool loading...');
  
  // Register all lazy tool definitions
  for (const definition of lazyToolDefinitions) {
    toolLazyLoader.registerLazyTool(definition);
  }

  // Preload high-priority tools
  const highPriorityTools = lazyToolDefinitions
    .filter(def => def.priority >= 8)
    .map(def => def.id);

  await toolLazyLoader.preloadTools(highPriorityTools);

  console.log(`Lazy loading initialized with ${lazyToolDefinitions.length} tools`);
}
