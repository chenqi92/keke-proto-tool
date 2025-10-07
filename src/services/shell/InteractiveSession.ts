// Interactive Session Manager
// Manages interactive command sessions (ssh, vim, etc.)

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
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
 * Backend session info
 */
interface BackendSessionInfo {
  id: string;
  command: string;
  args: string[];
  pid: number;
  state: string;
}

/**
 * Interactive Session Manager
 */
export class InteractiveSessionManager {
  private sessions: Map<string, InteractiveSession> = new Map();
  private handlers: Map<string, SessionHandlers> = new Map();
  private eventListeners: Map<string, (() => void)[]> = new Map();
  
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
      // Start session via backend
      const backendSession = await invoke<BackendSessionInfo>('start_interactive_session', {
        sessionId,
        command,
        args,
        context: {
          cwd: context.cwd || null,
          env: context.env || null,
        },
      });

      console.log(`[InteractiveSession] Backend session started:`, backendSession);

      // Update session with PID
      session.pid = backendSession.pid;
      session.state = 'running';

      if (handlers.onStateChange) {
        handlers.onStateChange('running');
      }

      // Set up event listeners for session output
      const listeners: (() => void)[] = [];

      // Listen for stdout
      const unlistenStdout = await listen<string>(`interactive-session-${sessionId}-stdout`, (event) => {
        console.log(`[InteractiveSession] Session ${sessionId} stdout:`, event.payload);
        if (handlers.onOutput) {
          handlers.onOutput(event.payload);
        }
      });
      listeners.push(unlistenStdout);

      // Listen for stderr
      const unlistenStderr = await listen<string>(`interactive-session-${sessionId}-stderr`, (event) => {
        console.error(`[InteractiveSession] Session ${sessionId} stderr:`, event.payload);
        if (handlers.onError) {
          handlers.onError(event.payload);
        }
      });
      listeners.push(unlistenStderr);

      // Listen for close
      const unlistenClose = await listen<number>(`interactive-session-${sessionId}-close`, (event) => {
        console.log(`[InteractiveSession] Session ${sessionId} closed with code:`, event.payload);
        this.updateSessionState(sessionId, 'stopped');
        session.endTime = new Date();

        if (handlers.onClose) {
          handlers.onClose(event.payload);
        }

        // Clean up listeners
        this.cleanupListeners(sessionId);
      });
      listeners.push(unlistenClose);

      // Store listeners for cleanup
      this.eventListeners.set(sessionId, listeners);

      return sessionId;
    } catch (error) {
      console.error(`[InteractiveSession] Failed to start session ${sessionId}:`, error);
      this.updateSessionState(sessionId, 'error');

      if (handlers.onStateChange) {
        handlers.onStateChange('error');
      }

      throw error;
    }
  }

  /**
   * Clean up event listeners for a session
   */
  private cleanupListeners(sessionId: string): void {
    const listeners = this.eventListeners.get(sessionId);
    if (listeners) {
      listeners.forEach(unlisten => unlisten());
      this.eventListeners.delete(sessionId);
    }
  }
  
  /**
   * Write to session stdin
   */
  async writeToSession(sessionId: string, data: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    console.log(`[InteractiveSession] Writing to session ${sessionId}:`, data);

    try {
      await invoke('write_interactive_session', {
        sessionId,
        data,
      });
    } catch (error) {
      console.error(`[InteractiveSession] Failed to write to session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Kill session
   */
  async killSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    console.log(`[InteractiveSession] Killing session ${sessionId}`);

    try {
      await invoke('kill_interactive_session', {
        sessionId,
      });

      this.updateSessionState(sessionId, 'stopped');
      this.cleanupListeners(sessionId);

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
    this.handlers.delete(sessionId);
    this.cleanupListeners(sessionId);
  }
}

// Global instance
export const interactiveSessionManager = new InteractiveSessionManager();

