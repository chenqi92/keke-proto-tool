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
import {
  MessageGeneratorInterface,
  DataConverterInterface,
  ProtocolParserInterface,
  CRCCalculatorInterface,
  TimestampConverterInterface,
  SignatureGeneratorInterface
} from './ToolInterfaces';

interface ToolPanelProps {
  toolId: string;
  sessionId?: string;
  onExecute: (toolId: string, result: any) => void;
  onClose: () => void;
  mode?: 'modal' | 'embedded';
}

export const ToolPanel: React.FC<ToolPanelProps> = ({
  toolId,
  sessionId,
  onExecute,
  onClose,
  mode = 'modal'
}) => {
  const [tool, setTool] = useState<BaseTool | null>(null);
  const [isLoadingTool, setIsLoadingTool] = useState(false);

  // Always call hooks at the top level
  const [inputData, setInputData] = useState('');
  const [inputFormat, setInputFormat] = useState<DataFormat>('ascii');
  const [outputFormat, setOutputFormat] = useState<DataFormat>('ascii');
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<ToolOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toolState, setToolState] = useState<Record<string, any>>({});

  // Load tool on mount or when toolId changes
  useEffect(() => {
    const loadTool = async () => {
      if (!toolId) return;

      setIsLoadingTool(true);
      try {
        // First try to get the tool from registry
        let toolInstance = toolRegistry.getById(toolId)?.tool;

        // If not found, try to load it lazily
        if (!toolInstance) {
          const { toolLazyLoader } = await import('@/services/ToolLazyLoader');
          toolInstance = await toolLazyLoader.loadTool(toolId);
        }

        setTool(toolInstance);
      } catch (error) {
        console.error(`Failed to load tool ${toolId}:`, error);
        setTool(null);
      } finally {
        setIsLoadingTool(false);
      }
    };

    loadTool();
  }, [toolId]);

  // Load tool state on mount
  useEffect(() => {
    if (!tool) return;

    const savedState = toolboxService.loadToolState(tool.id, sessionId);
    if (savedState) {
      setToolState(savedState);
      // Restore input data if available
      if (savedState.inputData) setInputData(savedState.inputData);
      if (savedState.inputFormat) setInputFormat(savedState.inputFormat);
      if (savedState.outputFormat) setOutputFormat(savedState.outputFormat);
    }
  }, [tool?.id, sessionId]);

  // Save tool state when it changes
  useEffect(() => {
    if (!tool) return;

    const state = {
      inputData,
      inputFormat,
      outputFormat,
      ...toolState
    };
    toolboxService.saveToolState(tool.id, state, sessionId);
  }, [tool?.id, sessionId, inputData, inputFormat, outputFormat, toolState]);

  if (isLoadingTool) {
    return (
      <div className="p-4 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-muted-foreground">正在加载工具...</p>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">工具未找到: {toolId}</p>
        <p className="text-xs text-muted-foreground mt-1">请检查工具是否已正确注册</p>
      </div>
    );
  }

  const Icon = tool.icon;

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
    // Render tool-specific UI based on the tool ID
    const commonProps = {
      onExecute: handleExecute,
      isExecuting
    };

    switch (toolId) {
      case 'message-generator':
        return <MessageGeneratorInterface {...commonProps} />;
      case 'data-converter':
        return <DataConverterInterface {...commonProps} />;
      case 'protocol-parser':
        return <ProtocolParserInterface {...commonProps} />;
      case 'crc-calculator':
        return <CRCCalculatorInterface {...commonProps} />;
      case 'timestamp-converter':
        return <TimestampConverterInterface {...commonProps} />;
      case 'signature-generator':
        return <SignatureGeneratorInterface {...commonProps} />;
      default:
        // Fallback generic interface
        return (
          <div className="space-y-6">
            {/* Input section */}
            <div className="bg-muted/30 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-semibold text-foreground">输入数据</label>
                <div className="flex items-center space-x-3">
                  <DataFormatSelector
                    value={inputFormat}
                    onChange={setInputFormat}
                    size="sm"
                  />
                  <button
                    onClick={handleImportData}
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
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
                className="w-full h-40 p-4 border border-border rounded-lg bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              {inputData && (
                <div className="mt-2 text-xs text-muted-foreground">
                  字符数: {inputData.length}
                </div>
              )}
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

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>重置</span>
                </button>

                <button
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                  title="工具设置"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleExecute}
                disabled={isExecuting || !inputData.trim()}
                className={cn(
                  "flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium shadow-lg",
                  (isExecuting || !inputData.trim()) && "opacity-50 cursor-not-allowed"
                )}
              >
                <Play className="w-4 h-4" />
                <span>{isExecuting ? '执行中...' : '执行工具'}</span>
              </button>
            </div>
          </div>
        );
    }
  };

  // Embedded mode for the new modal layout
  if (mode === 'embedded') {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Content - Dynamic height based on content */}
        <div className="flex-1 min-h-0">
          <div className="h-full overflow-y-auto">
            <div className="p-4">
              {renderToolSpecificUI()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original modal mode
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{tool.name}</h2>
              <p className="text-sm text-muted-foreground">v{tool.version}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tool Description and Info */}
        <div className="px-6 py-4 bg-muted/20">
          <p className="text-sm text-muted-foreground mb-3">
            {tool.description}
          </p>

          {/* Tool info */}
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
              {tool.category}
            </span>
            {tool.requiresConnection && (
              <div className="flex items-center space-x-1">
                <Zap className="w-3 h-3" />
                <span>需要连接</span>
              </div>
            )}
            <span>{tool.supportedFormats?.length || 0} 格式</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {renderToolSpecificUI()}
          </div>
        </div>

        {/* Fixed Action Bar */}
        <div className="border-t border-border bg-background/95 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleReset}
                className="flex items-center space-x-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重置</span>
              </button>

              <button
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                title="工具设置"
              >
                <Settings className="w-4 h-4" />
              </button>

              {lastResult && (
                <button
                  onClick={handleExportResult}
                  className="flex items-center space-x-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  <span>导出结果</span>
                </button>
              )}
            </div>

            <button
              onClick={handleExecute}
              disabled={isExecuting || !inputData.trim()}
              className={cn(
                "flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium shadow-lg",
                (isExecuting || !inputData.trim()) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Play className="w-4 h-4" />
              <span>{isExecuting ? '执行中...' : '执行工具'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
