import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { SessionConfig } from '@/types';
import { cn } from '@/utils';

interface EditConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: SessionConfig) => void;
  config: SessionConfig | null;
}

export const EditConfigModal: React.FC<EditConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  config
}) => {
  const [formData, setFormData] = useState<Partial<SessionConfig>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (config && isOpen) {
      setFormData({ ...config });
      setErrors({});
    }
  }, [config, isOpen]);

  const handleInputChange = (field: keyof SessionConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = '会话名称不能为空';
    }

    if (!formData.host?.trim()) {
      newErrors.host = '主机地址不能为空';
    }

    if (!formData.port || formData.port < 1 || formData.port > 65535) {
      newErrors.port = '端口必须在 1-65535 之间';
    }

    // Protocol-specific validation
    if (formData.protocol === 'MQTT') {
      if (!formData.mqttClientId?.trim()) {
        newErrors.mqttClientId = 'MQTT 客户端ID不能为空';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm() || !formData.id) return;

    onSave(formData as SessionConfig);
    onClose();
  };

  const handleClose = () => {
    setFormData({});
    setErrors({});
    onClose();
  };

  if (!isOpen || !config) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">编辑配置</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Session Name */}
          <div>
            <label className="block text-sm font-medium mb-1">会话名称</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={cn(
                "w-full px-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary",
                errors.name ? "border-red-500" : "border-border"
              )}
              placeholder="输入会话名称"
            />
            {errors.name && (
              <div className="flex items-center space-x-1 text-red-500 text-xs mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.name}</span>
              </div>
            )}
          </div>

          {/* Protocol */}
          <div>
            <label className="block text-sm font-medium mb-1">协议</label>
            <select
              value={formData.protocol || 'tcp'}
              onChange={(e) => handleInputChange('protocol', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
              <option value="websocket">WebSocket</option>
              <option value="mqtt">MQTT</option>
              <option value="sse">SSE</option>
            </select>
          </div>

          {/* Connection Type */}
          <div>
            <label className="block text-sm font-medium mb-1">连接类型</label>
            <select
              value={formData.connectionType || 'client'}
              onChange={(e) => handleInputChange('connectionType', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="client">客户端</option>
              <option value="server">服务端</option>
            </select>
          </div>

          {/* Host */}
          <div>
            <label className="block text-sm font-medium mb-1">主机地址</label>
            <input
              type="text"
              value={formData.host || ''}
              onChange={(e) => handleInputChange('host', e.target.value)}
              className={cn(
                "w-full px-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary",
                errors.host ? "border-red-500" : "border-border"
              )}
              placeholder="例如: localhost, 192.168.1.100"
            />
            {errors.host && (
              <div className="flex items-center space-x-1 text-red-500 text-xs mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.host}</span>
              </div>
            )}
          </div>

          {/* Port */}
          <div>
            <label className="block text-sm font-medium mb-1">端口</label>
            <input
              type="number"
              value={formData.port || ''}
              onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 0)}
              className={cn(
                "w-full px-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary",
                errors.port ? "border-red-500" : "border-border"
              )}
              placeholder="1-65535"
              min="1"
              max="65535"
            />
            {errors.port && (
              <div className="flex items-center space-x-1 text-red-500 text-xs mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.port}</span>
              </div>
            )}
          </div>

          {/* MQTT-specific fields */}
          {formData.protocol === 'MQTT' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">客户端ID</label>
                <input
                  type="text"
                  value={formData.mqttClientId || ''}
                  onChange={(e) => handleInputChange('mqttClientId', e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary",
                    errors.mqttClientId ? "border-red-500" : "border-border"
                  )}
                  placeholder="MQTT客户端唯一标识"
                />
                {errors.mqttClientId && (
                  <div className="flex items-center space-x-1 text-red-500 text-xs mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.mqttClientId}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">用户名 (可选)</label>
                <input
                  type="text"
                  value={formData.mqttUsername || ''}
                  onChange={(e) => handleInputChange('mqttUsername', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="MQTT认证用户名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">密码 (可选)</label>
                <input
                  type="password"
                  value={formData.mqttPassword || ''}
                  onChange={(e) => handleInputChange('mqttPassword', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="MQTT认证密码"
                />
              </div>
            </>
          )}

          {/* WebSocket-specific fields */}
          {formData.protocol === 'WebSocket' && (
            <div>
              <label className="block text-sm font-medium mb-1">路径 (可选)</label>
              <input
                type="text"
                value={formData.websocketPath || ''}
                onChange={(e) => handleInputChange('websocketPath', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="例如: /ws, /websocket"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 p-4 border-t border-border">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>保存</span>
          </button>
        </div>
      </div>
    </div>
  );
};
