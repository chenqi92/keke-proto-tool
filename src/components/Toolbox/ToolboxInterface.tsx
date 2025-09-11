import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/utils';
import { Search, Grid, List, Star, RotateCcw, X, Bug } from 'lucide-react';
import { ToolCard } from './ToolCard';
import { ToolPanel } from './ToolPanel';
import { QuickAccessBar } from './QuickAccessBar';
import { toolRegistry } from '@/services/ToolRegistry';
import { ToolCategory, ToolExecutionResult } from '@/types/toolbox';
import { CollapsibleDebugPanel } from '@/components/Debug/CollapsibleDebugPanel';

interface ToolboxInterfaceProps {
  mode?: 'page' | 'modal' | 'sidebar';
  onToolExecute?: (toolId: string, result: ToolExecutionResult) => void;
  className?: string;
  showQuickAccess?: boolean;
  initialCategory?: ToolCategory;
}

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

export const ToolboxInterface: React.FC<ToolboxInterfaceProps> = ({
  mode = 'page',
  onToolExecute,
  className,
  showQuickAccess = true,
  initialCategory
}) => {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>(initialCategory || 'all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load tools on mount
  useEffect(() => {
    // Add a small delay to ensure tools are registered
    const timer = setTimeout(() => {
      loadTools();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const loadTools = async () => {
    try {
      setIsLoading(true);
      console.log('Loading tools from registry...');

      const registeredTools = toolRegistry.getAll();
      console.log('Registered tools count:', registeredTools.length);
      console.log('Registered tools:', registeredTools.map(r => ({ id: r.tool.id, name: r.tool.name })));

      const favorites = getFavoriteTools();

      const toolInfos: ToolInfo[] = registeredTools.map(registration => ({
        id: registration.tool.id,
        name: registration.tool.name,
        description: registration.tool.description,
        category: registration.tool.category,
        icon: registration.tool.icon,
        priority: registration.tool.priority || 0,
        tags: registration.tool.tags || [],
        isLoaded: true, // All registered tools are considered loaded
        isFavorite: favorites.includes(registration.tool.id)
      }));

      console.log('Tool infos created:', toolInfos.length);
      setTools(toolInfos);
    } catch (error) {
      console.error('Failed to load tools:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort tools
  const filteredTools = useMemo(() => {
    console.log('Filtering tools. Initial count:', tools.length);
    console.log('Selected category:', selectedCategory);
    console.log('Search query:', searchQuery);
    console.log('Show favorites only:', showFavoritesOnly);

    let filtered = tools;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tool =>
        (tool.name || '').toLowerCase().includes(query) ||
        (tool.description || '').toLowerCase().includes(query) ||
        (tool.tags || []).some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(tool => tool.category === selectedCategory);
    }

    // Filter by favorites
    if (showFavoritesOnly) {
      filtered = filtered.filter(tool => tool.isFavorite);
    }

    // Sort by priority and name
    const sorted = filtered.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Safe string comparison with fallback
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });

    console.log('Final filtered tools count:', sorted.length);
    return sorted;
  }, [tools, searchQuery, selectedCategory, showFavoritesOnly]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(tools.map(tool => tool.category)));
    return cats.sort();
  }, [tools]);

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
  };

  const handleToolExecute = async (toolId: string, result: ToolExecutionResult) => {
    console.log('Tool executed:', toolId, result);
    onToolExecute?.(toolId, result);
  };

  const handleToggleFavorite = (toolId: string) => {
    const favorites = getFavoriteTools();
    const newFavorites = favorites.includes(toolId)
      ? favorites.filter(id => id !== toolId)
      : [...favorites, toolId];
    
    saveFavoriteTools(newFavorites);
    
    setTools(prev => prev.map(tool =>
      tool.id === toolId ? { ...tool, isFavorite: !tool.isFavorite } : tool
    ));
  };

  const getFavoriteTools = (): string[] => {
    try {
      const stored = localStorage.getItem('prototool-favorite-tools');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveFavoriteTools = (favorites: string[]) => {
    try {
      localStorage.setItem('prototool-favorite-tools', JSON.stringify(favorites));
    } catch (error) {
      console.error('Failed to save favorite tools:', error);
    }
  };

  const renderToolGrid = () => (
    <div className="h-full overflow-y-auto">
      <div className={cn(
        "grid gap-6 p-2",
        viewMode === 'grid'
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
          : "grid-cols-1 max-w-4xl mx-auto"
      )}>
        {filteredTools.map(tool => (
          <ToolCard
            key={tool.id}
            tool={tool}
            viewMode={viewMode}
            selected={selectedTool === tool.id}
            onSelect={handleToolSelect}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>
      {/* Bottom padding to ensure last row is visible */}
      <div className="h-20" />
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mb-6">
        <Search className="w-10 h-10 text-primary/60" />
      </div>
      <h3 className="text-xl font-semibold mb-3">没有找到工具</h3>
      <p className="text-muted-foreground max-w-md mb-6">
        {searchQuery ? '尝试调整搜索条件或清除筛选器' : '当前分类下没有可用的工具'}
      </p>
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          清除搜索
        </button>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full relative", className)}>
      {/* Quick Access Bar */}
      {showQuickAccess && (
        <QuickAccessBar
          onToolSelect={handleToolSelect}
          className="mb-6"
        />
      )}

      {/* Header */}
      <div className="flex flex-col space-y-4 mb-6 px-1">
        {/* Search and View Controls */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索工具..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={loadTools}
              className="p-2 hover:bg-accent rounded-md transition-colors"
              title="刷新工具列表"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 hover:bg-accent rounded-md transition-colors"
              title={viewMode === 'grid' ? '切换到列表视图' : '切换到网格视图'}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={cn(
                "p-2 rounded-md transition-colors",
                showFavoritesOnly 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-accent"
              )}
              title="只显示收藏的工具"
            >
              <Star className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              "px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              selectedCategory === 'all'
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            全部
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                selectedCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {getCategoryDisplayName(category)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {filteredTools.length === 0 ? renderEmptyState() : renderToolGrid()}
      </div>

      {/* Debug Panel - Fixed Position */}
      <CollapsibleDebugPanel
        className="fixed bottom-4 left-4 max-w-md z-40"
        defaultExpanded={false}
      />

      {/* Tool Panel */}
      {selectedTool && (
        <ToolPanel
          toolId={selectedTool}
          onClose={() => setSelectedTool(null)}
          onExecute={handleToolExecute}
        />
      )}
    </div>
  );
};

// Helper function to get category display names
function getCategoryDisplayName(category: ToolCategory): string {
  const displayNames: Record<ToolCategory, string> = {
    generation: '生成',
    parsing: '解析',
    conversion: '转换',
    validation: '验证',
    analysis: '分析',
    visualization: '可视化',
    utility: '工具',
    security: '安全'
  };
  return displayNames[category] || category;
}
