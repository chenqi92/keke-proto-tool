import React from 'react';
import { cn } from '@/utils';
import {
  Activity,
  Users,
  MessageSquare,
  Database,
  Wifi,
  CheckCircle,
  Server,
  Monitor
} from 'lucide-react';
import { useAllSessions } from '@/stores/AppStore';
import { StatusTag, StatusType } from '@/components/Common';

interface ProtocolTypeOverviewProps {
  protocol?: string;
  connectionType?: 'client' | 'server';
}

export const ProtocolTypeOverview: React.FC<ProtocolTypeOverviewProps> = ({
  protocol,
  connectionType
}) => {
  const allSessions = useAllSessions();

  const mapStatusToStatusType = (status: string): StatusType => {
    switch (status) {
      case 'connected':
      case 'connecting':
      case 'disconnected':
      case 'error':
        return status as StatusType;
      default:
        return 'disconnected';
    }
  };

  // Filter sessions for this protocol-type combination
  const filteredSessions = allSessions.filter(session =>
    (!protocol || session.config.protocol === protocol) &&
    (!connectionType || session.config.connectionType === connectionType)
  );

  // Calculate statistics
  const stats = {
    total: filteredSessions.length,
    connected: filteredSessions.filter(s => s.status === 'connected').length,
    disconnected: filteredSessions.filter(s => s.status === 'disconnected').length,
    connecting: filteredSessions.filter(s => s.status === 'connecting').length,
    totalMessages: filteredSessions.reduce((sum, s) => sum + s.statistics.messagesReceived + s.statistics.messagesSent, 0),
    totalBytes: filteredSessions.reduce((sum, s) => sum + s.statistics.bytesReceived + s.statistics.bytesSent, 0),
    totalConnections: filteredSessions.reduce((sum, s) => {
      if (connectionType === 'server' && s.clientConnections) {
        return sum + Object.keys(s.clientConnections).length;
      }
      return sum + (s.status === 'connected' ? 1 : 0);
    }, 0)
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProtocolIcon = () => {
    switch (protocol) {
      case 'TCP':
        return <Wifi className="w-6 h-6" />;
      case 'UDP':
        return <Wifi className="w-6 h-6" />;
      case 'WebSocket':
        return <Monitor className="w-6 h-6" />;
      case 'MQTT':
        return <MessageSquare className="w-6 h-6" />;
      case 'SSE':
        return <Activity className="w-6 h-6" />;
      default:
        return <Wifi className="w-6 h-6" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
            {getProtocolIcon()}
          </div>
          <div>
            <h1 className="text-lg font-bold">
              {protocol} {connectionType === 'client' ? '客户端' : '服务端'}概览
            </h1>
            <p className="text-sm text-muted-foreground">
              {connectionType === 'client' 
                ? `管理所有 ${protocol} 客户端连接和会话`
                : `监控所有 ${protocol} 服务端实例和客户端连接`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Sessions */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总会话数</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Connected Sessions */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">已连接</p>
                <p className="text-xl font-bold text-green-600">{stats.connected}</p>
              </div>
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </div>

          {/* Total Messages */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总消息数</p>
                <p className="text-xl font-bold">{stats.totalMessages.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Data Transfer */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">数据传输</p>
                <p className="text-xl font-bold">{formatBytes(stats.totalBytes)}</p>
              </div>
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Session List */}
        <div className="bg-card border border-border rounded-lg">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-semibold">会话列表</h3>
          </div>
          <div className="max-h-96 min-h-32 overflow-y-auto table-scroll-container">
            {filteredSessions.length > 0 ? (
              <div className="divide-y divide-border">
                {filteredSessions.map((session) => (
                  <div key={session.config.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <StatusTag
                          status={mapStatusToStatusType(session.status)}
                          showIcon={true}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium text-sm">{session.config.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {session.config.host}:{session.config.port}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {(session.statistics.messagesReceived + session.statistics.messagesSent).toLocaleString()} 消息
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(session.statistics.bytesReceived + session.statistics.bytesSent)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Server-specific: Show connected clients */}
                    {connectionType === 'server' && session.clientConnections && Object.keys(session.clientConnections).length > 0 && (
                      <div className="mt-2 pl-6">
                        <p className="text-xs text-muted-foreground mb-1">连接的客户端:</p>
                        <div className="space-y-1">
                          {Object.values(session.clientConnections).map((client: any) => (
                            <div key={client.id} className="flex items-center space-x-2 text-xs">
                              <Users className="w-3 h-3 text-muted-foreground" />
                              <span>{client.remoteAddress}:{client.remotePort}</span>
                              <span className={cn(
                                "px-1 py-0.5 rounded text-xs",
                                client.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              )}>
                                {client.isActive ? '活跃' : '断开'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无 {protocol} {connectionType === 'client' ? '客户端' : '服务端'} 会话</p>
                <p className="text-sm mt-1">创建新会话开始使用</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
