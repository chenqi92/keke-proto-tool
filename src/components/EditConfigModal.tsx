import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Info } from 'lucide-react';
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

    // Protocol-specific validation
    const protocol = formData.protocol;

    // Modbus RTU uses serial port instead of host/port
    if (protocol === 'Modbus-RTU') {
      if (!formData.modbusSerialPort?.trim()) {
        newErrors.modbusSerialPort = '串口不能为空';
      }
      if (!formData.modbusBaudRate || formData.modbusBaudRate < 1) {
        newErrors.modbusBaudRate = '波特率必须大于0';
      }
    } else {
      // All other protocols use host/port
      if (!formData.host?.trim()) {
        newErrors.host = '主机地址不能为空';
      }

      if (!formData.port || formData.port < 1 || formData.port > 65535) {
        newErrors.port = '端口必须在 1-65535 之间';
      }
    }

    // MQTT-specific validation
    if (protocol === 'MQTT') {
      if (!formData.mqttTopic?.trim()) {
        newErrors.mqttTopic = 'MQTT 主题不能为空';
      }
    }

    // SSE-specific validation
    if (protocol === 'SSE') {
      if (!formData.sseEventTypes || formData.sseEventTypes.length === 0) {
        newErrors.sseEventTypes = '至少需要一个事件类型';
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-3xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold">编辑配置</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {/* Session Name - Full width */}
          <div className="col-span-2">
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

          {/* Protocol (Read-only) */}
          <div>
            <label className="block text-sm font-medium mb-1">协议类型</label>
            <div className="flex items-center gap-2 px-3 py-2 text-sm bg-muted border border-border rounded-md text-muted-foreground">
              <Info className="w-4 h-4" />
              <span>{formData.protocol}</span>
              <span className="text-xs ml-auto">(不可修改)</span>
            </div>
          </div>

          {/* Connection Type (Read-only) */}
          <div>
            <label className="block text-sm font-medium mb-1">连接类型</label>
            <div className="flex items-center gap-2 px-3 py-2 text-sm bg-muted border border-border rounded-md text-muted-foreground">
              <Info className="w-4 h-4" />
              <span>{formData.connectionType === 'client' ? '客户端' : '服务端'}</span>
              <span className="text-xs ml-auto">(不可修改)</span>
            </div>
          </div>

          {/* Host and Port (for non-Modbus RTU protocols) */}
          {formData.protocol !== 'Modbus-RTU' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {formData.connectionType === 'server' ? '监听地址' : '主机地址'}
                </label>
                <input
                  type="text"
                  value={formData.host || ''}
                  onChange={(e) => handleInputChange('host', e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary",
                    errors.host ? "border-red-500" : "border-border"
                  )}
                  placeholder={formData.connectionType === 'server' ? '例如: 0.0.0.0, 127.0.0.1' : '例如: localhost, 192.168.1.100'}
                />
                {errors.host && (
                  <div className="flex items-center space-x-1 text-red-500 text-xs mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.host}</span>
                  </div>
                )}
              </div>

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
            </>
          )}

          {/* WebSocket-specific fields */}
          {formData.protocol === 'WebSocket' && (
            <div>
              <label className="block text-sm font-medium mb-1">子协议 (可选)</label>
              <input
                type="text"
                value={formData.websocketSubprotocol || ''}
                onChange={(e) => handleInputChange('websocketSubprotocol', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="例如: mqtt, stomp"
              />
            </div>
          )}

          {/* MQTT-specific fields */}
          {formData.protocol === 'MQTT' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                主题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.mqttTopic || ''}
                onChange={(e) => handleInputChange('mqttTopic', e.target.value)}
                className={cn(
                  "w-full px-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary",
                  errors.mqttTopic ? "border-red-500" : "border-border"
                )}
                placeholder="例如: sensor/temperature"
              />
              {errors.mqttTopic && (
                <div className="flex items-center space-x-1 text-red-500 text-xs mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.mqttTopic}</span>
                </div>
              )}
            </div>
          )}

          {/* SSE-specific fields */}
          {formData.protocol === 'SSE' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                事件类型 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={(formData.sseEventTypes || []).join(', ')}
                onChange={(e) => handleInputChange('sseEventTypes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className={cn(
                  "w-full px-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary",
                  errors.sseEventTypes ? "border-red-500" : "border-border"
                )}
                placeholder="例如: message, update, notification (逗号分隔)"
              />
              {errors.sseEventTypes && (
                <div className="flex items-center space-x-1 text-red-500 text-xs mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.sseEventTypes}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                多个事件类型用逗号分隔
              </p>
            </div>
          )}

          {/* Modbus TCP/RTU-specific fields */}
          {(formData.protocol === 'Modbus' || formData.protocol === 'Modbus-TCP' || formData.protocol === 'Modbus-RTU') && (
            <div>
              <label className="block text-sm font-medium mb-1">单元标识符 (Unit ID)</label>
              <input
                type="number"
                value={formData.modbusUnitId || 1}
                onChange={(e) => handleInputChange('modbusUnitId', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="1-247"
                min="1"
                max="247"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Modbus 从站设备地址 (1-247)
              </p>
            </div>
          )}

          {/* Modbus RTU Serial Configuration */}
          {formData.protocol === 'Modbus-RTU' && (
            <>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  串口 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.modbusSerialPort || ''}
                  onChange={(e) => handleInputChange('modbusSerialPort', e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary",
                    errors.modbusSerialPort ? "border-red-500" : "border-border"
                  )}
                  placeholder="Windows: COM1, Linux: /dev/ttyUSB0"
                />
                {errors.modbusSerialPort && (
                  <div className="flex items-center space-x-1 text-red-500 text-xs mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.modbusSerialPort}</span>
                  </div>
                )}
              </div>

              {/* Serial port settings - these will naturally flow in the parent 2-column grid */}
              <div>
                <label className="block text-sm font-medium mb-1">波特率</label>
                <select
                  value={formData.modbusBaudRate || 9600}
                  onChange={(e) => handleInputChange('modbusBaudRate', parseInt(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="9600">9600</option>
                  <option value="19200">19200</option>
                  <option value="38400">38400</option>
                  <option value="57600">57600</option>
                  <option value="115200">115200</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">数据位</label>
                <select
                  value={formData.modbusDataBits || 8}
                  onChange={(e) => handleInputChange('modbusDataBits', parseInt(e.target.value) as 5 | 6 | 7 | 8)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">校验位</label>
                <select
                  value={formData.modbusParity || 'none'}
                  onChange={(e) => handleInputChange('modbusParity', e.target.value as 'none' | 'even' | 'odd')}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="none">无</option>
                  <option value="even">偶校验</option>
                  <option value="odd">奇校验</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">停止位</label>
                <select
                  value={formData.modbusStopBits || 1}
                  onChange={(e) => handleInputChange('modbusStopBits', parseInt(e.target.value) as 1 | 2)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                </select>
              </div>
            </>
          )}

          {/* Connection Management Settings - Full width */}
          <div className="col-span-2 border-t border-border pt-4 mt-2">
            <h3 className="text-sm font-medium mb-3">连接管理</h3>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm">自动重连</label>
                <input
                  type="checkbox"
                  checked={formData.autoReconnect || false}
                  onChange={(e) => handleInputChange('autoReconnect', e.target.checked)}
                  className="w-4 h-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm">保持连接</label>
                <input
                  type="checkbox"
                  checked={formData.keepAlive !== false}
                  onChange={(e) => handleInputChange('keepAlive', e.target.checked)}
                  className="w-4 h-4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">超时时间 (毫秒)</label>
                <input
                  type="number"
                  value={formData.timeout || 10000}
                  onChange={(e) => handleInputChange('timeout', parseInt(e.target.value) || 10000)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="10000"
                  min="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">重试次数</label>
                <input
                  type="number"
                  value={formData.retryAttempts || 3}
                  onChange={(e) => handleInputChange('retryAttempts', parseInt(e.target.value) || 3)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="3"
                  min="0"
                  max="10"
                />
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex items-center justify-end space-x-2 p-4 border-t border-border flex-shrink-0">
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
