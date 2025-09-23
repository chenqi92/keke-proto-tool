// Storage system types for ProtoTool

export type DatabaseType = 'mysql5' | 'mysql8' | 'influxdb' | 'redis' | 'timescaledb' | 'minio';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface DatabaseConnection {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  status: ConnectionStatus;
  lastConnected?: Date;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseConfig {
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  defaultPort: number;
  category: 'relational' | 'timeseries' | 'cache' | 'object';
  requiredFields: string[];
  optionalFields: string[];
  connectionStringTemplate?: string;
}

export interface StorageRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: StorageCondition[];
  actions: StorageAction[];
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StorageCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'gt' | 'lt' | 'gte' | 'lte';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface StorageAction {
  type: 'store' | 'transform' | 'filter' | 'route';
  target: string; // Database connection ID
  table?: string;
  collection?: string;
  bucket?: string;
  transformation?: string;
  config: Record<string, any>;
}

export interface DataStorageRequest {
  sessionId: string;
  protocol: string;
  data: any;
  metadata: {
    timestamp: Date;
    direction: 'inbound' | 'outbound';
    size: number;
    format: string;
  };
}

export interface StorageMetrics {
  connectionId: string;
  totalRecords: number;
  totalSize: number;
  avgResponseTime: number;
  errorRate: number;
  lastActivity: Date;
}

// Database connector interface
export interface DatabaseConnector {
  type: DatabaseType;
  connect(config: DatabaseConnection): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<boolean>;
  store(data: DataStorageRequest): Promise<void>;
  query(query: string, params?: any[]): Promise<any[]>;
  getMetrics(): Promise<StorageMetrics>;
  isConnected(): boolean;
}

// Storage service events
export interface StorageEvents {
  'connection:status': {
    connectionId: string;
    status: ConnectionStatus;
    error?: string;
  };
  'data:stored': {
    connectionId: string;
    recordCount: number;
    size: number;
  };
  'metrics:updated': {
    connectionId: string;
    metrics: StorageMetrics;
  };
}

// Configuration for different database types
export const DATABASE_CONFIGS: Record<DatabaseType, DatabaseConfig> = {
  mysql5: {
    name: 'MySQL 5.x',
    icon: 'Database',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    defaultPort: 3306,
    category: 'relational',
    requiredFields: ['host', 'port', 'database', 'username'],
    optionalFields: ['password', 'ssl', 'charset', 'timezone'],
    connectionStringTemplate: 'mysql://{username}:{password}@{host}:{port}/{database}'
  },
  mysql8: {
    name: 'MySQL 8.x',
    icon: 'Database',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    defaultPort: 3306,
    category: 'relational',
    requiredFields: ['host', 'port', 'database', 'username'],
    optionalFields: ['password', 'ssl', 'charset', 'timezone', 'authPlugin'],
    connectionStringTemplate: 'mysql://{username}:{password}@{host}:{port}/{database}'
  },
  influxdb: {
    name: 'InfluxDB v1',
    icon: 'Activity',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    defaultPort: 8086,
    category: 'timeseries',
    requiredFields: ['host', 'port', 'database'],
    optionalFields: ['username', 'password', 'ssl', 'precision', 'retentionPolicy'],
    connectionStringTemplate: 'http://{host}:{port}'
  },
  redis: {
    name: 'Redis',
    icon: 'Server',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    defaultPort: 6379,
    category: 'cache',
    requiredFields: ['host', 'port'],
    optionalFields: ['username', 'password', 'database', 'ssl', 'keyPrefix', 'ttl'],
    connectionStringTemplate: 'redis://{username}:{password}@{host}:{port}/{database}'
  },
  timescaledb: {
    name: 'TimescaleDB',
    icon: 'HardDrive',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    defaultPort: 5432,
    category: 'timeseries',
    requiredFields: ['host', 'port', 'database', 'username'],
    optionalFields: ['password', 'ssl', 'schema', 'applicationName'],
    connectionStringTemplate: 'postgresql://{username}:{password}@{host}:{port}/{database}'
  },
  minio: {
    name: 'MinIO',
    icon: 'Cloud',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    defaultPort: 9000,
    category: 'object',
    requiredFields: ['host', 'port', 'accessKey', 'secretKey'],
    optionalFields: ['ssl', 'region', 'bucket'],
    connectionStringTemplate: 'http://{host}:{port}'
  }
};

// Default storage rules
export const DEFAULT_STORAGE_RULES: Omit<StorageRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Store All Protocol Data',
    description: '将所有协议数据存储到默认数据库',
    enabled: true,
    priority: 1,
    conditions: [],
    actions: [{
      type: 'store',
      target: 'default',
      table: 'protocol_data',
      config: {}
    }]
  },
  {
    name: 'Store Error Messages',
    description: '将错误消息存储到专用表',
    enabled: true,
    priority: 2,
    conditions: [{
      field: 'status',
      operator: 'equals',
      value: 'error'
    }],
    actions: [{
      type: 'store',
      target: 'default',
      table: 'error_logs',
      config: {}
    }]
  },
  {
    name: 'Store Time Series Metrics',
    description: '将时间序列数据存储到InfluxDB',
    enabled: false,
    priority: 3,
    conditions: [{
      field: 'protocol',
      operator: 'equals',
      value: 'MQTT'
    }],
    actions: [{
      type: 'store',
      target: 'influxdb',
      collection: 'mqtt_metrics',
      config: {
        measurement: 'protocol_metrics',
        tags: ['protocol', 'session_id'],
        fields: ['value', 'timestamp']
      }
    }]
  }
];

// Storage service configuration
export interface StorageServiceConfig {
  maxConnections: number;
  connectionTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  batchSize: number;
  flushInterval: number;
  enableMetrics: boolean;
  enableRules: boolean;
}

export const DEFAULT_STORAGE_CONFIG: StorageServiceConfig = {
  maxConnections: 10,
  connectionTimeout: 5000,
  retryAttempts: 3,
  retryDelay: 1000,
  batchSize: 100,
  flushInterval: 5000,
  enableMetrics: true,
  enableRules: true
};
