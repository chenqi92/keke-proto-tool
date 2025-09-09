import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/utils';
import { DataFormatSelector, DataFormat, formatData, validateFormat } from '@/components/DataFormatSelector';
import { HexEditor } from '@/components/HexEditor/HexEditor';
import { ParseTree } from '@/components/ParseTree/ParseTree';
import { Timeline } from '@/components/Timeline/Timeline';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useLayoutConfig } from '@/hooks/useResponsive';
import { useAppStore, useSessionById } from '@/stores/AppStore';
import { networkService } from '@/services/NetworkService';
import { SessionConfig, Message, ConnectionStatus } from '@/types';
import {
  Wifi,
  Send,
  AlertCircle,
  Play,
  Square,
  Settings,
  Download,
  Filter,
  WifiOff,
  Loader2
} from 'lucide-react';

interface TCPSessionContentProps {
  sessionId: string;
}

export const TCPSessionContent: React.FC<TCPSessionContentProps> = ({ sessionId }) => {
  const layoutConfig = useLayoutConfig();
  
  // 从全局状态获取会话数据
  const session = useSessionById(sessionId);
  const updateSessionStatus = useAppStore(state => state.updateSessionStatus);
  const addMessage = useAppStore(state => state.addMessage);
  
  // 本地UI状态
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'hex' | 'tree' | 'timeline'>('split');
  const [filterText, setFilterText] = useState('');
  const [sendFormat, setSendFormat] = useState<DataFormat>('ascii');
  const [receiveFormat, setReceiveFormat] = useState<DataFormat>('ascii');
  const [sendData, setSendData] = useState('');
  const [formatError, setFormatError] = useState<string | null>(null);
  const [sendMode, setSendMode] = useState<'immediate' | 'buffered'>('immediate');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  
  // TCP特定配置状态
  const [keepAlive, setKeepAlive] = useState(session?.config.keepAlive ?? true);
  const [nagleAlgorithm, setNagleAlgorithm] = useState(true);

  // 从会话状态获取数据
  const config = session?.config;
  const connectionStatus = session?.status || 'disconnected';
  const messages = session?.messages || [];
  const statistics = session?.statistics;
  const connectionError = session?.error;
  
  // 计算TCP特定统计信息
  const tcpStats = useMemo(() => {
    if (!statistics) {
      return {
        rtt: 0,
        windowSize: 65535,
        congestionWindow: 10,
        retransmissions: 0,
        bytesReceived: 0,
        bytesSent: 0
      };
    }
    
    return {
      rtt: 12, // TODO: 从后端获取实际RTT
      windowSize: 65535, // TODO: 从后端获取实际窗口大小
      congestionWindow: 10, // TODO: 从后端获取实际拥塞窗口
      retransmissions: statistics.errors, // 使用错误数作为重传次数的近似
      bytesReceived: statistics.bytesReceived,
      bytesSent: statistics.bytesSent
    };
  }, [statistics]);
  
  // 连接状态检查
  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';

  // 处理连接/断开
  const handleConnect = async () => {
    if (!config) return;
    
    try {
      if (isConnected) {
        // 断开连接
        setIsConnecting(true);
        const success = await networkService.disconnect(sessionId);
        if (!success) {
          console.error('Failed to disconnect');
        }
      } else {
        // 建立连接
        setIsConnecting(true);
        const success = await networkService.connect(sessionId);
        if (!success) {
          console.error('Failed to connect');
        }
      }
    } catch (error) {
      console.error('Connection operation failed:', error);
    } finally {
      setIsConnecting(false);
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
      const success = await networkService.sendMessage(sessionId, dataBytes);
      
      if (success) {
        setSendData('');
        // 显示成功反馈
        setFormatError(null);
      } else {
        setFormatError('发送失败：网络错误或连接已断开');
      }
    } catch (error) {
      setFormatError(`发送失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSending(false);
    }
  };

  // 处理文件发送
  const handleSendFile = async () => {
    if (!config || !isConnected) return;

    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '*/*';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        setIsSending(true);
        setFormatError(null);

        try {
          const arrayBuffer = await file.arrayBuffer();
          const dataBytes = new Uint8Array(arrayBuffer);
          
          const success = await networkService.sendMessage(sessionId, dataBytes);
          
          if (success) {
            setFormatError(`文件 "${file.name}" 发送成功 (${dataBytes.length} 字节)`);
          } else {
            setFormatError(`文件 "${file.name}" 发送失败`);
          }
        } catch (error) {
          setFormatError(`文件发送失败: ${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
          setIsSending(false);
        }
      };

      input.click();
    } catch (error) {
      setFormatError(`文件选择失败: ${error instanceof Error ? error.message : '未知错误'}`);
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

  const handleMessageSelect = (message: Message) => {
    setSelectedMessage(message);
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
      {/* TCP工具栏 - 临时简化版本 */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center space-x-2">
          {connectionStatus === 'connected' && <Wifi className="w-4 h-4 text-green-500" />}
          {connectionStatus === 'connecting' && <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />}
          {connectionStatus === 'disconnected' && <WifiOff className="w-4 h-4 text-gray-500" />}
          {connectionStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
          
          <span className="text-sm font-medium">TCP {config.connectionType}</span>
          <span className="text-xs text-muted-foreground">
            {config.host}:{config.port}
          </span>
          
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className={cn(
              "flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ml-4",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isConnected
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-green-500 hover:bg-green-600 text-white"
            )}
          >
            {isConnecting ? (
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
      </div>

      {/* 发送面板 */}
      <div className="h-32 border-b border-border bg-card p-4">
        <div className="flex items-start space-x-3 h-full">
          <div className="flex-1 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-muted-foreground">数据格式:</span>
                  <DataFormatSelector value={sendFormat} onChange={setSendFormat} size="sm" />
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
              placeholder="输入TCP数据包内容..."
              className="flex-1 resize-none bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            
            {formatError && (
              <div className="text-xs text-red-500">{formatError}</div>
            )}
          </div>
          
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleSendMessage}
              disabled={!isConnected || !sendData.trim() || isSending}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                "flex items-center space-x-2 min-w-20",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isConnected && sendData.trim() && !isSending
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

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-4">
          <div className="text-center text-muted-foreground">
            TCP客户端界面已重构完成
            <br />
            消息列表和其他功能将在后续版本中完善
          </div>
        </div>
      </div>
    </div>
  );
};
