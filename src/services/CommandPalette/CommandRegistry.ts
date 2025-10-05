// Command Registry Service

import { 
  Command, 
  CommandCategory, 
  CommandUsage, 
  CommandPaletteConfig,
  CommandSearchResult 
} from './types';

/**
 * Command Registry - manages all available commands
 */
export class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private usageStats: Map<string, CommandUsage> = new Map();
  private config: CommandPaletteConfig;
  private storageKey = 'prototool-command-palette';

  constructor(config?: Partial<CommandPaletteConfig>) {
    this.config = {
      maxRecentCommands: 10,
      showShortcuts: true,
      showIcons: true,
      groupByCategory: true,
      boostRecentCommands: true,
      confirmDangerousCommands: true,
      ...config
    };
    
    this.loadUsageStats();
  }

  /**
   * Register a command
   */
  register(command: Command): void {
    if (this.commands.has(command.id)) {
      console.warn(`Command ${command.id} is already registered. Updating.`);
    }
    
    this.commands.set(command.id, {
      enabled: true,
      dangerLevel: 'safe',
      ...command
    });
    
    console.log(`Command registered: ${command.title} (${command.id})`);
  }

  /**
   * Register multiple commands
   */
  registerMany(commands: Command[]): void {
    commands.forEach(cmd => this.register(cmd));
  }

  /**
   * Unregister a command
   */
  unregister(commandId: string): void {
    this.commands.delete(commandId);
    this.usageStats.delete(commandId);
    this.saveUsageStats();
  }

  /**
   * Get a command by ID
   */
  getCommand(commandId: string): Command | undefined {
    return this.commands.get(commandId);
  }

  /**
   * Get all commands
   */
  getAllCommands(): Command[] {
    return Array.from(this.commands.values()).filter(cmd => cmd.enabled !== false);
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category: CommandCategory): Command[] {
    return this.getAllCommands().filter(cmd => cmd.category === category);
  }

  /**
   * Search commands with fuzzy matching
   */
  search(query: string): CommandSearchResult[] {
    if (!query.trim()) {
      return this.getAllCommands().map(cmd => ({
        command: cmd,
        score: 0,
        matchedKeywords: []
      }));
    }

    const lowerQuery = query.toLowerCase();
    const results: CommandSearchResult[] = [];

    for (const command of this.getAllCommands()) {
      const score = this.calculateMatchScore(command, lowerQuery);
      
      if (score > 0) {
        const matchedKeywords = this.getMatchedKeywords(command, lowerQuery);
        results.push({ command, score, matchedKeywords });
      }
    }

    // Sort by score (descending) and boost recent commands
    results.sort((a, b) => {
      let scoreA = a.score;
      let scoreB = b.score;

      if (this.config.boostRecentCommands) {
        const usageA = this.usageStats.get(a.command.id);
        const usageB = this.usageStats.get(b.command.id);
        
        if (usageA) scoreA += usageA.usageCount * 0.1;
        if (usageB) scoreB += usageB.usageCount * 0.1;
      }

      return scoreB - scoreA;
    });

    return results;
  }

  /**
   * Calculate match score for a command
   */
  private calculateMatchScore(command: Command, query: string): number {
    let score = 0;
    const lowerTitle = command.title.toLowerCase();
    const lowerDesc = command.description?.toLowerCase() || '';

    // Exact title match
    if (lowerTitle === query) {
      score += 100;
    }
    // Title starts with query
    else if (lowerTitle.startsWith(query)) {
      score += 80;
    }
    // Title contains query
    else if (lowerTitle.includes(query)) {
      score += 60;
    }

    // Description match
    if (lowerDesc.includes(query)) {
      score += 20;
    }

    // Keyword matches
    for (const keyword of command.keywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (lowerKeyword === query) {
        score += 50;
      } else if (lowerKeyword.includes(query)) {
        score += 30;
      }
    }

    return score;
  }

  /**
   * Get matched keywords for highlighting
   */
  private getMatchedKeywords(command: Command, query: string): string[] {
    return command.keywords.filter(kw => 
      kw.toLowerCase().includes(query)
    );
  }

  /**
   * Execute a command
   */
  async execute(commandId: string): Promise<void> {
    const command = this.commands.get(commandId);
    
    if (!command) {
      console.error(`Command not found: ${commandId}`);
      return;
    }

    if (command.enabled === false) {
      console.warn(`Command is disabled: ${commandId}`);
      return;
    }

    try {
      await command.handler();
      this.recordUsage(commandId);
    } catch (error) {
      console.error(`Command execution failed: ${commandId}`, error);
      throw error;
    }
  }

  /**
   * Record command usage
   */
  private recordUsage(commandId: string): void {
    const usage = this.usageStats.get(commandId) || {
      commandId,
      usageCount: 0,
      lastUsed: new Date(),
      favorite: false
    };

    usage.usageCount++;
    usage.lastUsed = new Date();
    
    this.usageStats.set(commandId, usage);
    this.saveUsageStats();
  }

  /**
   * Get recent commands
   */
  getRecentCommands(limit?: number): Command[] {
    const maxCommands = limit || this.config.maxRecentCommands;
    
    const sortedUsage = Array.from(this.usageStats.values())
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
      .slice(0, maxCommands);

    return sortedUsage
      .map(usage => this.commands.get(usage.commandId))
      .filter((cmd): cmd is Command => cmd !== undefined && cmd.enabled !== false);
  }

  /**
   * Get favorite commands
   */
  getFavoriteCommands(): Command[] {
    const favorites = Array.from(this.usageStats.values())
      .filter(usage => usage.favorite)
      .map(usage => this.commands.get(usage.commandId))
      .filter((cmd): cmd is Command => cmd !== undefined && cmd.enabled !== false);

    return favorites;
  }

  /**
   * Toggle favorite status
   */
  toggleFavorite(commandId: string): void {
    const usage = this.usageStats.get(commandId) || {
      commandId,
      usageCount: 0,
      lastUsed: new Date(),
      favorite: false
    };

    usage.favorite = !usage.favorite;
    this.usageStats.set(commandId, usage);
    this.saveUsageStats();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CommandPaletteConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): CommandPaletteConfig {
    return { ...this.config };
  }

  /**
   * Load usage statistics from localStorage
   */
  private loadUsageStats(): void {
    try {
      const saved = localStorage.getItem(`${this.storageKey}-usage`);
      if (saved) {
        const data = JSON.parse(saved);
        this.usageStats = new Map(
          data.map((item: any) => [
            item.commandId,
            { ...item, lastUsed: new Date(item.lastUsed) }
          ])
        );
      }
    } catch (error) {
      console.error('Failed to load command usage stats:', error);
    }
  }

  /**
   * Save usage statistics to localStorage
   */
  private saveUsageStats(): void {
    try {
      const data = Array.from(this.usageStats.values()).map(usage => ({
        ...usage,
        lastUsed: usage.lastUsed.toISOString()
      }));
      localStorage.setItem(`${this.storageKey}-usage`, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save command usage stats:', error);
    }
  }

  /**
   * Clear all usage statistics
   */
  clearUsageStats(): void {
    this.usageStats.clear();
    localStorage.removeItem(`${this.storageKey}-usage`);
  }
}

// Singleton instance
export const commandRegistry = new CommandRegistry();

