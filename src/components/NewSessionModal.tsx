import React, { useState } from 'react';
import { cn } from '@/utils';
import { X, Server, Wifi, MessageSquare, Globe, Radio } from 'lucide-react';

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (sessionData: SessionData) => void;
}

export interface SessionData {
  name: string;
  type: 'client' | 'server';
  protocol: 'TCP' | 'UDP' | 'MQTT' | 'WebSocket' | 'SSE';
  host: string;
  port: number;
  version?: string;
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
    type: 'client',
    protocol: 'TCP',
    host: 'localhost',
    port: 8080,
    version: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof SessionData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof SessionData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = '会话名称不能为空';
    }

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
      onConfirm(formData);
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      type: 'client',
      protocol: 'TCP',
      host: 'localhost',
      port: 8080,
      version: ''
    });
    setErrors({});
    onClose();
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
        className="bg-background border border-border rounded-lg shadow-lg w-full max-w-md mx-4"
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
              会话名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={cn(
                "w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                errors.name ? "border-red-500" : "border-border"
              )}
              placeholder="输入会话名称"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Protocol Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">协议类型</label>
            <div className="grid grid-cols-3 gap-2">
              {protocolOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, protocol: option.value })}
                    className={cn(
                      "flex flex-col items-center p-3 border rounded-md text-xs transition-colors",
                      formData.protocol === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent"
                    )}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    {option.label}
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
                    onClick={() => setFormData({ ...formData, type: option.value })}
                    className={cn(
                      "flex items-center justify-center p-3 border rounded-md text-sm transition-colors",
                      formData.type === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent"
                    )}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Host and Port */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                主机地址 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                className={cn(
                  "w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                  errors.host ? "border-red-500" : "border-border"
                )}
                placeholder="localhost"
              />
              {errors.host && (
                <p className="text-red-500 text-xs mt-1">{errors.host}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                端口号 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="65535"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 0 })}
                className={cn(
                  "w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                  errors.port ? "border-red-500" : "border-border"
                )}
                placeholder="8080"
              />
              {errors.port && (
                <p className="text-red-500 text-xs mt-1">{errors.port}</p>
              )}
            </div>
          </div>

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
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              创建会话
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
