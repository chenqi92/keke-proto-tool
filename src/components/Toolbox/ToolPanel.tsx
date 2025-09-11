import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import {
  X,
  Play,
  Settings,
  Upload,
  Download,
  Zap,
  RotateCcw
} from 'lucide-react';
import { BaseTool, ToolInput, ToolOutput } from '@/types/toolbox';
import { toolboxService } from '@/services/ToolboxService';
import { toolRegistry } from '@/services/ToolRegistry';
import { DataFormatSelector, DataFormat } from '@/components/DataFormatSelector';

interface ToolPanelProps {
  toolId: string;
  sessionId?: string;
  onExecute: (toolId: string, result: any) => void;
  onClose: () => void;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({
  toolId,
  sessionId,
  onExecute,
  onClose
}) => {
  const tool = toolRegistry.getById(toolId)?.tool;

  if (!tool) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">工具未找到</p>
      </div>
    );
  }
  const [inputData, setInputData] = useState('');
  const [inputFormat, setInputFormat] = useState<DataFormat>('ascii');
  const [outputFormat, setOutputFormat] = useState<DataFormat>('ascii');
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<ToolOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toolState, setToolState] = useState<Record<string, any>>({});

  const Icon = tool.icon;

  // Load tool state on mount
  useEffect(() => {
    const savedState = toolboxService.loadToolState(tool.id, sessionId);
    if (savedState) {
      setToolState(savedState);
      // Restore input data if available
      if (savedState.inputData) setInputData(savedState.inputData);
      if (savedState.inputFormat) setInputFormat(savedState.inputFormat);
      if (savedState.outputFormat) setOutputFormat(savedState.outputFormat);
    }
  }, [tool.id, sessionId]);

  // Save tool state when it changes
  useEffect(() => {
    const state = {
      inputData,
      inputFormat,
      outputFormat,
      ...toolState
    };
    toolboxService.saveToolState(tool.id, state, sessionId);
  }, [tool.id, sessionId, inputData, inputFormat, outputFormat, toolState]);

  const handleExecute = async () => {
    if (isExecuting) return;

    setIsExecuting(true);
    setError(null);

    try {
      const input: ToolInput = {
        data: inputData ? new TextEncoder().encode(inputData) : undefined,
        format: inputFormat,
        metadata: { sessionId },
        context: toolState
      };

      await onExecute(tool.id, input);
      
      // Note: The actual result would come through a callback or event
      // For now, we'll simulate a successful execution
      setLastResult({
        data: new TextEncoder().encode('执行成功'),
        format: outputFormat,
        result: '工具执行完成'
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReset = () => {
    setInputData('');
    setError(null);
    setLastResult(null);
    setToolState({});
  };

  const handleImportData = () => {
    // This would open a file dialog or import from session
    console.log('Import data');
  };

  const handleExportResult = () => {
    if (lastResult) {
      // This would export the result
      console.log('Export result', lastResult);
    }
  };

  const renderToolSpecificUI = () => {
    // This would render tool-specific UI based on the tool type
    // For now, we'll render a generic input/output interface
    return (
      <div className="space-y-4">
        {/* Input section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">输入数据</label>
            <div className="flex items-center space-x-2">
              <DataFormatSelector
                value={inputFormat}
                onChange={setInputFormat}
                size="sm"
              />
              <button
                onClick={handleImportData}
                className="p-1 hover:bg-accent rounded-md transition-colors"
                title="导入数据"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
          </div>
          <textarea
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            placeholder="输入要处理的数据..."
            className="w-full h-32 p-3 border border-border rounded-md bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Output section */}
        {lastResult && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">输出结果</label>
              <div className="flex items-center space-x-2">
                <DataFormatSelector
                  value={outputFormat}
                  onChange={setOutputFormat}
                  size="sm"
                />
                <button
                  onClick={handleExportResult}
                  className="p-1 hover:bg-accent rounded-md transition-colors"
                  title="导出结果"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-3 border border-border rounded-md bg-muted font-mono text-sm min-h-[8rem] whitespace-pre-wrap">
              {lastResult.result || new TextDecoder().decode(lastResult.data)}
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="p-3 border border-red-200 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">{tool.name}</h2>
              <p className="text-sm text-muted-foreground">v{tool.version}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          {tool.description}
        </p>

        {/* Tool info */}
        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
          <span className="px-2 py-1 bg-muted rounded-full">
            {tool.category}
          </span>
          {tool.requiresConnection && (
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3" />
              <span>需要连接</span>
            </div>
          )}
          <span>{tool.supportedFormats.length} 格式</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {renderToolSpecificUI()}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-3 py-2 border border-border rounded-md hover:bg-accent transition-colors text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>重置</span>
            </button>
            
            <button className="p-2 hover:bg-accent rounded-md transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors",
              isExecuting && "opacity-50 cursor-not-allowed"
            )}
          >
            <Play className="w-4 h-4" />
            <span>{isExecuting ? '执行中...' : '执行'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
