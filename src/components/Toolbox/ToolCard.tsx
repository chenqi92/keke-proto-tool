import React from 'react';
import { cn } from '@/utils';
import { 
  Star, 
  Play, 
  Clock, 
  TrendingUp,
  Zap,
  Settings
} from 'lucide-react';
import { BaseTool, ToolRegistration } from '@/types/toolbox';

interface ToolCardProps {
  tool: BaseTool;
  registration: ToolRegistration;
  selected?: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onExecute: (input: any) => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  registration,
  selected = false,
  onSelect,
  onToggleFavorite,
  onExecute
}) => {
  const Icon = tool.icon;

  const handleQuickExecute = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Execute with default input
    onExecute({});
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative p-4 border border-border rounded-lg hover:border-accent-foreground hover:shadow-md transition-all cursor-pointer",
        selected && "border-primary bg-primary/5",
        !registration.enabled && "opacity-50"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          "p-3 rounded-lg transition-all group-hover:scale-105",
          selected ? "bg-primary/20" : "bg-muted"
        )}>
          <Icon className={cn(
            "w-6 h-6",
            selected ? "text-primary" : "text-foreground"
          )} />
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Favorite button */}
          <button
            onClick={handleToggleFavorite}
            className={cn(
              "p-1 rounded-md hover:bg-accent transition-colors opacity-0 group-hover:opacity-100",
              registration.favorite && "opacity-100"
            )}
          >
            <Star className={cn(
              "w-4 h-4",
              registration.favorite ? "text-yellow-500 fill-current" : "text-muted-foreground"
            )} />
          </button>
          
          {/* Quick execute button */}
          <button
            onClick={handleQuickExecute}
            className="p-1 rounded-md hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
            title="快速执行"
          >
            <Play className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
          {tool.name}
        </h3>
        
        <p className="text-sm text-muted-foreground line-clamp-2">
          {tool.description}
        </p>
        
        {/* Category badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs px-2 py-1 bg-muted rounded-full">
            {tool.category}
          </span>
          
          {/* Usage stats */}
          {registration.usageCount > 0 && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              <span>{registration.usageCount}</span>
            </div>
          )}
        </div>
        
        {/* Last used */}
        {registration.lastUsed && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' }).format(
                Math.floor((registration.lastUsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
                'day'
              )}
            </span>
          </div>
        )}
      </div>

      {/* Capabilities indicators */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center space-x-2">
          {tool.requiresConnection && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Zap className="w-3 h-3" />
              <span>需要连接</span>
            </div>
          )}
          
          {tool.canProcessStreaming && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>流处理</span>
            </div>
          )}
        </div>
        
        {/* Supported formats count */}
        <span className="text-xs text-muted-foreground">
          {tool.supportedFormats.length} 格式
        </span>
      </div>

      {/* Selection indicator */}
      {selected && (
        <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none" />
      )}
      
      {/* Disabled overlay */}
      {!registration.enabled && (
        <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center">
          <span className="text-sm text-muted-foreground font-medium">已禁用</span>
        </div>
      )}
    </div>
  );
};
