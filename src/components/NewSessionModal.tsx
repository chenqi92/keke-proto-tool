import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import { X, Server, Wifi, MessageSquare, Globe, Radio, AlertTriangle, Info, Network, Zap, RefreshCw, Edit3 } from 'lucide-react';
import { ProtocolType, ConnectionType, SerialPortInfo } from '@/types';
import { invoke } from '@tauri-apps/api/core';

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
  // Enhanced connection management (client-only)
  retryDelay?: number;
  maxRetryDelay?: number;
  // Automatic data sending (client-only)
  autoSendEnabled?: boolean;
  autoSendInterval?: number;
  autoSendData?: string;
  autoSendFormat?: 'text' | 'hex' | 'binary' | 'json';
  autoSendTemplate?: string;
  // Modbus-specific fields
  modbusUnitId?: number;
  modbusSerialPort?: string;
  modbusBaudRate?: number;
  modbusDataBits?: number;
  modbusParity?: 'none' | 'even' | 'odd';
  modbusStopBits?: number;
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
  'Modbus': 502,
  'Modbus-TCP': 502,
  'Modbus-RTU': 502, // Not used for RTU, but required for type
};

// 协议是否支持服务端模式
const protocolSupportsServer: Record<ProtocolType, boolean> = {
  'TCP': true,
  'UDP': true,
  'WebSocket': true,
  'MQTT': false, // MQTT通常只作为客户端连接到broker
  'SSE': false,  // SSE通常只作为客户端连接到服务器
  'Modbus': true, // Modbus TCP支持服务端(从站模拟器)
  'Modbus-TCP': true,
  'Modbus-RTU': false, // Modbus RTU通常只作为主站
};

// Categorized protocol options for better organization
const protocolCategories = [
  {
    name: '网络协议',
    icon: Network,
    protocols: [
      { value: 'TCP', label: 'TCP', icon: Wifi },
      { value: 'UDP', label: 'UDP', icon: Wifi },
      { value: 'WebSocket', label: 'WebSocket', icon: Globe },
    ]
  },
  {
    name: '消息协议',
    icon: MessageSquare,
    protocols: [
      { value: 'MQTT', label: 'MQTT', icon: MessageSquare },
      { value: 'SSE', label: 'SSE', icon: Radio },
    ]
  },
  {
    name: '工业协议',
    icon: Zap,
    protocols: [
      { value: 'Modbus', label: 'Modbus TCP', icon: Wifi },
      { value: 'Modbus-RTU', label: 'Modbus RTU', icon: Radio },
    ]
  }
] as const;

// Flat list for backward compatibility
const protocolOptions = [
  { value: 'TCP', label: 'TCP', icon: Wifi },
  { value: 'UDP', label: 'UDP', icon: Wifi },
  { value: 'WebSocket', label: 'WebSocket', icon: Globe },
  { value: 'MQTT', label: 'MQTT', icon: MessageSquare },
  { value: 'SSE', label: 'SSE', icon: Radio },
  { value: 'Modbus', label: 'Modbus TCP', icon: Wifi },
  { value: 'Modbus-RTU', label: 'Modbus RTU', icon: Radio },
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
    sseEventTypes: [],
    // Connection management defaults
    autoReconnect: false,
    keepAlive: true,
    timeout: 10000, // 10 seconds default
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    maxRetryDelay: 30000, // 30 seconds
    // Auto send defaults
    autoSendEnabled: false,
    autoSendInterval: 1000, // 1 second
    autoSendData: '',
    autoSendFormat: 'text'
  });

  // 服务端监听地址选择状态
  const [listenAddressType, setListenAddressType] = useState<'0.0.0.0' | '127.0.0.1' | 'custom'>('0.0.0.0');
  const [customListenAddress, setCustomListenAddress] = useState('');

  // 串口检测状态
  const [serialPorts, setSerialPorts] = useState<SerialPortInfo[]>([]);
  const [isLoadingPorts, setIsLoadingPorts] = useState(false);
  const [useManualSerialPort, setUseManualSerialPort] = useState(false);

  // 加载串口列表
  const loadSerialPorts = async () => {
    setIsLoadingPorts(true);
    try {
      const ports = await invoke<SerialPortInfo[]>('list_serial_ports');
      setSerialPorts(ports);

      // 如果检测到串口且当前没有选择，自动选择第一个
      if (ports.length > 0 && !formData.modbusSerialPort) {
        setFormData({ ...formData, modbusSerialPort: ports[0].port_name });
      }
    } catch (error) {
      console.error('Failed to load serial ports:', error);
      setSerialPorts([]);
    } finally {
      setIsLoadingPorts(false);
    }
  };

  // 当协议切换到 Modbus RTU 时自动加载串口
  useEffect(() => {
    if (formData.protocol === 'Modbus-RTU' && serialPorts.length === 0 && !isLoadingPorts) {
      loadSerialPorts();
    }
  }, [formData.protocol]);

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
    // For Modbus RTU, use serial port name
    if (data.protocol === 'Modbus-RTU' && data.modbusSerialPort) {
      return data.modbusSerialPort;
    }

    // For other protocols, use host:port format
    return `${data.host}:${data.port}`;
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
      sseEventTypes: [],
      // Reset connection management
      autoReconnect: false,
      keepAlive: true,
      timeout: 10000, // 10 seconds default
      retryAttempts: 3,
      retryDelay: 1000,
      maxRetryDelay: 30000,
      // Reset auto send
      autoSendEnabled: false,
      autoSendInterval: 1000,
      autoSendData: '',
      autoSendFormat: 'text'
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
        className="bg-background border border-border rounded-lg shadow-lg w-full max-w-3xl mx-4 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold">新建会话</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-accent rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Content */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Session Name */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium w-32 flex-shrink-0">
              会话名称 <span className="text-muted-foreground text-xs">(可选)</span>
            </label>
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={cn(
                  "flex-1 px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                  errors.name ? "border-red-500" : "border-border"
                )}
                placeholder="留空将自动生成名称"
              />
              {errors.name && (
                <div className="flex items-center space-x-1 text-red-500 text-xs whitespace-nowrap">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span>{errors.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Protocol Selection */}
          <div className="flex items-start gap-4">
            <label className="text-sm font-medium w-32 flex-shrink-0 pt-1">协议类型</label>
            <div className="flex-1 space-y-2">
              {protocolCategories.map((category) => {
                const CategoryIcon = category.icon;
                return (
                  <div key={category.name} className="space-y-1.5">
                    {/* Category Header */}
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <CategoryIcon className="w-3.5 h-3.5" />
                      <span>{category.name}</span>
                      <div className="flex-1 h-px bg-border"></div>
                    </div>

                    {/* Protocol Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {category.protocols.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleProtocolChange(option.value as ProtocolType)}
                            className={cn(
                              "flex flex-col items-center justify-center p-2 border rounded-md transition-colors min-h-[48px] hover:shadow-sm",
                              formData.protocol === option.value
                                ? "border-primary bg-primary/10 text-primary shadow-sm"
                                : "border-border hover:bg-accent hover:border-accent-foreground/20"
                            )}
                          >
                            <Icon className="w-4 h-4 mb-1" />
                            <span className="text-center leading-tight font-medium text-xs">{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section Divider */}
          <div className="border-t border-border my-2"></div>

          {/* Connection Type */}
          <div className="flex items-start gap-4">
            <label className="text-sm font-medium w-32 flex-shrink-0 pt-1">连接类型</label>
            <div className="flex-1">
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
                        "flex items-center justify-center p-2.5 border rounded-md text-sm transition-colors min-h-[44px] hover:shadow-sm",
                        isDisabled
                          ? "border-border bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                          : formData.connectionType === option.value
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border hover:bg-accent hover:border-accent-foreground/20"
                      )}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      <span className="text-center font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>
              {/* 协议不支持服务端模式的提示 */}
              {!protocolSupportsServer[formData.protocol] && (
                <div className="flex items-start gap-2 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-yellow-800 leading-relaxed">
                    {formData.protocol} 协议通常只作为客户端使用，连接到相应的服务器或代理。
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section Divider */}
          <div className="border-t border-border my-2"></div>

          {/* Host and Port */}
          {(() => {
            const labels = getFieldLabels(formData.connectionType, formData.protocol);
            return (
              <div className="space-y-2">
                {/* Host/Address */}
                <div className="flex items-start gap-4">
                  <label className="text-sm font-medium w-32 flex-shrink-0 pt-1.5">
                    {labels.hostLabel} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex-1">
                    {/* 服务端监听地址选择器 */}
                    {formData.connectionType === 'server' ? (
                      <div className="space-y-2">
                        <select
                          value={listenAddressType}
                          onChange={(e) => handleListenAddressTypeChange(e.target.value as '0.0.0.0' | '127.0.0.1' | 'custom')}
                          className={cn(
                            "w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary",
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
                              "w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary",
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
                          "w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                          errors.host ? "border-red-500" : "border-border"
                        )}
                        placeholder={labels.hostPlaceholder}
                      />
                    )}

                    {errors.host && (
                      <div className="flex items-center space-x-1 text-red-500 text-xs mt-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        <span>{errors.host}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Port */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium w-32 flex-shrink-0">
                    {labels.portLabel} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 flex-1">
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
                        "flex-1 px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                        errors.port ? "border-red-500" : "border-border"
                      )}
                      placeholder={labels.portPlaceholder}
                    />
                    {errors.port && (
                      <div className="flex items-center space-x-1 text-red-500 text-xs whitespace-nowrap">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        <span>{errors.port}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* WebSocket 子协议 */}
          {formData.protocol === 'WebSocket' && (
            <>
              <div className="border-t border-border my-2"></div>
              <div className="flex items-start gap-4">
                <label className="text-sm font-medium w-32 flex-shrink-0 pt-1.5">
                  子协议 <span className="text-muted-foreground text-xs">(可选)</span>
                </label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.websocketSubprotocol || ''}
                    onChange={(e) => setFormData({ ...formData, websocketSubprotocol: e.target.value })}
                    className="w-full px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="例如: chat, echo"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    指定WebSocket子协议，用于协议协商
                  </p>
                </div>
              </div>
            </>
          )}

          {/* MQTT 主题 */}
          {formData.protocol === 'MQTT' && (
            <>
              <div className="border-t border-border my-2"></div>
              <div className="flex items-start gap-4">
                <label className="text-sm font-medium w-32 flex-shrink-0 pt-1.5">
                  主题 <span className="text-red-500">*</span>
                </label>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.mqttTopic || ''}
                      onChange={(e) => setFormData({ ...formData, mqttTopic: e.target.value })}
                      className={cn(
                        "flex-1 px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                        errors.mqttTopic ? "border-red-500" : "border-border"
                      )}
                      placeholder="例如: test/topic, sensors/temperature"
                    />
                    {errors.mqttTopic && (
                      <div className="flex items-center space-x-1 text-red-500 text-xs whitespace-nowrap">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        <span>{errors.mqttTopic}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    MQTT消息发布和订阅的主题路径
                  </p>
                </div>
              </div>
            </>
          )}

          {/* SSE 事件类型 */}
          {formData.protocol === 'SSE' && (
            <>
              <div className="border-t border-border my-2"></div>
              <div className="flex items-start gap-4">
                <label className="text-sm font-medium w-32 flex-shrink-0 pt-1.5">
                  事件类型 <span className="text-red-500">*</span>
                </label>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.sseEventTypes?.join(', ') || ''}
                      onChange={(e) => {
                        const types = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                        setFormData({ ...formData, sseEventTypes: types });
                      }}
                      className={cn(
                        "flex-1 px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                        errors.sseEventTypes ? "border-red-500" : "border-border"
                      )}
                      placeholder="例如: message, update, notification"
                    />
                    {errors.sseEventTypes && (
                      <div className="flex items-center space-x-1 text-red-500 text-xs whitespace-nowrap">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        <span>{errors.sseEventTypes}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    用逗号分隔多个事件类型，如: message, update, notification
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Modbus Unit ID */}
          {(formData.protocol === 'Modbus' || formData.protocol === 'Modbus-RTU') && (
            <>
              <div className="border-t border-border my-2"></div>
              <div className="flex items-start gap-4">
                <label className="text-sm font-medium w-32 flex-shrink-0 pt-1.5">
                  Unit ID <span className="text-red-500">*</span>
                </label>
                <div className="flex-1">
                  <input
                    type="number"
                    min="1"
                    max="247"
                    value={formData.modbusUnitId || 1}
                    onChange={(e) => setFormData({ ...formData, modbusUnitId: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="1-247"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Modbus 从站/单元 ID，范围 1-247
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Modbus RTU Serial Configuration */}
          {formData.protocol === 'Modbus-RTU' && (
            <div className="space-y-2">
              <div className="border-t border-border my-2"></div>

              {/* Serial Port */}
              <div className="flex items-start gap-4">
                <label className="text-sm font-medium w-32 flex-shrink-0 pt-1.5">
                  串口 <span className="text-red-500">*</span>
                </label>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {useManualSerialPort ? (
                      // 手动输入模式
                      <input
                        type="text"
                        value={formData.modbusSerialPort || ''}
                        onChange={(e) => setFormData({ ...formData, modbusSerialPort: e.target.value })}
                        className="flex-1 px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Windows: COM1, Linux: /dev/ttyUSB0"
                      />
                    ) : (
                      // 自动检测下拉框
                      <select
                        value={formData.modbusSerialPort || ''}
                        onChange={(e) => setFormData({ ...formData, modbusSerialPort: e.target.value })}
                        className="flex-1 px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={isLoadingPorts}
                      >
                        {isLoadingPorts ? (
                          <option value="">正在检测串口...</option>
                        ) : serialPorts.length === 0 ? (
                          <option value="">未检测到串口设备</option>
                        ) : (
                          <>
                            <option value="">请选择串口</option>
                            {serialPorts.map((port) => (
                              <option key={port.port_name} value={port.port_name}>
                                {port.port_name}
                                {port.description && ` - ${port.description}`}
                                {port.manufacturer && ` (${port.manufacturer})`}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    )}

                    {!useManualSerialPort && (
                      <button
                        type="button"
                        onClick={loadSerialPorts}
                        disabled={isLoadingPorts}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50"
                        title="刷新串口列表"
                      >
                        <RefreshCw className={cn("w-3 h-3", isLoadingPorts && "animate-spin")} />
                        刷新
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setUseManualSerialPort(!useManualSerialPort)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                      title={useManualSerialPort ? "使用自动检测" : "手动输入"}
                    >
                      <Edit3 className="w-3 h-3" />
                      {useManualSerialPort ? "自动" : "手动"}
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {useManualSerialPort
                      ? "手动输入串口设备名称 (Windows: COM1, Linux: /dev/ttyUSB0)"
                      : serialPorts.length === 0
                        ? "未检测到串口设备，点击刷新或切换到手动输入"
                        : `检测到 ${serialPorts.length} 个串口设备`
                    }
                  </p>
                </div>
              </div>

              {/* Baud Rate */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium w-32 flex-shrink-0">波特率</label>
                <select
                  value={formData.modbusBaudRate || 9600}
                  onChange={(e) => setFormData({ ...formData, modbusBaudRate: parseInt(e.target.value) })}
                  className="flex-1 px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="9600">9600</option>
                  <option value="19200">19200</option>
                  <option value="38400">38400</option>
                  <option value="57600">57600</option>
                  <option value="115200">115200</option>
                </select>
              </div>

              {/* Data Bits */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium w-32 flex-shrink-0">数据位</label>
                <select
                  value={formData.modbusDataBits || 8}
                  onChange={(e) => setFormData({ ...formData, modbusDataBits: parseInt(e.target.value) as 5 | 6 | 7 | 8 })}
                  className="flex-1 px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                </select>
              </div>

              {/* Parity */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium w-32 flex-shrink-0">校验位</label>
                <select
                  value={formData.modbusParity || 'none'}
                  onChange={(e) => setFormData({ ...formData, modbusParity: e.target.value as 'none' | 'even' | 'odd' })}
                  className="flex-1 px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="none">无</option>
                  <option value="even">偶校验</option>
                  <option value="odd">奇校验</option>
                </select>
              </div>

              {/* Stop Bits */}
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium w-32 flex-shrink-0">停止位</label>
                <select
                  value={formData.modbusStopBits || 1}
                  onChange={(e) => setFormData({ ...formData, modbusStopBits: parseInt(e.target.value) as 1 | 2 })}
                  className="flex-1 px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                </select>
              </div>
            </div>
          )}
          </div>

          {/* Actions - Fixed at bottom */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:space-x-2 p-4 border-t border-border flex-shrink-0">
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
