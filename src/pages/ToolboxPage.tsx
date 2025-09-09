import React, { useState } from 'react';
import { cn } from '@/utils';
import { 
  Wrench, 
  Calculator, 
  Clock, 
  FileText, 
  Shuffle, 
  Hash,
  Binary,
  Zap,
  Play,
  Download
} from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  featured?: boolean;
}

const tools: Tool[] = [
  {
    id: 'message-generator',
    name: '报文生成器',
    description: '生成测试报文和数据包',
    icon: Zap,
    category: '生成工具',
    featured: true
  },
  {
    id: 'crc-calculator',
    name: 'CRC 校验',
    description: '计算和验证各种CRC校验和',
    icon: Calculator,
    category: '校验工具',
    featured: true
  },
  {
    id: 'timestamp-converter',
    name: '时间戳转换',
    description: '时间格式转换和计算',
    icon: Clock,
    category: '转换工具',
    featured: true
  },
  {
    id: 'log-extractor',
    name: '日志提取器',
    description: '从日志文件中提取特定数据',
    icon: FileText,
    category: '提取工具'
  },
  {
    id: 'data-converter',
    name: '数据转换器',
    description: 'Hex、Base64、二进制等格式转换',
    icon: Shuffle,
    category: '转换工具'
  },
  {
    id: 'hash-calculator',
    name: '哈希计算',
    description: 'MD5、SHA1、SHA256等哈希计算',
    icon: Hash,
    category: '校验工具'
  },
  {
    id: 'bit-visualizer',
    name: '位段可视化',
    description: '可视化显示位字段和标志位',
    icon: Binary,
    category: '可视化工具'
  }
];

const categories = Array.from(new Set(tools.map(tool => tool.category)));

export const ToolboxPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTools = tools.filter(tool => {
    const matchesCategory = !selectedCategory || tool.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredTools = tools.filter(tool => tool.featured);

  const renderToolCard = (tool: Tool, featured = false) => {
    const Icon = tool.icon;
    return (
      <button
        key={tool.id}
        onClick={() => setSelectedTool(tool)}
        className={cn(
          "p-4 border border-border rounded-lg hover:bg-accent hover:border-accent-foreground transition-colors text-left group w-full",
          featured && "border-primary/50 bg-primary/5"
        )}
      >
        <div className="flex items-start space-x-3">
          <div className={cn(
            "p-2 rounded-lg group-hover:scale-105 transition-transform",
            featured ? "bg-primary/20" : "bg-muted"
          )}>
            <Icon className={cn(
              "w-6 h-6",
              featured ? "text-primary" : "text-foreground"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1">
              {tool.name}
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              {tool.description}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs px-2 py-1 bg-muted rounded-full">
                {tool.category}
              </span>
              {featured && (
                <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
                  推荐
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    );
  };

  const renderToolInterface = () => {
    if (!selectedTool) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Wrench className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">选择工具</h3>
            <p>从左侧选择一个工具开始使用</p>
          </div>
        </div>
      );
    }

    const Icon = selectedTool.icon;

    return (
      <div className="h-full flex flex-col">
        {/* Tool Header */}
        <div className="border-b border-border p-4 bg-muted/30">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{selectedTool.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedTool.description}</p>
            </div>
          </div>
        </div>

        {/* Tool Content */}
        <div className="flex-1 p-4">
          {selectedTool.id === 'message-generator' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">协议类型</label>
                  <select className="w-full p-2 border border-border rounded-md bg-background">
                    <option>TCP</option>
                    <option>UDP</option>
                    <option>自定义</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">数据格式</label>
                  <select className="w-full p-2 border border-border rounded-md bg-background">
                    <option>十六进制</option>
                    <option>ASCII</option>
                    <option>二进制</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">数据内容</label>
                <textarea 
                  className="w-full h-32 p-3 border border-border rounded-md bg-background font-mono text-sm"
                  placeholder="输入要生成的数据..."
                />
              </div>
              <div className="flex space-x-2">
                <button className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                  <Play className="w-4 h-4" />
                  <span>生成</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 border border-border rounded-md hover:bg-accent">
                  <Download className="w-4 h-4" />
                  <span>导出</span>
                </button>
              </div>
            </div>
          )}

          {selectedTool.id === 'crc-calculator' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">CRC 类型</label>
                  <select className="w-full p-2 border border-border rounded-md bg-background">
                    <option>CRC-16</option>
                    <option>CRC-32</option>
                    <option>CRC-CCITT</option>
                    <option>CRC-8</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">输入格式</label>
                  <select className="w-full p-2 border border-border rounded-md bg-background">
                    <option>十六进制</option>
                    <option>ASCII</option>
                    <option>二进制</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">输入数据</label>
                <textarea 
                  className="w-full h-24 p-3 border border-border rounded-md bg-background font-mono text-sm"
                  placeholder="输入要计算CRC的数据..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">计算结果</label>
                <div className="p-3 bg-muted rounded-md font-mono text-sm">
                  CRC-16: 0x1234
                </div>
              </div>
              <button className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                <Calculator className="w-4 h-4" />
                <span>计算</span>
              </button>
            </div>
          )}

          {selectedTool.id === 'timestamp-converter' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">时间戳</label>
                  <input 
                    type="text"
                    className="w-full p-2 border border-border rounded-md bg-background font-mono"
                    placeholder="1640995200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">时间格式</label>
                  <select className="w-full p-2 border border-border rounded-md bg-background">
                    <option>Unix 时间戳 (秒)</option>
                    <option>Unix 时间戳 (毫秒)</option>
                    <option>ISO 8601</option>
                    <option>自定义格式</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">转换结果</label>
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">本地时间</div>
                    <div className="font-mono">2022-01-01 08:00:00</div>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">UTC 时间</div>
                    <div className="font-mono">2022-01-01 00:00:00</div>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">ISO 8601</div>
                    <div className="font-mono">2022-01-01T00:00:00.000Z</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 其他工具的占位符界面 */}
          {!['message-generator', 'crc-calculator', 'timestamp-converter'].includes(selectedTool.id) && (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Icon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">{selectedTool.name}</h3>
                <p>{selectedTool.description}</p>
                <p className="text-sm mt-2">工具界面开发中...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex">
      {/* Left Panel - Tool List */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-semibold mb-4">工具箱</h1>
          
          {/* Search */}
          <input
            type="text"
            placeholder="搜索工具..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 border border-border rounded-md bg-background text-sm"
          />
        </div>

        {/* Categories */}
        <div className="p-4 border-b border-border">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-3 py-1 text-xs rounded-full transition-colors",
                !selectedCategory 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted hover:bg-accent"
              )}
            >
              全部
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-3 py-1 text-xs rounded-full transition-colors",
                  selectedCategory === category 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted hover:bg-accent"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Tool List */}
        <div className="flex-1 overflow-auto p-4">
          {/* Featured Tools */}
          {!selectedCategory && !searchQuery && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">推荐工具</h3>
              <div className="space-y-3">
                {featuredTools.map(tool => renderToolCard(tool, true))}
              </div>
            </div>
          )}

          {/* All Tools */}
          <div className="space-y-3">
            {filteredTools.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>未找到匹配的工具</p>
              </div>
            ) : (
              filteredTools.map(tool => renderToolCard(tool))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Tool Interface */}
      <div className="flex-1">
        {renderToolInterface()}
      </div>
    </div>
  );
};
