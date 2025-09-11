import React, { useState } from 'react';
import { cn } from '@/utils';
import { Play, RotateCcw, Download, Settings, Zap, Copy } from 'lucide-react';
import { DataFormatSelector, DataFormat } from '@/components/DataFormatSelector';

interface MessageGeneratorInterfaceProps {
  onExecute: (data: any) => void;
  isExecuting?: boolean;
}

export const MessageGeneratorInterface: React.FC<MessageGeneratorInterfaceProps> = ({
  onExecute,
  isExecuting = false
}) => {
  const [messageType, setMessageType] = useState('custom');
  const [protocol, setProtocol] = useState('TCP');
  const [outputFormat, setOutputFormat] = useState<DataFormat>('hex');
  const [customMessage, setCustomMessage] = useState('');
  const [result, setResult] = useState<string>('');

  const messageTemplates = {
    http_get: 'GET / HTTP/1.1\r\nHost: example.com\r\nUser-Agent: ProtoTool/1.0\r\n\r\n',
    http_post: 'POST /api/data HTTP/1.1\r\nHost: example.com\r\nContent-Type: application/json\r\nContent-Length: 13\r\n\r\n{"test":true}',
    tcp_syn: '45 00 00 3c 1c 46 40 00 40 06 b1 e6 ac 10 00 01 ac 10 00 02',
    modbus_read: '01 03 00 00 00 0A C5 CD',
    custom: ''
  };

  const handleGenerate = () => {
    const template = messageType === 'custom' ? customMessage : messageTemplates[messageType as keyof typeof messageTemplates];
    setResult(template);
    onExecute({ messageType, protocol, template, outputFormat });
  };

  const handleReset = () => {
    setCustomMessage('');
    setResult('');
    setMessageType('custom');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
  };

  return (
    <div className="space-y-4">
      {/* Message Type Selection */}
      <div className="bg-muted/30 rounded-lg p-3">
        <label className="text-xs font-semibold text-foreground mb-2 block">消息类型</label>
        <div className="flex flex-wrap gap-1">
          {[
            { value: 'http_get', label: 'HTTP GET' },
            { value: 'http_post', label: 'HTTP POST' },
            { value: 'tcp_syn', label: 'TCP SYN' },
            { value: 'modbus_read', label: 'Modbus' },
            { value: 'custom', label: '自定义' }
          ].map(type => (
            <button
              key={type.value}
              onClick={() => setMessageType(type.value)}
              className={cn(
                "px-2 py-1 text-center rounded-md border transition-all text-xs font-medium whitespace-nowrap",
                messageType === type.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-accent-foreground hover:bg-accent"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Protocol Selection */}
      <div className="bg-muted/30 rounded-lg p-3">
        <label className="text-xs font-semibold text-foreground mb-2 block">协议类型</label>
        <div className="flex flex-wrap gap-1">
          {['TCP', 'UDP', 'HTTP', 'WebSocket', 'MQTT', 'Modbus'].map(proto => (
            <button
              key={proto}
              onClick={() => setProtocol(proto)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                protocol === proto
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {proto}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Message Input */}
      {messageType === 'custom' && (
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-foreground">自定义消息内容</label>
            <DataFormatSelector
              value={outputFormat}
              onChange={setOutputFormat}
              size="sm"
            />
          </div>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="输入自定义消息内容..."
            className="w-full h-24 p-3 border border-border rounded-md bg-background font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
      )}

      {/* Generated Result */}
      {result && (
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-foreground">生成的消息</label>
            <div className="flex items-center space-x-1">
              <DataFormatSelector
                value={outputFormat}
                onChange={setOutputFormat}
                size="sm"
              />
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-accent rounded-md transition-colors"
                title="复制结果"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                className="p-1 hover:bg-accent rounded-md transition-colors"
                title="导出结果"
              >
                <Download className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="p-3 bg-background border border-border rounded-md font-mono text-xs whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
            {result}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            字节数: {new TextEncoder().encode(result).length}
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1 px-3 py-1.5 border border-border rounded-md hover:bg-accent transition-colors text-xs font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>重置</span>
          </button>

          <button
            className="p-1.5 hover:bg-accent rounded-md transition-colors"
            title="工具设置"
          >
            <Settings className="w-3 h-3" />
          </button>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isExecuting || (messageType === 'custom' && !customMessage.trim())}
          className={cn(
            "flex items-center space-x-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all font-medium text-xs",
            (isExecuting || (messageType === 'custom' && !customMessage.trim())) && "opacity-50 cursor-not-allowed"
          )}
        >
          <Zap className="w-3 h-3" />
          <span>{isExecuting ? '生成中...' : '生成消息'}</span>
        </button>
      </div>
    </div>
  );
};
