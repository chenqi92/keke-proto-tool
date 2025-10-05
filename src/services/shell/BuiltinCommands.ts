// Built-in Shell Commands
// Implementation of core shell commands

import { ShellCommand, ShellContext, ShellExecutionResult } from '@/types/shell';
import { shellExecutor } from '../ShellExecutor';

/**
 * Helper to create execution result
 */
function createResult(
  success: boolean,
  output: string,
  exitCode = 0,
  error?: string
): ShellExecutionResult {
  return {
    success,
    output,
    error,
    exitCode,
    executionTime: 0, // Will be set by executor
  };
}

/**
 * echo - Print arguments
 */
export const echoCommand: ShellCommand = {
  name: 'echo',
  type: 'builtin',
  description: 'Print arguments to output',
  usage: 'echo [args...]',
  examples: ['echo Hello World', 'echo $VAR'],
  execute: async (args: string[], context: ShellContext) => {
    const output = args.join(' ');
    return createResult(true, output, 0);
  },
};

/**
 * clear - Clear the console
 */
export const clearCommand: ShellCommand = {
  name: 'clear',
  type: 'builtin',
  description: 'Clear the console output',
  usage: 'clear',
  execute: async (args: string[], context: ShellContext) => {
    return createResult(true, '__CLEAR__', 0);
  },
};

/**
 * help - Show help information
 */
export const helpCommand: ShellCommand = {
  name: 'help',
  type: 'builtin',
  description: 'Show help information',
  usage: 'help [command]',
  examples: ['help', 'help echo', 'help proto'],
  execute: async (args: string[], context: ShellContext) => {
    if (args.length === 0) {
      const output = `ProtoShell - Interactive Protocol Debugging Shell

Available Commands:
  Built-in Commands:
    echo      - Print arguments to output
    clear     - Clear the console
    help      - Show this help message
    version   - Show ProtoTool version
    pwd       - Print working directory
    cd        - Change directory
    history   - Show command history
    sleep     - Sleep for specified seconds (useful for testing jobs)
    jobs      - List background jobs
    fg        - Bring job to foreground
    bg        - Move job to background
    kill      - Kill a job
    alias     - Create command alias
    export    - Export environment variable
    set       - Set shell variable
    unset     - Unset variable

  ProtoTool Commands:
    proto connect    - Connect to a session
    proto disconnect - Disconnect from a session
    proto send       - Send data to active session
    proto status     - Show connection status
    proto sessions   - List all sessions
    proto settings   - Open settings

Tips:
  - Add '&' to run commands in background: sleep 10 &
  - Use Tab for command completion
  - Use ↑↓ to navigate command history
  - Use 'jobs' to see running background jobs

Type 'help <command>' for detailed information about a specific command.`;
      return createResult(true, output, 0);
    }
    
    const commandName = args[0];
    const command = shellExecutor.getCommand(commandName);
    
    if (!command) {
      return createResult(false, '', 1, `Command not found: ${commandName}`);
    }
    
    let output = `${command.name} - ${command.description}\n\nUsage: ${command.usage}`;
    
    if (command.examples && command.examples.length > 0) {
      output += '\n\nExamples:\n' + command.examples.map(ex => `  ${ex}`).join('\n');
    }
    
    return createResult(true, output, 0);
  },
};

/**
 * version - Show version
 */
export const versionCommand: ShellCommand = {
  name: 'version',
  type: 'builtin',
  description: 'Show ProtoTool version',
  usage: 'version',
  execute: async (args: string[], context: ShellContext) => {
    return createResult(true, 'ProtoTool v0.0.13', 0);
  },
};

/**
 * pwd - Print working directory
 */
export const pwdCommand: ShellCommand = {
  name: 'pwd',
  type: 'builtin',
  description: 'Print current working directory',
  usage: 'pwd',
  execute: async (args: string[], context: ShellContext) => {
    return createResult(true, context.cwd || '/', 0);
  },
};

/**
 * cd - Change directory
 */
export const cdCommand: ShellCommand = {
  name: 'cd',
  type: 'builtin',
  description: 'Change current directory',
  usage: 'cd [directory]',
  examples: ['cd /home', 'cd ..', 'cd ~'],
  execute: async (args: string[], context: ShellContext) => {
    const target = args[0] || '~';
    
    // Handle special cases
    let newPath = target;
    if (target === '~') {
      newPath = '/home';
    } else if (target === '..') {
      const parts = (context.cwd || '/').split('/').filter(p => p);
      parts.pop();
      newPath = '/' + parts.join('/');
    } else if (!target.startsWith('/')) {
      newPath = (context.cwd || '/') + '/' + target;
    }
    
    // Normalize path
    newPath = newPath.replace(/\/+/g, '/');
    if (newPath !== '/' && newPath.endsWith('/')) {
      newPath = newPath.slice(0, -1);
    }
    
    // Update context (this should be handled by the shell state manager)
    context.cwd = newPath;
    
    return createResult(true, '', 0);
  },
};

/**
 * history - Show command history
 */
export const historyCommand: ShellCommand = {
  name: 'history',
  type: 'builtin',
  description: 'Show command history',
  usage: 'history [n]',
  examples: ['history', 'history 10'],
  execute: async (args: string[], context: ShellContext) => {
    // Import shellHistoryService dynamically to avoid circular dependency
    const { shellHistoryService } = await import('../ShellHistoryService');

    const limit = args.length > 0 ? parseInt(args[0], 10) : 20;
    const items = shellHistoryService.getRecent(limit);

    if (items.length === 0) {
      return createResult(true, 'No command history', 0);
    }

    const output = items.map((item, index) => {
      const num = items.length - index;
      return `${num.toString().padStart(4)} ${item.command} ${item.args.join(' ')}`;
    }).join('\n');

    return createResult(true, output, 0);
  },
};

/**
 * jobs - List background jobs
 */
export const jobsCommand: ShellCommand = {
  name: 'jobs',
  type: 'builtin',
  description: 'List background jobs',
  usage: 'jobs',
  execute: async (args: string[], context: ShellContext) => {
    const jobs = shellExecutor.getJobs();
    
    if (jobs.length === 0) {
      return createResult(true, 'No jobs', 0);
    }
    
    const output = jobs.map(job => {
      const duration = job.endTime
        ? job.endTime.getTime() - job.startTime.getTime()
        : Date.now() - job.startTime.getTime();
      
      const status = job.status === 'running' ? 'Running' : job.status;
      return `[${job.id.slice(0, 8)}] ${status.padEnd(10)} ${job.command} ${job.args.join(' ')} (${Math.round(duration / 1000)}s)`;
    }).join('\n');
    
    return createResult(true, output, 0);
  },
};

/**
 * fg - Bring job to foreground
 */
export const fgCommand: ShellCommand = {
  name: 'fg',
  type: 'builtin',
  description: 'Bring job to foreground',
  usage: 'fg <job-id>',
  examples: ['fg abc123'],
  execute: async (args: string[], context: ShellContext) => {
    if (args.length === 0) {
      return createResult(false, '', 1, 'Usage: fg <job-id>');
    }
    
    const jobId = args[0];
    const result = await shellExecutor.foregroundJob(jobId);
    
    return result;
  },
};

/**
 * bg - Move job to background
 */
export const bgCommand: ShellCommand = {
  name: 'bg',
  type: 'builtin',
  description: 'Move job to background',
  usage: 'bg <job-id>',
  examples: ['bg abc123'],
  execute: async (args: string[], context: ShellContext) => {
    if (args.length === 0) {
      return createResult(false, '', 1, 'Usage: bg <job-id>');
    }
    
    const jobId = args[0];
    const success = shellExecutor.backgroundJob(jobId);
    
    if (success) {
      return createResult(true, `Job ${jobId} moved to background`, 0);
    } else {
      return createResult(false, '', 1, `Job not found or not running: ${jobId}`);
    }
  },
};

/**
 * kill - Kill a job
 */
export const killCommand: ShellCommand = {
  name: 'kill',
  type: 'builtin',
  description: 'Kill a background job',
  usage: 'kill <job-id>',
  examples: ['kill abc123'],
  execute: async (args: string[], context: ShellContext) => {
    if (args.length === 0) {
      return createResult(false, '', 1, 'Usage: kill <job-id>');
    }
    
    const jobId = args[0];
    const success = shellExecutor.killJob(jobId);
    
    if (success) {
      return createResult(true, `Job ${jobId} killed`, 0);
    } else {
      return createResult(false, '', 1, `Job not found or already completed: ${jobId}`);
    }
  },
};

/**
 * alias - Create command alias
 */
export const aliasCommand: ShellCommand = {
  name: 'alias',
  type: 'builtin',
  description: 'Create or list command aliases',
  usage: 'alias [name=value]',
  examples: ['alias', 'alias ll="ls -la"'],
  execute: async (args: string[], context: ShellContext) => {
    if (args.length === 0) {
      // List aliases
      const aliases = Object.entries(context.aliases || {});
      if (aliases.length === 0) {
        return createResult(true, 'No aliases defined', 0);
      }
      const output = aliases.map(([name, value]) => `${name}='${value}'`).join('\n');
      return createResult(true, output, 0);
    }
    
    // Set alias
    const aliasStr = args.join(' ');
    const match = aliasStr.match(/^(\w+)=(.+)$/);
    
    if (!match) {
      return createResult(false, '', 1, 'Invalid alias syntax. Use: alias name=value');
    }
    
    const [, name, value] = match;
    context.aliases = context.aliases || {};
    context.aliases[name] = value.replace(/^["']|["']$/g, '');
    
    return createResult(true, '', 0);
  },
};

/**
 * export - Export environment variable
 */
export const exportCommand: ShellCommand = {
  name: 'export',
  type: 'builtin',
  description: 'Export environment variable',
  usage: 'export NAME=value',
  examples: ['export PATH=/usr/bin', 'export DEBUG=true'],
  execute: async (args: string[], context: ShellContext) => {
    if (args.length === 0) {
      return createResult(false, '', 1, 'Usage: export NAME=value');
    }
    
    const exportStr = args.join(' ');
    const match = exportStr.match(/^(\w+)=(.*)$/);
    
    if (!match) {
      return createResult(false, '', 1, 'Invalid export syntax. Use: export NAME=value');
    }
    
    const [, name, value] = match;
    context.env = context.env || {};
    context.env[name] = value;
    
    return createResult(true, '', 0);
  },
};

/**
 * set - Set shell variable
 */
export const setCommand: ShellCommand = {
  name: 'set',
  type: 'builtin',
  description: 'Set shell variable',
  usage: 'set NAME=value',
  examples: ['set DEBUG=1'],
  execute: async (args: string[], context: ShellContext) => {
    if (args.length === 0) {
      // List variables
      const vars = Object.entries(context.variables || {});
      if (vars.length === 0) {
        return createResult(true, 'No variables set', 0);
      }
      const output = vars.map(([name, value]) => `${name}=${value}`).join('\n');
      return createResult(true, output, 0);
    }
    
    const setStr = args.join(' ');
    const match = setStr.match(/^(\w+)=(.*)$/);
    
    if (!match) {
      return createResult(false, '', 1, 'Invalid set syntax. Use: set NAME=value');
    }
    
    const [, name, value] = match;
    context.variables = context.variables || {};
    context.variables[name] = value;
    
    return createResult(true, '', 0);
  },
};

/**
 * unset - Unset variable
 */
export const unsetCommand: ShellCommand = {
  name: 'unset',
  type: 'builtin',
  description: 'Unset shell or environment variable',
  usage: 'unset NAME',
  examples: ['unset DEBUG'],
  execute: async (args: string[], context: ShellContext) => {
    if (args.length === 0) {
      return createResult(false, '', 1, 'Usage: unset NAME');
    }
    
    const name = args[0];
    
    if (context.variables && name in context.variables) {
      delete context.variables[name];
    }
    
    if (context.env && name in context.env) {
      delete context.env[name];
    }
    
    return createResult(true, '', 0);
  },
};

/**
 * sleep - Sleep for specified seconds (for testing background jobs)
 */
export const sleepCommand: ShellCommand = {
  name: 'sleep',
  type: 'builtin',
  description: 'Sleep for specified seconds',
  usage: 'sleep <seconds>',
  examples: ['sleep 5', 'sleep 10 &'],
  execute: async (args: string[], context: ShellContext) => {
    if (args.length === 0) {
      return createResult(false, '', 1, 'Usage: sleep <seconds>');
    }

    const seconds = parseInt(args[0], 10);

    if (isNaN(seconds) || seconds < 0) {
      return createResult(false, '', 1, 'Invalid number of seconds');
    }

    // Sleep for specified duration
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));

    return createResult(true, `Slept for ${seconds} seconds`, 0);
  },
};

/**
 * Get all builtin commands
 */
export function getAllBuiltinCommands(): ShellCommand[] {
  return [
    echoCommand,
    clearCommand,
    helpCommand,
    versionCommand,
    pwdCommand,
    cdCommand,
    historyCommand,
    jobsCommand,
    fgCommand,
    bgCommand,
    killCommand,
    aliasCommand,
    exportCommand,
    setCommand,
    unsetCommand,
    sleepCommand,
  ];
}

