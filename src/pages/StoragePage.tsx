import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import {
  Database,
  Plus,
  Settings,
  TestTube,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Server,
  HardDrive,
  Cloud,
  Activity,
  Grid,
  List
} from 'lucide-react';
import { DatabaseConnectionModal } from '@/components/Storage/DatabaseConnectionModal';
import { DatabaseConnectionCard } from '@/components/Storage/DatabaseConnectionCard';
import { StorageSettings } from '@/components/Storage/StorageSettings';
import { StorageMonitoring } from '@/components/Storage/StorageMonitoring';
import { ErrorBoundary } from '@/components/Common/ErrorBoundary';
import { useToast } from '@/components/Common/Toast';
import { storageService } from '@/services/StorageService';

// Database types supported
export type DatabaseType = 'mysql5' | 'mysql8' | 'influxdb' | 'redis' | 'timescaledb' | 'minio';

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
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastConnected?: Date;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

type StorageTab = 'connections' | 'settings' | 'monitoring';

const databaseTypeConfig = {
  mysql5: {
    name: 'MySQL 5.x',
    icon: Database,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    defaultPort: 3306,
    category: 'relational'
  },
  mysql8: {
    name: 'MySQL 8.x',
    icon: Database,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    defaultPort: 3306,
    category: 'relational'
  },
  influxdb: {
    name: 'InfluxDB v1',
    icon: Activity,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    defaultPort: 8086,
    category: 'timeseries'
  },
  redis: {
    name: 'Redis',
    icon: Server,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    defaultPort: 6379,
    category: 'cache'
  },
  timescaledb: {
    name: 'TimescaleDB',
    icon: HardDrive,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    defaultPort: 5432,
    category: 'timeseries'
  },
  minio: {
    name: 'MinIO',
    icon: Cloud,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    defaultPort: 9000,
    category: 'object'
  }
};

export const StoragePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StorageTab>('connections');
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [isAddingConnection, setIsAddingConnection] = useState(false);
  const [editingConnection, setEditingConnection] = useState<string | null>(null);
  const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());
  const [connectingConnections, setConnectingConnections] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toast = useToast();

  // Initialize storage service and load connections
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await storageService.initialize();
        await loadConnections();

        toast.success('存储服务已初始化', '数据库连接管理已准备就绪');
      } catch (error) {
        console.error('Failed to initialize storage service:', error);
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        setError(`初始化存储服务失败: ${errorMessage}`);
        toast.error('初始化失败', errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initializeStorage();

    // Listen for storage events
    const handleConnectionStatus = (data: any) => {
      setConnections(prev => prev.map(conn =>
        conn.id === data.connectionId
          ? { ...conn, status: data.status }
          : conn
      ));

      // Show toast notifications for connection status changes
      const connection = connections.find(c => c.id === data.connectionId);
      if (connection) {
        if (data.status === 'connected') {
          toast.success('连接成功', `已连接到 ${connection.name}`);
        } else if (data.status === 'error') {
          toast.error('连接失败', data.error || `无法连接到 ${connection.name}`);
        }
      }
    };

    storageService.on('connection:status', handleConnectionStatus);

    return () => {
      storageService.off('connection:status', handleConnectionStatus);
    };
  }, []);

  const loadConnections = async () => {
    try {
      // Load connections from the storage service
      const loadedConnections = storageService.getAllConnections();
      setConnections(loadedConnections);
      console.log(`Loaded ${loadedConnections.length} database connections`);
    } catch (error) {
      console.error('Failed to load connections:', error);
      const errorMessage = error instanceof Error ? error.message : '加载连接失败';
      toast.error('加载失败', errorMessage);
      setConnections([]);
      throw error; // Re-throw to be caught by the calling function
    }
  };

  const handleTestConnection = async (connectionId: string) => {
    setTestingConnections(prev => new Set(prev).add(connectionId));

    try {
      // Test connection using the storage service
      const result = await storageService.testConnection(connectionId);

      setConnections(prev => prev.map(conn =>
        conn.id === connectionId
          ? { ...conn, status: result ? 'connected' : 'error' as const }
          : conn
      ));

      // Show user feedback
      const connection = connections.find(c => c.id === connectionId);
      if (result) {
        console.log(`Connection test successful for ${connectionId}`);
        toast.success('测试成功', `连接到 ${connection?.name || connectionId} 测试成功`);
      } else {
        console.warn(`Connection test failed for ${connectionId}`);
        toast.warning('测试失败', `连接到 ${connection?.name || connectionId} 测试失败`);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : '测试连接时发生未知错误';
      const connection = connections.find(c => c.id === connectionId);

      setConnections(prev => prev.map(conn =>
        conn.id === connectionId
          ? { ...conn, status: 'error' as const }
          : conn
      ));

      toast.error('测试失败', `${connection?.name || connectionId}: ${errorMessage}`);
    } finally {
      setTestingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  const handleConnect = async (connectionId: string) => {
    setConnectingConnections(prev => new Set(prev).add(connectionId));

    try {
      // Connect using the storage service
      await storageService.connect(connectionId);

      // Update local state - the service will emit events, but we update immediately for UI responsiveness
      setConnections(prev => prev.map(conn =>
        conn.id === connectionId
          ? {
              ...conn,
              status: 'connected' as const,
              lastConnected: new Date()
            }
          : conn
      ));

      const connection = connections.find(c => c.id === connectionId);
      console.log(`Successfully connected to database: ${connectionId}`);
      toast.success('连接成功', `已成功连接到 ${connection?.name || connectionId}`);
    } catch (error) {
      console.error('Connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : '连接时发生未知错误';
      const connection = connections.find(c => c.id === connectionId);

      // Update status to error
      setConnections(prev => prev.map(conn =>
        conn.id === connectionId
          ? { ...conn, status: 'error' as const }
          : conn
      ));

      toast.error('连接失败', `${connection?.name || connectionId}: ${errorMessage}`);
    } finally {
      setConnectingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(connectionId);
        return newSet;
      });
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      // Disconnect using the storage service
      await storageService.disconnect(connectionId);

      // Update local state
      setConnections(prev => prev.map(conn =>
        conn.id === connectionId
          ? { ...conn, status: 'disconnected' as const }
          : conn
      ));

      const connection = connections.find(c => c.id === connectionId);
      console.log(`Successfully disconnected from database: ${connectionId}`);
      toast.info('已断开连接', `已断开与 ${connection?.name || connectionId} 的连接`);
    } catch (error) {
      console.error('Disconnect failed:', error);
      const errorMessage = error instanceof Error ? error.message : '断开连接时发生未知错误';
      const connection = connections.find(c => c.id === connectionId);
      toast.error('断开连接失败', `${connection?.name || connectionId}: ${errorMessage}`);
    }
  };

  const handleSaveConnection = async (connectionData: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingConnection) {
        // Update existing connection
        const existingConnection = connections.find(c => c.id === editingConnection);
        if (existingConnection) {
          const updatedConnection: DatabaseConnection = {
            ...connectionData,
            id: existingConnection.id,
            createdAt: existingConnection.createdAt,
            updatedAt: new Date()
          };

          await storageService.updateConnection(editingConnection, updatedConnection);

          setConnections(prev => prev.map(conn =>
            conn.id === editingConnection ? updatedConnection : conn
          ));

          console.log(`Updated connection: ${updatedConnection.name}`);
        }
        setEditingConnection(null);
      } else {
        // Add new connection
        const connectionId = await storageService.addConnection(connectionData);

        const newConnection: DatabaseConnection = {
          ...connectionData,
          id: connectionId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        setConnections(prev => [...prev, newConnection]);
        console.log(`Added new connection: ${newConnection.name}`);
        toast.success('连接已添加', `成功添加数据库连接: ${newConnection.name}`);
      }
      setIsAddingConnection(false);
    } catch (error) {
      console.error('Failed to save connection:', error);
      const errorMessage = error instanceof Error ? error.message : '保存连接时发生未知错误';
      toast.error('保存失败', errorMessage);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId);
    if (!connection) return;

    if (window.confirm(`确定要删除连接 "${connection.name}" 吗？此操作无法撤销。`)) {
      try {
        // Disconnect first if connected
        if (connection.status === 'connected') {
          await handleDisconnect(connectionId);
        }

        // Remove from storage service
        await storageService.removeConnection(connectionId);

        // Update local state
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));

        if (selectedConnection === connectionId) {
          setSelectedConnection(null);
        }

        console.log(`Deleted connection: ${connection.name}`);
        toast.success('连接已删除', `已删除数据库连接: ${connection.name}`);
      } catch (error) {
        console.error('Failed to delete connection:', error);
        const errorMessage = error instanceof Error ? error.message : '删除连接时发生未知错误';
        toast.error('删除失败', `${connection.name}: ${errorMessage}`);
      }
    }
  };

  const getStatusIcon = (status: DatabaseConnection['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'connecting':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const renderConnectionsTab = () => {

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">数据库连接</h3>
            <div className="flex items-center space-x-2">
              <div className="flex items-center border border-border rounded-md">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-1.5 rounded-l-md transition-colors",
                    viewMode === 'grid' ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  )}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-1.5 rounded-r-md transition-colors",
                    viewMode === 'list' ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setIsAddingConnection(true)}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>添加连接</span>
              </button>
            </div>
          </div>
        </div>

        {/* Connection List */}
        <div className="flex-1 overflow-auto">
          {connections.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">暂无数据库连接</h3>
              <p className="text-sm mb-4">添加您的第一个数据库连接开始使用</p>
              <button
                onClick={() => setIsAddingConnection(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>添加连接</span>
              </button>
            </div>
          ) : (
            <div className={cn(
              "p-4",
              viewMode === 'grid' ? "grid grid-cols-1 xl:grid-cols-2 gap-4" : "space-y-3"
            )}>
              {connections.map((connection) => (
                <DatabaseConnectionCard
                  key={connection.id}
                  connection={connection}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  onTest={handleTestConnection}
                  onEdit={(id) => setEditingConnection(id)}
                  onDelete={handleDeleteConnection}
                  onViewMetrics={(id) => console.log('View metrics for:', id)}
                  isConnecting={connectingConnections.has(connection.id)}
                  isTesting={testingConnections.has(connection.id)}
                  viewMode={viewMode}
                  className={viewMode === 'list' ? 'w-full' : ''}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };



  const renderTabContent = () => {
    switch (activeTab) {
      case 'connections':
        return renderConnectionsTab();
      case 'settings':
        return <StorageSettings />;
      case 'monitoring':
        return <StorageMonitoring />;
      default:
        return null;
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
          <h3 className="text-lg font-semibold mb-2">正在初始化存储服务</h3>
          <p className="text-muted-foreground">请稍候...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">初始化失败</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col">
        {/* Toast Container */}
        <toast.ToastContainer />

        {/* Header */}
        <div className="border-b border-border p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-semibold">储存方式</h1>
            </div>
          </div>

        {/* Tabs */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveTab('connections')}
            className={cn(
              "flex items-center space-x-2 px-2.5 py-1.5 text-sm rounded-md transition-colors",
              activeTab === 'connections'
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            <Database className="w-4 h-4" />
            <span>数据库连接</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex items-center space-x-2 px-2.5 py-1.5 text-sm rounded-md transition-colors",
              activeTab === 'settings'
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            <Settings className="w-4 h-4" />
            <span>存储设置</span>
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={cn(
              "flex items-center space-x-2 px-2.5 py-1.5 text-sm rounded-md transition-colors",
              activeTab === 'monitoring'
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            <Activity className="w-4 h-4" />
            <span>存储监控</span>
          </button>
        </div>
      </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderTabContent()}
        </div>

        {/* Connection Modal */}
        <DatabaseConnectionModal
          isOpen={isAddingConnection || editingConnection !== null}
          onClose={() => {
            setIsAddingConnection(false);
            setEditingConnection(null);
          }}
          connection={editingConnection ? connections.find(c => c.id === editingConnection) : undefined}
          onSave={handleSaveConnection}
          onTest={async (connectionData) => {
            // Test the connection configuration
            try {
              // Create a temporary connection for testing
              const tempConnection: DatabaseConnection = {
                ...connectionData,
                id: `temp_${Date.now()}`,
                createdAt: new Date(),
                updatedAt: new Date()
              };

              // Add temporary connection to service for testing
              const tempId = await storageService.addConnection(tempConnection);

              try {
                // Test the connection
                const result = await storageService.testConnection(tempId);
                return result;
              } finally {
                // Clean up temporary connection
                await storageService.removeConnection(tempId);
              }
            } catch (error) {
              console.error('Connection test failed:', error);
              return false;
            }
          }}
        />
      </div>
    </ErrorBoundary>
  );
};


