import React from 'react';
import { cn } from '@/utils';
import { Star } from 'lucide-react';
import { ToolCategory } from '@/types/toolbox';

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
        "group relative p-5 border border-border rounded-xl hover:border-accent-foreground hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer bg-card",
        selected && "border-primary bg-primary/5 shadow-lg shadow-primary/10",
        tool.isLoaded ? "" : "opacity-50",
        viewMode === 'list' && "flex items-center space-x-4 p-4"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-start justify-between",
        viewMode === 'grid' ? "mb-4" : "mb-0"
      )}>
        <div className={cn(
          "p-3 rounded-xl transition-all group-hover:scale-105",
          selected ? "bg-primary/20" : "bg-muted/50",
          viewMode === 'list' && "p-2"
        )}>
          <Icon className={cn(
            viewMode === 'grid' ? "w-6 h-6" : "w-5 h-5",
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

      {/* Tags */}
      {tool.tags && tool.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-border">
          {tool.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs px-2 py-1 bg-muted/50 rounded text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}

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
