import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import { Play, RotateCcw, Download, Settings, ArrowRight, Copy, Upload } from 'lucide-react';
import { DataFormatSelector, DataFormat } from '@/components/DataFormatSelector';

interface DataConverterInterfaceProps {
  onExecute: (data: any) => void;
  isExecuting?: boolean;
}

export const DataConverterInterface: React.FC<DataConverterInterfaceProps> = ({
  onExecute,
  isExecuting = false
}) => {
  const [inputData, setInputData] = useState('');
  const [inputFormat, setInputFormat] = useState<DataFormat>('ascii');
  const [outputFormat, setOutputFormat] = useState<DataFormat>('hex');
  const [result, setResult] = useState<string>('');
  const [autoConvert, setAutoConvert] = useState(true);

  // Auto-convert when input changes
  useEffect(() => {
    if (autoConvert && inputData.trim()) {
      handleConvert();
    }
  }, [inputData, inputFormat, outputFormat, autoConvert]);

  const handleConvert = () => {
    if (!inputData.trim()) return;
    
    // Simulate conversion logic
    let converted = '';
    try {
      if (inputFormat === 'ascii' && outputFormat === 'hex') {
        converted = Array.from(new TextEncoder().encode(inputData))
          .map(b => b.toString(16).padStart(2, '0'))
          .join(' ');
      } else if (inputFormat === 'hex' && outputFormat === 'ascii') {
        const bytes = inputData.replace(/\s+/g, '').match(/.{1,2}/g) || [];
        converted = new TextDecoder().decode(new Uint8Array(bytes.map(b => parseInt(b, 16))));
      } else if (inputFormat === 'ascii' && outputFormat === 'base64') {
        converted = btoa(inputData);
      } else if (inputFormat === 'base64' && outputFormat === 'ascii') {
        converted = atob(inputData);
      } else {
        converted = inputData; // Fallback
      }
      setResult(converted);
      onExecute({ inputData, inputFormat, outputFormat, result: converted });
    } catch (error) {
      setResult('转换错误: ' + (error as Error).message);
    }
  };

  const handleReset = () => {
    setInputData('');
    setResult('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
  };

  const handleSwapFormats = () => {
    setInputFormat(outputFormat);
    setOutputFormat(inputFormat);
    if (result) {
      setInputData(result);
      setResult('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Format Selection */}
      <div className="bg-muted/30 rounded-lg p-3">
        <label className="text-xs font-semibold text-foreground mb-2 block">转换格式</label>
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">源格式</label>
            <DataFormatSelector
              value={inputFormat}
              onChange={setInputFormat}
            />
          </div>

          <button
            onClick={handleSwapFormats}
            className="p-1.5 hover:bg-accent rounded-md transition-colors mt-4"
            title="交换格式"
          >
            <ArrowRight className="w-3 h-3" />
          </button>

          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">目标格式</label>
            <DataFormatSelector
              value={outputFormat}
              onChange={setOutputFormat}
            />
          </div>
        </div>
      </div>

      {/* Auto Convert Toggle */}
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-semibold text-foreground">自动转换</label>
            <p className="text-xs text-muted-foreground leading-tight">输入时自动转换</p>
          </div>
          <button
            onClick={() => setAutoConvert(!autoConvert)}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              autoConvert ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                autoConvert ? "translate-x-5" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-foreground">输入数据</label>
          <button
            className="p-1 hover:bg-accent rounded-md transition-colors"
            title="导入数据"
          >
            <Upload className="w-3 h-3" />
          </button>
        </div>
        <textarea
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder={`输入${inputFormat}格式的数据...`}
          className="w-full h-24 p-3 border border-border rounded-md bg-background font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        {inputData && (
          <div className="mt-1 text-xs text-muted-foreground">
            字符数: {inputData.length} | 字节数: {new TextEncoder().encode(inputData).length}
          </div>
        )}
      </div>

      {/* Output Section */}
      {result && (
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-foreground">转换结果</label>
            <div className="flex items-center space-x-1">
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
            字符数: {result.length} | 字节数: {new TextEncoder().encode(result).length}
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

        {!autoConvert && (
          <button
            onClick={handleConvert}
            disabled={isExecuting || !inputData.trim()}
            className={cn(
              "flex items-center space-x-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all font-medium text-xs",
              (isExecuting || !inputData.trim()) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Play className="w-3 h-3" />
            <span>{isExecuting ? '转换中...' : '转换数据'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
