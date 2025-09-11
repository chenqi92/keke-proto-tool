import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import {
  Plus,
  Settings,
  X
} from 'lucide-react';
import { BaseTool } from '@/types/toolbox';
import { toolboxService } from '@/services/ToolboxService';
import { toolRegistry } from '@/services/ToolRegistry';

interface QuickAccessBarProps {
  className?: string;
  sessionId?: string;
  orientation?: 'horizontal' | 'vertical';
  maxItems?: number;
  onToolExecute?: (toolId: string, input: any) => void;
  onToolSelect?: (toolId: string) => void;
}

export const QuickAccessBar: React.FC<QuickAccessBarProps> = ({
  className,
  sessionId,
  orientation = 'horizontal',
  maxItems = 6,
  onToolExecute
}) => {
  const [quickTools, setQuickTools] = useState<string[]>([]);
  const [tools, setTools] = useState<Map<string, BaseTool>>(new Map());
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Load quick access tools
  useEffect(() => {
    const loadQuickTools = () => {
      const toolIds = toolboxService.getQuickAccessTools(sessionId);
      setQuickTools(toolIds.slice(0, maxItems));
      
      // Load tool details
      const toolMap = new Map<string, BaseTool>();
      toolIds.forEach(id => {
        const registration = toolRegistry.getById(id);
        if (registration) {
          toolMap.set(id, registration.tool);
        }
      });
      setTools(toolMap);
    };

    loadQuickTools();

    // Listen for tool registry changes
    const handleRegistryChange = () => loadQuickTools();
    toolboxService.on('tool-registered', handleRegistryChange);
    toolboxService.on('tool-unregistered', handleRegistryChange);
    toolboxService.on('toolbox-config-changed', handleRegistryChange);

    return () => {
      toolboxService.off('tool-registered', handleRegistryChange);
      toolboxService.off('tool-unregistered', handleRegistryChange);
      toolboxService.off('toolbox-config-changed', handleRegistryChange);
    };
  }, [sessionId, maxItems]);

  const handleToolClick = async (toolId: string) => {
    try {
      // Execute tool with default input
      const result = await toolboxService.executeTool(toolId, {}, sessionId);
      onToolExecute?.(toolId, result);
    } catch (error) {
      console.error('Quick tool execution failed:', error);
    }
  };

  const handleRemoveTool = (toolId: string) => {
    const config = toolboxService.getConfig();
    const customTools = config.quickAccess.customTools.filter(id => id !== toolId);
    
    toolboxService.updateConfig({
      quickAccess: {
        ...config.quickAccess,
        customTools
      }
    });
  };

  const handleAddTool = (toolId: string) => {
    const config = toolboxService.getConfig();
    const customTools = [...config.quickAccess.customTools];
    
    if (!customTools.includes(toolId)) {
      customTools.push(toolId);
      toolboxService.updateConfig({
        quickAccess: {
          ...config.quickAccess,
          customTools
        }
      });
    }
  };

  const renderToolButton = (toolId: string, tool: BaseTool) => {
    const Icon = tool.icon;
    
    return (
      <div key={toolId} className="relative group">
        <button
          onClick={() => handleToolClick(toolId)}
          className={cn(
            "relative p-2 rounded-md hover:bg-accent transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary"
          )}
          title={tool.name}
        >
          <Icon className="w-5 h-5" />
          
          {/* Tool indicator */}
          {tool.requiresConnection && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
          )}
        </button>
        
        {/* Remove button when customizing */}
        {isCustomizing && (
          <button
            onClick={() => handleRemoveTool(toolId)}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          {tool.name}
        </div>
      </div>
    );
  };

  const renderDropdown = () => {
    const allTools = toolRegistry.getEnabledTools();
    const availableTools = allTools.filter(reg => !quickTools.includes(reg.tool.id));

    return (
      <div className="absolute top-full left-0 mt-1 w-64 bg-background border border-border rounded-md shadow-lg z-20">
        <div className="p-2 border-b border-border">
          <h3 className="text-sm font-medium">添加工具到快速访问</h3>
        </div>
        <div className="max-h-64 overflow-auto">
          {availableTools.map(reg => {
            const Icon = reg.tool.icon;
            return (
              <button
                key={reg.tool.id}
                onClick={() => {
                  handleAddTool(reg.tool.id);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center space-x-3 p-2 hover:bg-accent transition-colors text-left"
              >
                <Icon className="w-4 h-4" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{reg.tool.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{reg.tool.description}</div>
                </div>
              </button>
            );
          })}
          {availableTools.length === 0 && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              没有更多工具可添加
            </div>
          )}
        </div>
      </div>
    );
  };

  if (quickTools.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "relative flex items-center space-x-1 p-2 bg-muted/30 rounded-md",
      orientation === 'vertical' && "flex-col space-x-0 space-y-1",
      className
    )}>
      {/* Tool buttons */}
      {quickTools.map(toolId => {
        const tool = tools.get(toolId);
        return tool ? renderToolButton(toolId, tool) : null;
      })}

      {/* Separator */}
      {quickTools.length > 0 && (
        <div className={cn(
          "w-px h-6 bg-border",
          orientation === 'vertical' && "w-6 h-px"
        )} />
      )}

      {/* Add tool button */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-2 rounded-md hover:bg-accent transition-colors"
          title="添加工具"
        >
          <Plus className="w-4 h-4" />
        </button>
        
        {showDropdown && renderDropdown()}
      </div>

      {/* Customize button */}
      <button
        onClick={() => setIsCustomizing(!isCustomizing)}
        className={cn(
          "p-2 rounded-md hover:bg-accent transition-colors",
          isCustomizing && "bg-accent"
        )}
        title="自定义快速访问"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Click outside handler */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};
