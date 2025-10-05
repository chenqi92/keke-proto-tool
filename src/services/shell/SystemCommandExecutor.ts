// System Command Executor
// Executes native system commands using backend Rust service

import { ShellExecutionResult, ShellContext } from '@/types/shell';
import { executeSystemCommandBackend } from './BackendShellExecutor';

/**
 * Execute a system command using backend Rust service
 */
export async function executeSystemCommand(
  command: string,
  args: string[],
  context: ShellContext
): Promise<ShellExecutionResult> {
  console.log(`[SystemCommand] Executing via backend: ${command} ${args.join(' ')}`);
  console.log(`[SystemCommand] Working directory: ${context.cwd}`);

  try {
    // Use backend executor for better compatibility and no permission issues
    const result = await executeSystemCommandBackend(command, args, context);

    console.log(`[SystemCommand] Backend result - success: ${result.success}, exit code: ${result.exitCode}`);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[SystemCommand] Backend execution failed:`, errorMessage);

    return {
      success: false,
      output: '',
      error: errorMessage,
      exitCode: 1,
      executionTime: 0,
    };
  }
}

/**
 * Check if a command is likely a system command
 * This is a heuristic - we'll try to execute it if it's not a builtin
 */
export function isLikelySystemCommand(command: string): boolean {
  // Common system commands on Windows
  const windowsCommands = [
    'ipconfig', 'ping', 'netstat', 'tracert', 'nslookup', 'route',
    'arp', 'getmac', 'systeminfo', 'tasklist', 'taskkill',
    'dir', 'type', 'copy', 'move', 'del', 'mkdir', 'rmdir',
    'cls', 'date', 'time', 'ver', 'hostname', 'whoami',
    'net', 'sc', 'reg', 'wmic', 'powershell', 'cmd',
  ];

  // Common system commands on Unix/Linux/macOS
  const unixCommands = [
    'ifconfig', 'ip', 'ping', 'netstat', 'traceroute', 'nslookup', 'dig',
    'arp', 'route', 'ss', 'nc', 'telnet', 'curl', 'wget',
    'ls', 'cat', 'grep', 'find', 'sed', 'awk', 'sort', 'uniq',
    'head', 'tail', 'wc', 'diff', 'chmod', 'chown', 'ln',
    'cp', 'mv', 'rm', 'mkdir', 'rmdir', 'touch',
    'ps', 'top', 'kill', 'killall', 'pkill',
    'df', 'du', 'mount', 'umount', 'fdisk',
    'tar', 'gzip', 'gunzip', 'zip', 'unzip',
    'ssh', 'scp', 'sftp', 'rsync', 'ftp',
    'git', 'svn', 'hg',
    'node', 'npm', 'yarn', 'pnpm', 'python', 'python3', 'pip', 'pip3',
    'java', 'javac', 'mvn', 'gradle',
    'gcc', 'g++', 'make', 'cmake',
    'docker', 'kubectl', 'helm',
    'systemctl', 'service', 'journalctl',
    'uname', 'hostname', 'whoami', 'id', 'groups',
    'date', 'cal', 'uptime', 'w', 'who', 'last',
    'man', 'which', 'whereis', 'whatis', 'apropos',
  ];

  const lowerCommand = command.toLowerCase();
  
  return windowsCommands.includes(lowerCommand) || 
         unixCommands.includes(lowerCommand) ||
         // Also try if command contains path separators (likely a script/binary)
         command.includes('/') || 
         command.includes('\\') ||
         // Or has common executable extensions
         command.endsWith('.exe') ||
         command.endsWith('.sh') ||
         command.endsWith('.bat') ||
         command.endsWith('.cmd') ||
         command.endsWith('.ps1');
}

/**
 * Execute an interactive system command (like ssh)
 * This requires special handling for interactive I/O
 */
export async function executeInteractiveCommand(
  command: string,
  args: string[],
  context: ShellContext,
  onOutput?: (data: string) => void,
  onError?: (data: string) => void
): Promise<ShellExecutionResult> {
  const startTime = Date.now();

  try {
    console.log(`[InteractiveCommand] Executing: ${command} ${args.join(' ')}`);

    // Create command with sidecar for interactive mode
    const cmd = Command.create(command, args, {
      cwd: context.cwd || undefined,
      env: context.env || undefined,
    });

    // Set up event listeners for streaming output
    let stdout = '';
    let stderr = '';

    cmd.on('close', (data) => {
      console.log(`[InteractiveCommand] Process closed with code: ${data.code}`);
    });

    cmd.on('error', (error) => {
      console.error(`[InteractiveCommand] Error:`, error);
      if (onError) {
        onError(error);
      }
      stderr += error + '\n';
    });

    cmd.stdout.on('data', (line) => {
      console.log(`[InteractiveCommand] stdout:`, line);
      if (onOutput) {
        onOutput(line);
      }
      stdout += line;
    });

    cmd.stderr.on('data', (line) => {
      console.log(`[InteractiveCommand] stderr:`, line);
      if (onError) {
        onError(line);
      }
      stderr += line;
    });

    // Spawn the process
    const child = await cmd.spawn();
    console.log(`[InteractiveCommand] Process spawned with PID: ${child.pid}`);

    // Wait for completion
    const status = await child.wait();
    const executionTime = Date.now() - startTime;

    console.log(`[InteractiveCommand] Process exited with code: ${status.code}`);

    return {
      success: status.code === 0,
      output: stdout,
      error: status.code !== 0 ? stderr : undefined,
      exitCode: status.code,
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`[InteractiveCommand] Execution failed:`, errorMessage);

    return {
      success: false,
      output: '',
      error: errorMessage,
      exitCode: 1,
      executionTime,
    };
  }
}

/**
 * Check if a command requires interactive mode
 */
export function requiresInteractiveMode(command: string): boolean {
  const interactiveCommands = [
    'ssh', 'telnet', 'ftp', 'sftp', 'mysql', 'psql', 'mongo',
    'redis-cli', 'python', 'node', 'irb', 'php', 'lua',
    'vim', 'vi', 'nano', 'emacs', 'less', 'more',
    'top', 'htop', 'watch',
  ];

  return interactiveCommands.includes(command.toLowerCase());
}

