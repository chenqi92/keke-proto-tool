import React, { useState, useMemo } from 'react';
import { cn } from '@/utils';
import { DataFormatSelector, DataFormat, formatData, validateFormat } from '@/components/DataFormatSelector';
import { useSessionById, useAppStore } from '@/stores/AppStore';
import { networkService } from '@/services/NetworkService';
import { ConnectionErrorBanner } from '@/components/Common/ConnectionErrorBanner';
import { Message, MQTTQoSLevel } from '@/types';
import {
  Send,
  AlertCircle,
  Play,
  Square,
  Settings,
  WifiOff,
  Loader2,
  Activity,
  Plus,
  X
} from 'lucide-react';

interface MQTTSessionContentProps {
  sessionId: string;
}

export const MQTTSessionContent: React.FC<MQTTSessionContentProps> = ({ sessionId }) => {
  // 从全局状态获取会话数据
  const session = useSessionById(sessionId);
  const getMQTTSubscriptions = useAppStore(state => state.getMQTTSubscriptions);

  // 本地UI状态
  const [sendFormat, setSendFormat] = useState<DataFormat>('ascii');
  const [receiveFormat] = useState<DataFormat>('ascii');
  const [publishData, setPublishData] = useState('');
  const [formatError, setFormatError] = useState<string | null>(null);
  const [isConnectingLocal, setIsConnectingLocal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);

  // MQTT特定状态
  const [publishTopic, setPublishTopic] = useState('');
  const [publishQos, setPublishQos] = useState<MQTTQoSLevel>(0);
  const [publishRetain, setPublishRetain] = useState(false);
  const [subscribeTopic, setSubscribeTopic] = useState('');
  const [subscribeQos, setSubscribeQos] = useState<MQTTQoSLevel>(0);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // MQTT连接配置状态 - 这些配置现在从session.config中获取

  // 从会话状态获取数据
  const config = session?.config;
  const connectionStatus = session?.status || 'disconnected';
  const messages = session?.messages || [];
  const connectionError = session?.error;

  // 获取MQTT订阅列表
  const subscriptions = useMemo(() => {
    return getMQTTSubscriptions(sessionId);
  }, [sessionId, getMQTTSubscriptions, session?.mqttSubscriptions]);

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
          console.error('Failed to disconnect from MQTT broker');
        }
      } else {
        setIsConnectingLocal(true);
        const success = await networkService.connect(sessionId);
        if (!success) {
          console.error('Failed to connect to MQTT broker');
        }
      }
    } catch (error) {
      console.error('MQTT connection operation failed:', error);
    } finally {
      setIsConnectingLocal(false);
    }
  };

  // 处理订阅主题
  const handleSubscribe = async () => {
    if (!config || !isConnected || isSubscribing || !subscribeTopic.trim()) return;

    setIsSubscribing(true);
    setFormatError(null);

    try {
      const success = await networkService.subscribeMQTTTopic(sessionId, subscribeTopic.trim(), subscribeQos);
      if (success) {
        setSubscribeTopic('');
        setFormatError(null);
      } else {
        setFormatError('订阅失败：MQTT协议错误或连接已断开');
      }
    } catch (error) {
      setFormatError(`订阅失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSubscribing(false);
    }
  };

  // 处理取消订阅
  const handleUnsubscribe = async (topic: string) => {
    if (!config || !isConnected) return;

    try {
      const success = await networkService.unsubscribeMQTTTopic(sessionId, topic);
      if (!success) {
        setFormatError('取消订阅失败：MQTT协议错误或连接已断开');
      }
    } catch (error) {
      setFormatError(`取消订阅失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 处理发布消息
  const handlePublishMessage = async () => {
    if (!config || !isConnected || isPublishing || !publishTopic.trim()) return;

    if (!validateFormat[sendFormat](publishData)) {
      setFormatError(`无效的${sendFormat.toUpperCase()}格式`);
      return;
    }

    setFormatError(null);
    setIsPublishing(true);

    try {
      const dataBytes = formatData.from[sendFormat](publishData);
      const success = await networkService.publishMQTTMessage(
        sessionId,
        publishTopic.trim(),
        dataBytes,
        {
          qos: publishQos,
          retain: publishRetain,
        }
      );

      if (success) {
        setPublishData('');
        setFormatError(null);
      } else {
        setFormatError('发布失败：MQTT协议错误或连接已断开');
      }
    } catch (error) {
      setFormatError(`发布失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishDataChange = (value: string) => {
    setPublishData(value);
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
      {/* MQTT工具栏 */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center space-x-2">
          {/* 状态图标 */}
          {connectionStatus === 'connected' && <Activity className="w-4 h-4 text-green-500" />}
          {connectionStatus === 'connecting' && <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />}
          {connectionStatus === 'disconnected' && <WifiOff className="w-4 h-4 text-gray-500" />}
          {connectionStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}

          <span className="text-sm font-medium">MQTT 客户端</span>

          {/* MQTT连接配置 */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={config?.host || 'broker.hivemq.com'}
              placeholder="Broker地址"
              className="w-40 px-2 py-1 text-xs bg-background border border-border rounded"
              disabled={isConnected}
              readOnly
            />
            <span className="text-xs text-muted-foreground">:</span>
            <input
              type="number"
              value={config?.port || 1883}
              placeholder="端口"
              className="w-16 px-2 py-1 text-xs bg-background border border-border rounded"
              disabled={isConnected}
              readOnly
            />
          </div>

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

      {/* 发布面板 */}
      <div className="h-40 border-b border-border bg-card p-4">
        <div className="flex items-stretch space-x-3 h-full">
          <div className="flex-1 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-muted-foreground">数据格式:</span>
                  <DataFormatSelector value={sendFormat} onChange={setSendFormat} size="sm" />
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-muted-foreground">QoS:</span>
                  <select
                    value={publishQos}
                    onChange={(e) => setPublishQos(parseInt(e.target.value) as MQTTQoSLevel)}
                    className="px-2 py-1 text-xs bg-background border border-border rounded"
                  >
                    <option value={0}>0 - 最多一次</option>
                    <option value={1}>1 - 至少一次</option>
                    <option value={2}>2 - 恰好一次</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-1 text-xs">
                    <input
                      type="checkbox"
                      checked={publishRetain}
                      onChange={(e) => setPublishRetain(e.target.checked)}
                      className="w-3 h-3"
                    />
                    <span>保留消息</span>
                  </label>
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

            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-muted-foreground">主题:</span>
              <input
                type="text"
                value={publishTopic}
                onChange={(e) => setPublishTopic(e.target.value)}
                placeholder="例如: sensor/temperature"
                className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded"
              />
            </div>
            
            <textarea
              value={publishData}
              onChange={(e) => handlePublishDataChange(e.target.value)}
              placeholder="输入要发布的消息内容..."
              className="flex-1 resize-none bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            
            {formatError && (
              <div className="text-xs text-red-500">{formatError}</div>
            )}
          </div>
          
          <div className="flex flex-col justify-end space-y-2">
            <button
              onClick={handlePublishMessage}
              disabled={!isConnected || !publishData.trim() || !publishTopic.trim() || isPublishing}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                "flex items-center space-x-2 min-w-20",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isConnected && publishData.trim() && publishTopic.trim() && !isPublishing
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>发布中...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>发布</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区域：双面板布局 */}
      <div className="flex-1 overflow-hidden flex">
        {/* 订阅主题面板 */}
        <div className="w-80 border-r border-border bg-card">
          <div className="h-full flex flex-col">
            <div className="h-10 border-b border-border flex items-center px-3 bg-muted/50">
              <h3 className="text-sm font-medium">订阅主题 ({subscriptions.length})</h3>
            </div>
            
            {/* 订阅输入区域 */}
            <div className="p-3 border-b border-border">
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={subscribeTopic}
                  onChange={(e) => setSubscribeTopic(e.target.value)}
                  placeholder="主题过滤器 (支持 +, #)"
                  className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded"
                />
                <select
                  value={subscribeQos}
                  onChange={(e) => setSubscribeQos(parseInt(e.target.value) as MQTTQoSLevel)}
                  className="px-2 py-1 text-xs bg-background border border-border rounded"
                >
                  <option value={0}>QoS 0</option>
                  <option value={1}>QoS 1</option>
                  <option value={2}>QoS 2</option>
                </select>
              </div>
              <button
                onClick={handleSubscribe}
                disabled={!isConnected || !subscribeTopic.trim() || isSubscribing}
                className={cn(
                  "w-full px-2 py-1 rounded text-xs font-medium transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isConnected && subscribeTopic.trim() && !isSubscribing
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isSubscribing ? (
                  <div className="flex items-center justify-center space-x-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>订阅中...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-1">
                    <Plus className="w-3 h-3" />
                    <span>订阅</span>
                  </div>
                )}
              </button>
            </div>

            {/* 订阅列表 */}
            <div className="flex-1 overflow-y-auto">
              {subscriptions.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {isConnected ? '暂无订阅主题' : '请先连接到MQTT Broker'}
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {subscriptions.map((subscription) => (
                    <div
                      key={subscription.id}
                      className="p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            subscription.isActive ? "bg-green-500" : "bg-gray-500"
                          )} />
                          <span className="text-sm font-medium truncate" title={subscription.topic}>
                            {subscription.topic}
                          </span>
                        </div>
                        <button
                          onClick={() => handleUnsubscribe(subscription.topic)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                          title="取消订阅"
                        >
                          <X className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>QoS: {subscription.qos}</span>
                          <span>消息: {subscription.messageCount}</span>
                        </div>
                        <div>订阅时间: {subscription.subscribedAt.toLocaleTimeString()}</div>
                        {subscription.lastMessageAt && (
                          <div>最后消息: {subscription.lastMessageAt.toLocaleTimeString()}</div>
                        )}
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
            <h3 className="text-sm font-medium">MQTT消息流 ({messages.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                暂无MQTT消息
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
                          {message.direction === 'in' ? '接收' : '发布'}
                        </span>
                        {message.mqttTopic && (
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                            {message.mqttTopic}
                          </span>
                        )}
                        {message.mqttQos !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            QoS {message.mqttQos}
                          </span>
                        )}
                        {message.mqttRetain && (
                          <span className="text-xs px-1 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded">
                            保留
                          </span>
                        )}
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
    </div>
  );
};
