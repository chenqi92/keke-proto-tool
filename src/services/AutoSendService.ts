import { SessionConfig, ConnectionStatus } from '@/types';

export interface AutoSendOptions {
  sessionId: string;
  config: SessionConfig;
  onSendMessage: (data: string, format: string) => Promise<boolean>;
  onError: (error: string) => void;
  onStatisticsUpdate: (stats: AutoSendStatistics) => void;
}

export interface AutoSendStatistics {
  totalSent: number;
  totalErrors: number;
  isActive: boolean;
  lastSentTime?: Date;
  lastError?: string;
}

export class AutoSendService {
  private sessionId: string;
  private config: SessionConfig;
  private onSendMessage: (data: string, format: string) => Promise<boolean>;
  private onError: (error: string) => void;
  private onStatisticsUpdate: (stats: AutoSendStatistics) => void;
  
  private sendTimer: NodeJS.Timeout | null = null;
  private isActive = false;
  private statistics: AutoSendStatistics = {
    totalSent: 0,
    totalErrors: 0,
    isActive: false
  };

  constructor(options: AutoSendOptions) {
    this.sessionId = options.sessionId;
    this.config = options.config;
    this.onSendMessage = options.onSendMessage;
    this.onError = options.onError;
    this.onStatisticsUpdate = options.onStatisticsUpdate;
  }

  /**
   * Start automatic sending
   */
  start(): void {
    if (this.isActive) {
      console.log(`AutoSendService: Already active for session ${this.sessionId}`);
      return;
    }

    if (!this.config.autoSendEnabled || this.config.connectionType !== 'client') {
      console.log(`AutoSendService: Auto send not enabled or not a client session ${this.sessionId}`);
      return;
    }

    if (!this.config.autoSendData || this.config.autoSendData.trim() === '') {
      this.onError('Auto send data is empty');
      return;
    }

    const interval = this.config.autoSendInterval || 1000;
    if (interval < 100 || interval > 3600000) {
      this.onError('Auto send interval must be between 100ms and 1 hour');
      return;
    }

    this.isActive = true;
    this.statistics.isActive = true;
    this.updateStatistics();
    
    console.log(`AutoSendService: Starting auto send for session ${this.sessionId} with interval ${interval}ms`);
    this.scheduleNextSend();
  }

  /**
   * Stop automatic sending
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    this.statistics.isActive = false;
    
    if (this.sendTimer) {
      clearTimeout(this.sendTimer);
      this.sendTimer = null;
    }
    
    this.updateStatistics();
    console.log(`AutoSendService: Stopped auto send for session ${this.sessionId}`);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: SessionConfig): void {
    const wasActive = this.isActive;
    
    if (wasActive) {
      this.stop();
    }
    
    this.config = { ...this.config, ...newConfig };
    
    if (wasActive && newConfig.autoSendEnabled) {
      this.start();
    }
  }

  /**
   * Get current statistics
   */
  getStatistics(): AutoSendStatistics {
    return { ...this.statistics };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = {
      totalSent: 0,
      totalErrors: 0,
      isActive: this.isActive,
      lastSentTime: undefined,
      lastError: undefined
    };
    this.updateStatistics();
  }

  /**
   * Check if currently active
   */
  isCurrentlyActive(): boolean {
    return this.isActive;
  }

  private scheduleNextSend(): void {
    if (!this.isActive) {
      return;
    }

    const interval = this.config.autoSendInterval || 1000;
    
    this.sendTimer = setTimeout(async () => {
      if (!this.isActive) {
        return;
      }

      try {
        await this.sendData();
        this.scheduleNextSend(); // Schedule next send after successful send
      } catch (error) {
        this.handleSendError(error);
        this.scheduleNextSend(); // Continue sending even after errors
      }
    }, interval);
  }

  private async sendData(): Promise<void> {
    const data = this.config.autoSendData || '';
    const format = this.config.autoSendFormat || 'text';
    
    if (!data.trim()) {
      throw new Error('Auto send data is empty');
    }

    // Process data based on format
    const processedData = this.processDataByFormat(data, format);
    
    const success = await this.onSendMessage(processedData, format);
    
    if (success) {
      this.statistics.totalSent++;
      this.statistics.lastSentTime = new Date();
      this.statistics.lastError = undefined;
    } else {
      throw new Error('Failed to send message');
    }
    
    this.updateStatistics();
  }

  private processDataByFormat(data: string, format: string): string {
    switch (format) {
      case 'text':
        return data;
      
      case 'hex':
        // Validate hex format
        if (!/^[0-9a-fA-F\s]*$/.test(data.replace(/[^0-9a-fA-F\s]/g, ''))) {
          throw new Error('Invalid hex format');
        }
        return data.replace(/\s/g, '').toUpperCase();
      
      case 'binary':
        // Validate binary format
        if (!/^[01\s]*$/.test(data)) {
          throw new Error('Invalid binary format');
        }
        return data.replace(/\s/g, '');
      
      case 'json':
        try {
          // Validate JSON format
          JSON.parse(data);
          return data;
        } catch {
          throw new Error('Invalid JSON format');
        }
      
      default:
        return data;
    }
  }

  private handleSendError(error: unknown): void {
    this.statistics.totalErrors++;
    this.statistics.lastError = error instanceof Error ? error.message : 'Unknown error';
    this.updateStatistics();
    
    console.error(`AutoSendService: Send error for session ${this.sessionId}:`, error);
    this.onError(this.statistics.lastError);
  }

  private updateStatistics(): void {
    this.onStatisticsUpdate({ ...this.statistics });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();
  }
}

// Singleton service to manage all auto send services
class AutoSendRegistry {
  private services = new Map<string, AutoSendService>();

  createService(options: AutoSendOptions): AutoSendService {
    // Clean up existing service if it exists
    this.destroyService(options.sessionId);
    
    const service = new AutoSendService(options);
    this.services.set(options.sessionId, service);
    return service;
  }

  getService(sessionId: string): AutoSendService | undefined {
    return this.services.get(sessionId);
  }

  destroyService(sessionId: string): void {
    const service = this.services.get(sessionId);
    if (service) {
      service.destroy();
      this.services.delete(sessionId);
    }
  }

  destroyAll(): void {
    for (const [sessionId] of this.services) {
      this.destroyService(sessionId);
    }
  }
}

export const autoSendRegistry = new AutoSendRegistry();
