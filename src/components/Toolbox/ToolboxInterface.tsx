import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/utils';
import { Search, Grid, List, Star, RotateCcw, X, Bug, Wrench } from 'lucide-react';
import { ToolCard } from './ToolCard';
import { ToolPanel } from './ToolPanel';
import { QuickAccessBar } from './QuickAccessBar';
import { toolRegistry } from '@/services/ToolRegistry';
import { ToolCategory, ToolExecutionResult } from '@/types/toolbox';
import { CollapsibleDebugPanel } from '@/components/Debug/CollapsibleDebugPanel';

interface ToolboxInterfaceProps {
  mode?: 'page' | 'modal' | 'sidebar';
  onToolExecute?: (toolId: string, result: ToolExecutionResult) => void;
  onClose?: () => void;
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
  onClose,
  className,
  showQuickAccess = true,
  initialCategory
}) => {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>(initialCategory || 'all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list'); // Default to list for sidebar
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

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

  const renderToolList = () => (
    <div className="h-full overflow-y-auto">
      <div className="space-y-2 p-3">
        {filteredTools.map(tool => (
          <ToolCard
            key={tool.id}
            tool={tool}
            viewMode="compact"
            selected={selectedTool === tool.id}
            onSelect={handleToolSelect}
            onToggleFavorite={handleToggleFavorite}
          />
        ))}
      </div>
      {/* Bottom padding to ensure last item is visible */}
      <div className="h-4" />
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mb-6">
        <Search className="w-8 h-8 text-primary/60" />
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

  // Modal layout for toolbox
  if (mode === 'modal') {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="bg-background w-full h-full overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">工具箱</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowDebugPanel(!showDebugPanel)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    showDebugPanel ? "bg-orange-100 text-orange-700" : "hover:bg-accent"
                  )}
                  title="调试信息"
                >
                  <Bug className="w-4 h-4" />
                </button>
                <button
                  onClick={loadTools}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                  title="刷新工具列表"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Debug Panel */}
          {showDebugPanel && (
            <div className="border-b border-border bg-orange-50/50 dark:bg-orange-950/20">
              <CollapsibleDebugPanel
                className="m-4"
                defaultExpanded={true}
                showInProduction={true}
              />
            </div>
          )}

          {/* Main Content - Left-Right Layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar - Tool List */}
            <div className="w-80 border-r border-border flex flex-col bg-muted/20">
              {/* Search and Filters */}
              <div className="p-4 border-b border-border space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="搜索工具..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      showFavoritesOnly
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                    title="只显示收藏的工具"
                  >
                    <Star className="w-4 h-4" />
                  </button>

                  <div className="text-xs text-muted-foreground">
                    {filteredTools.length} 个工具
                  </div>
                </div>
              </div>

              {/* Category Filter */}
              <div className="px-4 pb-3">
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={cn(
                      "px-2 py-1 rounded-md text-xs font-medium transition-colors",
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
                        "px-2 py-1 rounded-md text-xs font-medium transition-colors",
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

              {/* Tool List */}
              <div className="flex-1 overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredTools.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <Search className="w-8 h-8 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? '没有找到匹配的工具' : '当前分类下没有工具'}
                    </p>
                  </div>
                ) : (
                  renderToolList()
                )}
              </div>
            </div>

            {/* Right Panel - Tool Interface */}
            <div className="flex-1 flex flex-col">
              {selectedTool ? (
                <ToolPanel
                  toolId={selectedTool}
                  onClose={() => setSelectedTool(null)}
                  onExecute={handleToolExecute}
                  mode="embedded"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                      <Search className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">选择一个工具</h3>
                    <p className="text-muted-foreground">
                      从左侧列表中选择一个工具开始使用
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Page layout for non-modal mode (Tab页面模式)
  return (
    <div className={cn("h-full flex", className)}>
      {/* 左侧工具列表 */}
      <div className="w-80 border-r border-border flex flex-col bg-muted/30">
        {/* 搜索和筛选 */}
        <div className="p-4 border-b border-border">
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索工具..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>

          {/* 分类筛选 */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-2 py-1 text-xs rounded-md transition-colors",
                selectedCategory === 'all'
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border border-border hover:bg-accent"
              )}
            >
              全部
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-2 py-1 text-xs rounded-md transition-colors",
                  selectedCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border border-border hover:bg-accent"
                )}
              >
                {getCategoryDisplayName(category)}
              </button>
            ))}
          </div>
        </div>

        {/* 工具列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? '没有找到匹配的工具' : '当前分类下没有工具'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => handleToolSelect(tool.id)}
                  className={cn(
                    "w-full p-3 text-left rounded-lg border transition-all",
                    selectedTool === tool.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-accent-foreground hover:bg-accent"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <tool.icon className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{tool.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{tool.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右侧工具面板 */}
      <div className="flex-1 flex flex-col">
        {selectedTool ? (
          <ToolPanel
            toolId={selectedTool}
            onClose={() => setSelectedTool(null)}
            onExecute={handleToolExecute}
            mode="embedded"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Wrench className="w-8 h-8 text-primary/60" />
              </div>
              <h3 className="text-xl font-semibold mb-3">选择一个工具</h3>
              <p className="text-muted-foreground max-w-md">
                从左侧列表中选择一个工具开始使用
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="absolute bottom-4 right-4 z-10">
          <CollapsibleDebugPanel />
        </div>
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
