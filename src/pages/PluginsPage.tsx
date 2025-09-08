import React, { useState } from 'react';
import { cn } from '@/utils';
import { 
  Puzzle, 
  Download, 
  Settings, 
  Trash2, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  Search,
  Filter
} from 'lucide-react';

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  status: 'active' | 'inactive' | 'error';
  installed: boolean;
  rating: number;
  downloads: number;
  size: string;
  lastUpdated: Date;
  permissions: string[];
}

const mockPlugins: Plugin[] = [
  {
    id: '1',
    name: 'Modbus 协议解析器',
    version: '1.2.3',
    description: '支持 Modbus TCP/RTU 协议的完整解析和生成功能',
    author: 'ProtoTool Team',
    category: '协议解析',
    status: 'active',
    installed: true,
    rating: 4.8,
    downloads: 1250,
    size: '2.1 MB',
    lastUpdated: new Date('2024-01-10'),
    permissions: ['网络访问', '文件读写']
  },
  {
    id: '2',
    name: 'JSON 格式化工具',
    version: '2.0.1',
    description: '美化和验证 JSON 数据格式',
    author: 'Community',
    category: '数据处理',
    status: 'active',
    installed: true,
    rating: 4.5,
    downloads: 890,
    size: '512 KB',
    lastUpdated: new Date('2024-01-08'),
    permissions: ['数据处理']
  },
  {
    id: '3',
    name: 'HTTP 协议分析器',
    version: '1.0.0',
    description: '分析 HTTP 请求和响应，支持 REST API 调试',
    author: 'DevTools Inc',
    category: '协议解析',
    status: 'inactive',
    installed: true,
    rating: 4.2,
    downloads: 2100,
    size: '3.5 MB',
    lastUpdated: new Date('2024-01-05'),
    permissions: ['网络访问', '数据处理', '文件读写']
  },
  {
    id: '4',
    name: 'CAN 总线工具',
    version: '1.1.0',
    description: '汽车 CAN 总线协议解析和诊断工具',
    author: 'AutoTech',
    category: '协议解析',
    status: 'error',
    installed: true,
    rating: 4.0,
    downloads: 650,
    size: '1.8 MB',
    lastUpdated: new Date('2024-01-03'),
    permissions: ['硬件访问', '网络访问']
  },
  {
    id: '5',
    name: 'MQTT 客户端',
    version: '2.1.0',
    description: 'MQTT 协议客户端，支持发布订阅和消息监控',
    author: 'IoT Solutions',
    category: '网络工具',
    status: 'active',
    installed: false,
    rating: 4.7,
    downloads: 3200,
    size: '2.8 MB',
    lastUpdated: new Date('2024-01-12'),
    permissions: ['网络访问']
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'inactive':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-500" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'active':
      return '运行中';
    case 'inactive':
      return '已停用';
    case 'error':
      return '错误';
    default:
      return '未知';
  }
};

const renderStars = (rating: number) => {
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "w-3 h-3",
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          )}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        {rating.toFixed(1)}
      </span>
    </div>
  );
};

export const PluginsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'installed' | 'available' | 'updates'>('installed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);

  const categories = Array.from(new Set(mockPlugins.map(plugin => plugin.category)));

  const filteredPlugins = mockPlugins.filter(plugin => {
    const matchesTab = 
      (activeTab === 'installed' && plugin.installed) ||
      (activeTab === 'available' && !plugin.installed) ||
      (activeTab === 'updates');

    const matchesSearch = !searchQuery || 
      plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.author.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory || plugin.category === selectedCategory;

    return matchesTab && matchesSearch && matchesCategory;
  });

  const handleTogglePlugin = (plugin: Plugin) => {
    console.log(`Toggle plugin: ${plugin.name}`);
  };

  const handleInstallPlugin = (plugin: Plugin) => {
    console.log(`Install plugin: ${plugin.name}`);
  };

  const handleUninstallPlugin = (plugin: Plugin) => {
    console.log(`Uninstall plugin: ${plugin.name}`);
  };

  const handleConfigurePlugin = (plugin: Plugin) => {
    console.log(`Configure plugin: ${plugin.name}`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4 bg-muted/30">
        <h1 className="text-xl font-semibold mb-4">插件管理</h1>
        
        {/* Tabs */}
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => setActiveTab('installed')}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              activeTab === 'installed' 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-accent"
            )}
          >
            已安装 ({mockPlugins.filter(p => p.installed).length})
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              activeTab === 'available' 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-accent"
            )}
          >
            可用插件 ({mockPlugins.filter(p => !p.installed).length})
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              activeTab === 'updates' 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-accent"
            )}
          >
            更新 (2)
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索插件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">所有分类</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Plugin List */}
        <div className="flex-1 overflow-auto">
          {filteredPlugins.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Puzzle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">暂无插件</h3>
                <p>没有找到匹配的插件</p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {filteredPlugins.map((plugin) => (
                <div
                  key={plugin.id}
                  className={cn(
                    "p-4 border border-border rounded-lg hover:bg-accent transition-colors",
                    selectedPlugin?.id === plugin.id && "border-primary bg-primary/10"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg">{plugin.name}</h3>
                        <span className="text-sm text-muted-foreground">
                          v{plugin.version}
                        </span>
                        {plugin.installed && (
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(plugin.status)}
                            <span className="text-sm text-muted-foreground">
                              {getStatusText(plugin.status)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {plugin.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>作者: {plugin.author}</span>
                        <span>分类: {plugin.category}</span>
                        <span>大小: {plugin.size}</span>
                        <span>下载: {plugin.downloads.toLocaleString()}</span>
                        <div>{renderStars(plugin.rating)}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {plugin.installed ? (
                        <>
                          <button
                            onClick={() => handleTogglePlugin(plugin)}
                            className={cn(
                              "p-2 rounded-md transition-colors",
                              plugin.status === 'active' 
                                ? "hover:bg-accent text-green-600" 
                                : "hover:bg-accent text-muted-foreground"
                            )}
                            title={plugin.status === 'active' ? '停用' : '启用'}
                          >
                            {plugin.status === 'active' ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleConfigurePlugin(plugin)}
                            className="p-2 hover:bg-accent rounded-md"
                            title="配置"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUninstallPlugin(plugin)}
                            className="p-2 hover:bg-accent rounded-md text-red-600"
                            title="卸载"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleInstallPlugin(plugin)}
                          className="flex items-center space-x-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
                        >
                          <Download className="w-4 h-4" />
                          <span>安装</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Plugin Details */}
        {selectedPlugin && (
          <div className="w-96 border-l border-border bg-card">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">插件详情</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="font-medium mb-2">{selectedPlugin.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedPlugin.description}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">版本:</span>
                  <span className="ml-2">{selectedPlugin.version}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">作者:</span>
                  <span className="ml-2">{selectedPlugin.author}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">分类:</span>
                  <span className="ml-2">{selectedPlugin.category}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">大小:</span>
                  <span className="ml-2">{selectedPlugin.size}</span>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium mb-2">权限要求</h5>
                <div className="space-y-1">
                  {selectedPlugin.permissions.map((permission, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      • {permission}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h5 className="font-medium mb-2">评分</h5>
                {renderStars(selectedPlugin.rating)}
                <p className="text-xs text-muted-foreground mt-1">
                  基于 {selectedPlugin.downloads} 次下载
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
