// Pipeline Executor
// Handles command pipelines and redirections

import { ShellExecutionResult, ShellContext } from '@/types/shell';
import { executeSystemCommand } from './SystemCommandExecutor';
import {
  readFileContentBackend,
  writeFileContentBackend,
  executePipelineBackend
} from './BackendShellExecutor';

/**
 * Redirect type
 */
export type RedirectType = 'stdout' | 'stderr' | 'stdin' | 'append';

/**
 * Redirect descriptor
 */
export interface Redirect {
  type: RedirectType;
  target: string; // file path or fd
}

/**
 * Pipeline command
 */
export interface PipelineCommand {
  command: string;
  args: string[];
  redirects: Redirect[];
}

/**
 * Parse command string with pipes and redirects
 */
export function parsePipeline(commandStr: string): PipelineCommand[] {
  const commands: PipelineCommand[] = [];
  
  // Split by pipe, but respect quotes
  const segments = splitByPipe(commandStr);
  
  for (const segment of segments) {
    const { command, args, redirects } = parseCommandWithRedirects(segment.trim());
    commands.push({ command, args, redirects });
  }
  
  return commands;
}

/**
 * Split command string by pipe, respecting quotes
 */
function splitByPipe(str: string): string[] {
  const segments: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : '';
    
    // Handle quotes
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuote = false;
        quoteChar = '';
      }
      current += char;
      continue;
    }
    
    // Handle pipe
    if (char === '|' && !inQuote) {
      if (current.trim()) {
        segments.push(current.trim());
      }
      current = '';
      continue;
    }
    
    current += char;
  }
  
  if (current.trim()) {
    segments.push(current.trim());
  }
  
  return segments;
}

/**
 * Parse command with redirects
 */
function parseCommandWithRedirects(str: string): {
  command: string;
  args: string[];
  redirects: Redirect[];
} {
  const redirects: Redirect[] = [];
  let commandPart = str;
  
  // Match redirects: >, >>, <, 2>, 2>>
  const redirectRegex = /(2?>>?|<)\s*([^\s]+)/g;
  let match;
  
  while ((match = redirectRegex.exec(str)) !== null) {
    const operator = match[1];
    const target = match[2];
    
    // Determine redirect type
    let type: RedirectType;
    if (operator === '>') {
      type = 'stdout';
    } else if (operator === '>>') {
      type = 'append';
    } else if (operator === '<') {
      type = 'stdin';
    } else if (operator === '2>') {
      type = 'stderr';
    } else if (operator === '2>>') {
      type = 'stderr'; // append stderr
    } else {
      continue;
    }
    
    redirects.push({ type, target });
    
    // Remove redirect from command part
    commandPart = commandPart.replace(match[0], '');
  }
  
  // Parse command and args
  const parts = parseCommandArgs(commandPart.trim());
  const command = parts[0] || '';
  const args = parts.slice(1);
  
  return { command, args, redirects };
}

/**
 * Parse command arguments, respecting quotes
 */
function parseCommandArgs(str: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : '';
    
    // Handle quotes
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuote = false;
        quoteChar = '';
      }
      continue; // Don't include quote chars
    }
    
    // Handle whitespace
    if (/\s/.test(char) && !inQuote) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }
    
    current += char;
  }
  
  if (current) {
    args.push(current);
  }
  
  return args;
}

/**
 * Execute pipeline
 */
export async function executePipeline(
  commands: PipelineCommand[],
  context: ShellContext
): Promise<ShellExecutionResult> {
  if (commands.length === 0) {
    return {
      success: false,
      output: '',
      error: 'Empty pipeline',
      exitCode: 1,
      executionTime: 0,
    };
  }
  
  // Single command - handle redirects
  if (commands.length === 1) {
    return await executeSingleCommandWithRedirects(commands[0], context);
  }
  
  // Multiple commands - execute pipeline
  return await executeMultiCommandPipeline(commands, context);
}

/**
 * Execute single command with redirects
 */
async function executeSingleCommandWithRedirects(
  cmd: PipelineCommand,
  context: ShellContext
): Promise<ShellExecutionResult> {
  const startTime = Date.now();

  try {
    // Handle stdin redirect
    let stdinContent = '';
    for (const redirect of cmd.redirects) {
      if (redirect.type === 'stdin') {
        try {
          console.log(`[Pipeline] Reading stdin from file: ${redirect.target}`);
          stdinContent = await readFileContentBackend(redirect.target);
          console.log(`[Pipeline] Read ${stdinContent.length} bytes from ${redirect.target}`);
          // TODO: Pass stdin to command execution
        } catch (error) {
          console.error(`[Pipeline] Failed to read stdin file:`, error);
          return {
            success: false,
            output: '',
            error: `Failed to read input file ${redirect.target}: ${error}`,
            exitCode: 1,
            executionTime: Date.now() - startTime,
          };
        }
      }
    }

    // Execute command
    const result = await executeSystemCommand(cmd.command, cmd.args, context);

    // Handle stdout/stderr redirects
    for (const redirect of cmd.redirects) {
      if (redirect.type === 'stdout' || redirect.type === 'append') {
        try {
          const append = redirect.type === 'append';
          console.log(`[Pipeline] Writing stdout to file: ${redirect.target} (append: ${append})`);
          await writeFileContentBackend(redirect.target, result.output, append);
          console.log(`[Pipeline] Wrote ${result.output.length} bytes to ${redirect.target}`);
        } catch (error) {
          console.error(`[Pipeline] Failed to write stdout file:`, error);
          // Don't fail the command, just log the error
        }
      } else if (redirect.type === 'stderr') {
        try {
          console.log(`[Pipeline] Writing stderr to file: ${redirect.target}`);
          const errorContent = result.error || '';
          await writeFileContentBackend(redirect.target, errorContent, false);
          console.log(`[Pipeline] Wrote ${errorContent.length} bytes to ${redirect.target}`);
        } catch (error) {
          console.error(`[Pipeline] Failed to write stderr file:`, error);
          // Don't fail the command, just log the error
        }
      }
    }

    return {
      ...result,
      executionTime: Date.now() - startTime,
    };
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

/**
 * Execute multi-command pipeline
 */
async function executeMultiCommandPipeline(
  commands: PipelineCommand[],
  context: ShellContext
): Promise<ShellExecutionResult> {
  const startTime = Date.now();
  
  try {
    let pipelineOutput = '';
    let lastExitCode = 0;
    
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      const isFirst = i === 0;
      const isLast = i === commands.length - 1;
      
      console.log(`[Pipeline] Executing command ${i + 1}/${commands.length}: ${cmd.command} ${cmd.args.join(' ')}`);
      
      // For now, execute each command and pass output to next
      // In a real implementation, this would use actual pipes
      const result = await executeSystemCommand(cmd.command, cmd.args, context);
      
      if (!result.success) {
        return {
          success: false,
          output: pipelineOutput,
          error: `Pipeline failed at command ${i + 1}: ${result.error}`,
          exitCode: result.exitCode,
          executionTime: Date.now() - startTime,
        };
      }
      
      pipelineOutput = result.output;
      lastExitCode = result.exitCode;
      
      // TODO: Pass output as stdin to next command
      // This requires modifying executeSystemCommand to accept stdin
    }
    
    return {
      success: lastExitCode === 0,
      output: pipelineOutput,
      exitCode: lastExitCode,
      executionTime: Date.now() - startTime,
    };
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

/**
 * Check if command string contains pipes or redirects
 */
export function hasPipelineFeatures(commandStr: string): boolean {
  // Check for pipes (not in quotes)
  let inQuote = false;
  let quoteChar = '';
  
  for (let i = 0; i < commandStr.length; i++) {
    const char = commandStr[i];
    const prevChar = i > 0 ? commandStr[i - 1] : '';
    
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuote = false;
        quoteChar = '';
      }
      continue;
    }
    
    if (!inQuote) {
      // Check for pipe
      if (char === '|') {
        return true;
      }
      
      // Check for redirects
      if (char === '>' || char === '<') {
        return true;
      }
    }
  }
  
  return false;
}

