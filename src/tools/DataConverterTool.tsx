import React, { useState, useEffect } from 'react';
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
  Shuffle, 
  ArrowRight, 
  Copy, 
  RotateCcw,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';

interface ConversionHistory {
  id: string;
  timestamp: Date;
  fromFormat: DataFormat;
  toFormat: DataFormat;
  input: string;
  output: string;
  success: boolean;
}

class DataConverterTool implements BaseTool {
  id = 'data-converter';
  name = '数据转换器';
  description = '在不同数据格式之间进行转换：Hex、ASCII、Base64、二进制等';
  version = '1.0.0';
  category = 'conversion' as const;
  icon = Shuffle;
  author = 'ProtoTool';

  supportedFormats: DataFormat[] = ['ascii', 'hex', 'binary', 'octal', 'decimal', 'base64', 'json', 'utf-8'];
  supportedProtocols = ['TCP', 'UDP', 'WebSocket', 'HTTP', 'Custom'] as const;
  requiresConnection = false;
  canProcessStreaming = true;

  defaultConfig = {
    fromFormat: 'hex' as DataFormat,
    toFormat: 'ascii' as DataFormat,
    autoConvert: true,
    keepHistory: true,
    maxHistoryItems: 50
  };

  private conversionHistory: ConversionHistory[] = [];

  async initialize(context: ToolContext): Promise<void> {
    // Load conversion history from storage
    this.loadHistory();
    console.log('Data Converter initialized');
  }

  async execute(input: ToolInput): Promise<ToolOutput> {
    try {
      if (!input.data || input.data.length === 0) {
        throw new Error('No data provided for conversion');
      }

      const { fromFormat, toFormat } = input.metadata || {};
      
      if (!fromFormat || !toFormat) {
        throw new Error('Source and target formats must be specified');
      }

      // Convert from source format to bytes
      const inputText = new TextDecoder().decode(input.data);
      let bytes: Uint8Array;

      try {
        bytes = (formatData.from as any)[fromFormat](inputText);
      } catch (error) {
        throw new Error(`Invalid ${fromFormat} format: ${error instanceof Error ? error.message : 'conversion failed'}`);
      }

      // Convert bytes to target format
      let outputText: string;
      try {
        outputText = (formatData.to as any)[toFormat](bytes);
      } catch (error) {
        throw new Error(`Failed to convert to ${toFormat}: ${error instanceof Error ? error.message : 'conversion failed'}`);
      }

      // Add to history
      this.addToHistory({
        fromFormat,
        toFormat,
        input: inputText,
        output: outputText,
        success: true
      });

      return {
        data: new TextEncoder().encode(outputText),
        format: toFormat,
        result: outputText,
        metadata: {
          fromFormat,
          toFormat,
          originalSize: input.data.length,
          convertedSize: bytes.length,
          outputLength: outputText.length
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Data conversion failed';
      
      // Add failed conversion to history
      if (input.metadata?.fromFormat && input.metadata?.toFormat) {
        this.addToHistory({
          fromFormat: input.metadata.fromFormat,
          toFormat: input.metadata.toFormat,
          input: input.data ? new TextDecoder().decode(input.data) : '',
          output: '',
          success: false
        });
      }

      return {
        error: errorMessage
      };
    }
  }

  async cleanup(): Promise<void> {
    this.saveHistory();
    console.log('Data Converter cleaned up');
  }

  renderUI(container: HTMLElement, context: ToolContext): React.ReactElement {
    return <DataConverterUI tool={this} context={context} />;
  }

  getQuickActions(context: ToolContext): ToolAction[] {
    return [
      {
        id: 'hex-to-ascii',
        label: 'Hex → ASCII',
        icon: Shuffle,
        shortcut: 'Ctrl+H',
        handler: async (ctx) => {
          if (ctx.selectedData) {
            const result = await this.execute({
              data: ctx.selectedData,
              metadata: { fromFormat: 'hex', toFormat: 'ascii' }
            });
            ctx.emit('tool-result', result);
          }
        }
      },
      {
        id: 'ascii-to-hex',
        label: 'ASCII → Hex',
        icon: Shuffle,
        shortcut: 'Ctrl+Shift+H',
        handler: async (ctx) => {
          if (ctx.selectedData) {
            const result = await this.execute({
              data: ctx.selectedData,
              metadata: { fromFormat: 'ascii', toFormat: 'hex' }
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
        id: 'convert-to-hex',
        label: '转换为 Hex',
        icon: Shuffle,
        handler: async (inputData) => {
          const result = await this.execute({
            data: inputData,
            metadata: { fromFormat: 'ascii', toFormat: 'hex' }
          });
          context.emit('tool-result', result);
        }
      },
      {
        id: 'convert-to-base64',
        label: '转换为 Base64',
        icon: Shuffle,
        handler: async (inputData) => {
          const result = await this.execute({
            data: inputData,
            metadata: { fromFormat: 'ascii', toFormat: 'base64' }
          });
          context.emit('tool-result', result);
        }
      }
    ];
  }

  // Helper methods
  private addToHistory(conversion: Omit<ConversionHistory, 'id' | 'timestamp'>) {
    const historyItem: ConversionHistory = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...conversion
    };

    this.conversionHistory.unshift(historyItem);
    
    // Limit history size
    if (this.conversionHistory.length > this.defaultConfig.maxHistoryItems) {
      this.conversionHistory = this.conversionHistory.slice(0, this.defaultConfig.maxHistoryItems);
    }
  }

  private loadHistory() {
    try {
      const saved = localStorage.getItem('prototool-data-converter-history');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.conversionHistory = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load conversion history:', error);
    }
  }

  private saveHistory() {
    try {
      localStorage.setItem('prototool-data-converter-history', JSON.stringify(this.conversionHistory));
    } catch (error) {
      console.warn('Failed to save conversion history:', error);
    }
  }

  getHistory(): ConversionHistory[] {
    return [...this.conversionHistory];
  }

  clearHistory() {
    this.conversionHistory = [];
    this.saveHistory();
  }
}

// UI Component
const DataConverterUI: React.FC<{ tool: DataConverterTool; context: ToolContext }> = ({ 
  tool, 
  context 
}) => {
  const [inputData, setInputData] = useState('');
  const [outputData, setOutputData] = useState('');
  const [fromFormat, setFromFormat] = useState<DataFormat>('hex');
  const [toFormat, setToFormat] = useState<DataFormat>('ascii');
  const [autoConvert, setAutoConvert] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ConversionHistory[]>([]);

  // Load history
  useEffect(() => {
    setHistory(tool.getHistory());
  }, [tool]);

  // Auto-convert when input or formats change
  useEffect(() => {
    if (autoConvert && inputData.trim()) {
      handleConvert();
    }
  }, [inputData, fromFormat, toFormat, autoConvert]);

  const handleConvert = async () => {
    if (!inputData.trim()) {
      setError('请输入要转换的数据');
      return;
    }

    // Validate input format
    if (!validateFormat[fromFormat](inputData)) {
      setError(`输入数据不是有效的 ${fromFormat.toUpperCase()} 格式`);
      return;
    }

    setIsConverting(true);
    setError(null);

    try {
      const result = await tool.execute({
        data: new TextEncoder().encode(inputData),
        metadata: { fromFormat, toFormat }
      });

      if (result.error) {
        setError(result.error);
        setOutputData('');
      } else {
        setOutputData(result.result || '');
        setError(null);
        // Update history
        setHistory(tool.getHistory());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '转换失败');
      setOutputData('');
    } finally {
      setIsConverting(false);
    }
  };

  const handleSwapFormats = () => {
    const temp = fromFormat;
    setFromFormat(toFormat);
    setToFormat(temp);
    
    // Swap input/output data
    setInputData(outputData);
    setOutputData(inputData);
  };

  const handleCopyOutput = async () => {
    if (outputData) {
      await navigator.clipboard.writeText(outputData);
      context.showNotification('已复制到剪贴板', 'success');
    }
  };

  const handleReset = () => {
    setInputData('');
    setOutputData('');
    setError(null);
  };

  const handleHistoryItemClick = (item: ConversionHistory) => {
    setFromFormat(item.fromFormat);
    setToFormat(item.toFormat);
    setInputData(item.input);
    setOutputData(item.output);
    setShowHistory(false);
  };

  const renderHistory = () => {
    if (!showHistory) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">转换历史</h3>
          <button
            onClick={() => {
              tool.clearHistory();
              setHistory([]);
              context.showNotification('历史记录已清空', 'success');
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            清空历史
          </button>
        </div>
        
        <div className="max-h-48 overflow-auto space-y-1">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">暂无转换历史</p>
          ) : (
            history.map(item => (
              <button
                key={item.id}
                onClick={() => handleHistoryItemClick(item)}
                className={`w-full p-2 text-left border border-border rounded-md hover:bg-accent transition-colors ${
                  !item.success ? 'border-red-200 bg-red-50' : ''
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono">
                    {item.fromFormat.toUpperCase()} → {item.toFormat.toUpperCase()}
                  </span>
                  <span className="text-muted-foreground">
                    {item.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate mt-1">
                  {item.input.substring(0, 50)}...
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Format Selection */}
      <div className="grid grid-cols-5 gap-2 items-center">
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">源格式</label>
          <select
            value={fromFormat}
            onChange={(e) => setFromFormat(e.target.value as DataFormat)}
            className="w-full p-2 border border-border rounded-md bg-background text-sm"
          >
            {tool.supportedFormats.map(format => (
              <option key={format} value={format}>{format.toUpperCase()}</option>
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
            value={toFormat}
            onChange={(e) => setToFormat(e.target.value as DataFormat)}
            className="w-full p-2 border border-border rounded-md bg-background text-sm"
          >
            {tool.supportedFormats.map(format => (
              <option key={format} value={format}>{format.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Auto Convert Toggle */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="autoConvert"
          checked={autoConvert}
          onChange={(e) => setAutoConvert(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="autoConvert" className="text-sm">
          自动转换
        </label>
      </div>

      {/* Input Data */}
      <div>
        <label className="block text-sm font-medium mb-2">输入数据</label>
        <textarea
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder={`输入 ${fromFormat.toUpperCase()} 格式的数据...`}
          className="w-full h-32 p-3 border border-border rounded-md bg-background font-mono text-sm resize-none"
        />
      </div>

      {/* Convert Button */}
      {!autoConvert && (
        <button
          onClick={handleConvert}
          disabled={isConverting || !inputData.trim()}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Shuffle className="w-4 h-4" />
          <span>{isConverting ? '转换中...' : '开始转换'}</span>
        </button>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 border border-red-200 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Output Data */}
      {outputData && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">输出结果</label>
            <button
              onClick={handleCopyOutput}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-muted hover:bg-accent rounded-md transition-colors"
            >
              <Copy className="w-3 h-3" />
              <span>复制</span>
            </button>
          </div>
          <textarea
            value={outputData}
            readOnly
            className="w-full h-32 p-3 border border-border rounded-md bg-muted font-mono text-sm resize-none"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-3 py-2 border border-border rounded-md hover:bg-accent transition-colors text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重置</span>
          </button>
          
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center space-x-2 px-3 py-2 border border-border rounded-md hover:bg-accent transition-colors text-sm"
          >
            <span>历史记录</span>
          </button>
        </div>
      </div>

      {/* History */}
      {renderHistory()}
    </div>
  );
};

// Export the tool class
export { DataConverterTool };
export default DataConverterTool;
