import React, { useState, useMemo } from 'react';
import { cn } from '@/utils';
import { DataFormatSelector, DataFormat, formatData, validateFormat } from '@/components/DataFormatSelector';
import { useSessionById } from '@/stores/AppStore';
import { networkService } from '@/services/NetworkService';
import { Message } from '@/types';
import {
  Send,
  AlertCircle,
  Play,
  Square,
  Settings,
  WifiOff,
  Loader2,
  Activity
} from 'lucide-react';

interface WebSocketSessionContentProps {
  sessionId: string;
}

export const WebSocketSessionContent: React.FC<WebSocketSessionContentProps> = ({ sessionId }) => {
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

  // WebSocket特定状态
  const [messageType, setMessageType] = useState<'text' | 'binary'>('text');
  const [subprotocol, setSubprotocol] = useState('');

  // 从会话状态获取数据
  const config = session?.config;
  const connectionStatus = session?.status || 'disconnected';
  const messages = session?.messages || [];
  const statistics = session?.statistics;
  const connectionError = session?.error;

  // 计算WebSocket特定统计信息
  const wsStats = useMemo(() => {
    const baseStats = {
      messagesReceived: messages.filter(m => m.direction === 'in').length,
      messagesSent: messages.filter(m => m.direction === 'out').length,
      bytesReceived: statistics?.bytesReceived || 0,
      bytesSent: statistics?.bytesSent || 0,
      errors: statistics?.errors || 0,
      connectionTime: 0, // 连接持续时间（秒）
      avgMessageSize: 0,
      messageRate: 0, // 消息/秒
      lastMessageTime: messages.length > 0 ? messages[messages.length - 1].timestamp : null,
      // WebSocket特有统计
      textMessages: 0,
      binaryMessages: 0,
      pingPongMessages: 0,
      connectionUptime: 0,
    };

    // 计算平均消息大小
    const totalMessages = baseStats.messagesReceived + baseStats.messagesSent;
    if (totalMessages > 0) {
      baseStats.avgMessageSize = Math.round((baseStats.bytesReceived + baseStats.bytesSent) / totalMessages);
    }

    // 计算消息速率 (简化计算，基于最近的消息)
    if (messages.length > 1) {
      const recentMessages = messages.slice(-10); // 最近10条消息
      const timeSpan = recentMessages[recentMessages.length - 1].timestamp.getTime() - recentMessages[0].timestamp.getTime();
      if (timeSpan > 0) {
        baseStats.messageRate = Math.round((recentMessages.length * 1000) / timeSpan); // 消息/秒
      }
    }

    // WebSocket特有统计：按消息类型分类
    messages.forEach(message => {
      // 这里需要根据实际的消息类型字段来判断
      // 暂时使用简化逻辑
      if (message.raw && message.raw.includes('ping') || message.raw && message.raw.includes('pong')) {
        baseStats.pingPongMessages++;
      } else if (message.size > 0) {
        // 简化判断：假设小于1KB的是文本消息，大于1KB的是二进制消息
        if (message.size < 1024) {
          baseStats.textMessages++;
        } else {
          baseStats.binaryMessages++;
        }
      }
    });

    // 计算连接时长（如果已连接）
    if (connectionStatus === 'connected' && session?.connectedAt) {
      baseStats.connectionUptime = Math.round((Date.now() - session.connectedAt.getTime()) / 1000);
    }

    return baseStats;
  }, [statistics, messages, connectionStatus, session?.connectedAt]);

  // WebSocket连接状态检查
  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';

  // 处理WebSocket连接
  const handleConnect = async () => {
    if (!config) return;

    try {
      if (isConnected) {
        // 断开连接
        setIsConnectingLocal(true);
        const success = await networkService.disconnect(sessionId);
        if (!success) {
          console.error('Failed to disconnect WebSocket');
        }
      } else {
        // 建立连接
        setIsConnectingLocal(true);
        const success = await networkService.connect(sessionId);
        if (!success) {
          console.error('Failed to connect WebSocket');
        }
      }
    } catch (error) {
      console.error('WebSocket connection operation failed:', error);
    } finally {
      setIsConnectingLocal(false);
    }
  };

  // 处理发送WebSocket消息
  const handleSendMessage = async () => {
    if (!config || isSending || !isConnected) return;

    if (!validateFormat[sendFormat](sendData)) {
      setFormatError(`无效的${sendFormat.toUpperCase()}格式`);
      return;
    }

    setFormatError(null);
    setIsSending(true);

    try {
      const dataBytes = formatData.from[sendFormat](sendData);

      // WebSocket支持文本和二进制消息
      let success = false;
      if (messageType === 'text') {
        // 发送文本消息
        const textData = new TextDecoder().decode(dataBytes);
        success = await networkService.sendWebSocketMessage(sessionId, textData, 'text');
      } else {
        // 发送二进制消息
        success = await networkService.sendWebSocketMessage(sessionId, dataBytes, 'binary');
      }

      if (success) {
        setSendData('');
        setFormatError(null);
      } else {
        setFormatError('发送失败：WebSocket连接错误');
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
      {/* WebSocket工具栏 */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center space-x-2">
          {/* 状态图标 */}
          {connectionStatus === 'connected' && <Activity className="w-4 h-4 text-green-500" />}
          {connectionStatus === 'connecting' && <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />}
          {connectionStatus === 'disconnected' && <WifiOff className="w-4 h-4 text-gray-500" />}
          {connectionStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}

          <span className="text-sm font-medium">WebSocket {config.connectionType}</span>
          <span className="text-xs text-muted-foreground">
            {config.host}:{config.port}
          </span>

          {/* 连接错误信息 */}
          {connectionError && (
            <span className="text-xs text-red-500 max-w-48 truncate" title={connectionError}>
              {connectionError}
            </span>
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
                <span>{isConnected ? '断开中...' : '连接中...'}</span>
              </>
            ) : isConnected ? (
              <>
                <Square className="w-3 h-3" />
                <span>断开</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>连接</span>
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
            {isConnected ? '已连接' : '未连接'}
          </span>
        </div>
      </div>

      {/* 发送面板 */}
      <div className="h-40 border-b border-border bg-card p-4">
        <div className="flex items-start space-x-3 h-full">
          <div className="flex-1 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-muted-foreground">数据格式:</span>
                  <DataFormatSelector value={sendFormat} onChange={setSendFormat} size="sm" />
                </div>

                {/* WebSocket消息类型选择 */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-muted-foreground">消息类型:</span>
                  <select
                    value={messageType}
                    onChange={(e) => setMessageType(e.target.value as 'text' | 'binary')}
                    className="px-2 py-1 text-xs bg-background border border-border rounded"
                  >
                    <option value="text">文本</option>
                    <option value="binary">二进制</option>
                  </select>
                </div>

                {/* 子协议设置 */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-muted-foreground">子协议:</span>
                  <input
                    type="text"
                    value={subprotocol}
                    onChange={(e) => setSubprotocol(e.target.value)}
                    placeholder="可选"
                    className="px-2 py-1 text-xs bg-background border border-border rounded w-20"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  connectionStatus === 'connected' ? "bg-green-500" :
                  connectionStatus === 'connecting' ? "bg-yellow-500 animate-pulse" :
                  connectionStatus === 'error' ? "bg-red-500" : "bg-gray-500"
                )} />
                <span className="text-xs text-muted-foreground">
                  {connectionStatus === 'connected' ? "已连接" :
                   connectionStatus === 'connecting' ? "连接中" :
                   connectionStatus === 'error' ? "连接错误" : "未连接"}
                </span>
              </div>
            </div>

            <textarea
              value={sendData}
              onChange={(e) => handleSendDataChange(e.target.value)}
              placeholder="输入WebSocket消息内容..."
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

          <div className="flex flex-col space-y-2">
            <button
              onClick={handleSendMessage}
              disabled={isSending || !isConnected || !sendData.trim()}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                "flex items-center space-x-2 min-w-20",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                !isSending && sendData.trim() && isConnected
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
                  <span>发送</span>
                </>
              )}
            </button>

            {/* 连接状态提示 */}
            {!isConnected && (
              <div className="text-xs text-muted-foreground text-center">
                请先建立连接
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 统计信息面板 */}
      {showAdvancedStats && (
        <div className="h-32 border-b border-border bg-card p-4">
          <div className="h-full">
            <h3 className="text-sm font-medium mb-3">WebSocket统计</h3>
            <div className="grid grid-cols-8 gap-4 h-20">
              {/* 基础统计 */}
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {wsStats.messagesReceived}
                </div>
                <div className="text-xs text-muted-foreground">接收消息</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {wsStats.messagesSent}
                </div>
                <div className="text-xs text-muted-foreground">发送消息</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-500">
                  {wsStats.bytesReceived}
                </div>
                <div className="text-xs text-muted-foreground">接收字节</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-500">
                  {wsStats.bytesSent}
                </div>
                <div className="text-xs text-muted-foreground">发送字节</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-500">
                  {wsStats.avgMessageSize}B
                </div>
                <div className="text-xs text-muted-foreground">平均消息大小</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-500">
                  {wsStats.messageRate}/s
                </div>
                <div className="text-xs text-muted-foreground">消息速率</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-cyan-500">
                  {wsStats.textMessages}
                </div>
                <div className="text-xs text-muted-foreground">文本消息</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-indigo-500">
                  {wsStats.connectionUptime}s
                </div>
                <div className="text-xs text-muted-foreground">连接时长</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="h-10 border-b border-border flex items-center px-3 bg-muted/50">
            <h3 className="text-sm font-medium">WebSocket消息流 ({messages.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                暂无WebSocket消息
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
                          WebSocket
                        </span>
                        {/* 消息类型标识 */}
                        <span className={cn(
                          "text-xs px-2 py-1 rounded",
                          message.size < 1024
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                        )}>
                          {message.size < 1024 ? '文本' : '二进制'}
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
    </div>
  );
};
