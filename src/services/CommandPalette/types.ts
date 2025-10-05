// Command Palette Types

import { LucideIcon } from 'lucide-react';

/**
 * Command category for grouping related commands
 */
export type CommandCategory = 
  | 'file'        // File operations
  | 'edit'        // Edit operations
  | 'view'        // View operations
  | 'session'     // Session operations
  | 'tools'       // Tools and utilities
  | 'window'      // Window operations
  | 'help'        // Help and documentation
  | 'navigation'  // Navigation commands
  | 'settings';   // Settings and preferences

/**
 * Command danger level for confirmation prompts
 */
export type CommandDangerLevel = 'safe' | 'warning' | 'danger';

/**
 * Command definition
 */
export interface Command {
  /** Unique command identifier */
  id: string;
  
  /** Display title */
  title: string;
  
  /** Command category */
  category: CommandCategory;
  
  /** Search keywords for fuzzy matching */
  keywords: string[];
  
  /** Command description */
  description?: string;
  
  /** Icon component */
  icon?: LucideIcon;
  
  /** Keyboard shortcut (display only) */
  shortcut?: string;
  
  /** Danger level for confirmation */
  dangerLevel?: CommandDangerLevel;
  
  /** Whether command is enabled */
  enabled?: boolean;
  
  /** Command handler function */
  handler: () => void | Promise<void>;
  
  /** Custom metadata */
  metadata?: Record<string, any>;
}

/**
 * Command group for display
 */
export interface CommandGroup {
  category: CommandCategory;
  title: string;
  commands: Command[];
}

/**
 * Command usage statistics
 */
export interface CommandUsage {
  commandId: string;
  usageCount: number;
  lastUsed: Date;
  favorite: boolean;
}

/**
 * Command palette configuration
 */
export interface CommandPaletteConfig {
  /** Maximum number of recent commands to show */
  maxRecentCommands: number;
  
  /** Whether to show command shortcuts */
  showShortcuts: boolean;
  
  /** Whether to show command icons */
  showIcons: boolean;
  
  /** Whether to group commands by category */
  groupByCategory: boolean;
  
  /** Whether to boost recent commands in search */
  boostRecentCommands: boolean;
  
  /** Confirmation for dangerous commands */
  confirmDangerousCommands: boolean;
}

/**
 * Command search result
 */
export interface CommandSearchResult {
  command: Command;
  score: number;
  matchedKeywords: string[];
}

