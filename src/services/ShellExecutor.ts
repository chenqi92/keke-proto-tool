// Shell Executor Service
// Manages shell command execution, job control, and background tasks

import {
  ShellExecutor as IShellExecutor,
  ShellCommand,
  ShellContext,
  ShellExecutionResult,
  ShellJob,
  JobStatus,
  ParsedCommand,
} from '@/types/shell';
import { generateId } from '@/utils';
import {
  executeSystemCommand,
  isLikelySystemCommand,
  requiresInteractiveMode,
  executeInteractiveCommand
} from './shell/SystemCommandExecutor';
import {
  parsePipeline,
  executePipeline,
  hasPipelineFeatures
} from './shell/PipelineExecutor';
import { interactiveSessionManager } from './shell/InteractiveSession';

export class ShellExecutor implements IShellExecutor {
  private jobs = new Map<string, ShellJob>();
  private maxConcurrentJobs = 10;
  private commandRegistry = new Map<string, ShellCommand>();

  constructor(maxConcurrentJobs = 10) {
    this.maxConcurrentJobs = maxConcurrentJobs;
  }

  /**
   * Register a command
   */
  registerCommand(command: ShellCommand): void {
    this.commandRegistry.set(command.name, command);
    
    // Register aliases
    if (command.aliases) {
      command.aliases.forEach(alias => {
        this.commandRegistry.set(alias, command);
      });
    }
  }

  /**
   * Get a registered command
   */
  getCommand(name: string): ShellCommand | null {
    return this.commandRegistry.get(name) || null;
  }

  /**
   * Parse command string
   */
  private parseCommand(commandStr: string): ParsedCommand {
    const trimmed = commandStr.trim();
    
    // Check for background execution
    const background = trimmed.endsWith('&');
    const cleanCommand = background ? trimmed.slice(0, -1).trim() : trimmed;
    
    // Simple parsing (TODO: handle quotes, pipes, redirects properly)
    const parts = cleanCommand.split(/\s+/);
    const command = parts[0] || '';
    const args = parts.slice(1);
    
    return {
      command,
      args,
      background,
      redirects: [],
      pipes: [],
    };
  }

  /**
   * Execute a command
   */
  async execute(commandStr: string, context: ShellContext): Promise<ShellExecutionResult> {
    const startTime = Date.now();

    // Check for pipeline features (pipes and redirects)
    if (hasPipelineFeatures(commandStr)) {
      console.log(`[ShellExecutor] Detected pipeline features in command: ${commandStr}`);

      try {
        const commands = parsePipeline(commandStr);
        console.log(`[ShellExecutor] Parsed ${commands.length} commands in pipeline`);

        return await executePipeline(commands, context);
      } catch (error) {
        return {
          success: false,
          output: '',
          error: `Pipeline execution failed: ${error instanceof Error ? error.message : String(error)}`,
          exitCode: 1,
          executionTime: Date.now() - startTime,
        };
      }
    }

    const parsed = this.parseCommand(commandStr);

    // Handle background execution
    if (parsed.background) {
      const jobId = await this.executeInBackground(commandStr, context);
      return {
        success: true,
        output: `[${jobId}] Job started in background`,
        exitCode: 0,
        executionTime: Date.now() - startTime,
        jobId,
      };
    }

    // Get command
    const command = this.getCommand(parsed.command);

    // If command is registered, execute it
    if (command) {
      try {
        const result = await command.execute(parsed.args, context);
        result.executionTime = Date.now() - startTime;
        return result;
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : String(error),
          exitCode: 1,
          executionTime: Date.now() - startTime,
        };
      }
    }

    // If not a builtin command, try to execute as system command
    if (isLikelySystemCommand(parsed.command)) {
      console.log(`[ShellExecutor] Attempting to execute system command: ${parsed.command}`);

      // Check if command requires interactive mode
      if (requiresInteractiveMode(parsed.command)) {
        console.log(`[ShellExecutor] Command requires interactive mode: ${parsed.command}`);

        // Start interactive session
        try {
          const sessionId = await interactiveSessionManager.startSession(
            parsed.command,
            parsed.args,
            context,
            {
              onOutput: (data) => console.log(`[Interactive] ${data}`),
              onError: (data) => console.error(`[Interactive] ${data}`),
              onClose: (code) => console.log(`[Interactive] Closed with code: ${code}`),
            }
          );

          // Return session ID in a special format
          return {
            success: true,
            output: '', // Empty output, will be filled by session events
            exitCode: 0,
            executionTime: Date.now() - startTime,
            interactiveSessionId: sessionId, // Special field to indicate interactive session
          };
        } catch (error) {
          return {
            success: false,
            output: '',
            error: `Failed to start interactive session: ${error instanceof Error ? error.message : String(error)}`,
            exitCode: 1,
            executionTime: Date.now() - startTime,
          };
        }
      }

      // Execute as system command
      return await executeSystemCommand(parsed.command, parsed.args, context);
    }

    // Command not found
    return {
      success: false,
      output: '',
      error: `Command not found: ${parsed.command}. Type 'help' to see available builtin commands.`,
      exitCode: 127,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Execute command in background
   */
  async executeInBackground(commandStr: string, context: ShellContext): Promise<string> {
    // Check concurrent job limit
    const runningJobs = this.getRunningJobs();
    if (runningJobs.length >= this.maxConcurrentJobs) {
      throw new Error(`Maximum concurrent jobs (${this.maxConcurrentJobs}) reached`);
    }
    
    const jobId = generateId();
    const parsed = this.parseCommand(commandStr.replace(/&\s*$/, '').trim());
    
    const job: ShellJob = {
      id: jobId,
      command: parsed.command,
      args: parsed.args,
      status: 'running',
      startTime: new Date(),
      output: '',
      error: '',
      context: { ...context },
    };
    
    // Create cancellation mechanism
    let cancelled = false;
    job.cancelFn = () => {
      cancelled = true;
      job.status = 'cancelled';
    };
    
    // Start execution
    job.promise = this.executeJobAsync(parsed, context, () => cancelled);
    
    // Handle completion
    job.promise.then(
      (result) => {
        job.status = 'completed';
        job.endTime = new Date();
        job.exitCode = result.exitCode;
        job.output = result.output;
        job.error = result.error || '';
      },
      (error) => {
        job.status = 'failed';
        job.endTime = new Date();
        job.exitCode = 1;
        job.error = error.message;
      }
    );
    
    this.jobs.set(jobId, job);
    
    // Clean up completed jobs after 5 minutes
    setTimeout(() => {
      const currentJob = this.jobs.get(jobId);
      if (currentJob && currentJob.status !== 'running') {
        this.jobs.delete(jobId);
      }
    }, 5 * 60 * 1000);
    
    return jobId;
  }

  /**
   * Execute job asynchronously with cancellation support
   */
  private async executeJobAsync(
    parsed: ParsedCommand,
    context: ShellContext,
    isCancelled: () => boolean
  ): Promise<ShellExecutionResult> {
    const startTime = Date.now();

    // Check cancellation before execution
    if (isCancelled()) {
      return {
        success: false,
        output: '',
        error: 'Job cancelled',
        exitCode: 130,
        executionTime: Date.now() - startTime,
      };
    }

    const command = this.getCommand(parsed.command);

    // Try builtin command first
    if (command) {
      try {
        const result = await command.execute(parsed.args, context);

        // Check cancellation after execution
        if (isCancelled()) {
          return {
            success: false,
            output: result.output,
            error: 'Job cancelled',
            exitCode: 130,
            executionTime: Date.now() - startTime,
          };
        }

        result.executionTime = Date.now() - startTime;
        return result;
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : String(error),
          exitCode: 1,
          executionTime: Date.now() - startTime,
        };
      }
    }

    // Try system command
    if (isLikelySystemCommand(parsed.command)) {
      try {
        const result = await executeSystemCommand(parsed.command, parsed.args, context);

        // Check cancellation after execution
        if (isCancelled()) {
          return {
            success: false,
            output: result.output,
            error: 'Job cancelled',
            exitCode: 130,
            executionTime: Date.now() - startTime,
          };
        }

        return result;
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : String(error),
          exitCode: 1,
          executionTime: Date.now() - startTime,
        };
      }
    }

    // Command not found
    return {
      success: false,
      output: '',
      error: `Command not found: ${parsed.command}`,
      exitCode: 127,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Get a job by ID
   */
  getJob(jobId: string): ShellJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs
   */
  getJobs(): ShellJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get running jobs
   */
  getRunningJobs(): ShellJob[] {
    return Array.from(this.jobs.values()).filter(job => job.status === 'running');
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'running' && job.cancelFn) {
      job.cancelFn();
      return true;
    }
    return false;
  }

  /**
   * Bring job to foreground (wait for completion)
   */
  async foregroundJob(jobId: string): Promise<ShellExecutionResult> {
    const job = this.jobs.get(jobId);

    if (!job) {
      return {
        success: false,
        output: '',
        error: `Job not found: ${jobId}`,
        exitCode: 1,
        executionTime: 0,
      };
    }

    // Wait for job promise if still running
    if (job.promise) {
      return await job.promise;
    }

    // Job already completed - return stored result
    return {
      success: job.status === 'completed',
      output: job.output || '',
      error: job.error || '',
      exitCode: job.exitCode ?? 0,
      executionTime: job.endTime
        ? job.endTime.getTime() - job.startTime.getTime()
        : 0,
    };
  }

  /**
   * Move job to background (no-op in this implementation)
   */
  backgroundJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    return job !== undefined && job.status === 'running';
  }

  /**
   * Kill a job
   */
  killJob(jobId: string): boolean {
    return this.cancelJob(jobId);
  }

  /**
   * Get job history
   */
  getJobHistory(limit = 50): ShellJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.status !== 'running')
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  /**
   * Clear completed jobs
   */
  clearCompletedJobs(): void {
    const completedJobIds: string[] = [];
    
    this.jobs.forEach((job, id) => {
      if (job.status !== 'running') {
        completedJobIds.push(id);
      }
    });
    
    completedJobIds.forEach(id => this.jobs.delete(id));
  }
}

// Singleton instance
export const shellExecutor = new ShellExecutor();

