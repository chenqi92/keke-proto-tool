import { useAppStore } from '@/stores/AppStore';
import { SessionState, ConnectionStatus } from '@/types';

export interface StatusBarData {
  connections: {
    active: number;
    total: number;
  };
  performance: {
    throughput: {
      rx: number; // bytes per second
      tx: number; // bytes per second
    };
  };
  parsing: {
    success: number;
    error: number;
    rate: number; // percentage
  };
}

export interface NetworkThroughputData {
  sessionId: string;
  bytesReceived: number;
  bytesSent: number;
  timestamp: number;
}

export interface ParseStatistics {
  sessionId: string;
  successCount: number;
  errorCount: number;
  timestamp: number;
}

class StatusBarService {
  private static instance: StatusBarService;
  private listeners: Set<(data: StatusBarData) => void> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;
  private throughputHistory: Map<string, NetworkThroughputData[]> = new Map();
  private parseStats: Map<string, ParseStatistics> = new Map();
  private readonly HISTORY_WINDOW = 10; // Keep last 10 data points for throughput calculation
  private readonly UPDATE_INTERVAL = 1000; // Update every second

  private constructor() {
    this.startMonitoring();
  }

  public static getInstance(): StatusBarService {
    if (!StatusBarService.instance) {
      StatusBarService.instance = new StatusBarService();
    }
    return StatusBarService.instance;
  }

  /**
   * Add a listener for status bar data updates
   */
  public addListener(listener: (data: StatusBarData) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove a listener
   */
  public removeListener(listener: (data: StatusBarData) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Start monitoring and updating status bar data
   */
  private startMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      const data = this.calculateStatusBarData();
      this.notifyListeners(data);
    }, this.UPDATE_INTERVAL);
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Update network throughput data for a session
   */
  public updateThroughputData(sessionId: string, bytesReceived: number, bytesSent: number): void {
    const timestamp = Date.now();
    const data: NetworkThroughputData = {
      sessionId,
      bytesReceived,
      bytesSent,
      timestamp,
    };

    if (!this.throughputHistory.has(sessionId)) {
      this.throughputHistory.set(sessionId, []);
    }

    const history = this.throughputHistory.get(sessionId)!;

    // Only add data if it's different from the last entry or enough time has passed
    const lastEntry = history[history.length - 1];
    const shouldUpdate = !lastEntry ||
      (timestamp - lastEntry.timestamp >= 500) || // At least 500ms between updates
      (bytesReceived !== lastEntry.bytesReceived) ||
      (bytesSent !== lastEntry.bytesSent);

    if (shouldUpdate) {
      history.push(data);

      // Keep only recent history
      if (history.length > this.HISTORY_WINDOW) {
        history.shift();
      }
    }
  }

  /**
   * Update parsing statistics for a session
   */
  public updateParseStats(sessionId: string, success: boolean): void {
    if (!this.parseStats.has(sessionId)) {
      this.parseStats.set(sessionId, {
        sessionId,
        successCount: 0,
        errorCount: 0,
        timestamp: Date.now(),
      });
    }

    const stats = this.parseStats.get(sessionId)!;
    if (success) {
      stats.successCount++;
    } else {
      stats.errorCount++;
    }
    stats.timestamp = Date.now();
  }

  /**
   * Calculate current status bar data
   */
  private calculateStatusBarData(): StatusBarData {
    const store = useAppStore.getState();
    const sessions = Object.values(store.sessions);

    // Calculate connection statistics
    const connections = this.calculateConnectionStats(sessions);

    // Calculate throughput
    const throughput = this.calculateThroughput();

    // Calculate parsing statistics
    const parsing = this.calculateParsingStats();

    return {
      connections,
      performance: {
        throughput,
      },
      parsing,
    };
  }

  /**
   * Calculate connection statistics
   */
  private calculateConnectionStats(sessions: SessionState[]): { active: number; total: number } {
    let active = 0;
    let total = sessions.length;

    sessions.forEach(session => {
      if (session.status === 'connected') {
        active++;
      }
      
      // For server sessions, count client connections
      if (session.config.connectionType === 'server' && session.clientConnections) {
        const clientCount = Object.keys(session.clientConnections).length;
        total += clientCount;
        
        // Count active client connections
        Object.values(session.clientConnections).forEach(client => {
          if (client.isActive) {
            active++;
          }
        });
      }
    });

    return { active, total };
  }

  /**
   * Calculate network throughput (bytes per second)
   */
  private calculateThroughput(): { rx: number; tx: number } {
    let totalRx = 0;
    let totalTx = 0;
    const now = Date.now();

    this.throughputHistory.forEach((history, sessionId) => {
      if (history.length >= 2) {
        const latest = history[history.length - 1];
        const previous = history[history.length - 2];

        // Check if the latest data is recent (within last 5 seconds)
        const timeSinceLastUpdate = (now - latest.timestamp) / 1000;
        if (timeSinceLastUpdate > 5) {
          // If no recent activity, gradually reduce the displayed speed
          return;
        }

        const timeDiff = (latest.timestamp - previous.timestamp) / 1000; // seconds
        if (timeDiff > 0) {
          const rxRate = (latest.bytesReceived - previous.bytesReceived) / timeDiff;
          const txRate = (latest.bytesSent - previous.bytesSent) / timeDiff;

          // Apply decay factor based on how old the data is
          const decayFactor = Math.max(0, 1 - (timeSinceLastUpdate / 5));

          totalRx += Math.max(0, rxRate * decayFactor);
          totalTx += Math.max(0, txRate * decayFactor);
        }
      }
    });

    return {
      rx: Math.round(totalRx),
      tx: Math.round(totalTx),
    };
  }

  /**
   * Calculate parsing statistics
   */
  private calculateParsingStats(): { success: number; error: number; rate: number } {
    let totalSuccess = 0;
    let totalError = 0;

    this.parseStats.forEach(stats => {
      totalSuccess += stats.successCount;
      totalError += stats.errorCount;
    });

    const total = totalSuccess + totalError;
    const rate = total > 0 ? (totalSuccess / total) * 100 : 100;

    return {
      success: totalSuccess,
      error: totalError,
      rate: Math.round(rate * 10) / 10, // Round to 1 decimal place
    };
  }

  /**
   * Notify all listeners with updated data
   */
  private notifyListeners(data: StatusBarData): void {
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in status bar listener:', error);
      }
    });
  }

  /**
   * Get current status bar data synchronously
   */
  public getCurrentData(): StatusBarData {
    return this.calculateStatusBarData();
  }

  /**
   * Force an immediate update of status bar data
   */
  public forceUpdate(): void {
    const data = this.calculateStatusBarData();
    this.notifyListeners(data);
  }

  /**
   * Clear all data (useful for testing or reset)
   */
  public clearData(): void {
    this.throughputHistory.clear();
    this.parseStats.clear();
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopMonitoring();
    this.listeners.clear();
    this.clearData();
  }
}

export const statusBarService = StatusBarService.getInstance();
