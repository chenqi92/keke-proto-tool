/**
 * 快捷命令组件
 */

import React, { useState } from 'react';
import { cn } from '@/utils';
import { AIQuickCommand, AIContext, DEFAULT_QUICK_COMMANDS } from '@/types/ai';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';

interface QuickCommandsProps {
  onCommandSelect: (command: AIQuickCommand) => void;
  context?: AIContext;
  className?: string;
}

export const QuickCommands: React.FC<QuickCommandsProps> = ({
  onCommandSelect,
  context,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 过滤需要上下文的命令
  const availableCommands = DEFAULT_QUICK_COMMANDS.filter(cmd => {
    if (cmd.requiresContext) {
      return context && (context.selectedMessage || context.sessionId);
    }
    return true;
  });

  if (availableCommands.length === 0) {
    return null;
  }

  return (
    <div className={cn("border-b", className)}>
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-accent transition-colors"
      >
        <div className="flex items-center space-x-1.5">
          <Zap className="w-3 h-3 text-primary" />
          <span className="text-xs font-medium">快捷命令</span>
          <span className="text-[10px] text-muted-foreground">
            ({availableCommands.length})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {/* Commands */}
      {isExpanded && (
        <div className="p-2 grid grid-cols-2 gap-1.5">
          {availableCommands.map((command) => (
            <button
              key={command.id}
              onClick={() => onCommandSelect(command)}
              className={cn(
                "p-2 text-left rounded border transition-colors",
                "hover:bg-accent hover:border-primary"
              )}
            >
              <div className="flex items-start space-x-1.5">
                <Zap className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-medium">{command.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                    {command.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

