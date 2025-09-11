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
import { BaseTool, ToolRegistration, ToolCategory } from '@/types/toolbox';

interface ToolInfo {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: any;
  priority: number;
  tags: string[];
  isLoaded: boolean;
  isFavorite: boolean;
}

interface ToolCardProps {
  tool: ToolInfo;
  viewMode?: 'grid' | 'list';
  selected?: boolean;
  onSelect: (toolId: string) => void;
  onToggleFavorite: (toolId: string) => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  viewMode = 'grid',
  selected = false,
  onSelect,
  onToggleFavorite
}) => {
  const Icon = tool.icon;

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(tool.id);
  };

  const handleSelect = () => {
    onSelect(tool.id);
  };

  return (
    <div
      onClick={handleSelect}
      className={cn(
        "group relative p-4 border border-border rounded-lg hover:border-accent-foreground hover:shadow-md transition-all cursor-pointer",
        selected && "border-primary bg-primary/5",
        tool.isLoaded ? "" : "opacity-50"
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
              tool.isFavorite && "opacity-100"
            )}
          >
            <Star className={cn(
              "w-4 h-4",
              tool.isFavorite ? "text-yellow-500 fill-current" : "text-muted-foreground"
            )} />
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
        </div>
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
      {!tool.isLoaded && (
        <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center">
          <span className="text-sm text-muted-foreground font-medium">未加载</span>
        </div>
      )}
    </div>
  );
};
