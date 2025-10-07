// Session Manager
// Manages multiple shell sessions

import { invoke } from '@tauri-apps/api/core';
import { generateId } from '@/utils';

export interface ShellSessionInfo {
  id: string;
  name: string;
  created_at: number;
  last_active: number;
  command_count: number;
}

export interface SessionState {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  lastActive: Date;
}

class SessionManagerService {
  private sessions: Map<string, SessionState> = new Map();
  private activeSessionId: string | null = null;
  private listeners: Set<() => void> = new Set();
  private initialized = false;

  /**
   * Initialize the session manager and database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize the database
      await invoke('init_shell_history_db');

      // Load existing sessions from database
      const dbSessions = await invoke<ShellSessionInfo[]>('get_all_shell_sessions');

      if (dbSessions.length === 0) {
        // Create default session if none exist
        const sessionId = await this.createSession('Default');
        this.activeSessionId = sessionId;
        const session = this.sessions.get(sessionId);
        if (session) {
          session.isActive = true;
        }
      } else {
        // Load sessions from database
        dbSessions.forEach(session => {
          this.sessions.set(session.id, {
            id: session.id,
            name: session.name,
            isActive: false,
            createdAt: new Date(session.created_at),
            lastActive: new Date(session.last_active),
          });
        });

        // Set first session as active
        const firstSession = dbSessions[0];
        this.activeSessionId = firstSession.id;
        const session = this.sessions.get(firstSession.id);
        if (session) {
          session.isActive = true;
        }
      }

      this.initialized = true;
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to initialize session manager:', error);
      // Create a default session even if database fails
      const sessionId = this.createSessionLocally('Default');
      this.activeSessionId = sessionId;
      const session = this.sessions.get(sessionId);
      if (session) {
        session.isActive = true;
      }
      this.initialized = true;
      this.notifyListeners();
    }
  }

  /**
   * Create a session locally without database
   */
  private createSessionLocally(name?: string): string {
    const sessionId = generateId();
    const sessionName = name || `Session ${this.sessions.size + 1}`;
    const now = Date.now();

    const session: SessionState = {
      id: sessionId,
      name: sessionName,
      isActive: false,
      createdAt: new Date(now),
      lastActive: new Date(now),
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Create a new session
   */
  async createSession(name?: string): Promise<string> {
    const sessionId = generateId();
    const sessionName = name || `Session ${this.sessions.size + 1}`;
    const now = Date.now();

    const session: SessionState = {
      id: sessionId,
      name: sessionName,
      isActive: false,
      createdAt: new Date(now),
      lastActive: new Date(now),
    };

    this.sessions.set(sessionId, session);

    // Save to database if initialized
    if (this.initialized) {
      try {
        await invoke('create_shell_session', {
          session: {
            id: sessionId,
            name: sessionName,
            created_at: now,
            last_active: now,
            command_count: 0,
          },
        });
      } catch (error) {
        console.error('Failed to save session to database:', error);
      }
    }

    // If this is the first session, make it active
    if (this.sessions.size === 1) {
      this.setActiveSession(sessionId);
    }

    this.notifyListeners();
    return sessionId;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Don't allow deleting the last session
    if (this.sessions.size === 1) {
      throw new Error('Cannot delete the last session');
    }

    // If deleting active session, switch to another one
    if (this.activeSessionId === sessionId) {
      const otherSessionId = Array.from(this.sessions.keys()).find(id => id !== sessionId);
      if (otherSessionId) {
        this.setActiveSession(otherSessionId);
      }
    }

    this.sessions.delete(sessionId);

    // Delete from database if initialized
    if (this.initialized) {
      try {
        await invoke('delete_shell_session', { sessionId });
      } catch (error) {
        console.error('Failed to delete session from database:', error);
      }
    }

    this.notifyListeners();
  }

  /**
   * Set active session
   */
  setActiveSession(sessionId: string): void {
    // Deactivate current session
    if (this.activeSessionId) {
      const currentSession = this.sessions.get(this.activeSessionId);
      if (currentSession) {
        currentSession.isActive = false;
      }
    }

    // Activate new session
    const newSession = this.sessions.get(sessionId);
    if (newSession) {
      newSession.isActive = true;
      newSession.lastActive = new Date();
      this.activeSessionId = sessionId;

      // Update in database if initialized
      if (this.initialized) {
        invoke('update_shell_session_active', {
          sessionId,
          timestamp: Date.now(),
        }).catch(error => {
          console.error('Failed to update session active time:', error);
        });
      }

      this.notifyListeners();
    }
  }

  /**
   * Get active session
   */
  getActiveSession(): SessionState | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) || null;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => b.lastActive.getTime() - a.lastActive.getTime()
    );
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionState | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Rename session
   */
  async renameSession(sessionId: string, newName: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.name = newName;
    this.notifyListeners();

    // Note: We would need to add a rename command to the backend
    // For now, we'll just update the local state
  }

  /**
   * Get session history
   */
  async getSessionHistory(sessionId: string, limit?: number): Promise<any[]> {
    if (!this.initialized) {
      console.warn('Session manager not initialized');
      return [];
    }

    try {
      return await invoke('get_session_history', {
        sessionId,
        limit: limit || null,
      });
    } catch (error) {
      console.error('Failed to get session history:', error);
      return [];
    }
  }

  /**
   * Clear session history
   */
  async clearSessionHistory(sessionId: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Session manager not initialized');
    }

    try {
      await invoke('clear_session_shell_history', { sessionId });
    } catch (error) {
      console.error('Failed to clear session history:', error);
      throw error;
    }
  }

  /**
   * Clear all history
   */
  async clearAllHistory(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Session manager not initialized');
    }

    try {
      await invoke('clear_all_shell_history');
    } catch (error) {
      console.error('Failed to clear all history:', error);
      throw error;
    }
  }

  /**
   * Search history
   */
  async searchHistory(query: string): Promise<any[]> {
    if (!this.initialized) {
      console.warn('Session manager not initialized');
      return [];
    }

    try {
      return await invoke('search_shell_history', { query });
    } catch (error) {
      console.error('Failed to search history:', error);
      return [];
    }
  }

  /**
   * Subscribe to session changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance
export const sessionManager = new SessionManagerService();

