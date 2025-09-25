import React, { useState } from 'react';
import { 
  BaseTool, 
  ToolInput, 
  ToolOutput, 
  ToolContext, 
  ToolAction, 
  ContextMenuItem 
} from '@/types/toolbox';
import { DataFormat, formatData } from '@/components/DataFormatSelector';
import { 
  FileSearch, 
  Play, 
  Download, 
  Upload, 
  Eye,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

interface ParseRule {
  id: string;
  name: string;
  description: string;
  protocol: string;
  pattern: string;
  fields: ParseField[];
}

interface ParseField {
  name: string;
  offset: number;
  length: number;
  type: 'uint8' | 'uint16' | 'uint32' | 'string' | 'hex' | 'float';
  endian?: 'big' | 'little';
  description?: string;
}

interface ParseResult {
  success: boolean;
  protocol?: string;
  fields: Record<string, any>;
  errors: string[];
  warnings: string[];
  rawData: Uint8Array;
  parsedSize: number;
}

const PARSE_RULES: ParseRule[] = [
  {
    id: 'modbus-rtu',
    name: 'Modbus RTU',
    description: 'Modbus RTU protocol parser',
    protocol: 'Modbus',
    pattern: '^[0-9A-Fa-f]{2}\\s*[0-9A-Fa-f]{2}',
    fields: [
      { name: 'slaveId', offset: 0, length: 1, type: 'uint8', description: 'Slave ID' },
      { name: 'functionCode', offset: 1, length: 1, type: 'uint8', description: 'Function Code' },
      { name: 'data', offset: 2, length: -2, type: 'hex', description: 'Data payload' },
      { name: 'crc', offset: -2, length: 2, type: 'uint16', endian: 'little', description: 'CRC-16' }
    ]
  },
  {
    id: 'http-request',
    name: 'HTTP Request',
    description: 'HTTP request message parser',
    protocol: 'HTTP',
    pattern: '^(GET|POST|PUT|DELETE|HEAD|OPTIONS)',
    fields: [
      { name: 'method', offset: 0, length: 0, type: 'string', description: 'HTTP Method' },
      { name: 'path', offset: 0, length: 0, type: 'string', description: 'Request Path' },
      { name: 'version', offset: 0, length: 0, type: 'string', description: 'HTTP Version' },
      { name: 'headers', offset: 0, length: 0, type: 'string', description: 'HTTP Headers' }
    ]
  },
  {
    id: 'tcp-header',
    name: 'TCP Header',
    description: 'TCP packet header parser',
    protocol: 'TCP',
    pattern: '^.{20}', // Minimum TCP header size
    fields: [
      { name: 'sourcePort', offset: 0, length: 2, type: 'uint16', endian: 'big', description: 'Source Port' },
      { name: 'destPort', offset: 2, length: 2, type: 'uint16', endian: 'big', description: 'Destination Port' },
      { name: 'seqNumber', offset: 4, length: 4, type: 'uint32', endian: 'big', description: 'Sequence Number' },
      { name: 'ackNumber', offset: 8, length: 4, type: 'uint32', endian: 'big', description: 'Acknowledgment Number' },
      { name: 'flags', offset: 13, length: 1, type: 'uint8', description: 'TCP Flags' },
      { name: 'windowSize', offset: 14, length: 2, type: 'uint16', endian: 'big', description: 'Window Size' }
    ]
  }
];

class ProtocolParserTool implements BaseTool {
  id = 'protocol-parser';
  name = '协议解析器';
  description = '解析和分析各种网络协议消息';
  version = '1.0.0';
  category = 'parsing' as const;
  icon = FileSearch;
  author = 'ProtoTool';

  supportedFormats: DataFormat[] = ['hex', 'ascii', 'binary', 'base64'];
  supportedProtocols = ['TCP', 'UDP', 'HTTP', 'Modbus', 'Custom'] as const;
  requiresConnection = false;
  canProcessStreaming = true;

  defaultConfig = {
    selectedRule: 'modbus-rtu',
    autoDetect: true,
    showRawData: true,
    validateCRC: true
  };

  async initialize(context: ToolContext): Promise<void> {
    console.log('Protocol Parser initialized');
  }

  async execute(input: ToolInput): Promise<ToolOutput> {
    try {
      if (!input.data || input.data.length === 0) {
        throw new Error('No data provided for parsing');
      }

      const { ruleId, autoDetect } = input.metadata || {};
      let parseRule: ParseRule | undefined;

      if (autoDetect !== false) {
        // Try to auto-detect protocol
        parseRule = this.detectProtocol(input.data);
      }

      if (!parseRule && ruleId) {
        parseRule = PARSE_RULES.find(rule => rule.id === ruleId);
      }

      if (!parseRule) {
        parseRule = PARSE_RULES[0]; // Default to first rule
      }

      const result = this.parseData(input.data, parseRule);

      return {
        data: input.data,
        format: input.format || 'hex',
        result: JSON.stringify(result, null, 2),
        metadata: {
          parseResult: result,
          usedRule: parseRule.id,
          protocol: parseRule.protocol
        }
      };

    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Protocol parsing failed'
      };
    }
  }

  async cleanup(): Promise<void> {
    console.log('Protocol Parser cleaned up');
  }

  renderUI(container: HTMLElement, context: ToolContext): React.ReactElement {
    return <ProtocolParserUI tool={this} context={context} />;
  }

  getQuickActions(context: ToolContext): ToolAction[] {
    return [
      {
        id: 'parse-selected',
        label: '解析选中数据',
        icon: FileSearch,
        shortcut: 'Ctrl+P',
        handler: async (ctx) => {
          if (ctx.selectedData) {
            const result = await this.execute({
              data: ctx.selectedData,
              metadata: { autoDetect: true }
            });
            ctx.emit('tool-result', result);
          }
        }
      }
    ];
  }

  getContextMenuItems(data: any, context: ToolContext): ContextMenuItem[] {
    return [
      {
        id: 'parse-as-modbus',
        label: '解析为 Modbus',
        icon: FileSearch,
        handler: async (inputData) => {
          const result = await this.execute({
            data: inputData,
            metadata: { ruleId: 'modbus-rtu', autoDetect: false }
          });
          context.emit('tool-result', result);
        }
      },
      {
        id: 'parse-as-http',
        label: '解析为 HTTP',
        icon: FileSearch,
        handler: async (inputData) => {
          const result = await this.execute({
            data: inputData,
            metadata: { ruleId: 'http-request', autoDetect: false }
          });
          context.emit('tool-result', result);
        }
      }
    ];
  }

  // Helper methods
  private detectProtocol(data: Uint8Array): ParseRule | undefined {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(data);
    const hex = formatData.to.hex(data);

    // Try to match against known patterns
    for (const rule of PARSE_RULES) {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        if (rule.protocol === 'HTTP' && regex.test(text)) {
          return rule;
        } else if (rule.protocol !== 'HTTP' && regex.test(hex)) {
          return rule;
        }
      } catch (error) {
        console.warn(`Invalid regex pattern for rule ${rule.id}:`, error);
      }
    }

    return undefined;
  }

  private parseData(data: Uint8Array, rule: ParseRule): ParseResult {
    const result: ParseResult = {
      success: false,
      protocol: rule.protocol,
      fields: {},
      errors: [],
      warnings: [],
      rawData: data,
      parsedSize: 0
    };

    try {
      if (rule.protocol === 'HTTP') {
        return this.parseHTTP(data, rule);
      } else {
        return this.parseBinary(data, rule);
      }
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown parsing error');
      return result;
    }
  }

  private parseHTTP(data: Uint8Array, rule: ParseRule): ParseResult {
    const result: ParseResult = {
      success: false,
      protocol: 'HTTP',
      fields: {},
      errors: [],
      warnings: [],
      rawData: data,
      parsedSize: data.length
    };

    try {
      const text = new TextDecoder().decode(data);
      const lines = text.split('\r\n');
      
      if (lines.length === 0) {
        result.errors.push('Empty HTTP message');
        return result;
      }

      // Parse request line
      const requestLine = lines[0];
      const requestParts = requestLine.split(' ');
      
      if (requestParts.length >= 3) {
        result.fields.method = requestParts[0];
        result.fields.path = requestParts[1];
        result.fields.version = requestParts[2];
      } else {
        result.errors.push('Invalid HTTP request line');
        return result;
      }

      // Parse headers
      const headers: Record<string, string> = {};
      let i = 1;
      
      for (; i < lines.length; i++) {
        const line = lines[i];
        if (line === '') break; // End of headers
        
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const name = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          headers[name] = value;
        }
      }
      
      result.fields.headers = headers;
      
      // Parse body if present
      if (i + 1 < lines.length) {
        result.fields.body = lines.slice(i + 1).join('\r\n');
      }

      result.success = true;
      
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'HTTP parsing failed');
    }

    return result;
  }

  private parseBinary(data: Uint8Array, rule: ParseRule): ParseResult {
    const result: ParseResult = {
      success: false,
      protocol: rule.protocol,
      fields: {},
      errors: [],
      warnings: [],
      rawData: data,
      parsedSize: 0
    };

    try {
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      
      for (const field of rule.fields) {
        try {
          let offset = field.offset;
          let length = field.length;
          
          // Handle negative offsets (from end)
          if (offset < 0) {
            offset = data.length + offset;
          }
          
          // Handle negative lengths (remaining data minus length)
          if (length < 0) {
            length = data.length - offset + length;
          }
          
          if (offset < 0 || offset >= data.length) {
            result.warnings.push(`Field ${field.name}: offset ${field.offset} is out of bounds`);
            continue;
          }
          
          if (offset + length > data.length) {
            result.warnings.push(`Field ${field.name}: extends beyond data boundary`);
            length = data.length - offset;
          }

          let value: any;
          
          switch (field.type) {
            case 'uint8':
              value = view.getUint8(offset);
              break;
            case 'uint16':
              value = field.endian === 'little' 
                ? view.getUint16(offset, true)
                : view.getUint16(offset, false);
              break;
            case 'uint32':
              value = field.endian === 'little'
                ? view.getUint32(offset, true)
                : view.getUint32(offset, false);
              break;
            case 'float':
              value = field.endian === 'little'
                ? view.getFloat32(offset, true)
                : view.getFloat32(offset, false);
              break;
            case 'string':
              value = new TextDecoder().decode(data.slice(offset, offset + length));
              break;
            case 'hex':
              value = formatData.to.hex(data.slice(offset, offset + length));
              break;
            default:
              value = Array.from(data.slice(offset, offset + length));
          }
          
          result.fields[field.name] = value;
          result.parsedSize = Math.max(result.parsedSize, offset + length);
          
        } catch (error) {
          result.errors.push(`Field ${field.name}: ${error instanceof Error ? error.message : 'parsing failed'}`);
        }
      }

      result.success = result.errors.length === 0;
      
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Binary parsing failed');
    }

    return result;
  }
}

// UI Component
const ProtocolParserUI: React.FC<{ tool: ProtocolParserTool; context: ToolContext }> = ({ 
  tool, 
  context 
}) => {
  const [inputData, setInputData] = useState('');
  const [inputFormat, setInputFormat] = useState<DataFormat>('hex');
  const [selectedRule, setSelectedRule] = useState<ParseRule>(PARSE_RULES[0]);
  const [autoDetect, setAutoDetect] = useState(true);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleParse = async () => {
    if (!inputData.trim()) {
      context.showNotification('请输入要解析的数据', 'warning');
      return;
    }

    setIsParsing(true);
    try {
      // Convert input data to Uint8Array
      const data = formatData.from[inputFormat](inputData);
      
      const result = await tool.execute({
        data,
        format: inputFormat,
        metadata: {
          ruleId: selectedRule.id,
          autoDetect
        }
      });

      if (result.error) {
        context.showNotification(result.error, 'error');
      } else {
        setParseResult(result.metadata?.parseResult);
        context.showNotification('解析完成', 'success');
      }
    } catch (error) {
      context.showNotification(`解析失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const renderParseResult = () => {
    if (!parseResult) return null;

    return (
      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center space-x-2">
          {parseResult.success ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          )}
          <span className="font-medium">
            {parseResult.success ? '解析成功' : '解析失败'}
          </span>
          <span className="text-sm text-muted-foreground">
            协议: {parseResult.protocol}
          </span>
        </div>

        {/* Errors */}
        {parseResult.errors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <h4 className="text-sm font-medium text-red-800 mb-2">错误:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {parseResult.errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {parseResult.warnings.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">警告:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {parseResult.warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Parsed Fields */}
        <div>
          <h4 className="text-sm font-medium mb-2">解析结果:</h4>
          <div className="space-y-2">
            {Object.entries(parseResult.fields).map(([name, value]) => (
              <div key={name} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <span className="font-mono text-sm">{name}:</span>
                <span className="font-mono text-sm text-muted-foreground">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="text-xs text-muted-foreground">
          解析了 {parseResult.parsedSize} / {parseResult.rawData.length} 字节
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Input Data */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">输入数据</label>
          <select
            value={inputFormat}
            onChange={(e) => setInputFormat(e.target.value as DataFormat)}
            className="px-2 py-1 border border-border rounded-md bg-background text-xs"
          >
            {tool.supportedFormats.map(format => (
              <option key={format} value={format}>{format.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <textarea
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder="输入要解析的数据..."
          className="w-full h-32 p-3 border border-border rounded-md bg-background font-mono text-sm resize-none"
        />
      </div>

      {/* Parser Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">解析规则</label>
          <select
            value={selectedRule.id}
            onChange={(e) => {
              const rule = PARSE_RULES.find(r => r.id === e.target.value);
              if (rule) setSelectedRule(rule);
            }}
            disabled={autoDetect}
            className="w-full p-2 border border-border rounded-md bg-background disabled:opacity-50"
          >
            {PARSE_RULES.map(rule => (
              <option key={rule.id} value={rule.id}>
                {rule.name} - {rule.description}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="autoDetect"
            checked={autoDetect}
            onChange={(e) => setAutoDetect(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="autoDetect" className="text-sm">
            自动检测协议
          </label>
        </div>
      </div>

      {/* Parse Button */}
      <button
        onClick={handleParse}
        disabled={isParsing || !inputData.trim()}
        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Play className="w-4 h-4" />
        <span>{isParsing ? '解析中...' : '开始解析'}</span>
      </button>

      {/* Parse Result */}
      {renderParseResult()}
    </div>
  );
};

// Export the tool class
export { ProtocolParserTool };
export default ProtocolParserTool;
