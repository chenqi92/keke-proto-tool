import React, { useState } from 'react';
import { 
  BaseTool, 
  ToolInput, 
  ToolOutput, 
  ToolContext, 
  ToolAction, 
  ContextMenuItem 
} from '@/types/toolbox';
import { DataFormat, formatData, validateFormat } from '@/components/DataFormatSelector';
import { 
  Zap, 
  Play, 
  Download, 
  Upload, 
  Copy,
  RotateCcw,
  Settings
} from 'lucide-react';

interface MessageTemplate {
  id: string;
  name: string;
  description: string;
  protocol: string;
  format: DataFormat;
  template: string;
  fields: TemplateField[];
}

interface TemplateField {
  name: string;
  type: 'text' | 'number' | 'hex' | 'select';
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
  required?: boolean;
}

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tcp-hello',
    name: 'TCP Hello Message',
    description: 'Simple TCP hello message',
    protocol: 'TCP',
    format: 'ascii',
    template: 'HELLO {{name}} FROM {{source}}',
    fields: [
      { name: 'name', type: 'text', placeholder: 'Target name', defaultValue: 'SERVER', required: true },
      { name: 'source', type: 'text', placeholder: 'Source name', defaultValue: 'CLIENT', required: true }
    ]
  },
  {
    id: 'http-request',
    name: 'HTTP Request',
    description: 'Basic HTTP GET request',
    protocol: 'HTTP',
    format: 'ascii',
    template: 'GET {{path}} HTTP/1.1\r\nHost: {{host}}\r\nUser-Agent: {{userAgent}}\r\n\r\n',
    fields: [
      { name: 'path', type: 'text', placeholder: 'Request path', defaultValue: '/', required: true },
      { name: 'host', type: 'text', placeholder: 'Host header', defaultValue: 'localhost', required: true },
      { name: 'userAgent', type: 'text', placeholder: 'User agent', defaultValue: 'ProtoTool/1.0' }
    ]
  },
  {
    id: 'modbus-read',
    name: 'Modbus Read Request',
    description: 'Modbus RTU read holding registers',
    protocol: 'Modbus',
    format: 'hex',
    template: '{{slaveId}} 03 {{startAddr}} {{quantity}} {{crc}}',
    fields: [
      { name: 'slaveId', type: 'hex', placeholder: 'Slave ID (hex)', defaultValue: '01', required: true },
      { name: 'startAddr', type: 'hex', placeholder: 'Start address (hex)', defaultValue: '0000', required: true },
      { name: 'quantity', type: 'hex', placeholder: 'Quantity (hex)', defaultValue: '0001', required: true },
      { name: 'crc', type: 'hex', placeholder: 'CRC (auto-calculated)', defaultValue: 'AUTO' }
    ]
  }
];

class MessageGeneratorTool implements BaseTool {
  id = 'message-generator';
  name = '报文生成器';
  description = '生成测试报文和数据包，支持多种协议模板';
  version = '1.0.0';
  category = 'generation' as const;
  icon = Zap;
  author = 'ProtoTool';

  supportedFormats: DataFormat[] = ['ascii', 'hex', 'binary', 'json', 'base64'];
  supportedProtocols = ['TCP', 'UDP', 'HTTP', 'WebSocket', 'Custom'] as const;
  requiresConnection = false;
  canProcessStreaming = false;

  defaultConfig = {
    selectedTemplate: 'tcp-hello',
    customTemplates: [],
    outputFormat: 'ascii' as DataFormat,
    autoCalculateCRC: true
  };

  async initialize(context: ToolContext): Promise<void> {
    console.log('Message Generator initialized');
  }

  async execute(input: ToolInput): Promise<ToolOutput> {
    try {
      const { template, fields, format } = input.metadata || {};
      
      if (!template) {
        throw new Error('No template provided');
      }

      // Generate message from template
      let message = template;
      
      // Replace template fields
      if (fields) {
        Object.entries(fields).forEach(([key, value]) => {
          const placeholder = `{{${key}}}`;
          message = message.replace(new RegExp(placeholder, 'g'), value as string);
        });
      }

      // Handle special cases like CRC calculation
      if (message.includes('{{crc}}') || message.includes('AUTO')) {
        message = this.calculateCRC(message);
      }

      // Convert to requested format
      const outputFormat = format || 'ascii';
      let outputData: Uint8Array;

      switch (outputFormat) {
        case 'hex':
          // If message is already in hex format, parse it
          if (/^[0-9A-Fa-f\s]+$/.test(message)) {
            outputData = formatData.from.hex(message);
          } else {
            outputData = formatData.from.ascii(message);
          }
          break;
        case 'ascii':
          outputData = formatData.from.ascii(message);
          break;
        case 'binary':
          outputData = formatData.from.binary(message);
          break;
        case 'json':
          outputData = formatData.from.json(message);
          break;
        case 'base64':
          outputData = formatData.from.base64(message);
          break;
        default:
          outputData = formatData.from.ascii(message);
      }

      return {
        data: outputData,
        format: outputFormat,
        result: message,
        metadata: {
          originalTemplate: template,
          generatedMessage: message,
          messageLength: outputData.length
        }
      };

    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Message generation failed'
      };
    }
  }

  async cleanup(): Promise<void> {
    console.log('Message Generator cleaned up');
  }

  renderUI(container: HTMLElement, context: ToolContext): React.ReactElement {
    return <MessageGeneratorUI tool={this} context={context} />;
  }

  getQuickActions(context: ToolContext): ToolAction[] {
    return [
      {
        id: 'generate-tcp-hello',
        label: '生成TCP Hello',
        icon: Zap,
        shortcut: 'Ctrl+G',
        handler: async (ctx) => {
          const result = await this.execute({
            metadata: {
              template: 'HELLO SERVER FROM CLIENT',
              format: 'ascii'
            }
          });
          ctx.emit('tool-result', result);
        }
      }
    ];
  }

  getContextMenuItems(data: any, context: ToolContext): ContextMenuItem[] {
    return [
      {
        id: 'generate-from-data',
        label: '基于数据生成报文',
        icon: Zap,
        handler: async (inputData) => {
          // Use input data as template
          const template = new TextDecoder().decode(inputData);
          const result = await this.execute({
            metadata: { template, format: 'ascii' }
          });
          context.emit('tool-result', result);
        }
      }
    ];
  }

  // Helper methods
  private calculateCRC(message: string): string {
    // Simple CRC-16 calculation for demonstration
    // In a real implementation, this would use a proper CRC library
    const data = message.replace(/{{crc}}|AUTO/g, '').trim();
    const bytes = data.split(' ').map(hex => parseInt(hex, 16)).filter(b => !isNaN(b));
    
    let crc = 0xFFFF;
    for (const byte of bytes) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        if (crc & 0x0001) {
          crc = (crc >> 1) ^ 0xA001;
        } else {
          crc = crc >> 1;
        }
      }
    }
    
    const crcHex = crc.toString(16).padStart(4, '0').toUpperCase();
    return message.replace(/{{crc}}|AUTO/g, crcHex);
  }
}

// UI Component
const MessageGeneratorUI: React.FC<{ tool: MessageGeneratorTool; context: ToolContext }> = ({ 
  tool, 
  context 
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate>(MESSAGE_TEMPLATES[0]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [customTemplate, setCustomTemplate] = useState('');
  const [outputFormat, setOutputFormat] = useState<DataFormat>('ascii');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize field values when template changes
  React.useEffect(() => {
    const initialValues: Record<string, string> = {};
    selectedTemplate.fields.forEach(field => {
      initialValues[field.name] = field.defaultValue || '';
    });
    setFieldValues(initialValues);
  }, [selectedTemplate]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const template = customTemplate || selectedTemplate.template;
      const result = await tool.execute({
        metadata: {
          template,
          fields: fieldValues,
          format: outputFormat
        }
      });

      if (result.error) {
        context.showNotification(result.error, 'error');
      } else {
        setGeneratedMessage(result.result || '');
        context.showNotification('报文生成成功', 'success');
      }
    } catch (error) {
      context.showNotification(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (generatedMessage) {
      await navigator.clipboard.writeText(generatedMessage);
      context.showNotification('已复制到剪贴板', 'success');
    }
  };

  const handleReset = () => {
    setFieldValues({});
    setCustomTemplate('');
    setGeneratedMessage('');
  };

  return (
    <div className="space-y-4">
      {/* Template Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">选择模板</label>
        <select
          value={selectedTemplate.id}
          onChange={(e) => {
            const template = MESSAGE_TEMPLATES.find(t => t.id === e.target.value);
            if (template) setSelectedTemplate(template);
          }}
          className="w-full p-2 border border-border rounded-md bg-background"
        >
          {MESSAGE_TEMPLATES.map(template => (
            <option key={template.id} value={template.id}>
              {template.name} - {template.description}
            </option>
          ))}
        </select>
      </div>

      {/* Template Fields */}
      {selectedTemplate.fields.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">模板参数</h3>
          {selectedTemplate.fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-1">
                {field.name} {field.required && <span className="text-red-500">*</span>}
              </label>
              {field.type === 'select' ? (
                <select
                  value={fieldValues[field.name] || ''}
                  onChange={(e) => setFieldValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                  className="w-full p-2 border border-border rounded-md bg-background"
                >
                  {field.options?.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={fieldValues[field.name] || ''}
                  onChange={(e) => setFieldValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full p-2 border border-border rounded-md bg-background font-mono"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Custom Template */}
      <div>
        <label className="block text-sm font-medium mb-2">自定义模板 (可选)</label>
        <textarea
          value={customTemplate}
          onChange={(e) => setCustomTemplate(e.target.value)}
          placeholder="输入自定义模板，使用 {{fieldName}} 作为占位符"
          className="w-full h-24 p-3 border border-border rounded-md bg-background font-mono text-sm"
        />
      </div>

      {/* Output Format */}
      <div>
        <label className="block text-sm font-medium mb-2">输出格式</label>
        <select
          value={outputFormat}
          onChange={(e) => setOutputFormat(e.target.value as DataFormat)}
          className="w-full p-2 border border-border rounded-md bg-background"
        >
          {tool.supportedFormats.map(format => (
            <option key={format} value={format}>{format.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {/* Generated Message */}
      {generatedMessage && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">生成的报文</label>
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-muted hover:bg-accent rounded-md transition-colors"
            >
              <Copy className="w-3 h-3" />
              <span>复制</span>
            </button>
          </div>
          <div className="p-3 border border-border rounded-md bg-muted font-mono text-sm whitespace-pre-wrap">
            {generatedMessage}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          onClick={handleReset}
          className="flex items-center space-x-2 px-3 py-2 border border-border rounded-md hover:bg-accent transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>重置</span>
        </button>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Play className="w-4 h-4" />
          <span>{isGenerating ? '生成中...' : '生成报文'}</span>
        </button>
      </div>
    </div>
  );
};

export default MessageGeneratorTool;
