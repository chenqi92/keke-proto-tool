import React, { useState } from 'react';
import { cn } from '@/utils';
import { X, Server, Wifi, MessageSquare, Globe, Radio, AlertTriangle, Info } from 'lucide-react';
import { ProtocolType, ConnectionType } from '@/types';

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sessionData: SessionData) => void;
}

export interface SessionData {
  name: string;
  connectionType: ConnectionType;
  protocol: ProtocolType;
  host: string;
  port: number;
  websocketSubprotocol?: string;
  mqttTopic?: string;
  sseEventTypes?: string[];
  // 添加缺失的字段以兼容SessionConfig
  autoReconnect?: boolean;
  keepAlive?: boolean;
  timeout?: number;
  retryAttempts?: number;
}

// 监听地址选项
const listenAddressOptions = [
  { value: '0.0.0.0', label: '0.0.0.0 (所有网络接口)', description: '允许来自任何网络接口的连接' },
  { value: '127.0.0.1', label: '127.0.0.1 (仅本地)', description: '仅允许本地连接' },
  { value: 'custom', label: '自定义地址', description: '手动输入特定IP地址' },
] as const;

// 协议默认端口
const protocolDefaultPorts: Record<ProtocolType, number> = {
  'TCP': 8080,
  'UDP': 9090,
  'WebSocket': 8080,
  'MQTT': 1883,
  'SSE': 3000,
};

// 协议是否支持服务端模式
const protocolSupportsServer: Record<ProtocolType, boolean> = {
  'TCP': true,
  'UDP': true,
  'WebSocket': true,
  'MQTT': false, // MQTT通常只作为客户端连接到broker
  'SSE': false,  // SSE通常只作为客户端连接到服务器
};

const protocolOptions = [
  { value: 'TCP', label: 'TCP', icon: Wifi },
  { value: 'UDP', label: 'UDP', icon: Wifi },
  { value: 'WebSocket', label: 'WebSocket', icon: Globe },
  { value: 'MQTT', label: 'MQTT', icon: MessageSquare },
  { value: 'SSE', label: 'SSE', icon: Radio },
] as const;

const typeOptions = [
  { value: 'client', label: '客户端', icon: Wifi },
  { value: 'server', label: '服务端', icon: Server },
] as const;

export const NewSessionModal: React.FC<NewSessionModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  const [formData, setFormData] = useState<SessionData>({
    name: '',
    connectionType: 'client',
    protocol: 'TCP',
    host: 'localhost',
    port: 8080,
    websocketSubprotocol: '',
    mqttTopic: '',
    sseEventTypes: []
  });

  // 服务端监听地址选择状态
  const [listenAddressType, setListenAddressType] = useState<'0.0.0.0' | '127.0.0.1' | 'custom'>('0.0.0.0');
  const [customListenAddress, setCustomListenAddress] = useState('');

  // 根据连接类型和协议获取默认配置
  const getDefaultConfig = (connectionType: ConnectionType, protocol: ProtocolType) => {
    const defaultPort = protocolDefaultPorts[protocol];

    if (connectionType === 'client') {
      // 客户端默认配置
      let defaultHost = 'localhost';
      if (protocol === 'MQTT') {
        defaultHost = 'broker.hivemq.com'; // MQTT公共测试broker
      }
      return {
        host: defaultHost,
        port: defaultPort
      };
    } else {
      // 服务端默认配置
      return {
        host: '0.0.0.0',
        port: defaultPort
      };
    }
  };

  // 根据连接类型和协议获取字段标签和占位符
  const getFieldLabels = (connectionType: ConnectionType, protocol: ProtocolType) => {
    if (connectionType === 'client') {
      let hostLabel = '目标服务器地址';
      let hostPlaceholder = 'localhost';

      if (protocol === 'MQTT') {
        hostLabel = 'MQTT Broker地址';
        hostPlaceholder = 'broker.hivemq.com';
      } else if (protocol === 'SSE') {
        hostLabel = 'SSE服务器地址';
        hostPlaceholder = 'localhost';
      }

      return {
        hostLabel,
        hostPlaceholder,
        portLabel: '端口号',
        portPlaceholder: protocolDefaultPorts[protocol].toString()
      };
    } else {
      return {
        hostLabel: '监听地址',
        hostPlaceholder: '0.0.0.0',
        portLabel: '监听端口号',
        portPlaceholder: protocolDefaultPorts[protocol].toString()
      };
    }
  };

  const [errors, setErrors] = useState<Partial<Record<keyof SessionData | 'mqttTopic' | 'sseEventTypes', string>>>({});

  const generateSessionName = (data: SessionData): string => {
    const protocolName = data.protocol;
    const connectionType = data.connectionType === 'client' ? '客户端' : '服务端';
    const address = `${data.host}:${data.port}`;

    return `${protocolName} ${connectionType} - ${address}`;
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof SessionData, string>> = {};

    // 验证主机地址
    if (!formData.host.trim()) {
      newErrors.host = '地址不能为空';
    } else if (formData.connectionType === 'server' && listenAddressType === 'custom' && !customListenAddress.trim()) {
      newErrors.host = '自定义监听地址不能为空';
    }

    // 验证端口号
    if (formData.port < 1 || formData.port > 65535) {
      newErrors.port = '端口号必须在1-65535之间';
    }

    // 协议特定验证
    if (formData.protocol === 'MQTT' && !formData.mqttTopic?.trim()) {
      newErrors.mqttTopic = 'MQTT主题不能为空';
    }

    if (formData.protocol === 'SSE' && (!formData.sseEventTypes || formData.sseEventTypes.length === 0)) {
      newErrors.sseEventTypes = '至少需要一个SSE事件类型';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Generate session name if not provided
      const finalData = {
        ...formData,
        name: formData.name.trim() || generateSessionName(formData)
      };

      onConfirm(finalData);
      handleClose();
    }
  };

  const handleClose = () => {
    const defaultConfig = getDefaultConfig('client', 'TCP');
    setFormData({
      name: '',
      connectionType: 'client',
      protocol: 'TCP',
      host: defaultConfig.host,
      port: defaultConfig.port,
      websocketSubprotocol: '',
      mqttTopic: '',
      sseEventTypes: []
    });
    setListenAddressType('0.0.0.0');
    setCustomListenAddress('');
    setErrors({});
    onClose();
  };



  // 处理连接类型变化
  const handleTypeChange = (newType: ConnectionType) => {
    const defaultConfig = getDefaultConfig(newType, formData.protocol);
    const newFormData = {
      ...formData,
      connectionType: newType,
      host: defaultConfig.host,
      port: defaultConfig.port
    };

    // 如果名称为空或者是自动生成的，则更新名称
    if (!formData.name || formData.name === generateSessionName(formData)) {
      newFormData.name = generateSessionName({
        ...newFormData,
        connectionType: newType,
        host: defaultConfig.host,
        port: defaultConfig.port
      });
    }

    setFormData(newFormData);

    // 重置监听地址选择
    if (newType === 'server') {
      setListenAddressType('0.0.0.0');
      setCustomListenAddress('');
    }
  };

  // 处理协议变化
  const handleProtocolChange = (newProtocol: ProtocolType) => {
    const defaultConfig = getDefaultConfig(formData.connectionType, newProtocol);
    const newFormData = {
      ...formData,
      protocol: newProtocol,
      host: defaultConfig.host,
      port: defaultConfig.port,
      // 重置协议特定字段
      websocketSubprotocol: newProtocol === 'WebSocket' ? 'chat' : '',
      mqttTopic: newProtocol === 'MQTT' ? 'test/topic' : '',
      sseEventTypes: newProtocol === 'SSE' ? ['message'] : []
    };

    // 如果协议不支持服务端模式，强制切换到客户端
    if (!protocolSupportsServer[newProtocol] && formData.connectionType === 'server') {
      newFormData.connectionType = 'client';
      const clientConfig = getDefaultConfig('client', newProtocol);
      newFormData.host = clientConfig.host;
      newFormData.port = clientConfig.port;
    }

    // 如果名称为空或者是自动生成的，则更新名称
    if (!formData.name || formData.name === generateSessionName(formData)) {
      newFormData.name = generateSessionName(newFormData);
    }

    setFormData(newFormData);
  };

  // 处理监听地址类型变化
  const handleListenAddressTypeChange = (type: '0.0.0.0' | '127.0.0.1' | 'custom') => {
    setListenAddressType(type);

    let newHost = '';
    if (type === 'custom') {
      newHost = customListenAddress || '';
    } else {
      newHost = type;
    }

    const newFormData = { ...formData, host: newHost };

    // 如果名称为空或者是自动生成的，则更新名称
    if (!formData.name || formData.name === generateSessionName(formData)) {
      newFormData.name = generateSessionName(newFormData);
    }

    setFormData(newFormData);
  };

  // 处理自定义监听地址变化
  const handleCustomListenAddressChange = (address: string) => {
    setCustomListenAddress(address);

    if (listenAddressType === 'custom') {
      const newFormData = { ...formData, host: address };

      // 如果名称为空或者是自动生成的，则更新名称
      if (!formData.name || formData.name === generateSessionName(formData)) {
        newFormData.name = generateSessionName(newFormData);
      }

      setFormData(newFormData);
    }
  };



  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="bg-background border border-border rounded-lg shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">新建会话</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-accent rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Session Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              会话名称 <span className="text-muted-foreground text-xs">(可选)</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={cn(
                "w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                errors.name ? "border-red-500" : "border-border"
              )}
              placeholder="留空将自动生成名称"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Protocol Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">协议类型</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {protocolOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleProtocolChange(option.value as ProtocolType)}
                    className={cn(
                      "flex flex-col items-center p-2 sm:p-3 border rounded-md text-xs transition-colors min-h-[60px]",
                      formData.protocol === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent"
                    )}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="text-center leading-tight">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Connection Type */}
          <div>
            <label className="block text-sm font-medium mb-2">连接类型</label>
            <div className="grid grid-cols-2 gap-2">
              {typeOptions.map((option) => {
                const Icon = option.icon;
                const isDisabled = option.value === 'server' && !protocolSupportsServer[formData.protocol];
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !isDisabled && handleTypeChange(option.value)}
                    disabled={isDisabled}
                    className={cn(
                      "flex items-center justify-center p-2 sm:p-3 border rounded-md text-sm transition-colors min-h-[48px]",
                      isDisabled
                        ? "border-border bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                        : formData.connectionType === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent"
                    )}
                  >
                    <Icon className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="text-center">{option.label}</span>
                  </button>
                );
              })}
            </div>
            {/* 协议不支持服务端模式的提示 */}
            {!protocolSupportsServer[formData.protocol] && (
              <div className="flex items-start gap-2 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-800">
                  {formData.protocol} 协议通常只作为客户端使用，连接到相应的服务器或代理。
                </p>
              </div>
            )}
          </div>

          {/* Host and Port */}
          {(() => {
            const labels = getFieldLabels(formData.connectionType, formData.protocol);
            return (
              <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {labels.hostLabel} <span className="text-red-500">*</span>
                  </label>

                  {/* 服务端监听地址选择器 */}
                  {formData.connectionType === 'server' ? (
                    <div className="space-y-2">
                      <select
                        value={listenAddressType}
                        onChange={(e) => handleListenAddressTypeChange(e.target.value as '0.0.0.0' | '127.0.0.1' | 'custom')}
                        className={cn(
                          "w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                          errors.host ? "border-red-500" : "border-border"
                        )}
                      >
                        {listenAddressOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      {/* 自定义地址输入框 */}
                      {listenAddressType === 'custom' && (
                        <input
                          type="text"
                          value={customListenAddress}
                          onChange={(e) => handleCustomListenAddressChange(e.target.value)}
                          className={cn(
                            "w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                            errors.host ? "border-red-500" : "border-border"
                          )}
                          placeholder="输入自定义IP地址"
                        />
                      )}

                      {/* 监听地址说明 */}
                      <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-800">
                          {listenAddressOptions.find(opt => opt.value === listenAddressType)?.description}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* 客户端地址输入框 */
                    <input
                      type="text"
                      value={formData.host}
                      onChange={(e) => {
                        const newHost = e.target.value;
                        const newFormData = { ...formData, host: newHost };

                        // 如果名称为空或者是自动生成的，则更新名称
                        if (!formData.name || formData.name === generateSessionName(formData)) {
                          newFormData.name = generateSessionName({
                            ...newFormData,
                            host: newHost
                          });
                        }

                        setFormData(newFormData);
                      }}
                      className={cn(
                        "w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                        errors.host ? "border-red-500" : "border-border"
                      )}
                      placeholder={labels.hostPlaceholder}
                    />
                  )}

                  {errors.host && (
                    <p className="text-red-500 text-xs mt-1">{errors.host}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {labels.portLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    value={formData.port}
                    onChange={(e) => {
                      const newPort = parseInt(e.target.value) || 0;
                      const newFormData = { ...formData, port: newPort };

                      // 如果名称为空或者是自动生成的，则更新名称
                      if (!formData.name || formData.name === generateSessionName(formData)) {
                        newFormData.name = generateSessionName({
                          ...newFormData,
                          port: newPort
                        });
                      }

                      setFormData(newFormData);
                    }}
                    className={cn(
                      "w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                      errors.port ? "border-red-500" : "border-border"
                    )}
                    placeholder={labels.portPlaceholder}
                  />
                  {errors.port && (
                    <p className="text-red-500 text-xs mt-1">{errors.port}</p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* WebSocket 子协议 */}
          {formData.protocol === 'WebSocket' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                WebSocket 子协议 <span className="text-muted-foreground text-xs">(可选)</span>
              </label>
              <input
                type="text"
                value={formData.websocketSubprotocol || ''}
                onChange={(e) => setFormData({ ...formData, websocketSubprotocol: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="例如: chat, echo"
              />
              <p className="text-xs text-muted-foreground mt-1">
                指定WebSocket子协议，用于协议协商
              </p>
            </div>
          )}

          {/* MQTT 主题 */}
          {formData.protocol === 'MQTT' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                MQTT 主题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.mqttTopic || ''}
                onChange={(e) => setFormData({ ...formData, mqttTopic: e.target.value })}
                className={cn(
                  "w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                  errors.mqttTopic ? "border-red-500" : "border-border"
                )}
                placeholder="例如: test/topic, sensors/temperature"
              />
              {errors.mqttTopic && (
                <p className="text-red-500 text-xs mt-1">{errors.mqttTopic}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                MQTT消息发布和订阅的主题路径
              </p>
            </div>
          )}

          {/* SSE 事件类型 */}
          {formData.protocol === 'SSE' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                SSE 事件类型 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.sseEventTypes?.join(', ') || ''}
                onChange={(e) => {
                  const types = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                  setFormData({ ...formData, sseEventTypes: types });
                }}
                className={cn(
                  "w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                  errors.sseEventTypes ? "border-red-500" : "border-border"
                )}
                placeholder="例如: message, update, notification"
              />
              {errors.sseEventTypes && (
                <p className="text-red-500 text-xs mt-1">{errors.sseEventTypes}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                用逗号分隔多个事件类型，如: message, update, notification
              </p>
            </div>
          )}



          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:space-x-2 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              创建会话
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
