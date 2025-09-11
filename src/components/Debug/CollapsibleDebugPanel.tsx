import React, { useState } from 'react';
import { cn } from '@/utils';
import { ChevronDown, ChevronRight, Bug, X } from 'lucide-react';
import { ToolRegistryDebug } from './ToolRegistryDebug';

interface CollapsibleDebugPanelProps {
  className?: string;
  defaultExpanded?: boolean;
  showInProduction?: boolean;
}

export const CollapsibleDebugPanel: React.FC<CollapsibleDebugPanelProps> = ({
  className,
  defaultExpanded = false,
  showInProduction = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isVisible, setIsVisible] = useState(true);

  // Hide in production unless explicitly shown
  if (!showInProduction && process.env.NODE_ENV === 'production') {
    return null;
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg transition-colors z-50"
        title="显示调试面板"
      >
        <Bug className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className={cn(
      "border border-orange-200 bg-orange-50 rounded-lg overflow-hidden",
      "dark:border-orange-800 dark:bg-orange-950/20",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-orange-100 dark:bg-orange-900/30 border-b border-orange-200 dark:border-orange-800">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-100 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <Bug className="w-4 h-4" />
          <span className="text-sm font-medium">调试信息</span>
        </button>
        
        <div className="flex items-center space-x-1">
          <span className="text-xs text-orange-600 dark:text-orange-400">
            开发模式
          </span>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200 transition-colors"
            title="隐藏调试面板"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 max-h-96 overflow-y-auto">
          <ToolRegistryDebug />
        </div>
      )}
    </div>
  );
};
