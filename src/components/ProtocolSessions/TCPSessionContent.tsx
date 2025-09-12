import React, { useState, useMemo } from 'react';
import { cn } from '@/utils';
import { DataFormatSelector, DataFormat, formatData, validateFormat } from '@/components/DataFormatSelector';
import { useAppStore, useSessionById } from '@/stores/AppStore';
import { networkService } from '@/services/NetworkService';
import { ConnectionErrorBanner } from '@/components/Common/ConnectionErrorBanner';
import { ConnectionManagementPanel } from '@/components/Session';
import { Message } from '@/types';
import {
  Wifi,
  Send,
  AlertCircle,
  Play,
  Square,
  Settings,
  WifiOff,
  Loader2,
  Edit3
} from 'lucide-react';

interface TCPSessionContentProps {
  sessionId: string;
}

export const TCPSessionContent: React.FC<TCPSessionContentProps> = ({ sessionId }) => {
  // 从全局状态获取会话数据
  const session = useSessionById(sessionId);
  const getClientConnections = useAppStore(state => state.getClientConnections);

  // 本地UI状态
  const [sendFormat, setSendFormat] = useState<DataFormat>('ascii');
  const [receiveFormat] = useState<DataFormat>('ascii');
  const [sendData, setSendData] = useState('');
  const [formatError, setFormatError] = useState<string | null>(null);
  const [isConnectingLocal, setIsConnectingLocal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const [showConnectionManagement, setShowConnectionManagement] = useState(false);

  // 编辑状态
  const [isEditingConnection, setIsEditingConnection] = useState(false);
  const [editHost, setEditHost] = useState('');
  const [editPort, setEditPort] = useState('');

  // 服务端特定状态
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [broadcastMode, setBroadcastMode] = useState(false);

  // 从会话状态获取数据
  const config = session?.config;
  const connectionStatus = session?.status || 'disconnected';
  const messages = session?.messages || [];
  const statistics = session?.statistics;
  const connectionError = session?.error;

  // 判断是否为服务端模式
  const isServerMode = config?.connectionType === 'server';

  // 获取客户端连接列表（仅服务端模式）
  const clientConnections = useMemo(() => {
    return isServerMode ? getClientConnections(sessionId) : [];
  }, [isServerMode, sessionId, getClientConnections, session?.clientConnections]);
  
  // 计算TCP特定统计信息
  const tcpStats = useMemo(() => {
    const baseStats = {
      rtt: 12, // TODO: 从后端获取实际RTT
      windowSize: 65535, // TODO: 从后端获取实际窗口大小
      congestionWindow: 10, // TODO: 从后端获取实际拥塞窗口
      retransmissions: statistics?.errors || 0, // 使用错误数作为重传次数的近似
      bytesReceived: statistics?.bytesReceived || 0,
      bytesSent: statistics?.bytesSent || 0,
      connectionCount: statistics?.connectionCount || 0,
      activeConnections: 0,
      totalConnections: 0,
      avgConnectionDuration: 0,
      peakConnections: 0
    };

    if (isServerMode) {
      // 服务端特定统计信息
      const activeConnections = clientConnections.filter(c => c.isActive).length;
      const totalConnections = clientConnections.length;
      const avgConnectionDuration = totalConnections > 0
        ? clientConnections.reduce((sum, c) => {
            const duration = (new Date().getTime() - c.connectedAt.getTime()) / 1000;
            return sum + duration;
          }, 0) / totalConnections
        : 0;

      return {
        ...baseStats,
        activeConnections,
        totalConnections,
        avgConnectionDuration,
        peakConnections: Math.max(totalConnections, baseStats.connectionCount), // TODO: 从历史数据获取峰值
      };
    }

    return baseStats;
  }, [statistics, isServerMode, clientConnections]);
  
  // 连接状态检查
  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';

  // 服务端状态检查
  const isListening = isServerMode && isConnected;

  // 处理连接/断开（客户端模式）或启动/停止（服务端模式）
  const handleConnect = async () => {
    if (!config) return;

    try {
      if (isConnected) {
        // 断开连接或停止服务端
        setIsConnectingLocal(true);
        const success = await networkService.disconnect(sessionId);
        if (!success) {
          console.error(`Failed to ${isServerMode ? 'stop server' : 'disconnect'}`);
        }
      } else {
        // 建立连接或启动服务端
        setIsConnectingLocal(true);
        const success = await networkService.connect(sessionId);
        if (!success) {
          console.error(`Failed to ${isServerMode ? 'start server' : 'connect'}`);
        }
      }
    } catch (error) {
      console.error(`${isServerMode ? 'Server' : 'Connection'} operation failed:`, error);
    } finally {
      setIsConnectingLocal(false);
    }
  };

  // 处理发送消息
  const handleSendMessage = async () => {
    if (!config || !isConnected || isSending) return;

    if (!validateFormat[sendFormat](sendData)) {
      setFormatError(`无效的${sendFormat.toUpperCase()}格式`);
      return;
    }

    setFormatError(null);
    setIsSending(true);

    try {
      const dataBytes = formatData.from[sendFormat](sendData);
      let success = false;

      if (isServerMode) {
        // 服务端模式：发送到指定客户端或广播
        if (broadcastMode) {
          // 广播到所有客户端
          success = await networkService.broadcastMessage(sessionId, dataBytes);
        } else if (selectedClient) {
          // 发送到指定客户端
          success = await networkService.sendToClient(sessionId, selectedClient, dataBytes);
        } else {
          setFormatError('请选择目标客户端或启用广播模式');
          return;
        }
      } else {
        // 客户端模式：正常发送
        success = await networkService.sendMessage(sessionId, dataBytes);
      }

      if (success) {
        setSendData('');
        setFormatError(null);
      } else {
        setFormatError(`发送失败：${isServerMode ? '服务端' : '网络'}错误或连接已断开`);
      }
    } catch (error) {
      setFormatError(`发送失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSending(false);
    }
  };

  // 处理发送消息 - 可被外部调用的版本
  const handleSend = async (data: string, format: DataFormat): Promise<void> => {
    if (!config || !isConnected) {
      throw new Error('Not connected');
    }

    if (!validateFormat[format](data)) {
      throw new Error(`Invalid ${format.toUpperCase()} format`);
    }

    try {
      const formattedData = formatData.from[format](data);

      if (isServerMode) {
        // For server mode, send to all connected clients or selected client
        if (broadcastMode) {
          const success = await networkService.broadcastMessage(sessionId, formattedData);
          if (!success) throw new Error('Broadcast failed');
        } else if (selectedClient) {
          const success = await networkService.sendToClient(sessionId, selectedClient, formattedData);
          if (!success) throw new Error('Send to client failed');
        } else {
          throw new Error('No client selected for sending');
        }
      } else {
        // For client mode, send to server
        const success = await networkService.sendMessage(sessionId, formattedData);
        if (!success) throw new Error('Send to server failed');
      }
    } catch (error) {
      console.error('Send failed:', error);
      throw error;
    }
  };

  const handleSendDataChange = (value: string) => {
    setSendData(value);
    setFormatError(null);
  };

  // 处理连接信息编辑
  const handleEditConnection = () => {
    if (!config) return;
    setEditHost(config.host);
    setEditPort(config.port.toString());
    setIsEditingConnection(true);
  };

  const handleSaveConnection = () => {
    const port = parseInt(editPort);
    if (isNaN(port) || port < 1 || port > 65535) {
      setFormatError('端口号必须在1-65535之间');
      return;
    }

    if (!editHost.trim()) {
      setFormatError('主机地址不能为空');
      return;
    }

    // 更新会话配置
    if (!config) return;
    const updateSession = useAppStore.getState().updateSession;
    updateSession(sessionId, {
      config: {
        ...config,
        host: editHost.trim(),
        port: port
      }
    });

    setIsEditingConnection(false);
    setFormatError(null);
  };

  const handleCancelEdit = () => {
    setIsEditingConnection(false);
    setEditHost('');
    setEditPort('');
    setFormatError(null);
  };

  const formatMessageData = (message: Message): string => {
    try {
      return formatData.to[receiveFormat](message.data);
    } catch {
      return '数据格式转换失败';
    }
  };



  // 如果没有会话数据，显示错误信息
  if (!session || !config) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">会话未找到</h3>
          <p className="text-sm text-muted-foreground">
            会话ID: {sessionId} 不存在或已被删除
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* TCP工具栏 */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center space-x-2">
          {/* 状态图标 */}
          {connectionStatus === 'connected' && <Wifi className="w-4 h-4 text-green-500" />}
          {connectionStatus === 'connecting' && <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />}
          {connectionStatus === 'disconnected' && <WifiOff className="w-4 h-4 text-gray-500" />}
          {connectionStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}

          <span className="text-sm font-medium">TCP {config.connectionType}</span>

          {/* 可编辑的连接信息 */}
          {isEditingConnection ? (
            <div className="flex items-center space-x-2">
              {!isServerMode && (
                <input
                  type="text"
                  value={editHost}
                  onChange={(e) => setEditHost(e.target.value)}
                  className="w-24 px-2 py-1 text-xs border border-border rounded"
                  placeholder="主机"
                />
              )}
              <input
                type="number"
                value={editPort}
                onChange={(e) => setEditPort(e.target.value)}
                className="w-16 px-2 py-1 text-xs border border-border rounded"
                placeholder="端口"
                min="1"
                max="65535"
              />
              <button
                onClick={handleSaveConnection}
                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
              >
                保存
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                取消
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">
                {isServerMode ? `监听 ${config.port}` : `${config.host}:${config.port}`}
              </span>
              <button
                onClick={handleEditConnection}
                disabled={isConnected}
                className="p-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                title="编辑连接信息"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={isConnecting || isConnectingLocal}
            className={cn(
              "flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ml-4",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isConnected
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-green-500 hover:bg-green-600 text-white"
            )}
          >
            {(isConnecting || isConnectingLocal) ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{isServerMode ? (isConnected ? '停止中...' : '启动中...') : (isConnected ? '断开中...' : '连接中...')}</span>
              </>
            ) : isConnected ? (
              <>
                <Square className="w-3 h-3" />
                <span>{isServerMode ? '停止' : '断开'}</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>{isServerMode ? '启动' : '连接'}</span>
              </>
            )}
          </button>
        </div>

        {/* 统计信息和服务端特定控制 */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvancedStats(!showAdvancedStats)}
            className={cn(
              "flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors",
              showAdvancedStats
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <Settings className="w-3 h-3" />
            <span>统计</span>
          </button>

          {isServerMode && (
            <span className="text-xs text-muted-foreground">
              {isListening ? `监听中 (${statistics?.connectionCount || 0} 客户端)` : '未启动'}
            </span>
          )}
        </div>
      </div>

      {/* 连接错误横幅 */}
      {connectionError && (
        <div className="px-4 pt-4">
          <ConnectionErrorBanner
            error={connectionError}
            onRetry={handleConnect}
            retryLabel={isServerMode ? '重新启动' : '重新连接'}
          />
        </div>
      )}

      {/* 发送面板 */}
      <div className={cn("border-b border-border bg-card p-4", isServerMode ? "h-40" : "h-32")}>
        <div className="flex items-stretch space-x-3 h-full">
          <div className="flex-1 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-muted-foreground">数据格式:</span>
                  <DataFormatSelector value={sendFormat} onChange={setSendFormat} size="sm" />
                </div>

                {/* 服务端模式：客户端选择和广播选项 */}
                {isServerMode && (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-muted-foreground">发送到:</span>
                      <select
                        value={broadcastMode ? 'broadcast' : selectedClient || ''}
                        onChange={(e) => {
                          if (e.target.value === 'broadcast') {
                            setBroadcastMode(true);
                            setSelectedClient(null);
                          } else {
                            setBroadcastMode(false);
                            setSelectedClient(e.target.value || null);
                          }
                        }}
                        className="px-2 py-1 text-xs bg-background border border-border rounded"
                        disabled={!isListening}
                      >
                        <option value="">选择客户端</option>
                        <option value="broadcast">广播到所有客户端</option>
                        {clientConnections.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.remoteAddress}:{client.remotePort}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* 连接管理按钮 - 仅客户端模式显示 */}
              {!isServerMode && (
                <button
                  onClick={() => setShowConnectionManagement(!showConnectionManagement)}
                  className={cn(
                    "flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors",
                    showConnectionManagement
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                  title="连接管理"
                >
                  <Settings className="w-3 h-3" />
                  <span>连接管理</span>
                </button>
              )}
            </div>
            
            <textarea
              value={sendData}
              onChange={(e) => handleSendDataChange(e.target.value)}
              placeholder="输入TCP数据包内容..."
              className="flex-1 resize-none bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            
            {formatError && (
              <div className="text-xs text-red-500">{formatError}</div>
            )}
          </div>
          
          <div className="flex flex-col justify-end space-y-2">
            <button
              onClick={handleSendMessage}
              disabled={
                !isConnected ||
                !sendData.trim() ||
                isSending ||
                (isServerMode && !broadcastMode && !selectedClient)
              }
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                "flex items-center space-x-2 min-w-20",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isConnected && sendData.trim() && !isSending &&
                (!isServerMode || broadcastMode || selectedClient)
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>发送中...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{isServerMode ? (broadcastMode ? '广播' : '发送') : '发送'}</span>
                </>
              )}
            </button>

            {/* 服务端模式提示 */}
            {isServerMode && !broadcastMode && !selectedClient && (
              <div className="text-xs text-muted-foreground text-center">
                请选择目标客户端
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 统计信息面板 */}
      {showAdvancedStats && (
        <div className="h-32 border-b border-border bg-card p-4">
          <div className="h-full">
            <h3 className="text-sm font-medium mb-3">
              {isServerMode ? 'TCP服务端统计' : 'TCP客户端统计'}
            </h3>
            <div className="grid grid-cols-6 gap-4 h-20">
              {/* 基础统计 */}
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {tcpStats.bytesReceived}
                </div>
                <div className="text-xs text-muted-foreground">接收字节</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {tcpStats.bytesSent}
                </div>
                <div className="text-xs text-muted-foreground">发送字节</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {messages.length}
                </div>
                <div className="text-xs text-muted-foreground">消息数</div>
              </div>

              {isServerMode ? (
                // 服务端特定统计
                <>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-500">
                      {tcpStats.activeConnections}
                    </div>
                    <div className="text-xs text-muted-foreground">活跃连接</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-500">
                      {tcpStats.totalConnections}
                    </div>
                    <div className="text-xs text-muted-foreground">总连接数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-500">
                      {Math.round(tcpStats.avgConnectionDuration || 0)}s
                    </div>
                    <div className="text-xs text-muted-foreground">平均连接时长</div>
                  </div>
                </>
              ) : (
                // 客户端特定统计
                <>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-500">
                      {tcpStats.rtt}ms
                    </div>
                    <div className="text-xs text-muted-foreground">RTT</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-500">
                      {tcpStats.windowSize}
                    </div>
                    <div className="text-xs text-muted-foreground">窗口大小</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-500">
                      {tcpStats.retransmissions}
                    </div>
                    <div className="text-xs text-muted-foreground">重传次数</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connection Management Panel - Only for Client Sessions */}
      {!isServerMode && showConnectionManagement && (
        <div className="px-4 py-2">
          <ConnectionManagementPanel
            sessionId={sessionId}
            config={config}
            status={connectionStatus}
            onConfigUpdate={(updates) => {
              // Update session config through the store
              const updateSession = useAppStore.getState().updateSession;
              updateSession(sessionId, { config: { ...config, ...updates } });
            }}
            onConnect={handleConnect}
            onDisconnect={handleConnect}
            onSendMessage={async (data, format) => {
              try {
                await handleSend(data, format as DataFormat);
                return true;
              } catch (error) {
                console.error('Auto send failed:', error);
                return false;
              }
            }}
          />
        </div>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        {isServerMode ? (
          // 服务端模式：显示客户端连接管理和消息流
          <div className="h-full flex">
            {/* 客户端连接面板 */}
            <div className="w-80 border-r border-border bg-card">
              <div className="h-full flex flex-col">
                <div className="h-10 border-b border-border flex items-center px-3 bg-muted/50">
                  <h3 className="text-sm font-medium">客户端连接 ({clientConnections.length})</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {clientConnections.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      {isListening ? '等待客户端连接...' : '服务端未启动'}
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {clientConnections.map((client) => (
                        <div
                          key={client.id}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-colors",
                            selectedClient === client.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          )}
                          onClick={() => {
                            setSelectedClient(client.id);
                            setBroadcastMode(false);
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                client.isActive ? "bg-green-500" : "bg-gray-500"
                              )} />
                              <span className="text-sm font-medium">
                                {client.remoteAddress}:{client.remotePort}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>连接时间: {client.connectedAt.toLocaleTimeString()}</div>
                            <div>最后活动: {client.lastActivity.toLocaleTimeString()}</div>
                            <div className="flex justify-between">
                              <span>接收: {client.bytesReceived}B</span>
                              <span>发送: {client.bytesSent}B</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 消息流面板 */}
            <div className="flex-1 flex flex-col">
              <div className="h-10 border-b border-border flex items-center px-3 bg-muted/50">
                <h3 className="text-sm font-medium">消息流 ({messages.length})</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    暂无消息
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          message.direction === 'in'
                            ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
                            : "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={cn(
                              "text-xs px-2 py-1 rounded",
                              message.direction === 'in'
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            )}>
                              {message.direction === 'in' ? '接收' : '发送'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {message.size} 字节
                            </span>
                          </div>
                        </div>
                        <div className="text-sm font-mono bg-background/50 p-2 rounded border">
                          {formatMessageData(message)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // 客户端模式：显示消息流
          <div className="h-full flex flex-col">
            <div className="h-10 border-b border-border flex items-center px-3 bg-muted/50">
              <h3 className="text-sm font-medium">消息流 ({messages.length})</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  暂无消息
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        message.direction === 'in'
                          ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
                          : "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={cn(
                            "text-xs px-2 py-1 rounded",
                            message.direction === 'in'
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          )}>
                            {message.direction === 'in' ? '接收' : '发送'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {message.size} 字节
                          </span>
                        </div>
                      </div>
                      <div className="text-sm font-mono bg-background/50 p-2 rounded border">
                        {formatMessageData(message)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
