// Backend Shell Executor
// Uses Tauri backend commands for shell execution

import { invoke } from '@tauri-apps/api/core';
import { ShellExecutionResult, ShellContext } from '@/types/shell';

/**
 * Execute system command via backend
 */
export async function executeSystemCommandBackend(
  command: string,
  args: string[],
  context: ShellContext
): Promise<ShellExecutionResult> {
  try {
    console.log(`[BackendShellExecutor] Executing: ${command} ${args.join(' ')}`);
    
    const result = await invoke<ShellExecutionResult>('execute_system_command', {
      command,
      args,
      context: {
        cwd: context.cwd || null,
        env: context.env || null,
      },
    });
    
    console.log(`[BackendShellExecutor] Result:`, result);
    return result;
  } catch (error) {
    console.error(`[BackendShellExecutor] Error:`, error);
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      executionTime: 0,
    };
  }
}

/**
 * Execute pipeline via backend
 */
export async function executePipelineBackend(
  commands: Array<{ command: string; args: string[] }>,
  context: ShellContext
): Promise<ShellExecutionResult> {
  try {
    console.log(`[BackendShellExecutor] Executing pipeline with ${commands.length} commands`);
    
    // Convert to backend format
    const backendCommands = commands.map(cmd => [cmd.command, cmd.args]);
    
    const result = await invoke<ShellExecutionResult>('execute_pipeline', {
      commands: backendCommands,
      context: {
        cwd: context.cwd || null,
        env: context.env || null,
      },
    });
    
    console.log(`[BackendShellExecutor] Pipeline result:`, result);
    return result;
  } catch (error) {
    console.error(`[BackendShellExecutor] Pipeline error:`, error);
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : String(error),
      exitCode: 1,
      executionTime: 0,
    };
  }
}

/**
 * Read file content via backend
 */
export async function readFileContentBackend(path: string): Promise<string> {
  try {
    console.log(`[BackendShellExecutor] Reading file: ${path}`);
    
    const content = await invoke<string>('read_file_content', { path });
    
    console.log(`[BackendShellExecutor] File read successfully, length: ${content.length}`);
    return content;
  } catch (error) {
    console.error(`[BackendShellExecutor] Failed to read file:`, error);
    throw error;
  }
}

/**
 * Write file content via backend
 */
export async function writeFileContentBackend(
  path: string,
  content: string,
  append: boolean = false
): Promise<void> {
  try {
    console.log(`[BackendShellExecutor] Writing to file: ${path} (append: ${append})`);
    
    await invoke('write_file_content', {
      path,
      content,
      append,
    });
    
    console.log(`[BackendShellExecutor] File written successfully`);
  } catch (error) {
    console.error(`[BackendShellExecutor] Failed to write file:`, error);
    throw error;
  }
}

/**
 * Interactive session info
 */
export interface InteractiveSessionInfo {
  id: string;
  command: string;
  args: string[];
  pid: number;
  state: string;
}

/**
 * Start interactive session via backend
 */
export async function startInteractiveSessionBackend(
  sessionId: string,
  command: string,
  args: string[],
  context: ShellContext
): Promise<InteractiveSessionInfo> {
  try {
    console.log(`[BackendShellExecutor] Starting interactive session: ${sessionId}`);
    
    const sessionInfo = await invoke<InteractiveSessionInfo>('start_interactive_session', {
      sessionId,
      command,
      args,
      context: {
        cwd: context.cwd || null,
        env: context.env || null,
      },
    });
    
    console.log(`[BackendShellExecutor] Session started:`, sessionInfo);
    return sessionInfo;
  } catch (error) {
    console.error(`[BackendShellExecutor] Failed to start session:`, error);
    throw error;
  }
}

/**
 * Get interactive session info
 */
export async function getInteractiveSessionBackend(
  sessionId: string
): Promise<InteractiveSessionInfo | null> {
  try {
    const sessionInfo = await invoke<InteractiveSessionInfo | null>('get_interactive_session', {
      sessionId,
    });
    
    return sessionInfo;
  } catch (error) {
    console.error(`[BackendShellExecutor] Failed to get session:`, error);
    return null;
  }
}

/**
 * List all interactive sessions
 */
export async function listInteractiveSessionsBackend(): Promise<InteractiveSessionInfo[]> {
  try {
    const sessions = await invoke<InteractiveSessionInfo[]>('list_interactive_sessions');
    return sessions;
  } catch (error) {
    console.error(`[BackendShellExecutor] Failed to list sessions:`, error);
    return [];
  }
}

/**
 * Kill interactive session
 */
export async function killInteractiveSessionBackend(sessionId: string): Promise<void> {
  try {
    console.log(`[BackendShellExecutor] Killing session: ${sessionId}`);
    
    await invoke('kill_interactive_session', { sessionId });
    
    console.log(`[BackendShellExecutor] Session killed successfully`);
  } catch (error) {
    console.error(`[BackendShellExecutor] Failed to kill session:`, error);
    throw error;
  }
}

/**
 * Check if backend executor is available
 */
export async function isBackendExecutorAvailable(): Promise<boolean> {
  try {
    // Try to execute a simple command
    const result = await executeSystemCommandBackend('echo', ['test'], {});
    return result.success;
  } catch (error) {
    console.error(`[BackendShellExecutor] Backend executor not available:`, error);
    return false;
  }
}

