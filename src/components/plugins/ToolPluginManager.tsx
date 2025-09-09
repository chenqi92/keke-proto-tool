import React, { useState } from 'react';
import { cn } from '@/utils';
import { ToolPlugin } from '@/types/plugins';
import { 
  Wrench, 
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
  Shield,
  Cpu,
  HardDrive,
  Network,
  Play,
  Activity
} from 'lucide-react';

interface ToolPluginManagerProps {
  plugins: ToolPlugin[];
  onInstall: (plugin: ToolPlugin) => void;
  onUninstall: (plugin: ToolPlugin) => void;
  onToggle: (plugin: ToolPlugin) => void;
  onConfigure: (plugin: ToolPlugin) => void;
  onExecute: (plugin: ToolPlugin) => void;
}

const mockToolPlugins: ToolPlugin[] = [
  {
    id: 'json-formatter',
    name: 'JSON 格式化工具',
    version: '2.0.1',
    description: '美化和验证 JSON 数据格式，支持语法高亮和错误检测',
    author: 'Community',
    type: 'tool',
    category: 'data-processing',
    executable: true,
    sandboxed: true,
    runtime: 'javascript',
    entryPoint: 'main.js',
    dependencies: ['lodash', 'json-schema'],
    capabilities: {
      fileAccess: false,
      networkAccess: false,
      systemAccess: false,
      dataModification: true
    },
    resourceLimits: {
      memory: '64MB',
      cpu: '10%',
      timeout: 30000
    },
    status: 'active',
    installed: true,
    rating: 4.5,
    downloads: 890,
    size: '512 KB',
    lastUpdated: new Date('2024-01-08'),
    permissions: ['数据处理']
  },
  {
    id: 'hex-editor',
    name: '十六进制编辑器',
    version: '1.3.0',
    description: '强大的十六进制数据编辑和分析工具，支持二进制文件操作',
    author: 'DevTools Pro',
    type: 'tool',
    category: 'utility',
    executable: true,
    sandboxed: true,
    runtime: 'wasm',
    entryPoint: 'hex_editor.wasm',
    dependencies: [],
    capabilities: {
      fileAccess: true,
      networkAccess: false,
      systemAccess: false,
      dataModification: true
    },
    resourceLimits: {
      memory: '128MB',
      cpu: '20%',
      timeout: 60000
    },
    status: 'active',
    installed: true,
    rating: 4.7,
    downloads: 1200,
    size: '2.3 MB',
    lastUpdated: new Date('2024-01-10'),
    permissions: ['文件读写', '数据处理']
  },
  {
    id: 'packet-analyzer',
    name: '数据包分析器',
    version: '3.1.2',
    description: '深度分析网络数据包，提供统计信息和可视化图表',
    author: 'NetworkTools Inc',
    type: 'tool',
    category: 'analysis',
    executable: true,
    sandboxed: false,
    runtime: 'native',
    entryPoint: 'analyzer.exe',
    dependencies: ['pcap', 'wireshark-core'],
    capabilities: {
      fileAccess: true,
      networkAccess: true,
      systemAccess: true,
      dataModification: false
    },
    resourceLimits: {
      memory: '512MB',
      cpu: '50%',
      timeout: 300000
    },
    status: 'inactive',
    installed: true,
    rating: 4.3,
    downloads: 650,
    size: '15.2 MB',
    lastUpdated: new Date('2024-01-05'),
    permissions: ['网络访问', '系统访问', '文件读写']
  },
  {
    id: 'crypto-toolkit',
    name: '加密工具包',
    version: '2.2.0',
    description: '提供各种加密解密算法，支持 AES、RSA、MD5、SHA 等',
    author: 'CryptoSoft',
    type: 'tool',
    category: 'security',
    executable: true,
    sandboxed: true,
    runtime: 'javascript',
    entryPoint: 'crypto.js',
    dependencies: ['crypto-js', 'node-rsa'],
    capabilities: {
      fileAccess: false,
      networkAccess: false,
      systemAccess: false,
      dataModification: true
    },
    resourceLimits: {
      memory: '32MB',
      cpu: '15%',
      timeout: 10000
    },
    status: 'error',
    installed: true,
    rating: 4.6,
    downloads: 2100,
    size: '1.8 MB',
    lastUpdated: new Date('2024-01-12'),
    permissions: ['数据处理']
  },
  {
    id: 'data-visualizer',
    name: '数据可视化工具',
    version: '1.5.0',
    description: '将网络数据转换为图表和可视化展示，支持多种图表类型',
    author: 'VizTech',
    type: 'tool',
    category: 'visualization',
    executable: true,
    sandboxed: true,
    runtime: 'javascript',
    entryPoint: 'visualizer.js',
    dependencies: ['d3', 'chart.js', 'plotly'],
    capabilities: {
      fileAccess: false,
      networkAccess: false,
      systemAccess: false,
      dataModification: false
    },
    resourceLimits: {
      memory: '256MB',
      cpu: '30%',
      timeout: 120000
    },
    status: 'active',
    installed: false,
    rating: 4.8,
    downloads: 1800,
    size: '4.2 MB',
    lastUpdated: new Date('2024-01-15'),
    permissions: ['数据处理']
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

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'data-processing':
      return <Cpu className="w-4 h-4" />;
    case 'analysis':
      return <Activity className="w-4 h-4" />;
    case 'visualization':
      return <Eye className="w-4 h-4" />;
    case 'utility':
      return <Wrench className="w-4 h-4" />;
    case 'security':
      return <Shield className="w-4 h-4" />;
    default:
      return <Wrench className="w-4 h-4" />;
  }
};

const getCategoryName = (category: string) => {
  switch (category) {
    case 'data-processing':
      return '数据处理';
    case 'analysis':
      return '数据分析';
    case 'visualization':
      return '数据可视化';
    case 'utility':
      return '实用工具';
    case 'security':
      return '安全工具';
    default:
      return '其他';
  }
};

const getRuntimeIcon = (runtime: string) => {
  switch (runtime) {
    case 'javascript':
      return <span className="text-yellow-600">JS</span>;
    case 'wasm':
      return <span className="text-purple-600">WASM</span>;
    case 'native':
      return <span className="text-blue-600">Native</span>;
    default:
      return <span className="text-gray-600">?</span>;
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

export const ToolPluginManager: React.FC<ToolPluginManagerProps> = ({
  plugins = mockToolPlugins,
  onInstall,
  onUninstall,
  onToggle,
  onConfigure,
  onExecute
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPlugin, setSelectedPlugin] = useState<ToolPlugin | null>(null);

  const categories = Array.from(new Set(plugins.map(plugin => plugin.category)));

  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = !searchQuery || 
      plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.author.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory || plugin.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">工具插件</h2>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索工具插件..."
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
                {getCategoryName(category)}
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
                <Wrench className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">暂无工具插件</h3>
                <p>没有找到匹配的工具插件</p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {filteredPlugins.map((plugin) => (
                <div
                  key={plugin.id}
                  className={cn(
                    "p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-auto",
                    selectedPlugin?.id === plugin.id && "border-primary bg-primary/10"
                  )}
                  onClick={() => setSelectedPlugin(plugin)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(plugin.category)}
                          <h3 className="font-semibold text-lg">{plugin.name}</h3>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          v{plugin.version}
                        </span>
                        <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">
                          {getCategoryName(plugin.category)}
                        </span>
                        <div className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                          {getRuntimeIcon(plugin.runtime)}
                        </div>
                        {plugin.installed && (
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(plugin.status)}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {plugin.description}
                      </p>
                      
                      {/* Capabilities */}
                      <div className="flex items-center space-x-4 mb-2">
                        {plugin.capabilities.fileAccess && (
                          <div className="flex items-center space-x-1 text-xs">
                            <HardDrive className="w-3 h-3" />
                            <span>文件</span>
                          </div>
                        )}
                        {plugin.capabilities.networkAccess && (
                          <div className="flex items-center space-x-1 text-xs">
                            <Network className="w-3 h-3" />
                            <span>网络</span>
                          </div>
                        )}
                        {plugin.capabilities.systemAccess && (
                          <div className="flex items-center space-x-1 text-xs">
                            <Shield className="w-3 h-3" />
                            <span>系统</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1 text-xs">
                          <span className={plugin.sandboxed ? "text-green-600" : "text-red-600"}>
                            {plugin.sandboxed ? "沙箱" : "原生"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>作者: {plugin.author}</span>
                        <span>大小: {plugin.size}</span>
                        <span>内存: {plugin.resourceLimits.memory}</span>
                        <span>下载: {plugin.downloads.toLocaleString()}</span>
                        <div>{renderStars(plugin.rating)}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {plugin.installed ? (
                        <>
                          {plugin.executable && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onExecute(plugin);
                              }}
                              className="p-2 hover:bg-accent rounded-md text-blue-600"
                              title="执行"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggle(plugin);
                            }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              onConfigure(plugin);
                            }}
                            className="p-2 hover:bg-accent rounded-md"
                            title="配置"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUninstall(plugin);
                            }}
                            className="p-2 hover:bg-accent rounded-md text-red-600"
                            title="卸载"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInstall(plugin);
                          }}
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
              <h3 className="font-semibold">工具插件详情</h3>
            </div>
            <div className="p-4 space-y-4 overflow-auto">
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
                  <span className="ml-2">{getCategoryName(selectedPlugin.category)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">运行时:</span>
                  <span className="ml-2">{selectedPlugin.runtime}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">大小:</span>
                  <span className="ml-2">{selectedPlugin.size}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">沙箱:</span>
                  <span className={cn("ml-2", selectedPlugin.sandboxed ? "text-green-600" : "text-red-600")}>
                    {selectedPlugin.sandboxed ? "是" : "否"}
                  </span>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium mb-2">资源限制</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>内存限制:</span>
                    <span>{selectedPlugin.resourceLimits.memory}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CPU 限制:</span>
                    <span>{selectedPlugin.resourceLimits.cpu}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>超时时间:</span>
                    <span>{selectedPlugin.resourceLimits.timeout / 1000}s</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium mb-2">权限能力</h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">文件访问</span>
                    <span className={cn("text-sm", selectedPlugin.capabilities.fileAccess ? "text-green-600" : "text-gray-400")}>
                      {selectedPlugin.capabilities.fileAccess ? "允许" : "禁止"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">网络访问</span>
                    <span className={cn("text-sm", selectedPlugin.capabilities.networkAccess ? "text-green-600" : "text-gray-400")}>
                      {selectedPlugin.capabilities.networkAccess ? "允许" : "禁止"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">系统访问</span>
                    <span className={cn("text-sm", selectedPlugin.capabilities.systemAccess ? "text-green-600" : "text-gray-400")}>
                      {selectedPlugin.capabilities.systemAccess ? "允许" : "禁止"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">数据修改</span>
                    <span className={cn("text-sm", selectedPlugin.capabilities.dataModification ? "text-green-600" : "text-gray-400")}>
                      {selectedPlugin.capabilities.dataModification ? "允许" : "禁止"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium mb-2">依赖项</h5>
                <div className="space-y-1">
                  {selectedPlugin.dependencies.length > 0 ? (
                    selectedPlugin.dependencies.map((dep, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        • {dep}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">无依赖</div>
                  )}
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
