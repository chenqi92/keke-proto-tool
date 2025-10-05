// ProtoShell Types and Interfaces
// Defines types for shell commands, jobs, execution, and history

/**
 * Command type classification
 */
export type CommandType = 'builtin' | 'proto' | 'external';

/**
 * Job status for background execution
 */
export type JobStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'stopped';

/**
 * Shell command definition
 */
export interface ShellCommand {
  name: string;
  type: CommandType;
  description: string;
  usage: string;
  examples?: string[];
  aliases?: string[];
  execute: (args: string[], context: ShellContext) => Promise<ShellExecutionResult>;
}

/**
 * Shell execution context
 */
export interface ShellContext {
  cwd: string;
  env: Record<string, string>;
  aliases: Record<string, string>;
  variables: Record<string, string>;
  sessionId?: string;
  stdin?: string;
  stdout?: (data: string) => void;
  stderr?: (data: string) => void;
}

/**
 * Shell execution result
 */
export interface ShellExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  executionTime: number;
  jobId?: string; // For background jobs
}

/**
 * Shell job for background execution
 */
export interface ShellJob {
  id: string;
  command: string;
  args: string[];
  status: JobStatus;
  startTime: Date;
  endTime?: Date;
  exitCode?: number;
  output: string;
  error?: string;
  pid?: number;
  context: ShellContext;
  promise?: Promise<ShellExecutionResult>;
  cancelFn?: () => void;
}

/**
 * Command history item
 */
export interface ShellHistoryItem {
  id: string;
  command: string;
  args: string[];
  timestamp: Date;
  cwd: string;
  exitCode: number;
  executionTime: number;
  output?: string;
  error?: string;
}

/**
 * Shell history configuration
 */
export interface ShellHistoryConfig {
  maxSize: number;
  persistToStorage: boolean;
  storageKey: string;
}

/**
 * Shell alias definition
 */
export interface ShellAlias {
  name: string;
  command: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Shell variable definition
 */
export interface ShellVariable {
  name: string;
  value: string;
  exported: boolean;
  readonly: boolean;
}

/**
 * Shell session state
 */
export interface ShellSession {
  id: string;
  startedAt: Date;
  lastCommand?: string;
  lastCwd: string;
  commandCount: number;
  history: ShellHistoryItem[];
  aliases: Record<string, ShellAlias>;
  variables: Record<string, ShellVariable>;
  jobs: ShellJob[];
}

/**
 * Command parser result
 */
export interface ParsedCommand {
  command: string;
  args: string[];
  background: boolean;
  redirects: CommandRedirect[];
  pipes: ParsedCommand[];
}

/**
 * Command redirect definition
 */
export interface CommandRedirect {
  type: 'stdin' | 'stdout' | 'stderr' | 'append';
  target: string;
}

/**
 * Shell executor interface
 */
export interface ShellExecutor {
  execute(command: string, context: ShellContext): Promise<ShellExecutionResult>;
  executeInBackground(command: string, context: ShellContext): Promise<string>;
  getJob(jobId: string): ShellJob | null;
  getJobs(): ShellJob[];
  getRunningJobs(): ShellJob[];
  cancelJob(jobId: string): boolean;
  foregroundJob(jobId: string): Promise<ShellExecutionResult>;
  backgroundJob(jobId: string): boolean;
  killJob(jobId: string): boolean;
  getJobHistory(limit?: number): ShellJob[];
}

/**
 * Shell history service interface
 */
export interface ShellHistoryService {
  add(item: ShellHistoryItem): void;
  get(id: string): ShellHistoryItem | null;
  getAll(): ShellHistoryItem[];
  search(query: string): ShellHistoryItem[];
  clear(): void;
  save(): void;
  load(): void;
  getRecent(limit: number): ShellHistoryItem[];
}

/**
 * Command registry interface
 */
export interface CommandRegistry {
  register(command: ShellCommand): void;
  unregister(name: string): void;
  get(name: string): ShellCommand | null;
  getAll(): ShellCommand[];
  getByType(type: CommandType): ShellCommand[];
  has(name: string): boolean;
}

/**
 * Shell configuration
 */
export interface ShellConfig {
  prompt: string;
  historySize: number;
  maxJobs: number;
  timeout: number;
  env: Record<string, string>;
  aliases: Record<string, string>;
}

/**
 * Command completion suggestion
 */
export interface CommandSuggestion {
  text: string;
  type: 'command' | 'file' | 'directory' | 'variable' | 'alias';
  description?: string;
  score: number;
}

/**
 * Shell event types
 */
export type ShellEventType = 
  | 'command-start'
  | 'command-end'
  | 'job-start'
  | 'job-end'
  | 'job-status-change'
  | 'output'
  | 'error'
  | 'cwd-change';

/**
 * Shell event
 */
export interface ShellEvent {
  type: ShellEventType;
  timestamp: Date;
  data: any;
}

/**
 * Shell event listener
 */
export type ShellEventListener = (event: ShellEvent) => void;

/**
 * Shell state
 */
export interface ShellState {
  session: ShellSession;
  context: ShellContext;
  config: ShellConfig;
  isExecuting: boolean;
  currentJob?: ShellJob;
}

