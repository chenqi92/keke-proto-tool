import { statusBarService } from './StatusBarService';

export interface ParseAttempt {
  sessionId: string;
  protocol: string;
  success: boolean;
  timestamp: number;
  error?: string;
  dataSize: number;
}

export interface ProtocolParsingStats {
  sessionId: string;
  protocol: string;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number;
  lastAttempt?: Date;
  lastError?: string;
}

class ProtocolParsingService {
  private static instance: ProtocolParsingService;
  private parseHistory: Map<string, ParseAttempt[]> = new Map();
  private readonly MAX_HISTORY_PER_SESSION = 1000;

  private constructor() {}

  public static getInstance(): ProtocolParsingService {
    if (!ProtocolParsingService.instance) {
      ProtocolParsingService.instance = new ProtocolParsingService();
    }
    return ProtocolParsingService.instance;
  }

  /**
   * Record a parsing attempt
   */
  public recordParseAttempt(
    sessionId: string,
    protocol: string,
    success: boolean,
    dataSize: number,
    error?: string
  ): void {
    const attempt: ParseAttempt = {
      sessionId,
      protocol,
      success,
      timestamp: Date.now(),
      error,
      dataSize,
    };

    // Add to history
    if (!this.parseHistory.has(sessionId)) {
      this.parseHistory.set(sessionId, []);
    }

    const history = this.parseHistory.get(sessionId)!;
    history.push(attempt);

    // Limit history size
    if (history.length > this.MAX_HISTORY_PER_SESSION) {
      history.shift();
    }

    // Update status bar service
    statusBarService.updateParseStats(sessionId, success);

    console.log(`Protocol parsing ${success ? 'success' : 'failure'} for session ${sessionId}:`, {
      protocol,
      dataSize,
      error: error || 'none',
    });
  }

  /**
   * Get parsing statistics for a specific session
   */
  public getSessionStats(sessionId: string): ProtocolParsingStats | null {
    const history = this.parseHistory.get(sessionId);
    if (!history || history.length === 0) {
      return null;
    }

    const totalAttempts = history.length;
    const successfulAttempts = history.filter(attempt => attempt.success).length;
    const failedAttempts = totalAttempts - successfulAttempts;
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;

    const lastAttempt = history[history.length - 1];
    const lastFailedAttempt = history.slice().reverse().find(attempt => !attempt.success);

    return {
      sessionId,
      protocol: lastAttempt.protocol,
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      successRate: Math.round(successRate * 10) / 10,
      lastAttempt: new Date(lastAttempt.timestamp),
      lastError: lastFailedAttempt?.error,
    };
  }

  /**
   * Get overall parsing statistics across all sessions
   */
  public getOverallStats(): {
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    successRate: number;
    sessionCount: number;
  } {
    let totalAttempts = 0;
    let successfulAttempts = 0;

    this.parseHistory.forEach(history => {
      totalAttempts += history.length;
      successfulAttempts += history.filter(attempt => attempt.success).length;
    });

    const failedAttempts = totalAttempts - successfulAttempts;
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 100;

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      successRate: Math.round(successRate * 10) / 10,
      sessionCount: this.parseHistory.size,
    };
  }

  /**
   * Get recent parsing attempts for a session
   */
  public getRecentAttempts(sessionId: string, limit: number = 10): ParseAttempt[] {
    const history = this.parseHistory.get(sessionId);
    if (!history) {
      return [];
    }

    return history.slice(-limit);
  }

  /**
   * Clear parsing history for a session
   */
  public clearSessionHistory(sessionId: string): void {
    this.parseHistory.delete(sessionId);
  }

  /**
   * Clear all parsing history
   */
  public clearAllHistory(): void {
    this.parseHistory.clear();
  }

  /**
   * Get sessions with parsing errors
   */
  public getSessionsWithErrors(): string[] {
    const sessionsWithErrors: string[] = [];

    this.parseHistory.forEach((history, sessionId) => {
      const hasErrors = history.some(attempt => !attempt.success);
      if (hasErrors) {
        sessionsWithErrors.push(sessionId);
      }
    });

    return sessionsWithErrors;
  }

  /**
   * Get parsing statistics by protocol
   */
  public getStatsByProtocol(): Map<string, {
    totalAttempts: number;
    successfulAttempts: number;
    successRate: number;
  }> {
    const protocolStats = new Map<string, {
      totalAttempts: number;
      successfulAttempts: number;
      successRate: number;
    }>();

    this.parseHistory.forEach(history => {
      history.forEach(attempt => {
        if (!protocolStats.has(attempt.protocol)) {
          protocolStats.set(attempt.protocol, {
            totalAttempts: 0,
            successfulAttempts: 0,
            successRate: 0,
          });
        }

        const stats = protocolStats.get(attempt.protocol)!;
        stats.totalAttempts++;
        if (attempt.success) {
          stats.successfulAttempts++;
        }
        stats.successRate = (stats.successfulAttempts / stats.totalAttempts) * 100;
      });
    });

    return protocolStats;
  }

  /**
   * Export parsing data for analysis
   */
  public exportParsingData(): {
    sessions: Record<string, ParseAttempt[]>;
    summary: {
      totalAttempts: number;
      successfulAttempts: number;
      failedAttempts: number;
      successRate: number;
      sessionCount: number;
    };
    protocolStats: Record<string, any>;
  } {
    const sessions: Record<string, ParseAttempt[]> = {};
    this.parseHistory.forEach((history, sessionId) => {
      sessions[sessionId] = [...history];
    });

    const protocolStatsMap = this.getStatsByProtocol();
    const protocolStats: Record<string, any> = {};
    protocolStatsMap.forEach((stats, protocol) => {
      protocolStats[protocol] = stats;
    });

    return {
      sessions,
      summary: this.getOverallStats(),
      protocolStats,
    };
  }
}

export const protocolParsingService = ProtocolParsingService.getInstance();
