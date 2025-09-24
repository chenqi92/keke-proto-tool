import React, { useState, useMemo } from 'react';
import { cn } from '@/utils';
import { DataFormatSelector, DataFormat, formatData } from '@/components/DataFormatSelector';
import { useAppStore, useSessionById } from '@/stores/AppStore';
import { networkService } from '@/services/NetworkService';
import { Message, ClientConnection } from '@/types';
import {
  Radio,
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

interface UDPClientDetailContentProps {
  sessionId: string;
  clientId: string;
  clientConnection: ClientConnection;
}

export const UDPClientDetailContent: React.FC<UDPClientDetailContentProps> = ({ 
  sessionId, 
  clientId, 
  clientConnection 
}) => {
  // 从全局状态获取会话数据
  const session = useSessionById(sessionId);
  const clearMessages = useAppStore(state => state.clearMessages);
  
  // 本地UI状态
  const [sendFormat, setSendFormat] = useState<DataFormat>('ascii');
  const [receiveFormat] = useState<DataFormat>('ascii');
  const [sendData, setSendData] = useState('');
  const [formatError, setFormatError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);

  // 获取会话配置
  const config = session?.config;

  // 获取该客户端的消息
  const messages = session?.messages || [];
  const clientMessages = useMemo(() => {
    return messages.filter(msg => msg.sourceClientId === clientId || msg.targetClientId === clientId);
  }, [messages, clientId]);

  // 计算客户端统计信息
  const clientStats = useMemo(() => {
    let bytesReceived = 0;
    let bytesSent = 0;
    let packetsReceived = 0;
    let packetsSent = 0;
    let firstActivity = clientConnection.connectedAt;
    let lastActivity = clientConnection.connectedAt;

    clientMessages.forEach(message => {
      if (message.direction === 'in') {
        bytesReceived += message.size || 0;
        packetsReceived++;
      } else if (message.direction === 'out') {
        bytesSent += message.size || 0;
        packetsSent++;
      }

      const messageTime = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
      if (messageTime > lastActivity) {
        lastActivity = messageTime;
      }
      if (messageTime < firstActivity) {
        firstActivity = messageTime;
      }
    });

    return {
      bytesReceived,
      bytesSent,
      packetsReceived,
      packetsSent,
      totalMessages: clientMessages.length,
      firstActivity,
      lastActivity,
      sessionDuration: lastActivity.getTime() - firstActivity.getTime()
    };
  }, [clientMessages, clientConnection.connectedAt]);

  // 发送数据到该客户端
  const handleSendData = async () => {
    if (!sendData.trim() || isSending) return;

    try {
      setIsSending(true);
      setFormatError(null);

      // 将数据转换为字节数组
      const dataBytes = formatData.from[sendFormat](sendData);
      
      // 发送数据到指定客户端
      await networkService.sendUDPMessage(
        sessionId,
        dataBytes,
        clientConnection.remoteAddress,
        clientConnection.remotePort
      );

      // 清空发送框
      setSendData('');
      console.log(`UDP服务端: 成功发送 ${dataBytes.length} 字节到客户端 ${clientConnection.remoteAddress}:${clientConnection.remotePort}`);
    } catch (error: any) {
      console.error('UDP发送失败:', error);
      if (error.message?.includes('Invalid')) {
        setFormatError(`数据格式错误: ${error.message}`);
      } else {
        setFormatError('发送失败，请检查连接状态');
      }
    } finally {
      setIsSending(false);
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

  // 清除该客户端的消息历史
  const handleClearClientMessages = () => {
    if (clientMessages.length > 0) {
      // 清除所有消息，然后重新添加不属于该客户端的消息
      const allMessages = messages;
      const otherMessages = allMessages.filter(msg =>
        msg.sourceClientId !== clientId && msg.targetClientId !== clientId
      );
      
      clearMessages(sessionId);
      
      // 重新添加其他客户端的消息
      otherMessages.forEach(msg => {
        useAppStore.getState().addMessage(sessionId, msg);
      });
      
      console.log(`UDP客户端详情: 已清除客户端 ${clientId} 的 ${clientMessages.length} 条消息记录`);
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

  return (
    <div className="h-full flex flex-col">
      {/* UDP客户端详情工具栏 */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center space-x-2">
          {/* 状态图标 */}
          {clientConnection.isActive ? (
            <Radio className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-gray-500" />
          )}

          <span className="text-sm font-medium">UDP客户端详情</span>
          <span className="text-xs text-muted-foreground">
            {clientConnection.remoteAddress}:{clientConnection.remotePort}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvancedStats(!showAdvancedStats)}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              showAdvancedStats
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {showAdvancedStats ? '隐藏统计' : '显示统计'}
          </button>
        </div>
      </div>

      {/* 客户端统计信息面板 */}
      {showAdvancedStats && (
        <div className="h-32 border-b border-border bg-card p-4">
          <div className="h-full">
            <h3 className="text-sm font-medium mb-3 text-blue-600">
              📊 UDP客户端统计 - {clientConnection.remoteAddress}:{clientConnection.remotePort}
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
                  {clientStats.packetsReceived}
                </div>
                <div className="text-xs text-muted-foreground">接收包数</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {clientStats.packetsSent}
                </div>
                <div className="text-xs text-muted-foreground">发送包数</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {clientStats.totalMessages}
                </div>
                <div className="text-xs text-muted-foreground">总消息数</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {Math.round(clientStats.sessionDuration / 1000)}s
                </div>
                <div className="text-xs text-muted-foreground">会话时长</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 消息流面板 */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="h-10 border-b border-border flex items-center justify-between px-3 bg-muted/50 flex-shrink-0">
            <h3 className="text-sm font-medium">客户端消息流 ({clientMessages.length})</h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">显示格式:</span>
              <DataFormatSelector
                value={receiveFormat}
                onChange={() => {}} // 只读
                className="h-6 text-xs"
              />
              <button
                onClick={handleClearClientMessages}
                disabled={clientMessages.length === 0}
                className={cn(
                  "p-1 rounded hover:bg-accent transition-colors",
                  clientMessages.length === 0
                    ? "text-muted-foreground cursor-not-allowed"
                    : "text-foreground hover:text-destructive"
                )}
                title="清除该客户端的消息历史"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 max-h-full">
            {clientMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                该客户端暂无消息记录
              </div>
            ) : (
              <div className="space-y-1 p-2 h-full overflow-y-auto">
                {/* 倒序排序，最新消息在上 */}
                {[...clientMessages].reverse().map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "px-3 py-1 text-xs border-l-2 hover:bg-muted/50 transition-colors",
                      message.direction === 'in'
                        ? "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                        : "border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
                    )}
                  >
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            message.direction === 'in' ? "bg-blue-500" : "bg-green-500"
                          )} />
                          <span className={cn(
                            "text-xs font-medium",
                            message.direction === 'in' ? "text-blue-700 dark:text-blue-300" : "text-green-700 dark:text-green-300"
                          )}>
                            {message.direction === 'in' ? '接收' : '发送'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {message.size}B
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                        {/* UDP协议标识 */}
                        <span className="text-xs px-1 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          UDP
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

        {/* 发送面板 */}
        <div className="h-32 border-t border-border bg-card p-4">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">发送到该客户端</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">数据格式:</span>
                <DataFormatSelector
                  value={sendFormat}
                  onChange={setSendFormat}
                  className="h-6 text-xs"
                />
              </div>
            </div>
            
            <div className="flex-1 flex space-x-2">
              <div className="flex-1 flex flex-col">
                <textarea
                  value={sendData}
                  onChange={(e) => {
                    setSendData(e.target.value);
                    setFormatError(null);
                  }}
                  placeholder={`输入要发送的${sendFormat.toUpperCase()}数据...`}
                  className={cn(
                    "flex-1 resize-none border rounded px-3 py-2 text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                    formatError ? "border-red-500" : "border-input"
                  )}
                />
                {formatError && (
                  <div className="text-xs text-red-500 mt-1">{formatError}</div>
                )}
              </div>
              
              <button
                onClick={handleSendData}
                disabled={!sendData.trim() || isSending}
                className={cn(
                  "px-4 py-2 rounded font-medium text-sm transition-colors flex items-center space-x-2",
                  !sendData.trim() || isSending
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isSending ? '发送中...' : '发送'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
