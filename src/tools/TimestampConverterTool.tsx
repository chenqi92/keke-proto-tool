import React, { useState, useEffect } from 'react';
import { 
  BaseTool, 
  ToolInput, 
  ToolOutput, 
  ToolContext, 
  ToolAction, 
  ContextMenuItem 
} from '@/types/toolbox';
import { DataFormat } from '@/components/DataFormatSelector';
import { 
  Clock, 
  Play, 
  Copy, 
  RotateCcw,
  Calendar,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

interface TimestampFormat {
  id: string;
  name: string;
  description: string;
  example: string;
  parser: (input: string) => Date | null;
  formatter: (date: Date) => string;
}

const TIMESTAMP_FORMATS: TimestampFormat[] = [
  {
    id: 'unix-seconds',
    name: 'Unix 时间戳 (秒)',
    description: '从1970年1月1日开始的秒数',
    example: '1640995200',
    parser: (input: string) => {
      const timestamp = parseInt(input);
      return isNaN(timestamp) ? null : new Date(timestamp * 1000);
    },
    formatter: (date: Date) => Math.floor(date.getTime() / 1000).toString()
  },
  {
    id: 'unix-milliseconds',
    name: 'Unix 时间戳 (毫秒)',
    description: '从1970年1月1日开始的毫秒数',
    example: '1640995200000',
    parser: (input: string) => {
      const timestamp = parseInt(input);
      return isNaN(timestamp) ? null : new Date(timestamp);
    },
    formatter: (date: Date) => date.getTime().toString()
  },
  {
    id: 'iso8601',
    name: 'ISO 8601',
    description: '国际标准时间格式',
    example: '2022-01-01T00:00:00.000Z',
    parser: (input: string) => {
      const date = new Date(input);
      return isNaN(date.getTime()) ? null : date;
    },
    formatter: (date: Date) => date.toISOString()
  },
  {
    id: 'rfc2822',
    name: 'RFC 2822',
    description: 'Email 标准时间格式',
    example: 'Sat, 01 Jan 2022 00:00:00 GMT',
    parser: (input: string) => {
      const date = new Date(input);
      return isNaN(date.getTime()) ? null : date;
    },
    formatter: (date: Date) => date.toUTCString()
  },
  {
    id: 'local-string',
    name: '本地时间字符串',
    description: '本地格式的时间字符串',
    example: '2022/1/1 上午8:00:00',
    parser: (input: string) => {
      const date = new Date(input);
      return isNaN(date.getTime()) ? null : date;
    },
    formatter: (date: Date) => date.toLocaleString('zh-CN')
  },
  {
    id: 'custom',
    name: '自定义格式',
    description: '用户自定义的时间格式',
    example: 'YYYY-MM-DD HH:mm:ss',
    parser: (input: string) => {
      // Simple parser for common patterns
      const patterns = [
        /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
        /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
        /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/
      ];
      
      for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) {
          const [, year, month, day, hour, minute, second] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                         parseInt(hour), parseInt(minute), parseInt(second));
        }
      }
      
      const date = new Date(input);
      return isNaN(date.getTime()) ? null : date;
    },
    formatter: (date: Date) => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hour = date.getHours().toString().padStart(2, '0');
      const minute = date.getMinutes().toString().padStart(2, '0');
      const second = date.getSeconds().toString().padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    }
  }
];

interface ConversionResult {
  inputFormat: TimestampFormat;
  outputFormat: TimestampFormat;
  inputValue: string;
  parsedDate: Date;
  outputValue: string;
  timezone: string;
  isValid: boolean;
  error?: string;
}

class TimestampConverterTool implements BaseTool {
  id = 'timestamp-converter';
  name = '时间戳转换器';
  description = '在不同时间格式之间进行转换，支持Unix时间戳、ISO 8601等格式';
  version = '1.0.0';
  category = 'conversion' as const;
  icon = Clock;
  author = 'ProtoTool';

  supportedFormats: DataFormat[] = ['ascii', 'json'];
  supportedProtocols = ['TCP', 'UDP', 'HTTP', 'WebSocket', 'Custom'] as const;
  requiresConnection = false;
  canProcessStreaming = false;

  defaultConfig = {
    fromFormat: 'unix-seconds',
    toFormat: 'iso8601',
    showTimezone: true,
    showRelativeTime: true,
    autoDetect: true
  };

  async initialize(context: ToolContext): Promise<void> {
    console.log('Timestamp Converter initialized');
  }

  async execute(input: ToolInput): Promise<ToolOutput> {
    try {
      if (!input.data || input.data.length === 0) {
        throw new Error('No timestamp data provided');
      }

      const { fromFormatId, toFormatId, autoDetect } = input.metadata || {};
      
      const inputText = new TextDecoder().decode(input.data).trim();
      
      let fromFormat = TIMESTAMP_FORMATS.find(f => f.id === fromFormatId);
      const toFormat = TIMESTAMP_FORMATS.find(f => f.id === toFormatId) || TIMESTAMP_FORMATS[2];

      // Auto-detect format if enabled
      if (autoDetect !== false && !fromFormat) {
        fromFormat = this.detectFormat(inputText);
      }

      if (!fromFormat) {
        fromFormat = TIMESTAMP_FORMATS[0]; // Default to Unix seconds
      }

      const result = this.convertTimestamp(inputText, fromFormat, toFormat);

      return {
        data: new TextEncoder().encode(result.outputValue),
        format: 'ascii',
        result: result.outputValue,
        metadata: {
          conversionResult: result,
          fromFormat: fromFormat.name,
          toFormat: toFormat.name,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };

    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Timestamp conversion failed'
      };
    }
  }

  async cleanup(): Promise<void> {
    console.log('Timestamp Converter cleaned up');
  }

  renderUI(container: HTMLElement, context: ToolContext): React.ReactElement {
    return <TimestampConverterUI tool={this} context={context} />;
  }

  getQuickActions(context: ToolContext): ToolAction[] {
    return [
      {
        id: 'current-timestamp',
        label: '当前时间戳',
        icon: Clock,
        shortcut: 'Ctrl+T',
        handler: async (ctx) => {
          const now = Date.now();
          const result = await this.execute({
            data: new TextEncoder().encode(Math.floor(now / 1000).toString()),
            metadata: { fromFormatId: 'unix-seconds', toFormatId: 'iso8601' }
          });
          ctx.emit('tool-result', result);
        }
      }
    ];
  }

  getContextMenuItems(data: any, context: ToolContext): ContextMenuItem[] {
    return [
      {
        id: 'convert-to-iso',
        label: '转换为 ISO 8601',
        icon: Clock,
        handler: async (inputData) => {
          const result = await this.execute({
            data: inputData,
            metadata: { toFormatId: 'iso8601', autoDetect: true }
          });
          context.emit('tool-result', result);
        }
      },
      {
        id: 'convert-to-unix',
        label: '转换为 Unix 时间戳',
        icon: Clock,
        handler: async (inputData) => {
          const result = await this.execute({
            data: inputData,
            metadata: { toFormatId: 'unix-seconds', autoDetect: true }
          });
          context.emit('tool-result', result);
        }
      }
    ];
  }

  // Helper methods
  private detectFormat(input: string): TimestampFormat | undefined {
    // Try each format's parser
    for (const format of TIMESTAMP_FORMATS) {
      if (format.id === 'custom') continue; // Skip custom format in auto-detection
      
      try {
        const date = format.parser(input);
        if (date && !isNaN(date.getTime())) {
          // Additional validation for Unix timestamps
          if (format.id.startsWith('unix')) {
            const timestamp = parseInt(input);
            // Reasonable range check (1970-2100)
            if (format.id === 'unix-seconds' && (timestamp < 0 || timestamp > 4102444800)) {
              continue;
            }
            if (format.id === 'unix-milliseconds' && (timestamp < 0 || timestamp > 4102444800000)) {
              continue;
            }
          }
          return format;
        }
      } catch (error) {
        continue;
      }
    }
    
    return undefined;
  }

  private convertTimestamp(input: string, fromFormat: TimestampFormat, toFormat: TimestampFormat): ConversionResult {
    const result: ConversionResult = {
      inputFormat: fromFormat,
      outputFormat: toFormat,
      inputValue: input,
      parsedDate: new Date(),
      outputValue: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isValid: false
    };

    try {
      // Parse input
      const parsedDate = fromFormat.parser(input);
      
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        result.error = `无法解析 ${fromFormat.name} 格式的时间: ${input}`;
        return result;
      }

      result.parsedDate = parsedDate;
      result.isValid = true;

      // Format output
      result.outputValue = toFormat.formatter(parsedDate);

    } catch (error) {
      result.error = error instanceof Error ? error.message : '转换失败';
    }

    return result;
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (Math.abs(diffSeconds) < 60) {
      return diffSeconds === 0 ? '现在' : `${Math.abs(diffSeconds)}秒${diffSeconds > 0 ? '前' : '后'}`;
    } else if (Math.abs(diffMinutes) < 60) {
      return `${Math.abs(diffMinutes)}分钟${diffMinutes > 0 ? '前' : '后'}`;
    } else if (Math.abs(diffHours) < 24) {
      return `${Math.abs(diffHours)}小时${diffHours > 0 ? '前' : '后'}`;
    } else if (Math.abs(diffDays) < 30) {
      return `${Math.abs(diffDays)}天${diffDays > 0 ? '前' : '后'}`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  }
}

// UI Component
const TimestampConverterUI: React.FC<{ tool: TimestampConverterTool; context: ToolContext }> = ({ 
  tool, 
  context 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [fromFormat, setFromFormat] = useState<TimestampFormat>(TIMESTAMP_FORMATS[0]);
  const [toFormat, setToFormat] = useState<TimestampFormat>(TIMESTAMP_FORMATS[2]);
  const [autoDetect, setAutoDetect] = useState(true);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-convert when input changes
  useEffect(() => {
    if (inputValue.trim()) {
      handleConvert();
    } else {
      setConversionResult(null);
    }
  }, [inputValue, fromFormat, toFormat, autoDetect]);

  const handleConvert = async () => {
    if (!inputValue.trim()) {
      context.showNotification('请输入时间戳', 'warning');
      return;
    }

    setIsConverting(true);

    try {
      const result = await tool.execute({
        data: new TextEncoder().encode(inputValue),
        metadata: {
          fromFormatId: fromFormat.id,
          toFormatId: toFormat.id,
          autoDetect
        }
      });

      if (result.error) {
        context.showNotification(result.error, 'error');
        setConversionResult(null);
      } else {
        setConversionResult(result.metadata?.conversionResult);
      }
    } catch (error) {
      context.showNotification(`转换失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
      setConversionResult(null);
    } finally {
      setIsConverting(false);
    }
  };

  const handleSwapFormats = () => {
    const temp = fromFormat;
    setFromFormat(toFormat);
    setToFormat(temp);
    
    if (conversionResult) {
      setInputValue(conversionResult.outputValue);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    context.showNotification('已复制到剪贴板', 'success');
  };

  const handleUseCurrentTime = () => {
    const timestamp = Math.floor(currentTime.getTime() / 1000);
    setInputValue(timestamp.toString());
    setFromFormat(TIMESTAMP_FORMATS[0]); // Unix seconds
  };

  const handleReset = () => {
    setInputValue('');
    setConversionResult(null);
  };

  const renderResult = () => {
    if (!conversionResult) return null;

    return (
      <div className="space-y-4">
        {/* Conversion Result */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">转换结果</label>
            <button
              onClick={() => handleCopy(conversionResult.outputValue)}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-muted hover:bg-accent rounded-md transition-colors"
            >
              <Copy className="w-3 h-3" />
              <span>复制</span>
            </button>
          </div>
          <div className="p-3 border border-border rounded-md bg-muted font-mono text-sm">
            {conversionResult.outputValue}
          </div>
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-muted rounded-md">
            <div className="text-xs text-muted-foreground mb-1">本地时间</div>
            <div className="text-sm">{conversionResult.parsedDate.toLocaleString('zh-CN')}</div>
          </div>

          <div className="p-3 bg-muted rounded-md">
            <div className="text-xs text-muted-foreground mb-1">UTC 时间</div>
            <div className="text-sm">{conversionResult.parsedDate.toUTCString()}</div>
          </div>

          <div className="p-3 bg-muted rounded-md">
            <div className="text-xs text-muted-foreground mb-1">相对时间</div>
            <div className="text-sm">{tool['getRelativeTime'](conversionResult.parsedDate)}</div>
          </div>

          <div className="p-3 bg-muted rounded-md">
            <div className="text-xs text-muted-foreground mb-1">时区</div>
            <div className="text-sm">{conversionResult.timezone}</div>
          </div>
        </div>

        {/* All Formats */}
        <div>
          <h4 className="text-sm font-medium mb-2">所有格式</h4>
          <div className="space-y-2">
            {TIMESTAMP_FORMATS.filter(f => f.id !== 'custom').map(format => (
              <div key={format.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <div>
                  <div className="text-sm font-medium">{format.name}</div>
                  <div className="text-xs text-muted-foreground">{format.description}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm">
                    {format.formatter(conversionResult.parsedDate)}
                  </span>
                  <button
                    onClick={() => handleCopy(format.formatter(conversionResult.parsedDate))}
                    className="p-1 hover:bg-accent rounded-md transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Current Time Display */}
      <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">当前时间</div>
            <div className="text-xs text-muted-foreground">
              Unix: {Math.floor(currentTime.getTime() / 1000)} | 
              本地: {currentTime.toLocaleString('zh-CN')}
            </div>
          </div>
          <button
            onClick={handleUseCurrentTime}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Clock className="w-3 h-3" />
            <span>使用</span>
          </button>
        </div>
      </div>

      {/* Format Selection */}
      <div className="grid grid-cols-5 gap-2 items-center">
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">源格式</label>
          <select
            value={fromFormat.id}
            onChange={(e) => {
              const format = TIMESTAMP_FORMATS.find(f => f.id === e.target.value);
              if (format) setFromFormat(format);
            }}
            disabled={autoDetect}
            className="w-full p-2 border border-border rounded-md bg-background text-sm disabled:opacity-50"
          >
            {TIMESTAMP_FORMATS.map(format => (
              <option key={format.id} value={format.id}>{format.name}</option>
            ))}
          </select>
        </div>
        
        <div className="flex justify-center">
          <button
            onClick={handleSwapFormats}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            title="交换格式"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">目标格式</label>
          <select
            value={toFormat.id}
            onChange={(e) => {
              const format = TIMESTAMP_FORMATS.find(f => f.id === e.target.value);
              if (format) setToFormat(format);
            }}
            className="w-full p-2 border border-border rounded-md bg-background text-sm"
          >
            {TIMESTAMP_FORMATS.map(format => (
              <option key={format.id} value={format.id}>{format.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Auto Detect Toggle */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="autoDetect"
          checked={autoDetect}
          onChange={(e) => setAutoDetect(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="autoDetect" className="text-sm">
          自动检测源格式
        </label>
      </div>

      {/* Input */}
      <div>
        <label className="block text-sm font-medium mb-2">输入时间戳</label>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`输入 ${fromFormat.name} 格式的时间戳...`}
          className="w-full p-3 border border-border rounded-md bg-background font-mono text-sm"
        />
        <div className="mt-1 text-xs text-muted-foreground">
          示例: {fromFormat.example}
        </div>
      </div>

      {/* Result */}
      {renderResult()}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          onClick={handleReset}
          className="flex items-center space-x-2 px-3 py-2 border border-border rounded-md hover:bg-accent transition-colors text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          <span>重置</span>
        </button>
      </div>
    </div>
  );
};

export default TimestampConverterTool;
