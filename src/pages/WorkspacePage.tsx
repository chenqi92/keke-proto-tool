import React, { useState, useMemo, useEffect } from 'react';
import {
  Folder,
  Plus,
  Settings,
  BarChart3,
  Clock,
  Users,
  Database,
  Activity,
  Wifi,
  MessageSquare,
  Globe,
  Radio,
  Play,
  Square,
  AlertCircle,
  CheckCircle,
  Search,
  MoreHorizontal,
  Zap,
  Server
} from 'lucide-react';
import { useAllSessions, useConnectedSessions, useAppStore } from '@/stores/AppStore';
import { networkService } from '@/services/NetworkService';
import { NewSessionModal } from '@/components/NewSessionModal';

interface WorkspaceStats {
  totalSessions: number;
  activeSessions: number;
  totalConnections: number;
  activeConnections: number;
  totalMessages: number;
  totalBytes: number;
  uptime: string;
}

interface SessionSummary {
  id: string;
  name: string;
  protocol: 'TCP' | 'UDP' | 'WebSocket' | 'MQTT' | 'SSE';
  status: 'connected' | 'disconnected' | 'connecting';
  lastActivity: Date;
  messageCount: number;
  bytesTransferred: number;
}

interface WorkspacePageProps {
  viewType?: 'workspace-overview' | 'protocol-type-overview';
  protocol?: string;
  connectionType?: 'client' | 'server';
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  viewType = 'workspace-overview',
  protocol,
  connectionType
}) => {
  // Get real data from store
  const allSessions = useAllSessions();
  const connectedSessions = useConnectedSessions();
  const setActiveSession = useAppStore(state => state.setActiveSession);
  const deleteSession = useAppStore(state => state.deleteSession);
  const createSession = useAppStore(state => state.createSession);

  // New session modal state
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);

  // Automated data sending state (only for client types)
  const [isAutomatedSending, setIsAutomatedSending] = useState(false);
  const [automatedConfig, setAutomatedConfig] = useState({
    payload: 'Hello World',
    interval: 1000, // milliseconds
    format: 'ascii' as 'ascii' | 'hex' | 'binary'
  });
  const [automatedStats, setAutomatedStats] = useState({
    messagesSent: 0,
    startTime: null as Date | null,
    lastSentTime: null as Date | null
  });

  // Automated data sending effect (only for client types)
  useEffect(() => {
    if (!isAutomatedSending || connectionType !== 'client') return;

    const interval = setInterval(async () => {
      // Get connected sessions of the current protocol-type
      const targetSessions = connectedSessions.filter(session =>
        session.config.protocol === protocol &&
        session.config.connectionType === 'client'
      );

      if (targetSessions.length === 0) return;

      // Send data to all connected client sessions
      let successCount = 0;
      for (const session of targetSessions) {
        try {
          // Convert payload based on format
          let dataBytes: number[];
          switch (automatedConfig.format) {
            case 'hex':
              dataBytes = automatedConfig.payload.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [];
              break;
            case 'binary':
              dataBytes = automatedConfig.payload.split('').map(char => char.charCodeAt(0));
              break;
            case 'ascii':
            default:
              dataBytes = Array.from(new TextEncoder().encode(automatedConfig.payload));
              break;
          }

          const success = await networkService.sendMessage(session.config.id, dataBytes);
          if (success) successCount++;
        } catch (error) {
          console.error('Automated sending error:', error);
        }
      }

      if (successCount > 0) {
        setAutomatedStats(prev => ({
          messagesSent: prev.messagesSent + successCount,
          startTime: prev.startTime || new Date(),
          lastSentTime: new Date()
        }));
      }
    }, automatedConfig.interval);

    return () => clearInterval(interval);
  }, [isAutomatedSending, automatedConfig, connectedSessions, protocol, connectionType]);

  // Calculate real statistics
  const stats = useMemo<WorkspaceStats>(() => {
    const totalMessages = allSessions.reduce((sum, session) =>
      sum + session.statistics.messagesReceived + session.statistics.messagesSent, 0);
    const totalBytes = allSessions.reduce((sum, session) =>
      sum + session.statistics.bytesReceived + session.statistics.bytesSent, 0);
    const totalConnections = allSessions.length;
    const activeConnections = connectedSessions.length;

    // Calculate uptime (time since first session was created)
    const oldestSession = allSessions.reduce((oldest, session) => {
      return session.connectedAt && (!oldest.connectedAt || session.connectedAt < oldest.connectedAt)
        ? session : oldest;
    }, allSessions[0]);

    const uptimeMs = oldestSession?.connectedAt
      ? Date.now() - oldestSession.connectedAt.getTime()
      : 0;
    const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const uptimeMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    const uptime = uptimeHours > 0 ? `${uptimeHours}h ${uptimeMinutes}m` : `${uptimeMinutes}m`;

    return {
      totalSessions: allSessions.length,
      activeSessions: connectedSessions.length,
      totalConnections,
      activeConnections,
      totalMessages,
      totalBytes,
      uptime
    };
  }, [allSessions, connectedSessions]);

  // Convert sessions to display format with filtering based on view type
  const sessions = useMemo<SessionSummary[]>(() => {
    let filteredSessions = allSessions;

    // Filter based on view type
    if (viewType === 'protocol-type-overview' && protocol && connectionType) {
      filteredSessions = allSessions.filter(session =>
        session.config.protocol === protocol && session.config.connectionType === connectionType
      );
    }

    return filteredSessions.map(session => ({
      id: session.config.id,
      name: session.config.name,
      protocol: session.config.protocol,
      status: session.status,
      lastActivity: session.lastActivity || new Date(),
      messageCount: session.statistics.messagesReceived + session.statistics.messagesSent,
      bytesTransferred: session.statistics.bytesReceived + session.statistics.bytesSent
    }));
  }, [allSessions, viewType, protocol, connectionType]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'disconnected' | 'connecting'>('all');

  const getProtocolIcon = (protocol: string) => {
    switch (protocol) {
      case 'TCP':
      case 'UDP':
        return <Wifi className="w-4 h-4" />;
      case 'MQTT':
        return <MessageSquare className="w-4 h-4" />;
      case 'WebSocket':
        return <Globe className="w-4 h-4" />;
      case 'SSE':
        return <Radio className="w-4 h-4" />;
      default:
        return <Wifi className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <Activity className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'disconnected':
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))  } ${  sizes[i]}`;
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}天前`;
  };

  // Automated sending control functions
  const handleStartAutomatedSending = () => {
    setIsAutomatedSending(true);
    setAutomatedStats({
      messagesSent: 0,
      startTime: new Date(),
      lastSentTime: null
    });
  };

  const handleStopAutomatedSending = () => {
    setIsAutomatedSending(false);
  };

  const handleConfigChange = (field: string, value: any) => {
    setAutomatedConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // New session handlers
  const handleNewSession = () => {
    setIsNewSessionModalOpen(true);
  };

  const handleCreateSession = (sessionData: any) => {
    console.log('Creating new session:', sessionData)

    // Create session config from session data
    const sessionConfig = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: sessionData.name,
      protocol: sessionData.protocol,
      connectionType: sessionData.connectionType,
      host: sessionData.host,
      port: sessionData.port,
      autoReconnect: sessionData.autoReconnect || false,
      keepAlive: sessionData.keepAlive || true,
      timeout: sessionData.timeout || 30000,
      retryAttempts: sessionData.retryAttempts || 3,
      // Protocol-specific properties
      ...(sessionData.protocol === 'WebSocket' && { websocketSubprotocol: sessionData.websocketSubprotocol }),
      ...(sessionData.protocol === 'MQTT' && { mqttTopic: sessionData.mqttTopic }),
      ...(sessionData.protocol === 'SSE' && { sseEventTypes: sessionData.sseEventTypes })
    }

    // Create the session in the store
    createSession(sessionConfig)
    setIsNewSessionModalOpen(false);
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         session.protocol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <Folder className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {viewType === 'workspace-overview' && '默认工作区'}
                {viewType === 'protocol-type-overview' && `${protocol} ${connectionType === 'client' ? '客户端' : '服务端'}`}
              </h1>
              <p className="text-sm text-muted-foreground">
                {viewType === 'workspace-overview' && '工作区概览和会话管理'}
                {viewType === 'protocol-type-overview' && connectionType === 'client' && `${protocol} 客户端会话管理和自动化数据发送`}
                {viewType === 'protocol-type-overview' && connectionType === 'server' && `${protocol} 服务端会话管理和客户端连接监控`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleNewSession}
              className="flex items-center space-x-2 px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>新建会话</span>
            </button>
            <button className="p-2 hover:bg-accent rounded-md transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6 border-b border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">会话总数</p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
                <p className="text-xs text-green-600">{stats.activeSessions} 活跃</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">连接数</p>
                <p className="text-2xl font-bold">{stats.totalConnections}</p>
                <p className="text-xs text-green-600">{stats.activeConnections} 活跃</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">消息总数</p>
                <p className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">累计处理</p>
              </div>
              <Database className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">运行时间</p>
                <p className="text-2xl font-bold">{stats.uptime}</p>
                <p className="text-xs text-muted-foreground">持续运行</p>
              </div>
              <Clock className="w-8 h-8 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Automated Data Sending Panel (only for client types) */}
      {viewType === 'protocol-type-overview' && connectionType === 'client' && (
        <div className="p-6 border-b border-border">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">自动化数据发送</h3>
              </div>
              <div className="flex items-center space-x-2">
                {isAutomatedSending ? (
                  <button
                    onClick={handleStopAutomatedSending}
                    className="flex items-center space-x-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    <span>停止发送</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartAutomatedSending}
                    className="flex items-center space-x-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>开始发送</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Configuration */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">发送配置</h4>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">数据格式</label>
                  <select
                    value={automatedConfig.format}
                    onChange={(e) => handleConfigChange('format', e.target.value)}
                    className="w-full px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    disabled={isAutomatedSending}
                  >
                    <option value="ascii">ASCII</option>
                    <option value="hex">HEX</option>
                    <option value="binary">Binary</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">发送间隔 (ms)</label>
                  <input
                    type="number"
                    value={automatedConfig.interval}
                    onChange={(e) => handleConfigChange('interval', parseInt(e.target.value) || 1000)}
                    className="w-full px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    min="100"
                    step="100"
                    disabled={isAutomatedSending}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">数据内容</label>
                  <textarea
                    value={automatedConfig.payload}
                    onChange={(e) => handleConfigChange('payload', e.target.value)}
                    className="w-full px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    rows={2}
                    disabled={isAutomatedSending}
                    placeholder="输入要发送的数据..."
                  />
                </div>
              </div>

              {/* Statistics */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">发送统计</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">已发送消息:</span>
                    <span className="font-medium">{automatedStats.messagesSent}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">开始时间:</span>
                    <span className="font-medium">
                      {automatedStats.startTime ? automatedStats.startTime.toLocaleTimeString() : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">最后发送:</span>
                    <span className="font-medium">
                      {automatedStats.lastSentTime ? automatedStats.lastSentTime.toLocaleTimeString() : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">发送状态</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {isAutomatedSending ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-green-600">正在发送</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm text-muted-foreground">已停止</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    目标会话: {sessions.filter(s => s.status === 'connected').length} 个连接的客户端
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Server Connection Monitor Panel (only for server types) */}
      {viewType === 'protocol-type-overview' && connectionType === 'server' && (
        <div className="p-6 border-b border-border">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Server className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">客户端连接监控</h3>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>活跃连接: {sessions.filter(s => s.status === 'connected').length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.filter(s => s.status === 'connected').map(session => (
                <div key={session.id} className="bg-background border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium text-sm">{session.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.lastActivity ? formatTimeAgo(session.lastActivity) : '未知'}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>消息数:</span>
                      <span>{session.messageCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>数据量:</span>
                      <span>{formatBytes(session.bytesTransferred)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>连接时长:</span>
                      <span>
                        {session.lastActivity ?
                          Math.floor((new Date().getTime() - session.lastActivity.getTime()) / 60000) + '分钟' :
                          '未知'
                        }
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                    <button
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      onClick={() => setActiveSession(session.id)}
                    >
                      查看详情
                    </button>
                    <button
                      className="text-xs text-red-600 hover:text-red-800 transition-colors"
                      onClick={() => {
                        // Disconnect client logic would go here
                        console.log('Disconnect client:', session.id);
                      }}
                    >
                      断开连接
                    </button>
                  </div>
                </div>
              ))}

              {sessions.filter(s => s.status === 'connected').length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无客户端连接</p>
                  <p className="text-xs mt-1">等待客户端连接到服务端...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">会话列表</h2>
          <div className="flex items-center space-x-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索会话..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-48"
              />
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">全部状态</option>
              <option value="connected">已连接</option>
              <option value="connecting">连接中</option>
              <option value="disconnected">已断开</option>
            </select>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">会话</th>
                  <th className="text-left p-4 font-medium text-sm">协议</th>
                  <th className="text-left p-4 font-medium text-sm">状态</th>
                  <th className="text-left p-4 font-medium text-sm">最后活动</th>
                  <th className="text-left p-4 font-medium text-sm">消息数</th>
                  <th className="text-left p-4 font-medium text-sm">传输量</th>
                  <th className="text-left p-4 font-medium text-sm">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        {getProtocolIcon(session.protocol)}
                        <span className="font-medium">{session.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-muted rounded text-xs font-medium">
                        {session.protocol}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(session.status)}
                        <span className="text-sm capitalize">{
                          session.status === 'connected' ? '已连接' :
                          session.status === 'connecting' ? '连接中' : '已断开'
                        }</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatTimeAgo(session.lastActivity)}
                    </td>
                    <td className="p-4 text-sm">
                      {session.messageCount.toLocaleString()}
                    </td>
                    <td className="p-4 text-sm">
                      {formatBytes(session.bytesTransferred)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-1">
                        {session.status === 'connected' ? (
                          <button
                            onClick={() => networkService.disconnect(session.id)}
                            className="p-1 hover:bg-accent rounded text-red-500 hover:text-red-600"
                            title="断开连接"
                          >
                            <Square className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => networkService.connect(session.id)}
                            className="p-1 hover:bg-accent rounded text-green-500 hover:text-green-600"
                            title="开始连接"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            // Show context menu or perform more actions
                            const action = confirm('删除此会话？');
                            if (action) {
                              deleteSession(session.id);
                            }
                          }}
                          className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                          title="更多操作"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredSessions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>没有找到匹配的会话</p>
            <p className="text-sm mt-1">尝试调整搜索条件或创建新会话</p>
          </div>
        )}
      </div>

      {/* New Session Modal */}
      <NewSessionModal
        isOpen={isNewSessionModalOpen}
        onClose={() => setIsNewSessionModalOpen(false)}
        onConfirm={handleCreateSession}
      />
    </div>
  );
};
