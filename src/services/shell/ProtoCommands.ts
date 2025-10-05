// ProtoTool Bridge Commands
// Commands that integrate with ProtoTool features

import { ShellCommand, ShellContext, ShellExecutionResult } from '@/types/shell';
import { useAppStore } from '@/stores/AppStore';
import { networkService } from '../NetworkService';

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
    executionTime: 0,
  };
}

/**
 * proto connect - Connect to a session
 */
export const protoConnectCommand: ShellCommand = {
  name: 'proto connect',
  type: 'proto',
  description: 'Connect to a session',
  usage: 'proto connect <session-id>',
  examples: ['proto connect tcp-client-1', 'proto connect ws-server-1'],
  execute: async (args: string[], context: ShellContext) => {
    if (args.length < 2) {
      return createResult(false, '', 1, 'Usage: proto connect <session-id>');
    }
    
    const sessionId = args[1];
    const store = useAppStore.getState();
    const session = store.getSession(sessionId);
    
    if (!session) {
      return createResult(false, '', 1, `Session not found: ${sessionId}`);
    }
    
    if (session.status === 'connected') {
      return createResult(true, `Session ${sessionId} is already connected`, 0);
    }
    
    try {
      const success = await networkService.connect(sessionId);
      
      if (success) {
        return createResult(
          true,
          `Connected to session: ${session.config.name} (${session.config.protocol} ${session.config.connectionType})`,
          0
        );
      } else {
        return createResult(false, '', 1, 'Connection failed');
      }
    } catch (error) {
      return createResult(
        false,
        '',
        1,
        error instanceof Error ? error.message : String(error)
      );
    }
  },
};

/**
 * proto disconnect - Disconnect from a session
 */
export const protoDisconnectCommand: ShellCommand = {
  name: 'proto disconnect',
  type: 'proto',
  description: 'Disconnect from a session',
  usage: 'proto disconnect <session-id>',
  examples: ['proto disconnect tcp-client-1'],
  execute: async (args: string[], context: ShellContext) => {
    if (args.length < 2) {
      return createResult(false, '', 1, 'Usage: proto disconnect <session-id>');
    }
    
    const sessionId = args[1];
    const store = useAppStore.getState();
    const session = store.getSession(sessionId);
    
    if (!session) {
      return createResult(false, '', 1, `Session not found: ${sessionId}`);
    }
    
    if (session.status === 'disconnected') {
      return createResult(true, `Session ${sessionId} is already disconnected`, 0);
    }
    
    try {
      const success = await networkService.disconnect(sessionId);
      
      if (success) {
        return createResult(true, `Disconnected from session: ${session.config.name}`, 0);
      } else {
        return createResult(false, '', 1, 'Disconnect failed');
      }
    } catch (error) {
      return createResult(
        false,
        '',
        1,
        error instanceof Error ? error.message : String(error)
      );
    }
  },
};

/**
 * proto send - Send data to active session
 */
export const protoSendCommand: ShellCommand = {
  name: 'proto send',
  type: 'proto',
  description: 'Send data to active session',
  usage: 'proto send <session-id> <data> [--format hex|ascii|base64]',
  examples: [
    'proto send tcp-client-1 "Hello World"',
    'proto send tcp-client-1 48656c6c6f --format hex',
  ],
  execute: async (args: string[], context: ShellContext) => {
    if (args.length < 3) {
      return createResult(false, '', 1, 'Usage: proto send <session-id> <data> [--format hex|ascii|base64]');
    }
    
    const sessionId = args[1];
    const data = args[2];
    
    // Parse format option
    let format: 'ascii' | 'hex' | 'base64' = 'ascii';
    const formatIndex = args.indexOf('--format');
    if (formatIndex !== -1 && args[formatIndex + 1]) {
      const formatArg = args[formatIndex + 1].toLowerCase();
      if (formatArg === 'hex' || formatArg === 'base64') {
        format = formatArg;
      }
    }
    
    const store = useAppStore.getState();
    const session = store.getSession(sessionId);
    
    if (!session) {
      return createResult(false, '', 1, `Session not found: ${sessionId}`);
    }
    
    if (session.status !== 'connected') {
      return createResult(false, '', 1, `Session ${sessionId} is not connected`);
    }
    
    try {
      const success = await networkService.sendString(sessionId, data, format);
      
      if (success) {
        return createResult(true, `Data sent to session: ${session.config.name}`, 0);
      } else {
        return createResult(false, '', 1, 'Send failed');
      }
    } catch (error) {
      return createResult(
        false,
        '',
        1,
        error instanceof Error ? error.message : String(error)
      );
    }
  },
};

/**
 * proto status - Show connection status
 */
export const protoStatusCommand: ShellCommand = {
  name: 'proto status',
  type: 'proto',
  description: 'Show connection status',
  usage: 'proto status [session-id]',
  examples: ['proto status', 'proto status tcp-client-1'],
  execute: async (args: string[], context: ShellContext) => {
    const store = useAppStore.getState();
    
    if (args.length >= 2) {
      // Show specific session status
      const sessionId = args[1];
      const session = store.getSession(sessionId);
      
      if (!session) {
        return createResult(false, '', 1, `Session not found: ${sessionId}`);
      }
      
      const output = `Session: ${session.config.name}
ID: ${session.config.id}
Protocol: ${session.config.protocol}
Type: ${session.config.connectionType}
Host: ${session.config.host}:${session.config.port}
Status: ${session.status}
Messages: ${session.messages.length}
Bytes Sent: ${session.statistics.bytesSent}
Bytes Received: ${session.statistics.bytesReceived}`;
      
      return createResult(true, output, 0);
    } else {
      // Show all sessions status
      const sessions = store.getAllSessions();
      
      if (sessions.length === 0) {
        return createResult(true, 'No sessions', 0);
      }
      
      const output = sessions.map(session => {
        const statusIcon = session.status === 'connected' ? '✓' : 
                          session.status === 'connecting' ? '⋯' : '✗';
        return `${statusIcon} ${session.config.name.padEnd(20)} ${session.config.protocol.padEnd(10)} ${session.status}`;
      }).join('\n');
      
      return createResult(true, output, 0);
    }
  },
};

/**
 * proto sessions - List all sessions
 */
export const protoSessionsCommand: ShellCommand = {
  name: 'proto sessions',
  type: 'proto',
  description: 'List all sessions',
  usage: 'proto sessions [--protocol tcp|udp|websocket|mqtt|sse]',
  examples: ['proto sessions', 'proto sessions --protocol tcp'],
  execute: async (args: string[], context: ShellContext) => {
    const store = useAppStore.getState();
    
    // Parse protocol filter
    let protocolFilter: string | null = null;
    const protocolIndex = args.indexOf('--protocol');
    if (protocolIndex !== -1 && args[protocolIndex + 1]) {
      protocolFilter = args[protocolIndex + 1].toUpperCase();
    }
    
    let sessions = store.getAllSessions();
    
    if (protocolFilter) {
      sessions = sessions.filter(s => s.config.protocol.toUpperCase() === protocolFilter);
    }
    
    if (sessions.length === 0) {
      return createResult(true, protocolFilter ? `No ${protocolFilter} sessions` : 'No sessions', 0);
    }
    
    const output = sessions.map(session => {
      const statusIcon = session.status === 'connected' ? '✓' : 
                        session.status === 'connecting' ? '⋯' : '✗';
      return `${statusIcon} ${session.config.id.padEnd(25)} ${session.config.name.padEnd(20)} ${session.config.protocol.padEnd(10)} ${session.config.connectionType.padEnd(8)} ${session.config.host}:${session.config.port}`;
    }).join('\n');
    
    const header = `${'Status'.padEnd(2)} ${'ID'.padEnd(25)} ${'Name'.padEnd(20)} ${'Protocol'.padEnd(10)} ${'Type'.padEnd(8)} Address`;
    
    return createResult(true, `${header}\n${'-'.repeat(100)}\n${output}`, 0);
  },
};

/**
 * proto settings - Open settings (placeholder)
 */
export const protoSettingsCommand: ShellCommand = {
  name: 'proto settings',
  type: 'proto',
  description: 'Open ProtoTool settings',
  usage: 'proto settings',
  execute: async (args: string[], context: ShellContext) => {
    return createResult(
      true,
      'Settings command not yet implemented. Use the GUI settings button.',
      0
    );
  },
};

/**
 * Get all proto commands
 */
export function getAllProtoCommands(): ShellCommand[] {
  return [
    protoConnectCommand,
    protoDisconnectCommand,
    protoSendCommand,
    protoStatusCommand,
    protoSessionsCommand,
    protoSettingsCommand,
  ];
}

