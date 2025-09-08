import React, { useState } from 'react';
import { cn } from '@/utils';
import { 
  Network, 
  Plus, 
  Play, 
  Square, 
  Settings, 
  Trash2,
  Edit3,
  Copy,
  Server,
  Smartphone,
  Globe,
  Wifi,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface Connection {
  id: string;
  name: string;
  type: 'tcp-client' | 'tcp-server' | 'udp-client' | 'udp-server';
  host: string;
  port: number;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastConnected?: Date;
  messageCount: number;
  bytesTransferred: number;
}

const mockConnections: Connection[] = [
  {
    id: '1',
    name: 'TCP 调试服务器',
    type: 'tcp-server',
    host: '0.0.0.0',
    port: 8080,
    status: 'connected',
    lastConnected: new Date(),
    messageCount: 1250,
    bytesTransferred: 2048576
  },
  {
    id: '2',
    name: 'Modbus TCP 客户端',
    type: 'tcp-client',
    host: '192.168.1.100',
    port: 502,
    status: 'disconnected',
    lastConnected: new Date(Date.now() - 300000),
    messageCount: 890,
    bytesTransferred: 1024000
  },
  {
    id: '3',
    name: 'UDP 广播监听',
    type: 'udp-server',
    host: '0.0.0.0',
    port: 9999,
    status: 'connecting',
    messageCount: 0,
    bytesTransferred: 0
  }
];

const connectionTypes = [
  { 
    id: 'tcp-client', 
    label: 'TCP 客户端', 
    icon: Smartphone,
    description: '连接到远程TCP服务器'
  },
  { 
    id: 'tcp-server', 
    label: 'TCP 服务端', 
    icon: Server,
    description: '创建TCP服务器监听连接'
  },
  { 
    id: 'udp-client', 
    label: 'UDP 客户端', 
    icon: Globe,
    description: '发送UDP数据包'
  },
  { 
    id: 'udp-server', 
    label: 'UDP 服务端', 
    icon: Wifi,
    description: '监听UDP数据包'
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'connected':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'connecting':
      return <Activity className="w-4 h-4 text-yellow-500 animate-pulse" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <AlertCircle className="w-4 h-4 text-gray-500" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'connected':
      return '已连接';
    case 'connecting':
      return '连接中';
    case 'error':
      return '错误';
    default:
      return '未连接';
  }
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const ConnectionPage: React.FC = () => {
  const [connections, setConnections] = useState<Connection[]>(mockConnections);
  const [showNewConnectionDialog, setShowNewConnectionDialog] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [newConnectionType, setNewConnectionType] = useState<string>('tcp-client');

  const handleConnect = (connection: Connection) => {
    console.log('Connect to:', connection.name);
    // 这里会调用 Tauri 命令来建立连接
  };

  const handleDisconnect = (connection: Connection) => {
    console.log('Disconnect from:', connection.name);
    // 这里会调用 Tauri 命令来断开连接
  };

  const handleCreateConnection = () => {
    setShowNewConnectionDialog(true);
  };

  const renderConnectionCard = (connection: Connection) => {
    const TypeIcon = connectionTypes.find(t => t.id === connection.type)?.icon || Network;
    
    return (
      <div
        key={connection.id}
        className={cn(
          "p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer",
          selectedConnection?.id === connection.id && "border-primary bg-primary/10"
        )}
        onClick={() => setSelectedConnection(connection)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-muted rounded-lg">
              <TypeIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">{connection.name}</h3>
              <p className="text-sm text-muted-foreground">
                {connection.host}:{connection.port}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {getStatusIcon(connection.status)}
            <span className="text-sm">{getStatusText(connection.status)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">消息数:</span>
            <span className="ml-2 font-mono">{connection.messageCount.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">传输量:</span>
            <span className="ml-2 font-mono">{formatBytes(connection.bytesTransferred)}</span>
          </div>
        </div>

        {connection.lastConnected && (
          <div className="mt-2 text-xs text-muted-foreground flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            最后连接: {connection.lastConnected.toLocaleString()}
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            {connection.status === 'connected' ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDisconnect(connection);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
              >
                <Square className="w-3 h-3" />
                <span>断开</span>
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleConnect(connection);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
              >
                <Play className="w-3 h-3" />
                <span>连接</span>
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Edit connection:', connection.id);
              }}
              className="p-1.5 hover:bg-accent rounded-md"
              title="编辑"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Copy connection:', connection.id);
              }}
              className="p-1.5 hover:bg-accent rounded-md"
              title="复制"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('Delete connection:', connection.id);
              }}
              className="p-1.5 hover:bg-accent rounded-md text-red-500"
              title="删除"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border p-4 bg-muted/30 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold">网络连接</h1>
            <p className="text-muted-foreground text-sm mt-1">
              管理TCP/UDP连接，开始协议分析
            </p>
          </div>
          <button
            onClick={handleCreateConnection}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            <span>新建连接</span>
          </button>
        </div>

        {/* Quick Create Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {connectionTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => {
                  setNewConnectionType(type.id);
                  setShowNewConnectionDialog(true);
                }}
                className="p-3 border border-border rounded-lg hover:bg-accent transition-colors text-left"
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">{type.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {type.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Connection List */}
        <div className="flex-1 p-4 overflow-auto">
          {connections.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Network className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">暂无连接</h3>
                <p className="mb-4">创建您的第一个网络连接开始使用</p>
                <button
                  onClick={handleCreateConnection}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>新建连接</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {connections.map(renderConnectionCard)}
            </div>
          )}
        </div>

        {/* Connection Details */}
        {selectedConnection && (
          <div className="w-80 border-l border-border bg-card p-4 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">连接详情</h3>
              <button className="p-1 hover:bg-accent rounded-md">
                <Settings className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">名称</label>
                <p className="mt-1">{selectedConnection.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">类型</label>
                <p className="mt-1">
                  {connectionTypes.find(t => t.id === selectedConnection.type)?.label}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">主机</label>
                  <p className="mt-1 font-mono text-sm">{selectedConnection.host}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">端口</label>
                  <p className="mt-1 font-mono text-sm">{selectedConnection.port}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">状态</label>
                <div className="mt-1 flex items-center space-x-2">
                  {getStatusIcon(selectedConnection.status)}
                  <span>{getStatusText(selectedConnection.status)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">消息数</div>
                  <div className="text-lg font-semibold">
                    {selectedConnection.messageCount.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">传输量</div>
                  <div className="text-lg font-semibold">
                    {formatBytes(selectedConnection.bytesTransferred)}
                  </div>
                </div>
              </div>

              {selectedConnection.lastConnected && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">最后连接</label>
                  <p className="mt-1 text-sm">
                    {selectedConnection.lastConnected.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Connection Dialog */}
      {showNewConnectionDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">新建连接</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">连接类型</label>
                <select
                  value={newConnectionType}
                  onChange={(e) => setNewConnectionType(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-background"
                >
                  {connectionTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">名称</label>
                <input
                  type="text"
                  placeholder="连接名称"
                  className="w-full p-2 border border-border rounded-md bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">主机</label>
                  <input
                    type="text"
                    placeholder="127.0.0.1"
                    className="w-full p-2 border border-border rounded-md bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">端口</label>
                  <input
                    type="number"
                    placeholder="8080"
                    className="w-full p-2 border border-border rounded-md bg-background"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewConnectionDialog(false)}
                className="px-4 py-2 border border-border rounded-md hover:bg-accent"
              >
                取消
              </button>
              <button
                onClick={() => {
                  console.log('Create connection');
                  setShowNewConnectionDialog(false);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
