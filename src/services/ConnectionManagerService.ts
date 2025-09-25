import { SessionConfig, SessionState, ConnectionStatus } from '@/types';
import { backendLogService } from './BackendLogService';

export interface ConnectionManagerOptions {
  sessionId: string;
  config: SessionConfig;
  onStatusChange: (status: ConnectionStatus) => void;
  onError: (error: string) => void;
  onRetryAttempt: (attempt: number, maxAttempts: number) => void;
}

export class ConnectionManagerService {
  private sessionId: string;
  private config: SessionConfig;
  private onStatusChange: (status: ConnectionStatus) => void;
  private onError: (error: string) => void;
  private onRetryAttempt: (attempt: number, maxAttempts: number) => void;
  
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private currentRetryAttempt = 0;
  private isReconnecting = false;
  private shouldStop = false;

  constructor(options: ConnectionManagerOptions) {
    this.sessionId = options.sessionId;
    this.config = options.config;
    this.onStatusChange = options.onStatusChange;
    this.onError = options.onError;
    this.onRetryAttempt = options.onRetryAttempt;
  }

  /**
   * Start connection with timeout and retry logic
   */
  async connect(): Promise<void> {
    if (this.isReconnecting) {
      console.log(`ConnectionManager: Already connecting for session ${this.sessionId}`);
      return;
    }

    this.shouldStop = false;
    this.currentRetryAttempt = 0;

    // Log connection attempt
    await backendLogService.addLog(
      'info',
      'ConnectionManager',
      `Starting connection for ${this.config.protocol} ${this.config.connectionType}`,
      this.sessionId,
      this.config.name,
      {
        category: 'network',
        protocol: this.config.protocol,
        connectionType: this.config.connectionType,
        details: {
          host: this.config.host,
          port: this.config.port,
          autoReconnect: this.config.autoReconnect
        }
      }
    ).catch(err => console.error('Failed to log connection attempt:', err));

    try {
      await this.attemptConnection();
    } catch (error) {
      // Log connection failure
      await backendLogService.addLog(
        'error',
        'ConnectionManager',
        `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.sessionId,
        this.config.name,
        {
          category: 'network',
          protocol: this.config.protocol,
          connectionType: this.config.connectionType,
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        }
      ).catch(err => console.error('Failed to log connection failure:', err));

      if (this.config.autoReconnect && this.config.connectionType === 'client') {
        await this.startReconnectProcess();
      } else {
        this.onError(error instanceof Error ? error.message : 'Connection failed');
      }
    }
  }

  /**
   * Disconnect and stop all reconnection attempts
   */
  disconnect(): void {
    this.shouldStop = true;
    this.isReconnecting = false;
    this.currentRetryAttempt = 0;
    
    this.clearTimers();
    this.onStatusChange('disconnected');
  }

  /**
   * Update configuration (useful for runtime changes)
   */
  updateConfig(newConfig: SessionConfig): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current retry attempt
   */
  getCurrentRetryAttempt(): number {
    return this.currentRetryAttempt;
  }

  /**
   * Check if currently reconnecting
   */
  isCurrentlyReconnecting(): boolean {
    return this.isReconnecting;
  }

  private async attemptConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.onStatusChange('connecting');
      
      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        this.clearTimers();
        reject(new Error(`Connection timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      // Simulate connection attempt (in real implementation, this would call the actual network service)
      // For now, we'll simulate success/failure based on some logic
      setTimeout(() => {
        this.clearTimers();
        
        if (this.shouldStop) {
          reject(new Error('Connection cancelled'));
          return;
        }

        // Simulate connection success (in real implementation, this would be based on actual connection result)
        const success = Math.random() > 0.3; // 70% success rate for testing
        
        if (success) {
          this.onStatusChange('connected');
          this.currentRetryAttempt = 0;
          this.isReconnecting = false;

          // Log successful connection
          backendLogService.addLog(
            'info',
            'ConnectionManager',
            `Successfully connected to ${this.config.host}:${this.config.port}`,
            this.sessionId,
            this.config.name,
            {
              category: 'network',
              protocol: this.config.protocol,
              connectionType: this.config.connectionType,
              details: {
                host: this.config.host,
                port: this.config.port,
                connectionTime: Date.now()
              }
            }
          ).catch(err => console.error('Failed to log successful connection:', err));

          resolve();
        } else {
          reject(new Error('Connection failed'));
        }
      }, Math.random() * 2000 + 1000); // Simulate 1-3 second connection time
    });
  }

  private async startReconnectProcess(): Promise<void> {
    if (this.shouldStop || !this.config.autoReconnect) {
      return;
    }

    this.isReconnecting = true;
    this.currentRetryAttempt = 0;

    const maxAttempts = this.config.retryAttempts || 3;
    
    while (this.currentRetryAttempt < maxAttempts && !this.shouldStop) {
      this.currentRetryAttempt++;
      this.onRetryAttempt(this.currentRetryAttempt, maxAttempts);
      
      // Calculate delay with exponential backoff
      const baseDelay = this.config.retryDelay || 1000;
      const maxDelay = this.config.maxRetryDelay || 30000;
      const delay = Math.min(baseDelay * Math.pow(2, this.currentRetryAttempt - 1), maxDelay);
      
      console.log(`ConnectionManager: Retry attempt ${this.currentRetryAttempt}/${maxAttempts} for session ${this.sessionId} in ${delay}ms`);
      
      // Wait for delay
      await this.sleep(delay);
      
      if (this.shouldStop) {
        break;
      }

      try {
        await this.attemptConnection();
        // If we get here, connection was successful
        return;
      } catch (error) {
        console.log(`ConnectionManager: Retry ${this.currentRetryAttempt} failed for session ${this.sessionId}:`, error);
        
        if (this.currentRetryAttempt >= maxAttempts) {
          this.isReconnecting = false;
          this.onError(`Connection failed after ${maxAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }
      }
    }
    
    this.isReconnecting = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.reconnectTimer = setTimeout(resolve, ms);
    });
  }

  private clearTimers(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.disconnect();
    this.clearTimers();
  }
}

// Singleton service to manage all connection managers
class ConnectionManagerRegistry {
  private managers = new Map<string, ConnectionManagerService>();

  createManager(options: ConnectionManagerOptions): ConnectionManagerService {
    // Clean up existing manager if it exists
    this.destroyManager(options.sessionId);
    
    const manager = new ConnectionManagerService(options);
    this.managers.set(options.sessionId, manager);
    return manager;
  }

  getManager(sessionId: string): ConnectionManagerService | undefined {
    return this.managers.get(sessionId);
  }

  destroyManager(sessionId: string): void {
    const manager = this.managers.get(sessionId);
    if (manager) {
      manager.destroy();
      this.managers.delete(sessionId);
    }
  }

  destroyAll(): void {
    for (const [sessionId] of this.managers) {
      this.destroyManager(sessionId);
    }
  }
}

export const connectionManagerRegistry = new ConnectionManagerRegistry();
