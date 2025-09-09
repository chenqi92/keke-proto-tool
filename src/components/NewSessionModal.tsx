import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import { X, Server, Wifi, MessageSquare, Globe, Radio } from 'lucide-react';
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
}

const protocolOptions = [
  { value: 'TCP', label: 'TCP', icon: Wifi },
  { value: 'UDP', label: 'UDP', icon: Wifi },
  { value: 'MQTT', label: 'MQTT', icon: MessageSquare },
  { value: 'WebSocket', label: 'WebSocket', icon: Globe },
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

  // 根据连接类型获取默认配置
  const getDefaultConfig = (connectionType: ConnectionType) => {
    if (connectionType === 'client') {
      return {
        host: 'localhost',
        port: 8080
      };
    } else {
      return {
        host: '0.0.0.0',
        port: 8080
      };
    }
  };

  // 根据连接类型获取字段标签和占位符
  const getFieldLabels = (connectionType: ConnectionType) => {
    if (connectionType === 'client') {
      return {
        hostLabel: '目标服务器地址',
        hostPlaceholder: 'localhost',
        portLabel: '目标端口号',
        portPlaceholder: '8080'
      };
    } else {
      return {
        hostLabel: '监听地址',
        hostPlaceholder: '0.0.0.0',
        portLabel: '监听端口号',
        portPlaceholder: '8080'
      };
    }
  };

  const [errors, setErrors] = useState<Partial<Record<keyof SessionData, string>>>({});

  const generateSessionName = (data: SessionData): string => {
    const protocolName = data.protocol;
    const connectionType = data.connectionType === 'client' ? '客户端' : '服务端';
    const address = `${data.host}:${data.port}`;

    return `${protocolName} ${connectionType} - ${address}`;
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof SessionData, string>> = {};

    // Session name is now optional - will be auto-generated if empty

    if (!formData.host.trim()) {
      newErrors.host = '主机地址不能为空';
    }

    if (formData.port < 1 || formData.port > 65535) {
      newErrors.port = '端口号必须在1-65535之间';
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
    const defaultConfig = getDefaultConfig('client');
    setFormData({
      name: '',
      type: 'client',
      protocol: 'TCP',
      host: defaultConfig.host,
      port: defaultConfig.port,
      version: ''
    });
    setErrors({});
    onClose();
  };



  // 处理连接类型变化
  const handleTypeChange = (newType: ConnectionType) => {
    const defaultConfig = getDefaultConfig(newType);
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
  };

  // 处理协议变化
  const handleProtocolChange = (newProtocol: ProtocolType) => {
    const newFormData = {
      ...formData,
      protocol: newProtocol
    };

    // 如果名称为空或者是自动生成的，则更新名称
    if (!formData.name || formData.name === generateSessionName(formData)) {
      newFormData.name = generateSessionName({
        ...newFormData,
        protocol: newProtocol
      });
    }

    setFormData(newFormData);
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
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleTypeChange(option.value)}
                    className={cn(
                      "flex items-center justify-center p-2 sm:p-3 border rounded-md text-sm transition-colors min-h-[48px]",
                      formData.connectionType === option.value
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
          </div>

          {/* Host and Port */}
          {(() => {
            const labels = getFieldLabels(formData.connectionType);
            return (
              <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {labels.hostLabel} <span className="text-red-500">*</span>
                  </label>
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

          {/* Protocol Version (optional) */}
          {(formData.protocol === 'MQTT' || formData.protocol === 'WebSocket') && (
            <div>
              <label className="block text-sm font-medium mb-1">协议版本（可选）</label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={formData.protocol === 'MQTT' ? '3.1.1 或 5.0' : '13'}
              />
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
