import React, { useState, useMemo } from 'react';
import { cn } from '@/utils';
import { DataFormatSelector, DataFormat, formatData, validateFormat } from '@/components/DataFormatSelector';
import { useAppStore, useSessionById } from '@/stores/AppStore';
import { networkService } from '@/services/NetworkService';
import { ConnectionErrorBanner } from '@/components/Common/ConnectionErrorBanner';
import { Message } from '@/types';
import {
  Send,
  AlertCircle,
  Play,
  Square,
  Settings,
  WifiOff,
  Loader2,
  Radio,
  Edit3,
  Trash2,
  Filter
} from 'lucide-react';

interface UDPSessionContentProps {
  sessionId: string;
}

export const UDPSessionContent: React.FC<UDPSessionContentProps> = ({ sessionId }) => {
  // 从全局状态获取会话数据
  const session = useSessionById(sessionId);
  const { clearMessages, getClientConnections, removeClientConnection } = useAppStore();

  // 本地UI状态
  const [sendFormat, setSendFormat] = useState<DataFormat>('ascii');
  const [receiveFormat, setReceiveFormat] = useState<DataFormat>('ascii');
  const [sendData, setSendData] = useState('');
  const [formatError, setFormatError] = useState<string | null>(null);
  const [isConnectingLocal, setIsConnectingLocal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);

  // 编辑状态
  const [isEditingConnection, setIsEditingConnection] = useState(false);
  const [editHost, setEditHost] = useState('');
  const [editPort, setEditPort] = useState('');

  // UDP特定状态
  const [broadcastMode, setBroadcastMode] = useState(false);

  // UDP服务端特定状态
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedClientForFilter, setSelectedClientForFilter] = useState<string | null>('all');

  // 从会话状态获取数据
  const config = session?.config;
  const connectionStatus = session?.status || 'disconnected';
  const messages = session?.messages || [];
  const statistics = session?.statistics;
  const connectionError = session?.error;
  
  // 判断是否为服务端模式
  const isServerMode = config?.connectionType === 'server';

  // 获取UDP客户端连接列表（仅服务端模式）
  const clientConnections = useMemo(() => {
    // 强制检查：客户端模式下绝对不应该有客户端连接
    if (!isServerMode) {
      console.log(`UDP客户端模式 - Session ${sessionId}: 强制返回空的客户端连接列表`);
      // 如果发现客户端模式下有客户端连接数据，清理它们
      const existingConnections = getClientConnections(sessionId);
      if (existingConnections.length > 0) {
        console.error(`UDP客户端模式 - Session ${sessionId}: 检测到 ${existingConnections.length} 个错误的客户端连接，正在清理...`);
        // 清理错误的客户端连接数据
        existingConnections.forEach(client => {
          removeClientConnection(sessionId, client.id);
        });
      }
      return [];
    }

    const connections = getClientConnections(sessionId);
    console.log(`UDP服务端模式 - Session ${sessionId}: 获取到 ${connections.length} 个客户端连接`, connections);

    // 过滤掉无效的客户端连接（地址为空或端口为0的连接）
    const validConnections = connections.filter(client => {
      const isValid = client.remoteAddress &&
                     client.remoteAddress.trim() !== '' &&
                     client.remotePort &&
                     client.remotePort > 0;

      if (!isValid) {
        console.warn(`UDP服务端 - Session ${sessionId}: 发现无效的客户端连接，将被过滤:`, {
          id: client.id,
          remoteAddress: client.remoteAddress,
          remotePort: client.remotePort
        });
        // 自动清理无效的客户端连接
        removeClientConnection(sessionId, client.id);
      }

      return isValid;
    });

    // 更新客户端连接的活动状态和字节统计
    const updatedConnections = validConnections.map(client => {
      // 计算该客户端的消息统计
      let bytesReceived = 0;
      let bytesSent = 0;
      // 确保 connectedAt 是 Date 对象
      let lastActivity = client.connectedAt instanceof Date
        ? client.connectedAt
        : new Date(client.connectedAt);

      messages.forEach(message => {
        if (message.sourceClientId === client.id || message.targetClientId === client.id) {
          if (message.direction === 'in') {
            bytesReceived += message.size || 0;
          } else if (message.direction === 'out') {
            bytesSent += message.size || 0;
          }
          if (message.timestamp > lastActivity) {
            lastActivity = message.timestamp;
          }
        }
      });

      return {
        ...client,
        bytesReceived,
        bytesSent,
        lastActivity,
        isActive: true, // UDP连接始终视为活跃，因为UDP是无连接的
      };
    });

    return updatedConnections.sort((a, b) => {
      const aConnectedAt = a.connectedAt instanceof Date ? a.connectedAt : new Date(a.connectedAt);
      const bConnectedAt = b.connectedAt instanceof Date ? b.connectedAt : new Date(b.connectedAt);
      return bConnectedAt.getTime() - aConnectedAt.getTime();
    });
  }, [isServerMode, sessionId, getClientConnections, removeClientConnection, messages]);

  // 当服务端停止时清理客户端连接
  React.useEffect(() => {
    if (isServerMode && connectionStatus === 'disconnected') {
      const existingConnections = getClientConnections(sessionId);
      if (existingConnections.length > 0) {
        console.log(`UDP服务端 ${sessionId}: 服务端已停止，清理 ${existingConnections.length} 个客户端连接`);
        existingConnections.forEach(client => {
          removeClientConnection(sessionId, client.id);
        });
      }
    }
  }, [connectionStatus, isServerMode, sessionId, getClientConnections, removeClientConnection]);

  // 计算UDP特定统计信息
  const udpStats = useMemo(() => {
    const baseStats = {
      packetsReceived: messages.filter(m => m.direction === 'in').length,
      packetsSent: messages.filter(m => m.direction === 'out').length,
      bytesReceived: statistics?.bytesReceived || 0,
      bytesSent: statistics?.bytesSent || 0,
      errors: statistics?.errors || 0,
      packetLossRate: 0, // TODO: 从后端获取实际丢包率
      avgPacketSize: 0,
      transmissionRate: 0, // bytes per second
      lastPacketTime: messages.length > 0 ? messages[messages.length - 1].timestamp : null,
      // UDP服务端特有统计
      activeClients: 0,
      totalClients: 0,
      avgClientActivity: 0,
    };

    // 计算平均包大小
    const totalPackets = baseStats.packetsReceived + baseStats.packetsSent;
    if (totalPackets > 0) {
      baseStats.avgPacketSize = Math.round((baseStats.bytesReceived + baseStats.bytesSent) / totalPackets);
    }

    // 计算传输速率 (简化计算，基于最近的消息)
    if (messages.length > 1) {
      const recentMessages = messages.slice(-10); // 最近10条消息
      const timeSpan = recentMessages[recentMessages.length - 1].timestamp.getTime() - recentMessages[0].timestamp.getTime();
      if (timeSpan > 0) {
        const recentBytes = recentMessages.reduce((sum, msg) => sum + msg.size, 0);
        baseStats.transmissionRate = Math.round((recentBytes * 1000) / timeSpan); // bytes per second
      }
    }

    // UDP服务端特有统计
    if (isServerMode && clientConnections.length > 0) {
      baseStats.activeClients = clientConnections.filter(c => c.isActive).length;
      baseStats.totalClients = clientConnections.length;

      // 计算平均客户端活动时间
      const now = new Date();
      const totalActivityTime = clientConnections.reduce((sum, client) => {
        // 确保 connectedAt 是 Date 对象
        const connectedAt = client.connectedAt instanceof Date
          ? client.connectedAt
          : new Date(client.connectedAt);
        return sum + (now.getTime() - connectedAt.getTime());
      }, 0);
      baseStats.avgClientActivity = Math.round(totalActivityTime / clientConnections.length / 1000); // 秒
    }

    return baseStats;
  }, [statistics, messages, isServerMode, clientConnections]);

  // 过滤消息（服务端模式按客户端过滤）
  const filteredMessages = useMemo(() => {
    if (!isServerMode || selectedClientForFilter === 'all' || !selectedClientForFilter) {
      return messages;
    }

    return messages.filter(message => {
      if (message.direction === 'in' && message.sourceAddress) {
        const clientKey = `${message.sourceAddress.host}:${message.sourceAddress.port}`;
        return clientKey === selectedClientForFilter;
      }
      if (message.direction === 'out' && message.targetAddress) {
        const clientKey = `${message.targetAddress.host}:${message.targetAddress.port}`;
        return clientKey === selectedClientForFilter;
      }
      return false;
    });
  }, [messages, isServerMode, selectedClientForFilter]);

  // UDP连接状态检查（UDP是无连接的，这里主要是socket绑定状态）
  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';
  
  // UDP特有的"连接"状态（实际是socket绑定状态）
  const isBound = isServerMode && isConnected;

  // 处理UDP"连接"（实际是绑定socket）
  const handleConnect = async () => {
    if (!config) return;
    
    try {
      if (isConnected) {
        // 断开连接（关闭socket）
        setIsConnectingLocal(true);
        const success = await networkService.disconnect(sessionId);
        if (!success) {
          console.error(`Failed to ${isServerMode ? 'unbind socket' : 'close UDP socket'}`);
        }
      } else {
        // 建立连接（绑定socket）
        setIsConnectingLocal(true);
        const success = await networkService.connect(sessionId);
        if (!success) {
          console.error(`Failed to ${isServerMode ? 'bind socket' : 'create UDP socket'}`);
        }
      }
    } catch (error) {
      console.error(`UDP ${isServerMode ? 'socket binding' : 'socket'} operation failed:`, error);
    } finally {
      setIsConnectingLocal(false);
    }
  };

  // 处理发送UDP数据报
  const handleSendMessage = async () => {
    if (!config || isSending) return;

    // UDP服务端模式需要选择客户端或广播
    if (isServerMode && !broadcastMode && !selectedClient) {
      setFormatError('请选择目标客户端或启用广播模式');
      return;
    }

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
        // 服务端模式：发送到选定客户端或广播
        if (broadcastMode) {
          success = await networkService.broadcastMessage(sessionId, dataBytes);
        } else if (selectedClient) {
          // 解析选定客户端的地址
          const [host, portStr] = selectedClient.split(':');
          const port = parseInt(portStr);
          success = await networkService.sendUDPMessage(sessionId, dataBytes, host, port);
        }
      } else {
        // 客户端模式：使用配置中的默认地址
        success = await networkService.sendUDPMessage(sessionId, dataBytes, config.host, config.port);
      }

      if (success) {
        setSendData('');
        setFormatError(null);
      } else {
        setFormatError(`发送失败：UDP ${isServerMode ? '服务端' : '客户端'}错误`);
      }
    } catch (error) {
      setFormatError(`发送失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSending(false);
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
    const updatedConfig = {
      ...config,
      host: editHost.trim(),
      port: port
    };

    updateSession(sessionId, {
      config: updatedConfig
    });

    console.log(`UDP Session ${sessionId}: Configuration updated - host: ${editHost.trim()}, port: ${port}`);

    setIsEditingConnection(false);
    setFormatError(null);
  };

  const handleCancelEdit = () => {
    setIsEditingConnection(false);
    setEditHost('');
    setEditPort('');
    setFormatError(null);
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

  const formatMessageData = (message: Message): string => {
    try {
      return formatData.to[receiveFormat](message.data);
    } catch {
      return '数据格式转换失败';
    }
  };

  // 获取原始数据的十六进制表示
  const getRawDataHex = (message: Message): string => {
    try {
      return formatData.to.hex(message.data);
    } catch {
      return '无法显示原始数据';
    }
  };

  // 清除消息历史
  const handleClearMessages = () => {
    if (messages.length > 0) {
      clearMessages(sessionId);
      console.log(`UDP会话 ${sessionId}: 已清除 ${messages.length} 条消息记录`);
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
      {/* UDP工具栏 */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center space-x-2">
          {/* 状态图标 */}
          {connectionStatus === 'connected' && <Radio className="w-4 h-4 text-green-500" />}
          {connectionStatus === 'connecting' && <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />}
          {connectionStatus === 'disconnected' && <WifiOff className="w-4 h-4 text-gray-500" />}
          {connectionStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
          
          <span className="text-sm font-medium">UDP {config.connectionType}</span>

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
                {isServerMode ? `绑定 ${config.port}` : `${config.host}:${config.port}`}
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
                <span>{isServerMode ? (isConnected ? '解绑中...' : '绑定中...') : (isConnected ? '关闭中...' : '创建中...')}</span>
              </>
            ) : isConnected ? (
              <>
                <Square className="w-3 h-3" />
                <span>{isServerMode ? '解绑' : '关闭'}</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>{isServerMode ? '绑定' : '创建'}</span>
              </>
            )}
          </button>
        </div>

        {/* 统计信息控制 */}
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
          
          <span className="text-xs text-muted-foreground">
            {isServerMode ? (isBound ? '监听中' : '未绑定') : (isConnected ? 'Socket已创建' : 'Socket未创建')}
          </span>
        </div>
      </div>

      {/* 连接错误横幅 */}
      {connectionError && (
        <div className="px-4 pt-4">
          <ConnectionErrorBanner
            error={connectionError}
            onRetry={handleConnect}
            retryLabel={isServerMode ? '重新绑定' : '重新创建'}
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

                {/* UDP服务端模式：目标选择显示 */}
                {isServerMode && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-muted-foreground">目标:</span>
                    <span className="text-xs px-2 py-1 rounded bg-muted">
                      {broadcastMode ? '广播模式' : selectedClient ? selectedClient : '未选择'}
                    </span>
                  </div>
                )}
              </div>

              {/* UDP客户端模式：连接设置 */}
              {!isServerMode && (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-muted-foreground">超时:</span>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={Math.floor((config.timeout || 10000) / 1000)}
                      onChange={(e) => {
                        const timeoutSeconds = parseInt(e.target.value) || 10;
                        const store = useAppStore.getState();
                        store.updateSession(sessionId, {
                          config: { ...config, timeout: timeoutSeconds * 1000 }
                        });
                      }}
                      className="w-12 px-1 py-0.5 text-xs border border-border rounded"
                    />
                    <span className="text-xs text-muted-foreground">秒</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-muted-foreground">重试:</span>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={config.retryAttempts || 3}
                      onChange={(e) => {
                        const retryAttempts = parseInt(e.target.value) || 3;
                        const store = useAppStore.getState();
                        store.updateSession(sessionId, {
                          config: { ...config, retryAttempts }
                        });
                      }}
                      className="w-12 px-1 py-0.5 text-xs border border-border rounded"
                    />
                    <span className="text-xs text-muted-foreground">次</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoReconnect"
                      checked={config.autoReconnect || false}
                      onChange={(e) => {
                        const store = useAppStore.getState();
                        store.updateSession(sessionId, {
                          config: { ...config, autoReconnect: e.target.checked }
                        });
                      }}
                      className="rounded border-border"
                    />
                    <label htmlFor="autoReconnect" className="text-xs">自动重连</label>
                  </div>
                </div>
              )}
            </div>

            <textarea
              value={sendData}
              onChange={(e) => handleSendDataChange(e.target.value)}
              placeholder="输入UDP数据报内容..."
              className="flex-1 resize-none bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />

            {formatError && (
              <div className={cn(
                "text-xs px-2 py-1 rounded",
                formatError.includes('成功')
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              )}>
                {formatError}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-end space-y-2">
            {/* 自动发送选项 - 仅客户端模式 */}
            {!isServerMode && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoSendEnabled"
                  checked={config.autoSendEnabled || false}
                  onChange={(e) => {
                    const store = useAppStore.getState();
                    store.updateSession(sessionId, {
                      config: { ...config, autoSendEnabled: e.target.checked }
                    });
                  }}
                  className="rounded border-border"
                />
                <label htmlFor="autoSendEnabled" className="text-xs">启用自动发送</label>
              </div>
            )}

            <button
              onClick={handleSendMessage}
              disabled={
                isSending ||
                (isServerMode && !broadcastMode && !selectedClient) ||
                !sendData.trim()
              }
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                "flex items-center space-x-2 min-w-20",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                !isSending && sendData.trim()
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
                  <span>{isServerMode && broadcastMode ? '广播' : '发送'}</span>
                </>
              )}
            </button>

            {/* 服务端模式提示 */}
            {isServerMode && !broadcastMode && !selectedClient && (
              <div className="text-xs text-muted-foreground text-center">
                请选择客户端地址
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
              UDP {isServerMode ? '服务端' : '客户端'}统计
            </h3>
            <div className={cn("grid gap-4 h-20", isServerMode ? "grid-cols-8" : "grid-cols-6")}>
              {/* 基础统计 */}
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {udpStats.packetsReceived}
                </div>
                <div className="text-xs text-muted-foreground">接收包数</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {udpStats.packetsSent}
                </div>
                <div className="text-xs text-muted-foreground">发送包数</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-500">
                  {udpStats.bytesReceived}
                </div>
                <div className="text-xs text-muted-foreground">接收字节</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-500">
                  {udpStats.bytesSent}
                </div>
                <div className="text-xs text-muted-foreground">发送字节</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-500">
                  {udpStats.avgPacketSize}B
                </div>
                <div className="text-xs text-muted-foreground">平均包大小</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-500">
                  {udpStats.transmissionRate}B/s
                </div>
                <div className="text-xs text-muted-foreground">传输速率</div>
              </div>

              {/* UDP服务端特有统计 */}
              {isServerMode && (
                <>
                  <div className="text-center">
                    <div className="text-lg font-bold text-cyan-500">
                      {udpStats.activeClients}
                    </div>
                    <div className="text-xs text-muted-foreground">活跃地址</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-indigo-500">
                      {udpStats.totalClients}
                    </div>
                    <div className="text-xs text-muted-foreground">总地址数</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}



      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        {isServerMode ? (
          // 服务端模式：双面板布局（客户端地址面板 + 消息流面板）
          <div className="h-full flex">
            {/* 客户端地址面板 */}
            <div className="w-80 border-r border-border bg-card">
              <div className="h-full flex flex-col">
                <div className="h-10 border-b border-border flex items-center justify-between px-3 bg-muted/50">
                  <h3 className="text-sm font-medium">客户端地址 ({clientConnections.length})</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {clientConnections.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      {isBound ? '等待客户端数据报...' : 'UDP服务端未启动'}
                    </div>
                  ) : (
                    <div className="p-2 space-y-3">
                      {/* 消息过滤区域 */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2 px-1 flex items-center">
                          <Filter className="w-3 h-3 mr-1" />
                          消息过滤
                        </div>
                        <div
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-colors",
                            selectedClientForFilter === 'all' || selectedClientForFilter === null
                              ? "border-primary bg-primary/10"
                              : "border-border hover:bg-muted/50"
                          )}
                          onClick={() => setSelectedClientForFilter('all')}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="text-sm font-medium">显示所有消息</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            显示来自所有客户端地址的数据报
                          </div>
                        </div>
                      </div>

                      {/* 发送目标区域 */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2 px-1 flex items-center">
                          <Send className="w-3 h-3 mr-1" />
                          发送目标
                        </div>
                        <div
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-colors",
                            broadcastMode
                              ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                              : "border-border hover:bg-muted/50"
                          )}
                          onClick={() => {
                            setBroadcastMode(true);
                            setSelectedClient(null);
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 rounded-full bg-orange-500" />
                              <span className="text-sm font-medium">广播模式</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            向所有客户端地址发送数据报
                          </div>
                        </div>
                      </div>

                      {/* 客户端地址列表 */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2 px-1 flex items-center">
                          <Radio className="w-3 h-3 mr-1" />
                          客户端地址 ({clientConnections.length})
                        </div>
                        {clientConnections.map((client) => (
                        <div
                          key={client.id}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-colors",
                            selectedClientForFilter === client.id
                              ? "border-primary bg-primary/10"
                              : selectedClient === client.id && !broadcastMode
                              ? "border-green-500 bg-green-50/50 dark:bg-green-950/20"
                              : "border-border hover:bg-muted/50"
                          )}
                          onClick={() => {
                            // 双重功能：选择发送目标和过滤消息
                            setSelectedClientForFilter(client.id);
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
                            <div>首次活动: {(client.connectedAt instanceof Date ? client.connectedAt : new Date(client.connectedAt)).toLocaleTimeString()}</div>
                            <div>最后活动: {(client.lastActivity instanceof Date ? client.lastActivity : new Date(client.lastActivity)).toLocaleTimeString()}</div>
                            <div className="flex justify-between">
                              <span>接收: {client.bytesReceived}B</span>
                              <span>发送: {client.bytesSent}B</span>
                            </div>
                          </div>
                        </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 消息流面板 */}
            <div className="flex-1 flex flex-col">
              <div className="h-10 border-b border-border flex items-center justify-between px-3 bg-muted/50">
                <h3 className="text-sm font-medium">
                  消息流 ({filteredMessages.length}
                  {selectedClientForFilter && selectedClientForFilter !== 'all' && (
                    <span className="text-muted-foreground"> - {selectedClientForFilter}</span>
                  )}
                  )
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">显示格式:</span>
                  <DataFormatSelector
                    value={receiveFormat}
                    onChange={setReceiveFormat}
                    className="h-6 text-xs"
                  />
                  <button
                    onClick={handleClearMessages}
                    disabled={filteredMessages.length === 0}
                    className={cn(
                      "p-1 rounded hover:bg-accent transition-colors",
                      filteredMessages.length === 0
                        ? "text-muted-foreground cursor-not-allowed"
                        : "text-foreground hover:text-destructive"
                    )}
                    title="清除消息历史"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    {selectedClientForFilter && selectedClientForFilter !== 'all'
                      ? `暂无来自客户端 ${selectedClientForFilter} 的消息`
                      : '暂无消息'
                    }
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {/* 倒序排序，最新消息在上 */}
                    {[...filteredMessages].reverse().map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "px-3 py-1 text-xs border-l-2 hover:bg-muted/50 transition-colors",
                          message.direction === 'in'
                            ? "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                            : "border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
                        )}
                      >
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className={cn(
                              "text-xs px-1 py-0.5 rounded text-white font-medium",
                              message.direction === 'in' ? "bg-blue-500" : "bg-green-500"
                            )}>
                              {message.direction === 'in' ? '收' : '发'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {(message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)).toLocaleTimeString()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {message.size}B
                            </span>
                            <span className={cn(
                              "text-xs px-1 py-0.5 rounded border",
                              "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                            )}>
                              {receiveFormat.toUpperCase()}
                            </span>
                            {/* 显示来源/目标地址 */}
                            {(message.sourceAddress || message.targetAddress) && (
                              <span className="text-xs px-1 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                {message.direction === 'in' && message.sourceAddress
                                  ? `来自: ${message.sourceAddress.host}:${message.sourceAddress.port}`
                                  : message.direction === 'out' && message.targetAddress
                                  ? `发往: ${message.targetAddress.host}:${message.targetAddress.port}`
                                  : 'UDP'
                                }
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="font-mono text-xs break-all">
                              {formatMessageData(message)}
                            </div>
                            {receiveFormat !== 'hex' && (
                              <div className="text-xs text-muted-foreground">
                                <span className="text-xs font-medium">原始数据: </span>
                                <span className="font-mono">{getRawDataHex(message)}</span>
                              </div>
                            )}
                          </div>
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
            <div className="h-10 border-b border-border flex items-center justify-between px-3 bg-muted/50">
              <h3 className="text-sm font-medium">消息流 ({messages.length})</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">显示格式:</span>
                <DataFormatSelector
                  value={receiveFormat}
                  onChange={setReceiveFormat}
                  className="h-6 text-xs"
                />
                <button
                  onClick={handleClearMessages}
                  disabled={messages.length === 0}
                  className={cn(
                    "p-1 rounded hover:bg-accent transition-colors",
                    messages.length === 0
                      ? "text-muted-foreground cursor-not-allowed"
                      : "text-foreground hover:text-destructive"
                  )}
                  title="清除消息历史"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  暂无消息
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {/* 倒序排序，最新消息在上 */}
                  {[...messages].reverse().map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "px-3 py-1 text-xs border-l-2 hover:bg-muted/50 transition-colors",
                        message.direction === 'in'
                          ? "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                          : "border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
                      )}
                    >
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={cn(
                            "text-xs px-1 py-0.5 rounded text-white font-medium",
                            message.direction === 'in' ? "bg-blue-500" : "bg-green-500"
                          )}>
                            {message.direction === 'in' ? '收' : '发'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)).toLocaleTimeString()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {message.size}B
                          </span>
                          <span className={cn(
                            "text-xs px-1 py-0.5 rounded border",
                            "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          )}>
                            {receiveFormat.toUpperCase()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="font-mono text-xs break-all">
                            {formatMessageData(message)}
                          </div>
                          {receiveFormat !== 'hex' && (
                            <div className="text-xs text-muted-foreground">
                              <span className="text-xs font-medium">原始数据: </span>
                              <span className="font-mono">{getRawDataHex(message)}</span>
                            </div>
                          )}
                        </div>
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
