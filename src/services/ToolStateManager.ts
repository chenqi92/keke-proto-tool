import { StateManager, ToolState } from '@/types/toolbox';
import { deepClone } from '@/utils';

export class ToolStateManager implements StateManager {
  private states = new Map<string, ToolState>();
  private maxStatesPerTool = 10; // Limit states to prevent memory issues
  private persistenceEnabled = true;

  constructor(persistenceEnabled = true) {
    this.persistenceEnabled = persistenceEnabled;
    if (persistenceEnabled) {
      this.loadPersistedStates();
    }
  }

  saveToolState(toolId: string, sessionId: string | undefined, state: Record<string, any>): void {
    const stateKey = this.getStateKey(toolId, sessionId);
    
    const toolState: ToolState = {
      toolId,
      sessionId,
      state: deepClone(state),
      lastModified: new Date()
    };

    this.states.set(stateKey, toolState);
    
    // Cleanup old states for this tool
    this.cleanupOldStates(toolId);
    
    if (this.persistenceEnabled) {
      this.persistStates();
    }

    console.log(`Tool state saved: ${toolId}${sessionId ? ` (session: ${sessionId})` : ''}`);
  }

  loadToolState(toolId: string, sessionId?: string): Record<string, any> | undefined {
    const stateKey = this.getStateKey(toolId, sessionId);
    const toolState = this.states.get(stateKey);
    
    if (toolState) {
      console.log(`Tool state loaded: ${toolId}${sessionId ? ` (session: ${sessionId})` : ''}`);
      return deepClone(toolState.state);
    }

    return undefined;
  }

  clearToolState(toolId: string, sessionId?: string): void {
    const stateKey = this.getStateKey(toolId, sessionId);
    
    if (this.states.has(stateKey)) {
      this.states.delete(stateKey);
      
      if (this.persistenceEnabled) {
        this.persistStates();
      }
      
      console.log(`Tool state cleared: ${toolId}${sessionId ? ` (session: ${sessionId})` : ''}`);
    }
  }

  getAllStates(sessionId?: string): ToolState[] {
    const states = Array.from(this.states.values());
    
    if (sessionId) {
      return states.filter(state => state.sessionId === sessionId);
    }
    
    return states;
  }

  // Additional utility methods
  getToolStates(toolId: string): ToolState[] {
    return Array.from(this.states.values()).filter(state => state.toolId === toolId);
  }

  getSessionStates(sessionId: string): ToolState[] {
    return Array.from(this.states.values()).filter(state => state.sessionId === sessionId);
  }

  clearAllStates(): void {
    this.states.clear();
    
    if (this.persistenceEnabled) {
      this.persistStates();
    }
    
    console.log('All tool states cleared');
  }

  clearSessionStates(sessionId: string): void {
    const sessionStates = this.getSessionStates(sessionId);

    sessionStates.forEach(state => {
      const stateKey = this.getStateKey(state.toolId, state.sessionId);
      this.states.delete(stateKey);
    });

    if (this.persistenceEnabled) {
      this.persistStates();
    }

    console.log(`Session states cleared: ${sessionId}`);
  }

  // State management utilities
  hasState(toolId: string, sessionId?: string): boolean {
    const stateKey = this.getStateKey(toolId, sessionId);
    return this.states.has(stateKey);
  }

  getStateAge(toolId: string, sessionId?: string): number | undefined {
    const stateKey = this.getStateKey(toolId, sessionId);
    const toolState = this.states.get(stateKey);
    
    if (toolState) {
      return Date.now() - toolState.lastModified.getTime();
    }
    
    return undefined;
  }

  // Cleanup methods
  cleanupOldStates(toolId: string): void {
    const toolStates = this.getToolStates(toolId)
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    
    if (toolStates.length > this.maxStatesPerTool) {
      const statesToRemove = toolStates.slice(this.maxStatesPerTool);
      
      statesToRemove.forEach(state => {
        const stateKey = this.getStateKey(state.toolId, state.sessionId);
        this.states.delete(stateKey);
      });
      
      console.log(`Cleaned up ${statesToRemove.length} old states for tool: ${toolId}`);
    }
  }

  cleanupExpiredStates(maxAge: number = 7 * 24 * 60 * 60 * 1000): void { // 7 days default
    const now = Date.now();
    const expiredStates: string[] = [];
    
    this.states.forEach((state, key) => {
      if (now - state.lastModified.getTime() > maxAge) {
        expiredStates.push(key);
      }
    });
    
    expiredStates.forEach(key => this.states.delete(key));
    
    if (expiredStates.length > 0) {
      if (this.persistenceEnabled) {
        this.persistStates();
      }
      console.log(`Cleaned up ${expiredStates.length} expired tool states`);
    }
  }

  // Private methods
  private getStateKey(toolId: string, sessionId?: string): string {
    return sessionId ? `${toolId}:${sessionId}` : `${toolId}:global`;
  }

  private persistStates(): void {
    if (!this.persistenceEnabled) return;
    
    try {
      const statesData = Array.from(this.states.entries()).map(([key, state]) => ({
        key,
        toolId: state.toolId,
        sessionId: state.sessionId,
        state: state.state,
        lastModified: state.lastModified.toISOString()
      }));
      
      localStorage.setItem('prototool-tool-states', JSON.stringify(statesData));
    } catch (error) {
      console.error('Failed to persist tool states:', error);
    }
  }

  private loadPersistedStates(): void {
    try {
      const data = localStorage.getItem('prototool-tool-states');
      if (data) {
        const statesData = JSON.parse(data);
        
        statesData.forEach((item: any) => {
          const toolState: ToolState = {
            toolId: item.toolId,
            sessionId: item.sessionId,
            state: item.state,
            lastModified: new Date(item.lastModified)
          };
          
          this.states.set(item.key, toolState);
        });
        
        console.log(`Loaded ${statesData.length} persisted tool states`);
      }
    } catch (error) {
      console.error('Failed to load persisted tool states:', error);
    }
  }

  // Statistics and monitoring
  getStats() {
    const states = Array.from(this.states.values());
    const toolCounts = new Map<string, number>();
    const sessionCounts = new Map<string, number>();
    
    states.forEach(state => {
      toolCounts.set(state.toolId, (toolCounts.get(state.toolId) || 0) + 1);
      if (state.sessionId) {
        sessionCounts.set(state.sessionId, (sessionCounts.get(state.sessionId) || 0) + 1);
      }
    });
    
    return {
      totalStates: states.length,
      globalStates: states.filter(s => !s.sessionId).length,
      sessionStates: states.filter(s => s.sessionId).length,
      uniqueTools: toolCounts.size,
      uniqueSessions: sessionCounts.size,
      toolCounts: Object.fromEntries(toolCounts),
      sessionCounts: Object.fromEntries(sessionCounts),
      oldestState: states.reduce((oldest, state) => 
        !oldest || state.lastModified < oldest.lastModified ? state : oldest, 
        null as ToolState | null
      )?.lastModified,
      newestState: states.reduce((newest, state) => 
        !newest || state.lastModified > newest.lastModified ? state : newest, 
        null as ToolState | null
      )?.lastModified
    };
  }

  // Configuration
  setMaxStatesPerTool(max: number): void {
    this.maxStatesPerTool = Math.max(1, max);
  }

  setPersistenceEnabled(enabled: boolean): void {
    this.persistenceEnabled = enabled;
    if (enabled) {
      this.persistStates();
    }
  }
}

// Singleton instance
export const toolStateManager = new ToolStateManager();
