import React, { useState, useMemo } from 'react';
import { cn } from '@/utils';
import { DataFormat, formatData } from '@/components/DataFormatSelector';
import { useSessionById, useAppStore } from '@/stores/AppStore';
import { networkService } from '@/services/NetworkService';
import { ConnectionErrorBanner } from '@/components/Common/ConnectionErrorBanner';
import { Message, SSEEventFilter } from '@/types';
import {
  AlertCircle,
  Play,
  Square,
  Settings,
  WifiOff,
  Loader2,
  Activity,
  Plus,
  X,

  Filter,
  Globe
} from 'lucide-react';

interface SSESessionContentProps {
  sessionId: string;
}

export const SSESessionContent: React.FC<SSESessionContentProps> = ({ sessionId }) => {
  // 从全局状态获取会话数据
  const session = useSessionById(sessionId);

  // 本地UI状态
  const [receiveFormat] = useState<DataFormat>('ascii');
  const [isConnectingLocal, setIsConnectingLocal] = useState(false);
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);

  // SSE特定状态
  const [newEventType, setNewEventType] = useState('');
  const [isAddingFilter, setIsAddingFilter] = useState(false);

  // SSE连接配置状态
  const [serverUrl, setServerUrl] = useState('http://localhost:8080/events');
  const [customHeaders, setCustomHeaders] = useState('');
  const [withCredentials, setWithCredentials] = useState(false);
  const [reconnectTime, setReconnectTime] = useState(3000);
  // const [maxReconnectAttempts] = useState(10); // 暂时未使用，保留以备将来扩展

  // 从会话状态获取数据
  const config = session?.config;
  const connectionStatus = session?.status || 'disconnected';
  const messages = session?.messages || [];
  const connectionError = session?.error;

  // 获取SSE事件过滤器列表
  const eventFilters = useMemo(() => {
    return useAppStore.getState().getSSEEventFilters(sessionId);
  }, [sessionId, session?.sseEventFilters]);

  // 连接状态检查
  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';

  // 处理连接/断开
  const handleConnect = async () => {
    if (!config) return;

    try {
      if (isConnected) {
        setIsConnectingLocal(true);
        const success = await networkService.disconnect(sessionId);
        if (!success) {
          console.error('Failed to disconnect from SSE server');
        }
      } else {
        setIsConnectingLocal(true);
        const success = await networkService.connect(sessionId);
        if (!success) {
          console.error('Failed to connect to SSE server');
        }
      }
    } catch (error) {
      console.error('SSE connection operation failed:', error);
    } finally {
      setIsConnectingLocal(false);
    }
  };

  // 处理添加事件过滤器
  const handleAddEventFilter = async () => {
    if (!config || !isConnected || isAddingFilter || !newEventType.trim()) return;

    setIsAddingFilter(true);

    try {
      const success = await networkService.addSSEEventFilter(sessionId, newEventType.trim());
      if (success) {
        setNewEventType('');
      }
    } catch (error) {
      console.error('Add SSE event filter failed:', error);
    } finally {
      setIsAddingFilter(false);
    }
  };

  // 处理移除事件过滤器
  const handleRemoveEventFilter = async (eventType: string) => {
    if (!config || !isConnected) return;

    try {
      const success = await networkService.removeSSEEventFilter(sessionId, eventType);
      if (!success) {
        console.error('Remove SSE event filter failed');
      }
    } catch (error) {
      console.error('Remove SSE event filter failed:', error);
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
      {/* SSE工具栏 */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center space-x-2">
          {/* 状态图标 */}
          {connectionStatus === 'connected' && <Activity className="w-4 h-4 text-green-500" />}
          {connectionStatus === 'connecting' && <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />}
          {connectionStatus === 'disconnected' && <WifiOff className="w-4 h-4 text-gray-500" />}
          {connectionStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}

          <span className="text-sm font-medium">SSE 客户端</span>

          {/* SSE服务器URL配置 */}
          <div className="flex items-center space-x-2">
            <Globe className="w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              value={serverUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setServerUrl(e.target.value)}
              placeholder="SSE服务器URL"
              className="w-48 px-2 py-1 text-xs bg-background border border-border rounded"
              disabled={isConnected}
            />
          </div>

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

        {/* 统计信息 */}
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
        </div>
      </div>

      {/* 连接错误横幅 */}
      {connectionError && (
        <div className="px-4 pt-4">
          <ConnectionErrorBanner
            error={connectionError}
            onRetry={handleConnect}
            retryLabel="重新连接"
          />
        </div>
      )}

      {/* 事件过滤器配置面板 */}
      <div className="h-40 border-b border-border bg-card p-4">
        <div className="flex items-start space-x-3 h-full">
          <div className="flex-1 flex flex-col space-y-3">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">事件过滤器配置</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-muted-foreground">重连间隔:</span>
                <input
                  type="number"
                  value={reconnectTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReconnectTime(parseInt(e.target.value) || 3000)}
                  className="w-16 px-2 py-1 text-xs bg-background border border-border rounded"
                  disabled={isConnected}
                  min="1000"
                  max="60000"
                  step="1000"
                />
                <span className="text-xs text-muted-foreground">ms</span>
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-1 text-xs">
                  <input
                    type="checkbox"
                    checked={withCredentials}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWithCredentials(e.target.checked)}
                    className="w-3 h-3"
                    disabled={isConnected}
                  />
                  <span>发送凭据</span>
                </label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-muted-foreground">事件类型:</span>
              <input
                type="text"
                value={newEventType}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEventType(e.target.value)}
                placeholder="例如: message, notification, update"
                className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded"
              />
            </div>

            <div className="flex-1">
              <div className="text-xs font-medium text-muted-foreground mb-1">自定义请求头:</div>
              <textarea
                value={customHeaders}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomHeaders(e.target.value)}
                placeholder="每行一个，格式: Header-Name: value"
                className="w-full h-16 resize-none bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={isConnected}
              />
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleAddEventFilter}
              disabled={!isConnected || !newEventType.trim() || isAddingFilter}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                "flex items-center space-x-2 min-w-20",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isConnected && newEventType.trim() && !isAddingFilter
                  ? "bg-blue-500 hover:bg-blue-600 text-white hover:scale-105"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isAddingFilter ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>添加中...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>添加过滤器</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区域：单面板布局 */}
      <div className="flex-1 overflow-hidden flex">
        {/* 事件过滤器面板 */}
        <div className="w-80 border-r border-border bg-card">
          <div className="h-full flex flex-col">
            <div className="h-10 border-b border-border flex items-center px-3 bg-muted/50">
              <h3 className="text-sm font-medium">事件过滤器 ({eventFilters.length})</h3>
            </div>
            
            {/* 过滤器列表 */}
            <div className="flex-1 overflow-y-auto">
              {eventFilters.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {isConnected ? '暂无事件过滤器' : '请先连接到SSE服务器'}
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {eventFilters.map((filter: SSEEventFilter) => (
                    <div
                      key={filter.id}
                      className="p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            filter.isActive ? "bg-green-500" : "bg-gray-500"
                          )} />
                          <span className="text-sm font-medium truncate" title={filter.eventType}>
                            {filter.eventType}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveEventFilter(filter.eventType)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                          title="移除过滤器"
                        >
                          <X className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>消息: {filter.messageCount}</span>
                          <span>状态: {filter.isActive ? '活跃' : '非活跃'}</span>
                        </div>
                        <div>创建时间: {filter.createdAt.toLocaleTimeString()}</div>
                        {filter.lastMessageAt && (
                          <div>最后消息: {filter.lastMessageAt.toLocaleTimeString()}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 事件流面板 */}
        <div className="flex-1 flex flex-col">
          <div className="h-10 border-b border-border flex items-center px-3 bg-muted/50">
            <h3 className="text-sm font-medium">SSE事件流 ({messages.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                暂无SSE事件
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
                          {message.direction === 'in' ? '接收' : '系统'}
                        </span>
                        {message.sseEventType && (
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                            {message.sseEventType}
                          </span>
                        )}
                        {message.sseEventId && (
                          <span className="text-xs text-muted-foreground">
                            ID: {message.sseEventId}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {(message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp)).toLocaleTimeString()}
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
    </div>
  );
};
