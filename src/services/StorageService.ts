import {
  DatabaseConnection,
  DatabaseConnector,
  DatabaseType,
  DataStorageRequest,
  StorageRule,
  StorageMetrics,
  StorageEvents,
  StorageServiceConfig,
  DEFAULT_STORAGE_CONFIG,
  ConnectionStatus
} from '@/types/storage';
import { EventEmitter } from '@/utils/EventEmitter';
import { createDatabaseConnector } from './DatabaseConnectors';

// Event emitter for storage events
class StorageEventEmitter extends EventEmitter<StorageEvents> {
  // Type-safe event emitter for storage events
}

export class StorageService {
  private connections = new Map<string, DatabaseConnection>();
  private connectors = new Map<string, DatabaseConnector>();
  private rules: StorageRule[] = [];
  private config: StorageServiceConfig;
  private eventEmitter = new StorageEventEmitter();
  private initialized = false;
  private metricsInterval?: NodeJS.Timeout;

  constructor(config: Partial<StorageServiceConfig> = {}) {
    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load persisted connections and rules
      await this.loadPersistedData();
      
      // Start metrics collection if enabled
      if (this.config.enableMetrics) {
        this.startMetricsCollection();
      }

      this.initialized = true;
      console.log('Storage service initialized');
    } catch (error) {
      console.error('Failed to initialize storage service:', error);
      throw error;
    }
  }

  // Connection Management
  async addConnection(connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.generateId();
    const now = new Date();
    
    const newConnection: DatabaseConnection = {
      ...connection,
      id,
      status: 'disconnected',
      createdAt: now,
      updatedAt: now
    };

    this.connections.set(id, newConnection);
    await this.persistConnections();
    
    console.log(`Added database connection: ${connection.name} (${id})`);
    return id;
  }

  async updateConnection(id: string, updates: Partial<DatabaseConnection>): Promise<void> {
    const connection = this.connections.get(id);
    if (!connection) {
      throw new Error(`Connection not found: ${id}`);
    }

    const updatedConnection = {
      ...connection,
      ...updates,
      updatedAt: new Date()
    };

    this.connections.set(id, updatedConnection);
    await this.persistConnections();
    
    console.log(`Updated database connection: ${id}`);
  }

  async removeConnection(id: string): Promise<void> {
    const connection = this.connections.get(id);
    if (!connection) {
      throw new Error(`Connection not found: ${id}`);
    }

    // Disconnect if connected
    if (this.connectors.has(id)) {
      await this.disconnect(id);
    }

    this.connections.delete(id);
    await this.persistConnections();
    
    console.log(`Removed database connection: ${id}`);
  }

  getConnection(id: string): DatabaseConnection | undefined {
    return this.connections.get(id);
  }

  getAllConnections(): DatabaseConnection[] {
    return Array.from(this.connections.values());
  }

  // Connection Operations
  async connect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    if (this.connectors.has(connectionId)) {
      console.log(`Already connected: ${connectionId}`);
      return;
    }

    try {
      // Update status to connecting
      await this.updateConnectionStatus(connectionId, 'connecting');

      // Create connector based on database type
      const connector = this.createConnector(connection.type);
      
      // Attempt connection
      await connector.connect(connection);
      
      // Store connector and update status
      this.connectors.set(connectionId, connector);
      await this.updateConnectionStatus(connectionId, 'connected');
      
      // Update last connected time
      await this.updateConnection(connectionId, { lastConnected: new Date() });

      this.eventEmitter.emit('connection:status', {
        connectionId,
        status: 'connected'
      });

      console.log(`Connected to database: ${connectionId}`);
    } catch (error) {
      await this.updateConnectionStatus(connectionId, 'error');
      
      this.eventEmitter.emit('connection:status', {
        connectionId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      console.error(`Failed to connect to database ${connectionId}:`, error);
      throw error;
    }
  }

  async disconnect(connectionId: string): Promise<void> {
    const connector = this.connectors.get(connectionId);
    if (!connector) {
      console.log(`Not connected: ${connectionId}`);
      return;
    }

    try {
      await connector.disconnect();
      this.connectors.delete(connectionId);
      await this.updateConnectionStatus(connectionId, 'disconnected');

      this.eventEmitter.emit('connection:status', {
        connectionId,
        status: 'disconnected'
      });

      console.log(`Disconnected from database: ${connectionId}`);
    } catch (error) {
      console.error(`Failed to disconnect from database ${connectionId}:`, error);
      throw error;
    }
  }

  async testConnection(connectionId: string): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    try {
      const connector = this.createConnector(connection.type);
      await connector.connect(connection);
      const result = await connector.testConnection();
      await connector.disconnect();
      return result;
    } catch (error) {
      console.error(`Connection test failed for ${connectionId}:`, error);
      return false;
    }
  }

  // Data Storage
  async storeData(request: DataStorageRequest): Promise<void> {
    if (!this.config.enableRules) {
      // Store to default connection if rules are disabled
      await this.storeToDefault(request);
      return;
    }

    // Apply storage rules
    const applicableRules = this.getApplicableRules(request);
    
    for (const rule of applicableRules) {
      for (const action of rule.actions) {
        try {
          await this.executeStorageAction(action, request);
        } catch (error) {
          console.error(`Failed to execute storage action for rule ${rule.id}:`, error);
        }
      }
    }
  }

  // Event Management
  on<K extends keyof StorageEvents>(event: K, listener: (data: StorageEvents[K]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off<K extends keyof StorageEvents>(event: K, listener: (data: StorageEvents[K]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  // Metrics
  async getConnectionMetrics(connectionId: string): Promise<StorageMetrics | null> {
    const connector = this.connectors.get(connectionId);
    if (!connector) {
      return null;
    }

    try {
      return await connector.getMetrics();
    } catch (error) {
      console.error(`Failed to get metrics for ${connectionId}:`, error);
      return null;
    }
  }

  // Private Methods
  private createConnector(type: DatabaseType): DatabaseConnector {
    // Create real database connector
    const connectionId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return createDatabaseConnector(type, connectionId);
  }

  private async updateConnectionStatus(connectionId: string, status: ConnectionStatus): Promise<void> {
    await this.updateConnection(connectionId, { status });
  }

  private generateId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadPersistedData(): Promise<void> {
    try {
      // Load connections from localStorage
      const connectionsData = localStorage.getItem('prototool-storage-connections');
      if (connectionsData) {
        const connections: DatabaseConnection[] = JSON.parse(connectionsData);
        connections.forEach(conn => {
          // Reset status to disconnected on load
          conn.status = 'disconnected';
          // Convert date strings back to Date objects
          conn.createdAt = new Date(conn.createdAt);
          conn.updatedAt = new Date(conn.updatedAt);
          if (conn.lastConnected) {
            conn.lastConnected = new Date(conn.lastConnected);
          }
          this.connections.set(conn.id, conn);
        });
        console.log(`Loaded ${connections.length} database connections from storage`);
      }

      // Load rules from localStorage
      const rulesData = localStorage.getItem('prototool-storage-rules');
      if (rulesData) {
        this.rules = JSON.parse(rulesData);
        console.log(`Loaded ${this.rules.length} storage rules from storage`);
      }
    } catch (error) {
      console.error('Failed to load persisted storage data:', error);
    }
  }

  private async persistConnections(): Promise<void> {
    try {
      const connections = Array.from(this.connections.values());
      localStorage.setItem('prototool-storage-connections', JSON.stringify(connections));
      console.log(`Persisted ${connections.length} database connections to storage`);
    } catch (error) {
      console.error('Failed to persist storage connections:', error);
      throw error;
    }
  }

  private async persistRules(): Promise<void> {
    try {
      localStorage.setItem('prototool-storage-rules', JSON.stringify(this.rules));
      console.log(`Persisted ${this.rules.length} storage rules to storage`);
    } catch (error) {
      console.error('Failed to persist storage rules:', error);
      throw error;
    }
  }

  private getApplicableRules(request: DataStorageRequest): StorageRule[] {
    return this.rules
      .filter(rule => rule.enabled)
      .filter(rule => this.evaluateRuleConditions(rule, request))
      .sort((a, b) => a.priority - b.priority);
  }

  private evaluateRuleConditions(rule: StorageRule, request: DataStorageRequest): boolean {
    // Simplified rule evaluation - would be more complex in real implementation
    return rule.conditions.length === 0 || rule.conditions.some(condition => {
      // Basic condition evaluation logic
      return true;
    });
  }

  private async executeStorageAction(action: any, request: DataStorageRequest): Promise<void> {
    const connector = this.connectors.get(action.target);
    if (!connector) {
      throw new Error(`Connector not found: ${action.target}`);
    }

    await connector.store(request);
  }

  private async storeToDefault(request: DataStorageRequest): Promise<void> {
    // Store to first available connection or create default
    const connections = Array.from(this.connectors.values());
    if (connections.length > 0) {
      await connections[0].store(request);
    }
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      for (const [connectionId] of this.connectors) {
        try {
          const metrics = await this.getConnectionMetrics(connectionId);
          if (metrics) {
            this.eventEmitter.emit('metrics:updated', {
              connectionId,
              metrics
            });
          }
        } catch (error) {
          console.error(`Failed to collect metrics for ${connectionId}:`, error);
        }
      }
    }, 30000); // Collect metrics every 30 seconds
  }

  async cleanup(): Promise<void> {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Disconnect all connections
    const disconnectPromises = Array.from(this.connectors.keys()).map(id => 
      this.disconnect(id).catch(error => 
        console.error(`Failed to disconnect ${id} during cleanup:`, error)
      )
    );

    await Promise.all(disconnectPromises);
    
    this.initialized = false;
    console.log('Storage service cleaned up');
  }
}

// Note: DevelopmentDatabaseConnector has been replaced with real database connectors
// See DatabaseConnectors.ts for the actual implementations
class DevelopmentDatabaseConnector implements DatabaseConnector {
  private connected = false;
  private connectionStartTime?: Date;
  private metrics: StorageMetrics;

  constructor(public type: DatabaseType, private connectionId: string) {
    this.metrics = {
      connectionId,
      totalRecords: 0,
      totalSize: 0,
      avgResponseTime: 0,
      errorRate: 0,
      lastActivity: new Date()
    };
  }

  async connect(config: DatabaseConnection): Promise<void> {
    // Validate configuration
    if (!config.host || !config.port) {
      throw new Error('Host and port are required');
    }

    // Simulate realistic connection delay
    const delay = Math.random() * 2000 + 500; // 500-2500ms
    await new Promise(resolve => setTimeout(resolve, delay));

    // Simulate connection failures for invalid configurations
    if (config.host === 'invalid-host' || config.port === 0) {
      throw new Error(`Failed to connect to ${config.host}:${config.port}`);
    }

    // Simulate authentication failures
    if (config.username === 'invalid-user') {
      throw new Error('Authentication failed: Invalid credentials');
    }

    this.connected = true;
    this.connectionStartTime = new Date();
    console.log(`Connected to ${this.type} database: ${config.host}:${config.port}`);
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;

    // Simulate disconnect delay
    await new Promise(resolve => setTimeout(resolve, 200));

    this.connected = false;
    this.connectionStartTime = undefined;
    console.log(`Disconnected from ${this.type} database`);
  }

  async testConnection(): Promise<boolean> {
    if (!this.connected) return false;

    // Simulate test query delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Simulate 90% success rate for connected databases
    const success = Math.random() > 0.1;

    if (!success) {
      console.warn(`Connection test failed for ${this.type} database`);
    }

    return success;
  }

  async store(data: DataStorageRequest): Promise<void> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    const startTime = Date.now();

    // Simulate storage delay
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

    // Simulate occasional storage failures (5% failure rate)
    if (Math.random() < 0.05) {
      throw new Error('Storage operation failed: Constraint violation');
    }

    // Update metrics
    const responseTime = Date.now() - startTime;
    this.updateMetrics(1, JSON.stringify(data).length, responseTime, true);

    console.log(`Stored data to ${this.type} database (${responseTime}ms)`);
  }

  async query(query: string, params?: any[]): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Database not connected');
    }

    const startTime = Date.now();

    // Simulate query delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 300));

    const responseTime = Date.now() - startTime;
    this.updateMetrics(0, 0, responseTime, true);

    // Return mock results based on query type
    if (query.toLowerCase().includes('select')) {
      return [
        {
          id: 1,
          session_id: 'test-session',
          protocol: 'TCP',
          data: { message: 'test' },
          timestamp: new Date().toISOString()
        }
      ];
    }

    return [];
  }

  async getMetrics(): Promise<StorageMetrics> {
    return { ...this.metrics };
  }

  isConnected(): boolean {
    return this.connected;
  }

  private updateMetrics(records: number, size: number, responseTime: number, success: boolean): void {
    this.metrics.totalRecords += records;
    this.metrics.totalSize += size;

    // Update average response time
    if (this.metrics.avgResponseTime === 0) {
      this.metrics.avgResponseTime = responseTime;
    } else {
      this.metrics.avgResponseTime = (this.metrics.avgResponseTime + responseTime) / 2;
    }

    // Update error rate
    if (!success) {
      this.metrics.errorRate = Math.min(1, this.metrics.errorRate + 0.1);
    } else {
      this.metrics.errorRate = Math.max(0, this.metrics.errorRate - 0.01);
    }

    this.metrics.lastActivity = new Date();
  }
}

// Singleton instance
export const storageService = new StorageService();
