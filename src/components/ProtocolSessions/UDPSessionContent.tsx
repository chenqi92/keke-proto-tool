import React, { useState, useMemo } from 'react';
import { cn } from '@/utils';
import { DataFormatSelector, DataFormat, formatData, validateFormat } from '@/components/DataFormatSelector';
import { useAppStore, useSessionById } from '@/stores/AppStore';
import { networkService } from '@/services/NetworkService';
import { ConnectionErrorBanner } from '@/components/Common/ConnectionErrorBanner';
import { ConnectionManagementPanel } from '@/components/Session';
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
  Edit3
} from 'lucide-react';

interface UDPSessionContentProps {
  sessionId: string;
}

export const UDPSessionContent: React.FC<UDPSessionContentProps> = ({ sessionId }) => {
  // 从全局状态获取会话数据
  const session = useSessionById(sessionId);


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

  // UDP特定状态
  const [targetHost, setTargetHost] = useState('');
  const [targetPort, setTargetPort] = useState(9090);
  const [broadcastMode, setBroadcastMode] = useState(false);

  // UDP服务端特定状态
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  // 从会话状态获取数据
  const config = session?.config;
  const connectionStatus = session?.status || 'disconnected';
  const messages = session?.messages || [];
  const statistics = session?.statistics;
  const connectionError = session?.error;
  
  // 判断是否为服务端模式
  const isServerMode = config?.connectionType === 'server';

  // 获取UDP"客户端连接"列表（基于来源地址，仅服务端模式）
  const clientConnections = useMemo(() => {
    if (!isServerMode) return [];

    // 从消息中提取不同的来源地址，模拟"客户端连接"
    const addressMap = new Map();
    messages.forEach(message => {
      if (message.direction === 'in' && message.sourceAddress) {
        const key = `${message.sourceAddress.host}:${message.sourceAddress.port}`;
        if (!addressMap.has(key)) {
          addressMap.set(key, {
            id: key,
            sessionId,
            remoteAddress: message.sourceAddress.host,
            remotePort: message.sourceAddress.port,
            connectedAt: message.timestamp, // 第一次收到消息的时间
            lastActivity: message.timestamp,
            bytesReceived: 0,
            bytesSent: 0,
            isActive: true,
          });
        }
        const client = addressMap.get(key);
        client.lastActivity = message.timestamp;
        client.bytesReceived += message.size;
      }
    });

    // 计算发送字节数
    messages.forEach(message => {
      if (message.direction === 'out' && message.targetAddress) {
        const key = `${message.targetAddress.host}:${message.targetAddress.port}`;
        const client = addressMap.get(key);
        if (client) {
          client.bytesSent += message.size;
        }
      }
    });

    // 标记超过5分钟无活动的客户端为非活跃
    const now = new Date();
    Array.from(addressMap.values()).forEach(client => {
      const inactiveTime = now.getTime() - client.lastActivity.getTime();
      client.isActive = inactiveTime < 5 * 60 * 1000; // 5分钟
    });

    return Array.from(addressMap.values()).sort((a, b) =>
      b.lastActivity.getTime() - a.lastActivity.getTime()
    );
  }, [isServerMode, sessionId, messages]);
  
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
        return sum + (now.getTime() - client.connectedAt.getTime());
      }, 0);
      baseStats.avgClientActivity = Math.round(totalActivityTime / clientConnections.length / 1000); // 秒
    }

    return baseStats;
  }, [statistics, messages, isServerMode, clientConnections]);
  
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

    // UDP客户端模式需要目标地址
    if (!isServerMode && (!targetHost || !targetPort)) {
      setFormatError('请设置目标主机和端口');
      return;
    }

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
        // 客户端模式：发送到指定目标
        success = await networkService.sendUDPMessage(sessionId, dataBytes, targetHost, targetPort);
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
      <div className={cn("border-b border-border bg-card p-4", isServerMode ? "h-40" : "h-48")}>
        <div className="flex items-stretch space-x-3 h-full">
          <div className="flex-1 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-muted-foreground">数据格式:</span>
                  <DataFormatSelector value={sendFormat} onChange={setSendFormat} size="sm" />
                </div>

                {/* UDP客户端模式：目标地址设置 */}
                {!isServerMode && (
                  <>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-muted-foreground">目标:</span>
                      <input
                        type="text"
                        value={targetHost}
                        onChange={(e) => setTargetHost(e.target.value)}
                        placeholder="主机地址"
                        className="px-2 py-1 text-xs bg-background border border-border rounded w-24"
                      />
                      <span className="text-xs text-muted-foreground">:</span>
                      <input
                        type="number"
                        value={targetPort}
                        onChange={(e) => setTargetPort(parseInt(e.target.value) || 9090)}
                        placeholder="端口"
                        className="px-2 py-1 text-xs bg-background border border-border rounded w-16"
                        min="1"
                        max="65535"
                      />
                    </div>
                  </>
                )}

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

              {/* 连接管理按钮 - 仅客户端模式显示，右对齐 */}
              <div className="flex justify-end">
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
            <button
              onClick={handleSendMessage}
              disabled={
                isSending ||
                (!isServerMode && (!targetHost || !targetPort)) ||
                (isServerMode && !broadcastMode && !selectedClient) ||
                !sendData.trim()
              }
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                "flex items-center space-x-2 min-w-20",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                !isSending && sendData.trim() &&
                (isServerMode || (targetHost && targetPort))
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

            {/* 发送提示 */}
            {!isServerMode && (!targetHost || !targetPort) && (
              <div className="text-xs text-muted-foreground text-center">
                请设置目标地址
              </div>
            )}
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
          // 服务端模式：双面板布局（客户端地址面板 + 消息流面板）
          <div className="h-full flex">
            {/* 客户端地址面板 */}
            <div className="w-80 border-r border-border flex flex-col">
              <div className="h-10 border-b border-border flex items-center px-3 bg-muted/50">
                <h3 className="text-sm font-medium">客户端地址 ({clientConnections.length})</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {clientConnections.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    暂无客户端地址
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* 广播选项 */}
                    <div
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        broadcastMode
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
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

                    {/* 客户端地址列表 */}
                    {clientConnections.map((client) => (
                      <div
                        key={client.id}
                        className={cn(
                          "p-3 rounded-lg border transition-colors",
                          selectedClient === client.id && !broadcastMode
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
                )}
              </div>
            </div>

            {/* 消息流面板 */}
            <div className="flex-1 flex flex-col">
              <div className="h-10 border-b border-border flex items-center px-3 bg-muted/50">
                <h3 className="text-sm font-medium">UDP数据报流 ({messages.length})</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    暂无UDP数据报
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
                              {(message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)).toLocaleTimeString()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {message.size} 字节
                            </span>
                            <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              UDP
                            </span>
                            {/* 显示来源/目标地址 */}
                            {message.sourceAddress && (
                              <span className="text-xs px-2 py-1 rounded bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200">
                                {message.direction === 'in' ? '来自' : '发往'}: {message.sourceAddress.host}:{message.sourceAddress.port}
                              </span>
                            )}
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
          // 客户端模式：单面板消息流
          <div className="h-full flex flex-col">
            <div className="h-10 border-b border-border flex items-center px-3 bg-muted/50">
              <h3 className="text-sm font-medium">UDP数据报流 ({messages.length})</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  暂无UDP数据报
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
                          <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            UDP
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
