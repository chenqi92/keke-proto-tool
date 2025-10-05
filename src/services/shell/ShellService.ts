// Shell Service
// Main service for initializing and managing the shell

import { shellExecutor } from '../ShellExecutor';
import { shellHistoryService } from '../ShellHistoryService';
import { getAllBuiltinCommands } from './BuiltinCommands';
import { getAllProtoCommands } from './ProtoCommands';
import { ShellContext, ShellExecutionResult, ShellHistoryItem } from '@/types/shell';
import { generateId } from '@/utils';

export class ShellService {
  private initialized = false;
  private context: ShellContext;

  constructor() {
    this.context = this.createDefaultContext();
  }

  /**
   * Initialize the shell service
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Register all built-in commands
    const builtinCommands = getAllBuiltinCommands();
    builtinCommands.forEach(command => {
      shellExecutor.registerCommand(command);
    });

    // Register all proto commands
    const protoCommands = getAllProtoCommands();
    protoCommands.forEach(command => {
      shellExecutor.registerCommand(command);
    });

    // Load history
    shellHistoryService.load();

    // Load aliases and variables into context
    this.context.aliases = Object.fromEntries(
      Object.entries(shellHistoryService.getAllAliases()).map(([key, alias]) => [
        key,
        alias.command,
      ])
    );

    this.context.variables = Object.fromEntries(
      Object.entries(shellHistoryService.getAllVariables()).map(([key, variable]) => [
        key,
        variable.value,
      ])
    );

    this.initialized = true;
    console.log('Shell service initialized');
  }

  /**
   * Create default shell context
   */
  private createDefaultContext(): ShellContext {
    return {
      cwd: '/',
      env: {},
      aliases: {},
      variables: {},
    };
  }

  /**
   * Get current context
   */
  getContext(): ShellContext {
    return { ...this.context };
  }

  /**
   * Update context
   */
  updateContext(updates: Partial<ShellContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Execute a command
   */
  async execute(commandStr: string): Promise<ShellExecutionResult> {
    if (!this.initialized) {
      this.initialize();
    }

    const startTime = Date.now();

    try {
      // Expand aliases
      const expandedCommand = this.expandAliases(commandStr);

      // Execute command
      const result = await shellExecutor.execute(expandedCommand, this.context);

      // Add to history
      const historyItem: ShellHistoryItem = {
        id: generateId(),
        command: this.parseCommandName(commandStr),
        args: this.parseCommandArgs(commandStr),
        timestamp: new Date(),
        cwd: this.context.cwd,
        exitCode: result.exitCode,
        executionTime: Date.now() - startTime,
        output: result.output,
        error: result.error,
      };

      shellHistoryService.add(historyItem);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        success: false,
        output: '',
        error: errorMessage,
        exitCode: 1,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute command in background
   */
  async executeInBackground(commandStr: string): Promise<string> {
    if (!this.initialized) {
      this.initialize();
    }

    const expandedCommand = this.expandAliases(commandStr);
    return await shellExecutor.executeInBackground(expandedCommand, this.context);
  }

  /**
   * Expand aliases in command
   */
  private expandAliases(commandStr: string): string {
    const parts = commandStr.trim().split(/\s+/);
    const commandName = parts[0];

    if (this.context.aliases && commandName in this.context.aliases) {
      const aliasValue = this.context.aliases[commandName];
      return `${aliasValue} ${parts.slice(1).join(' ')}`.trim();
    }

    return commandStr;
  }

  /**
   * Parse command name from command string
   */
  private parseCommandName(commandStr: string): string {
    const parts = commandStr.trim().split(/\s+/);
    
    // Handle multi-word commands like "proto connect"
    if (parts.length >= 2 && parts[0] === 'proto') {
      return `${parts[0]} ${parts[1]}`;
    }
    
    return parts[0] || '';
  }

  /**
   * Parse command arguments from command string
   */
  private parseCommandArgs(commandStr: string): string[] {
    const parts = commandStr.trim().split(/\s+/);
    
    // Handle multi-word commands like "proto connect"
    if (parts.length >= 2 && parts[0] === 'proto') {
      return parts.slice(2);
    }
    
    return parts.slice(1);
  }

  /**
   * Get command suggestions
   */
  getCommandSuggestions(prefix: string): string[] {
    const commands: string[] = [];

    // Get all registered commands
    const builtinCommands = getAllBuiltinCommands();
    const protoCommands = getAllProtoCommands();

    [...builtinCommands, ...protoCommands].forEach(command => {
      if (command.name.startsWith(prefix)) {
        commands.push(command.name);
      }
    });

    // Add aliases
    Object.keys(this.context.aliases || {}).forEach(alias => {
      if (alias.startsWith(prefix)) {
        commands.push(alias);
      }
    });

    return commands.sort();
  }

  /**
   * Get history
   */
  getHistory(limit?: number): ShellHistoryItem[] {
    if (limit) {
      return shellHistoryService.getRecent(limit);
    }
    return shellHistoryService.getAll();
  }

  /**
   * Search history
   */
  searchHistory(query: string): ShellHistoryItem[] {
    return shellHistoryService.search(query);
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    shellHistoryService.clear();
  }

  /**
   * Get running jobs
   */
  getRunningJobs() {
    return shellExecutor.getRunningJobs();
  }

  /**
   * Get all jobs
   */
  getAllJobs() {
    return shellExecutor.getJobs();
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    return shellExecutor.cancelJob(jobId);
  }

  /**
   * Get job
   */
  getJob(jobId: string) {
    return shellExecutor.getJob(jobId);
  }
}

// Singleton instance
export const shellService = new ShellService();

