import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import {
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
  Play,
  Square,
  Clock,
  AlertTriangle,
  CheckCircle,
  Radio,
  BarChart3
} from 'lucide-react';
import { SessionConfig, ConnectionStatus } from '@/types';
import { StatusTag } from '@/components/Common';
import { connectionManagerRegistry } from '@/services/ConnectionManagerService';
import { autoSendService } from '@/services/AutoSendService';

interface ConnectionManagementPanelProps {
  sessionId: string;
  config: SessionConfig;
  status: ConnectionStatus;
  onConfigUpdate: (updates: Partial<SessionConfig>) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onSendMessage: (data: string, format: string) => Promise<boolean>;
  className?: string;
}

export const ConnectionManagementPanel: React.FC<ConnectionManagementPanelProps> = ({
  sessionId,
  config,
  status,
  onConfigUpdate,
  onConnect,
  onDisconnect,
  onSendMessage,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded
  const [currentRetryAttempt, setCurrentRetryAttempt] = useState(0);
  const [maxRetryAttempts, setMaxRetryAttempts] = useState(0);
  // AutoSendService现在是全局管理的，不需要在组件中维护状态

  // Always call hooks at the top level
  useEffect(() => {
    // Only initialize for client sessions
    if (config.connectionType !== 'client') {
      return;
    }

    // Initialize connection manager
    const connectionManager = connectionManagerRegistry.createManager({
      sessionId,
      config,
      onStatusChange: (newStatus) => {
        // Status changes are handled by parent component
      },
      onError: (error: string) => {
        console.error('Connection error:', error);
      },
      onRetryAttempt: (attempt, maxAttempts) => {
        setCurrentRetryAttempt(attempt);
        setMaxRetryAttempts(maxAttempts);
      }
    });

    // AutoSendService现在是全局管理的，在main.tsx中初始化
    // 不需要在组件中初始化

    return () => {
      connectionManagerRegistry.destroyManager(sessionId);
      // autoSendService不需要在组件中清理
    };
  }, [sessionId, config, onSendMessage]);

  // Only show for client sessions
  if (config.connectionType !== 'client') {
    return null;
  }

  const handleAutoReconnectToggle = (enabled: boolean) => {
    onConfigUpdate({ autoReconnect: enabled });
  };

  const handleTimeoutChange = (timeoutSeconds: number) => {
    onConfigUpdate({ timeout: timeoutSeconds * 1000 });
  };

  const handleRetryAttemptsChange = (attempts: number) => {
    onConfigUpdate({ retryAttempts: attempts });
  };

  const handleAutoSendToggle = (enabled: boolean) => {
    onConfigUpdate({ autoSendEnabled: enabled });
    // AutoSendService会自动响应配置变化
  };

  const handleAutoSendIntervalChange = (interval: number) => {
    onConfigUpdate({ autoSendInterval: interval });
    // AutoSendService会自动响应配置变化
  };

  const handleAutoSendDataChange = (data: string) => {
    onConfigUpdate({ autoSendData: data });
  };

  const handleAutoSendFormatChange = (format: 'text' | 'hex' | 'binary' | 'json') => {
    onConfigUpdate({ autoSendFormat: format });
  };

  const startAutoSend = () => {
    // AutoSendService会自动管理，只需要启用配置
    onConfigUpdate({ autoSendEnabled: true });
  };

  const stopAutoSend = () => {
    // AutoSendService会自动管理，只需要禁用配置
    onConfigUpdate({ autoSendEnabled: false });
  };

  // 检查是否正在自动发送
  const isAutoSending = autoSendService.isAutoSending(sessionId);

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const isReconnecting = currentRetryAttempt > 0;

  return (
    <div className={cn("bg-card border border-border rounded-lg", className)}>
      {/* Header */}
      <div className="p-2 border-b border-border">
        <div className="flex items-center space-x-2">
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">连接管理</span>
          <StatusTag status={status} size="sm" />
        </div>

        {/* Connection Status Info */}
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>超时: {Math.floor(config.timeout / 1000)}s</span>
            {config.autoReconnect && (
              <span>重试: {config.retryAttempts}次</span>
            )}
          </div>
          {isReconnecting && (
            <div className="flex items-center space-x-1 text-yellow-600">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>重连中 {currentRetryAttempt}/{maxRetryAttempts}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-2 space-y-3">
          {/* Connection Settings */}
          <div>
            <h4 className="text-sm font-medium mb-1">连接设置</h4>
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-0.5">超时 (秒)</label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={Math.floor(config.timeout / 1000)}
                    onChange={(e) => handleTimeoutChange(parseInt(e.target.value) || 10)}
                    className="w-full px-2 py-1 border border-border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-0.5">重试次数</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.retryAttempts}
                    onChange={(e) => handleRetryAttemptsChange(parseInt(e.target.value) || 3)}
                    className="w-full px-2 py-1 border border-border rounded text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoReconnect"
                  checked={config.autoReconnect}
                  onChange={(e) => handleAutoReconnectToggle(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="autoReconnect" className="text-xs">启用自动重连</label>
              </div>
            </div>
          </div>

          {/* Auto Send Settings */}
          <div className="border-t border-border pt-2">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium flex items-center">
                <Radio className="w-4 h-4 mr-1" />
                自动发送
              </h4>
              <div className="flex items-center space-x-2">
                {isAutoSending && (
                  <div className="flex items-center space-x-1 text-xs text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>运行中</span>
                  </div>
                )}
                {config.autoSendEnabled && isConnected && (
                  <div className="flex items-center space-x-1">
                    {isAutoSending ? (
                      <button
                        onClick={stopAutoSend}
                        className="p-1 hover:bg-accent rounded text-red-500"
                        title="停止自动发送"
                      >
                        <Square className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={startAutoSend}
                        className="p-1 hover:bg-accent rounded text-green-500"
                        title="开始自动发送"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoSendEnabled"
                  checked={config.autoSendEnabled || false}
                  onChange={(e) => handleAutoSendToggle(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="autoSendEnabled" className="text-xs">启用自动发送</label>
              </div>

              {config.autoSendEnabled && (
                <div className="ml-4 space-y-1.5 border-l-2 border-muted pl-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-0.5">间隔 (ms)</label>
                      <input
                        type="number"
                        min="100"
                        max="60000"
                        value={config.autoSendInterval || 1000}
                        onChange={(e) => handleAutoSendIntervalChange(parseInt(e.target.value) || 1000)}
                        className="w-full px-2 py-1 border border-border rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-0.5">格式</label>
                      <select
                        value={config.autoSendFormat || 'text'}
                        onChange={(e) => handleAutoSendFormatChange(e.target.value as any)}
                        className="w-full px-2 py-1 border border-border rounded text-xs"
                      >
                        <option value="text">文本</option>
                        <option value="hex">十六进制</option>
                        <option value="binary">二进制</option>
                        <option value="json">JSON</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-0.5">发送数据</label>
                    <textarea
                      value={config.autoSendData || ''}
                      onChange={(e) => handleAutoSendDataChange(e.target.value)}
                      className="w-full px-2 py-1 border border-border rounded text-xs"
                      rows={2}
                      placeholder="输入要发送的数据..."
                    />
                  </div>

                  {/* Statistics - 统计信息现在在session.statistics中 */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>自动发送: {isAutoSending ? '运行中' : '已停止'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
