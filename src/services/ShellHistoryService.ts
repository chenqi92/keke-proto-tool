// Shell History Service
// Manages command history persistence using localStorage

import {
  ShellHistoryService as IShellHistoryService,
  ShellHistoryItem,
  ShellHistoryConfig,
  ShellAlias,
  ShellVariable,
} from '@/types/shell';
import { generateId } from '@/utils';

const DEFAULT_CONFIG: ShellHistoryConfig = {
  maxSize: 1000,
  persistToStorage: true,
  storageKey: 'prototool-shell-history',
};

const ALIASES_STORAGE_KEY = 'prototool-shell-aliases';
const VARIABLES_STORAGE_KEY = 'prototool-shell-variables';

export class ShellHistoryService implements IShellHistoryService {
  private history: ShellHistoryItem[] = [];
  private aliases: Record<string, ShellAlias> = {};
  private variables: Record<string, ShellVariable> = {};
  private config: ShellHistoryConfig;

  constructor(config?: Partial<ShellHistoryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.load();
  }

  /**
   * Add a history item
   */
  add(item: ShellHistoryItem): void {
    // Don't add duplicate consecutive commands
    if (this.history.length > 0) {
      const lastItem = this.history[this.history.length - 1];
      if (lastItem.command === item.command && 
          JSON.stringify(lastItem.args) === JSON.stringify(item.args)) {
        return;
      }
    }

    this.history.push(item);

    // Trim history if it exceeds max size
    if (this.history.length > this.config.maxSize) {
      this.history = this.history.slice(-this.config.maxSize);
    }

    if (this.config.persistToStorage) {
      this.save();
    }
  }

  /**
   * Get a history item by ID
   */
  get(id: string): ShellHistoryItem | null {
    return this.history.find(item => item.id === id) || null;
  }

  /**
   * Get all history items
   */
  getAll(): ShellHistoryItem[] {
    return [...this.history];
  }

  /**
   * Search history
   */
  search(query: string): ShellHistoryItem[] {
    const lowerQuery = query.toLowerCase();
    return this.history.filter(item => 
      item.command.toLowerCase().includes(lowerQuery) ||
      item.args.some(arg => arg.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    if (this.config.persistToStorage) {
      this.save();
    }
  }

  /**
   * Save history to localStorage
   */
  save(): void {
    if (!this.config.persistToStorage) {
      return;
    }

    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.history));
      localStorage.setItem(ALIASES_STORAGE_KEY, JSON.stringify(this.aliases));
      localStorage.setItem(VARIABLES_STORAGE_KEY, JSON.stringify(this.variables));
    } catch (error) {
      console.error('Failed to save shell history:', error);
    }
  }

  /**
   * Load history from localStorage
   */
  load(): void {
    if (!this.config.persistToStorage) {
      return;
    }

    try {
      // Load history
      const historyData = localStorage.getItem(this.config.storageKey);
      if (historyData) {
        const parsed = JSON.parse(historyData);
        // Convert timestamp strings back to Date objects
        this.history = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }

      // Load aliases
      const aliasesData = localStorage.getItem(ALIASES_STORAGE_KEY);
      if (aliasesData) {
        const parsed = JSON.parse(aliasesData);
        // Convert date strings back to Date objects
        this.aliases = Object.fromEntries(
          Object.entries(parsed).map(([key, value]: [string, any]) => [
            key,
            {
              ...value,
              createdAt: new Date(value.createdAt),
              updatedAt: new Date(value.updatedAt),
            },
          ])
        );
      }

      // Load variables
      const variablesData = localStorage.getItem(VARIABLES_STORAGE_KEY);
      if (variablesData) {
        this.variables = JSON.parse(variablesData);
      }
    } catch (error) {
      console.error('Failed to load shell history:', error);
      this.history = [];
      this.aliases = {};
      this.variables = {};
    }
  }

  /**
   * Get recent history items
   */
  getRecent(limit: number): ShellHistoryItem[] {
    return this.history.slice(-limit).reverse();
  }

  /**
   * Get history statistics
   */
  getStatistics() {
    const commandCounts = new Map<string, number>();
    
    this.history.forEach(item => {
      const count = commandCounts.get(item.command) || 0;
      commandCounts.set(item.command, count + 1);
    });

    const mostUsed = Array.from(commandCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([command, count]) => ({ command, count }));

    return {
      totalCommands: this.history.length,
      uniqueCommands: commandCounts.size,
      mostUsed,
    };
  }

  /**
   * Alias management
   */
  setAlias(name: string, command: string): void {
    const now = new Date();
    const existing = this.aliases[name];
    
    this.aliases[name] = {
      name,
      command,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    if (this.config.persistToStorage) {
      this.save();
    }
  }

  getAlias(name: string): ShellAlias | null {
    return this.aliases[name] || null;
  }

  getAllAliases(): Record<string, ShellAlias> {
    return { ...this.aliases };
  }

  removeAlias(name: string): boolean {
    if (name in this.aliases) {
      delete this.aliases[name];
      if (this.config.persistToStorage) {
        this.save();
      }
      return true;
    }
    return false;
  }

  /**
   * Variable management
   */
  setVariable(name: string, value: string, exported = false, readonly = false): void {
    this.variables[name] = {
      name,
      value,
      exported,
      readonly,
    };

    if (this.config.persistToStorage) {
      this.save();
    }
  }

  getVariable(name: string): ShellVariable | null {
    return this.variables[name] || null;
  }

  getAllVariables(): Record<string, ShellVariable> {
    return { ...this.variables };
  }

  removeVariable(name: string): boolean {
    const variable = this.variables[name];
    
    if (variable?.readonly) {
      return false;
    }

    if (name in this.variables) {
      delete this.variables[name];
      if (this.config.persistToStorage) {
        this.save();
      }
      return true;
    }
    return false;
  }

  /**
   * Export history to JSON
   */
  exportToJSON(): string {
    return JSON.stringify({
      history: this.history,
      aliases: this.aliases,
      variables: this.variables,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Import history from JSON
   */
  importFromJSON(json: string): boolean {
    try {
      const data = JSON.parse(json);
      
      if (data.history) {
        this.history = data.history.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }

      if (data.aliases) {
        this.aliases = Object.fromEntries(
          Object.entries(data.aliases).map(([key, value]: [string, any]) => [
            key,
            {
              ...value,
              createdAt: new Date(value.createdAt),
              updatedAt: new Date(value.updatedAt),
            },
          ])
        );
      }

      if (data.variables) {
        this.variables = data.variables;
      }

      if (this.config.persistToStorage) {
        this.save();
      }

      return true;
    } catch (error) {
      console.error('Failed to import shell history:', error);
      return false;
    }
  }
}

// Singleton instance
export const shellHistoryService = new ShellHistoryService();

