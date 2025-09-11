import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import {
  Wrench,
  ChevronDown,
  Play,
  X,
  Settings,
  Lightbulb
} from 'lucide-react';
import { ToolInput } from '@/types/toolbox';
import { toolIntegrationManager, ToolSuggestion, IntegrationContext } from '@/services/ToolIntegrationManager';
import { toolboxService } from '@/services/ToolboxService';
import { QuickAccessBar } from '@/components/Toolbox/QuickAccessBar';
import { ToolContextMenu } from '@/components/Toolbox/ToolContextMenu';

interface ToolIntegrationProps {
  sessionId: string;
  protocol?: string;
  connectionState?: 'connected' | 'disconnected' | 'connecting';
  selectedData?: Uint8Array;
  onToolResult?: (toolId: string, result: any) => void;
  className?: string;
}

export const ToolIntegration: React.FC<ToolIntegrationProps> = ({
  sessionId,
  protocol,
  connectionState,
  selectedData,
  onToolResult,
  className
}) => {
  const [suggestions, setSuggestions] = useState<ToolSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    position: { x: number; y: number };
    data: Uint8Array;
  } | null>(null);
  const [isExecuting, setIsExecuting] = useState<string | null>(null);

  const integrationContext: IntegrationContext = {
    sessionId,
    protocol,
    connectionState,
    selectedData
  };

  // Update suggestions when context changes
  useEffect(() => {
    const updateSuggestions = async () => {
      try {
        const newSuggestions = await toolIntegrationManager.getToolSuggestions(integrationContext);
        setSuggestions(newSuggestions);
        setShowSuggestions(newSuggestions.length > 0);
      } catch (error) {
        console.error('Failed to get tool suggestions:', error);
      }
    };

    updateSuggestions();
  }, [sessionId, protocol, connectionState, selectedData]);

  // Listen for tool suggestions from integration manager
  useEffect(() => {
    const handleSuggestions = (newSuggestions: ToolSuggestion[]) => {
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    };

    toolboxService.on('tool-suggestions', handleSuggestions);
    return () => toolboxService.off('tool-suggestions', handleSuggestions);
  }, []);

  const handleToolExecute = async (toolId: string, input?: ToolInput) => {
    if (isExecuting) return;

    setIsExecuting(toolId);
    try {
      const toolInput: ToolInput = input || {
        data: selectedData,
        metadata: { sessionId, protocol }
      };

      const result = await toolIntegrationManager.executeToolWithContext(
        toolId,
        toolInput,
        integrationContext
      );

      onToolResult?.(toolId, result);
    } catch (error) {
      console.error('Tool execution failed:', error);
    } finally {
      setIsExecuting(null);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, data: Uint8Array) => {
    event.preventDefault();
    setContextMenu({
      show: true,
      position: { x: event.clientX, y: event.clientY },
      data
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) {
      return null;
    }

    return (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">建议的工具</span>
          </div>
          <button
            onClick={() => setShowSuggestions(false)}
            className="p-1 hover:bg-blue-100 rounded-md transition-colors"
          >
            <X className="w-3 h-3 text-blue-600" />
          </button>
        </div>
        
        <div className="space-y-2">
          {suggestions.map(suggestion => {
            const Icon = suggestion.tool.icon;
            return (
              <button
                key={suggestion.toolId}
                onClick={() => handleToolExecute(suggestion.toolId)}
                disabled={isExecuting === suggestion.toolId}
                className="w-full flex items-center justify-between p-2 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4 text-blue-600" />
                  <div className="text-left">
                    <div className="text-sm font-medium">{suggestion.tool.name}</div>
                    <div className="text-xs text-muted-foreground">{suggestion.reason}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-blue-600">
                    {Math.round(suggestion.confidence * 100)}%
                  </div>
                  {isExecuting === suggestion.toolId ? (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 text-blue-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderQuickAccess = () => {
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">快速工具</span>
          <button className="p-1 hover:bg-accent rounded-md transition-colors">
            <Settings className="w-3 h-3" />
          </button>
        </div>
        
        <QuickAccessBar
          sessionId={sessionId}
          orientation="horizontal"
          maxItems={8}
          onToolExecute={handleToolExecute}
          className="bg-muted/50"
        />
      </div>
    );
  };

  const renderDataActions = () => {
    if (!selectedData || selectedData.length === 0) {
      return null;
    }

    return (
      <div className="mb-4 p-3 bg-muted/50 border border-border rounded-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">选中数据操作</span>
          <span className="text-xs text-muted-foreground">
            {selectedData.length} 字节
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => handleContextMenu(e, selectedData)}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-background border border-border rounded-md hover:bg-accent transition-colors"
          >
            <Wrench className="w-3 h-3" />
            <span>工具菜单</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {/* Quick action buttons for common operations */}
          <button
            onClick={() => handleToolExecute('data-converter', {
              data: selectedData,
              metadata: { fromFormat: 'hex', toFormat: 'ascii' }
            })}
            className="px-2 py-1 text-xs bg-background border border-border rounded-md hover:bg-accent transition-colors"
          >
            转ASCII
          </button>
          
          <button
            onClick={() => handleToolExecute('crc-calculator', {
              data: selectedData,
              metadata: { algorithmId: 'crc16-modbus' }
            })}
            className="px-2 py-1 text-xs bg-background border border-border rounded-md hover:bg-accent transition-colors"
          >
            计算CRC
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Tool Suggestions */}
      {renderSuggestions()}
      
      {/* Quick Access Tools */}
      {renderQuickAccess()}
      
      {/* Selected Data Actions */}
      {renderDataActions()}
      
      {/* Context Menu */}
      {contextMenu && (
        <ToolContextMenu
          data={contextMenu.data}
          sessionId={sessionId}
          position={contextMenu.position}
          onClose={handleCloseContextMenu}
          onToolExecute={handleToolExecute}
        />
      )}
    </div>
  );
};

// Hook for using tool integration in components
export const useToolIntegration = (sessionId: string) => {
  const [selectedData, setSelectedData] = useState<Uint8Array | undefined>();
  const [suggestions, setSuggestions] = useState<ToolSuggestion[]>([]);

  const selectData = (data: Uint8Array) => {
    setSelectedData(data);
    // Trigger integration manager to update suggestions
    toolboxService.emit('data-selected', { data, sessionId });
  };

  const executeToolOnData = async (toolId: string, data?: Uint8Array) => {
    const targetData = data || selectedData;
    if (!targetData) return;

    return await toolIntegrationManager.executeToolWithContext(
      toolId,
      { data: targetData },
      { sessionId, selectedData: targetData }
    );
  };

  useEffect(() => {
    const handleSuggestions = (newSuggestions: ToolSuggestion[]) => {
      setSuggestions(newSuggestions);
    };

    toolboxService.on('tool-suggestions', handleSuggestions);
    return () => toolboxService.off('tool-suggestions', handleSuggestions);
  }, []);

  return {
    selectedData,
    suggestions,
    selectData,
    executeToolOnData,
    clearSelection: () => setSelectedData(undefined)
  };
};
