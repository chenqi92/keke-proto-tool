import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/utils';
import { DataFormatSelector, DataFormat, formatData } from '@/components/DataFormatSelector';
import { useAppStore, useSessionById } from '@/stores/AppStore';
import { networkService } from '@/services/NetworkService';
import { Message, ClientConnection } from '@/types';
import {
  Wifi,
  Send,
  AlertCircle,
  WifiOff,
  Loader2,
  Activity,
  Clock,
  Database,
  TrendingUp,
  Users,
  X,
  Trash2
} from 'lucide-react';

interface TCPClientDetailContentProps {
  sessionId: string;
  clientId: string;
  clientConnection: ClientConnection;
}

export const TCPClientDetailContent: React.FC<TCPClientDetailContentProps> = ({
  sessionId,
  clientId,
  clientConnection
}) => {
  // 从全局状态获取会话数据
  const session = useSessionById(sessionId);
  const clearMessages = useAppStore(state => state.clearMessages);
  const getClientConnection = useAppStore(state => state.getClientConnection);
  const setSelectedNode = useAppStore(state => state.setSelectedNode);

  // 本地UI状态
  const [sendFormat, setSendFormat] = useState<DataFormat>('ascii');
  const [receiveFormat] = useState<DataFormat>('ascii');
  const [sendData, setSendData] = useState('');
  const [formatError, setFormatError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const [isClientDisconnected, setIsClientDisconnected] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // 从会话状态获取数据
  const config = session?.config;
  const connectionStatus = session?.status || 'disconnected';
  const messages = session?.messages || [];
  const statistics = session?.statistics;

  // 过滤出与该客户端相关的消息
  const clientMessages = useMemo(() => {
    return messages.filter(message => 
      message.sourceClientId === clientId || 
      message.targetClientId === clientId
    );
  }, [messages, clientId]);

  // 计算客户端特定统计信息
  const clientStats = useMemo(() => {
    const clientMsgs = clientMessages;
    const receivedMsgs = clientMsgs.filter(m => m.direction === 'in');
    const sentMsgs = clientMsgs.filter(m => m.direction === 'out');

    // 确保 connectedAt 是 Date 对象
    const connectedAt = clientConnection.connectedAt instanceof Date
      ? clientConnection.connectedAt
      : new Date(clientConnection.connectedAt);

    return {
      totalMessages: clientMsgs.length,
      receivedMessages: receivedMsgs.length,
      sentMessages: sentMsgs.length,
      bytesReceived: clientConnection.bytesReceived,
      bytesSent: clientConnection.bytesSent,
      connectionDuration: Math.floor((new Date().getTime() - connectedAt.getTime()) / 1000),
      lastActivity: clientConnection.lastActivity,
      isActive: clientConnection.isActive
    };
  }, [clientMessages, clientConnection]);

  // 处理发送消息到该客户端
  const handleSendMessage = async () => {
    if (!config || connectionStatus !== 'connected' || isSending) return;

    if (!sendData.trim()) {
      setFormatError('请输入要发送的数据');
      return;
    }

    setFormatError(null);
    setIsSending(true);

    try {
      const dataBytes = formatData.from[sendFormat](sendData);
      const success = await networkService.sendToClient(sessionId, clientId, dataBytes);

      if (success) {
        console.log(`TCP Server: 消息发送成功到客户端 ${clientId}`);
        setSendData('');
        setFormatError(null);
      } else {
        const errorMsg = '发送失败：网络错误或连接已断开';
        console.error(`TCP Server: ${errorMsg}`);
        setFormatError(errorMsg);
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
    if (clientMessages.length > 0) {
      clearMessages(sessionId);
      console.log(`TCP客户端 ${clientId}: 已清除 ${clientMessages.length} 条消息记录`);
    }
  };

  // 初始化状态管理
  useEffect(() => {
    // 标记初始加载完成
    const initTimeout = setTimeout(() => {
      setIsInitialLoad(false);
    }, 1000); // 1秒后认为初始加载完成

    return () => {
      clearTimeout(initTimeout);
    };
  }, []);

  // 监听客户端连接状态变化
  useEffect(() => {
    // 如果还在初始加载阶段，不进行检查
    if (isInitialLoad) {
      return;
    }

    // 检查客户端连接是否还存在
    const checkClientConnection = () => {
      const currentConnection = getClientConnection(sessionId, clientId);
      if (!currentConnection) {
        console.log(`TCP客户端详情页面: 客户端 ${clientId} 已断开连接`);
        setIsClientDisconnected(true);
      }
    };

    // 立即检查一次
    checkClientConnection();

    // 设置定时检查（每秒检查一次）
    const interval = setInterval(checkClientConnection, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [sessionId, clientId, getClientConnection, setSelectedNode, isInitialLoad]);

  // 断开该客户端连接
  const handleDisconnectClient = async () => {
    try {
      await networkService.disconnectClient(sessionId, clientId);
    } catch (error) {
      console.error('断开客户端连接失败:', error);
    }
  };

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

  // 如果客户端已断开连接，显示断开状态页面
  if (isClientDisconnected) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <WifiOff className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-600 mb-2">客户端已断开连接</h3>
          <p className="text-sm text-muted-foreground">
            TCP客户端 {clientConnection.remoteAddress}:{clientConnection.remotePort} 已断开连接
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* TCP客户端详情工具栏 */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center space-x-2">
          {/* 状态图标 */}
          {clientConnection.isActive ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-gray-500" />
          )}

          <span className="text-sm font-medium">TCP客户端详情</span>
          <span className="text-xs text-muted-foreground">
            {clientConnection.remoteAddress}:{clientConnection.remotePort}
          </span>
        </div>

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
            <Activity className="w-3 h-3" />
            <span>统计</span>
          </button>

          <button
            onClick={handleDisconnectClient}
            className="flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            <X className="w-3 h-3" />
            <span>断开连接</span>
          </button>
        </div>
      </div>

      {/* 客户端统计信息面板 */}
      {showAdvancedStats && (
        <div className="h-32 border-b border-border bg-card p-4">
          <div className="h-full">
            <h3 className="text-sm font-medium mb-3 text-blue-600">
              📊 客户端统计面板 - {clientConnection.remoteAddress}:{clientConnection.remotePort}
            </h3>
            <div className="grid grid-cols-6 gap-4 h-20">
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {clientStats.bytesReceived}
                </div>
                <div className="text-xs text-muted-foreground">接收字节</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {clientStats.bytesSent}
                </div>
                <div className="text-xs text-muted-foreground">发送字节</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {clientStats.totalMessages}
                </div>
                <div className="text-xs text-muted-foreground">消息数</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-500">
                  {clientStats.connectionDuration}s
                </div>
                <div className="text-xs text-muted-foreground">连接时长</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-500">
                  {clientStats.receivedMessages}
                </div>
                <div className="text-xs text-muted-foreground">接收消息</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-500">
                  {clientStats.sentMessages}
                </div>
                <div className="text-xs text-muted-foreground">发送消息</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 发送面板 */}
      <div className="h-32 border-b border-border bg-card p-4">
        <div className="flex items-stretch space-x-3 h-full">
          <div className="flex-1 flex flex-col space-y-2">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-muted-foreground">数据格式:</span>
                <DataFormatSelector value={sendFormat} onChange={setSendFormat} size="sm" />
              </div>
              <div className="text-xs text-muted-foreground">
                发送到: {clientConnection.remoteAddress}:{clientConnection.remotePort}
              </div>
            </div>
            
            <textarea
              value={sendData}
              onChange={(e) => handleSendDataChange(e.target.value)}
              placeholder="输入要发送给该客户端的数据..."
              className="flex-1 resize-none bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            
            {formatError && (
              <div className="text-xs text-red-500">{formatError}</div>
            )}
          </div>
          
          <div className="flex flex-col justify-end">
            <button
              onClick={handleSendMessage}
              disabled={
                connectionStatus !== 'connected' ||
                !sendData.trim() ||
                isSending ||
                !clientConnection.isActive
              }
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                "flex items-center space-x-2 min-w-20",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                connectionStatus === 'connected' && sendData.trim() && !isSending && clientConnection.isActive
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
          </div>
        </div>
      </div>

      {/* 消息流面板 - 极简展示 */}
      <div className="flex-1 flex flex-col">
        <div className="h-10 border-b border-border flex items-center justify-between px-3 bg-muted/50">
          <h3 className="text-sm font-medium">客户端消息流 ({clientMessages.length})</h3>
          <button
            onClick={handleClearMessages}
            disabled={clientMessages.length === 0}
            className={cn(
              "p-1 rounded hover:bg-accent transition-colors",
              clientMessages.length === 0
                ? "text-muted-foreground cursor-not-allowed"
                : "text-foreground hover:text-destructive"
            )}
            title="清除消息历史"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {clientMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              暂无与该客户端的消息记录
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {/* 倒序排序，最新消息在上 */}
              {[...clientMessages].reverse().map((message) => (
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
    </div>
  );
};
