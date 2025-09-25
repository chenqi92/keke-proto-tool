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
  viewMode?: 'grid' | 'list' | 'compact';
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
  // Handle icon safely - it might be a Promise function, React component, or string
  const [IconComponent, setIconComponent] = React.useState<React.ComponentType<{ className?: string }> | null>(null);

  React.useEffect(() => {
    const loadIcon = async () => {
      if (typeof tool.icon === 'function') {
        try {
          // Check if it's a React component (has displayName, name, or prototype)
          if (tool.icon.displayName || tool.icon.name || tool.icon.prototype?.isReactComponent || tool.icon.prototype?.render) {
            // Direct React component
            setIconComponent(() => tool.icon);
          } else {
            // It's likely a Promise function like () => import('lucide-react').then(m => m.Zap)
            const iconResult = await tool.icon();

            if (typeof iconResult === 'function') {
              setIconComponent(() => iconResult);
            } else if (iconResult && typeof iconResult === 'object' && iconResult.default) {
              // Handle default export
              setIconComponent(() => iconResult.default);
            } else {
              // Fallback for unexpected results
              setIconComponent(() => ({ className }: { className?: string }) => (
                <div className={cn(className, "bg-muted border border-border flex items-center justify-center")} style={{ width: '1em', height: '1em', borderRadius: '2px' }}>
                  <span className="text-xs text-muted-foreground">?</span>
                </div>
              ));
            }
          }
        } catch (error) {
          console.warn('Failed to load icon for:', tool.name, error);
          setIconComponent(() => ({ className }: { className?: string }) => (
            <div className={cn(className, "bg-muted border border-border flex items-center justify-center")} style={{ width: '1em', height: '1em', borderRadius: '2px' }}>
              <span className="text-xs text-muted-foreground">!</span>
            </div>
          ));
        }
      } else if (typeof tool.icon === 'string') {
        // If it's a string (emoji), render as text
        setIconComponent(() => ({ className }: { className?: string }) => (
          <span className={cn(className, "flex items-center justify-center")} style={{ fontSize: '1em' }}>
            {tool.icon}
          </span>
        ));
      } else {
        // Default fallback
        setIconComponent(() => ({ className }: { className?: string }) => (
          <div className={cn(className, "bg-muted border border-border flex items-center justify-center")} style={{ width: '1em', height: '1em', borderRadius: '2px' }}>
            <span className="text-xs text-muted-foreground">🔧</span>
          </div>
        ));
      }
    };

    loadIcon();
  }, [tool.icon]);

  const Icon = IconComponent || (({ className }: { className?: string }) => (
    <div className={cn(className, "bg-muted border border-border flex items-center justify-center")} style={{ width: '1em', height: '1em', borderRadius: '2px' }}>
      <span className="text-xs text-muted-foreground">⚙</span>
    </div>
  ));

  // Compact view for sidebar
  if (viewMode === 'compact') {
    return (
      <div
        onClick={() => onSelect(tool.id)}
        className={cn(
          "group flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-all cursor-pointer",
          selected && "bg-primary/10 border border-primary/20",
          !tool.isLoaded && "opacity-60 cursor-not-allowed"
        )}
      >
        <div className={cn(
          "p-2 rounded-lg transition-all flex items-center justify-center",
          selected ? "bg-primary/20 border border-primary/30" : "bg-muted/50 border border-border/50"
        )}>
          <Icon className={cn(
            "w-4 h-4",
            selected ? "text-primary" : "text-foreground",
            !tool.isLoaded && "text-muted-foreground"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className={cn(
              "font-medium text-sm truncate",
              !tool.isLoaded && "text-muted-foreground"
            )}>
              {tool.name}
            </h3>
            {!tool.isLoaded && (
              <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                待加载
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(tool.id);
          }}
          className={cn(
            "p-1 rounded-md hover:bg-accent transition-colors opacity-0 group-hover:opacity-100",
            tool.isFavorite && "opacity-100"
          )}
        >
          <Star className={cn(
            "w-3 h-3",
            tool.isFavorite ? "text-yellow-500 fill-current" : "text-muted-foreground"
          )} />
        </button>
      </div>
    );
  }

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(tool.id);
  };

  const handleSelect = () => {
    onSelect(tool.id);
  };

  // Regular grid/list view

  return (
    <div
      onClick={handleSelect}
      className={cn(
        "group relative p-5 border border-border rounded-xl hover:border-accent-foreground hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 cursor-pointer bg-card",
        selected && "border-primary bg-primary/5 shadow-lg shadow-primary/10",
        !tool.isLoaded && "opacity-60 cursor-not-allowed",
        viewMode === 'list' && "flex items-center space-x-4 p-4"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-start justify-between",
        viewMode === 'grid' ? "mb-4" : "mb-0"
      )}>
        <div className={cn(
          "p-3 rounded-xl transition-all group-hover:scale-105 flex items-center justify-center",
          selected ? "bg-primary/20 border border-primary/30" : "bg-muted/50 border border-border/50",
          viewMode === 'list' && "p-2"
        )}>
          <Icon className={cn(
            viewMode === 'grid' ? "w-6 h-6" : "w-5 h-5",
            selected ? "text-primary" : "text-foreground",
            !tool.isLoaded && "text-muted-foreground"
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
        <div className="flex items-center justify-between">
          <h3 className={cn(
            "font-semibold group-hover:text-primary transition-colors",
            !tool.isLoaded ? "text-muted-foreground" : "text-foreground"
          )}>
            {tool.name}
          </h3>
          {!tool.isLoaded && (
            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
              待加载
            </span>
          )}
        </div>

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
      
      {/* Loading indicator for unloaded tools */}
      {!tool.isLoaded && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
};
