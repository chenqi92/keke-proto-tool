// Interactive Session Manager
// Manages interactive command sessions (ssh, vim, etc.)

import { Child, Command } from '@tauri-apps/plugin-shell';
import { ShellContext } from '@/types/shell';

/**
 * Interactive session state
 */
export type SessionState = 'starting' | 'running' | 'stopped' | 'error';

/**
 * Interactive session
 */
export interface InteractiveSession {
  id: string;
  command: string;
  args: string[];
  state: SessionState;
  pid?: number;
  startTime: Date;
  endTime?: Date;
}

/**
 * Session event handlers
 */
export interface SessionHandlers {
  onOutput?: (data: string) => void;
  onError?: (data: string) => void;
  onClose?: (code: number) => void;
  onStateChange?: (state: SessionState) => void;
}

/**
 * Interactive Session Manager
 */
export class InteractiveSessionManager {
  private sessions: Map<string, InteractiveSession> = new Map();
  private processes: Map<string, Child> = new Map();
  private handlers: Map<string, SessionHandlers> = new Map();
  
  /**
   * Start an interactive session
   */
  async startSession(
    command: string,
    args: string[],
    context: ShellContext,
    handlers: SessionHandlers
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    
    console.log(`[InteractiveSession] Starting session ${sessionId}: ${command} ${args.join(' ')}`);
    
    // Create session
    const session: InteractiveSession = {
      id: sessionId,
      command,
      args,
      state: 'starting',
      startTime: new Date(),
    };
    
    this.sessions.set(sessionId, session);
    this.handlers.set(sessionId, handlers);
    
    try {
      // Create command
      const cmd = Command.create(command, args, {
        cwd: context.cwd || undefined,
        env: context.env || undefined,
      });
      
      // Set up event listeners
      cmd.on('close', (data) => {
        console.log(`[InteractiveSession] Session ${sessionId} closed with code: ${data.code}`);
        this.updateSessionState(sessionId, 'stopped');
        session.endTime = new Date();
        
        if (handlers.onClose) {
          handlers.onClose(data.code);
        }
      });
      
      cmd.on('error', (error) => {
        console.error(`[InteractiveSession] Session ${sessionId} error:`, error);
        this.updateSessionState(sessionId, 'error');
        
        if (handlers.onError) {
          handlers.onError(error);
        }
      });
      
      cmd.stdout.on('data', (line) => {
        console.log(`[InteractiveSession] Session ${sessionId} stdout:`, line);
        
        if (handlers.onOutput) {
          handlers.onOutput(line);
        }
      });
      
      cmd.stderr.on('data', (line) => {
        console.log(`[InteractiveSession] Session ${sessionId} stderr:`, line);
        
        if (handlers.onError) {
          handlers.onError(line);
        }
      });
      
      // Spawn process
      const child = await cmd.spawn();
      console.log(`[InteractiveSession] Session ${sessionId} spawned with PID: ${child.pid}`);
      
      session.pid = child.pid;
      this.processes.set(sessionId, child);
      this.updateSessionState(sessionId, 'running');
      
      return sessionId;
    } catch (error) {
      console.error(`[InteractiveSession] Failed to start session ${sessionId}:`, error);
      this.updateSessionState(sessionId, 'error');
      throw error;
    }
  }
  
  /**
   * Write to session stdin
   */
  async writeToSession(sessionId: string, data: string): Promise<void> {
    const child = this.processes.get(sessionId);
    
    if (!child) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    console.log(`[InteractiveSession] Writing to session ${sessionId}:`, data);
    
    try {
      await child.write(data);
    } catch (error) {
      console.error(`[InteractiveSession] Failed to write to session ${sessionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Kill session
   */
  async killSession(sessionId: string): Promise<void> {
    const child = this.processes.get(sessionId);
    
    if (!child) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    console.log(`[InteractiveSession] Killing session ${sessionId}`);
    
    try {
      await child.kill();
      this.updateSessionState(sessionId, 'stopped');
      
      const session = this.sessions.get(sessionId);
      if (session) {
        session.endTime = new Date();
      }
    } catch (error) {
      console.error(`[InteractiveSession] Failed to kill session ${sessionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get session info
   */
  getSession(sessionId: string): InteractiveSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  /**
   * Get all sessions
   */
  getAllSessions(): InteractiveSession[] {
    return Array.from(this.sessions.values());
  }
  
  /**
   * Get active sessions
   */
  getActiveSessions(): InteractiveSession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.state === 'running'
    );
  }
  
  /**
   * Update session state
   */
  private updateSessionState(sessionId: string, state: SessionState): void {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      session.state = state;
      
      const handlers = this.handlers.get(sessionId);
      if (handlers && handlers.onStateChange) {
        handlers.onStateChange(state);
      }
    }
  }
  
  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Cleanup session
   */
  cleanupSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.processes.delete(sessionId);
    this.handlers.delete(sessionId);
  }
}

// Global instance
export const interactiveSessionManager = new InteractiveSessionManager();

