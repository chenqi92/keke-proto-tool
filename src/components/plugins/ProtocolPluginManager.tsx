import React, { useState, useEffect } from 'react';
import { cn } from '@/utils';
import { ProtocolPlugin } from '@/types/plugins';
import {
  protocolRepositoryService,
  ProtocolMetadata
} from '@/services/ProtocolRepositoryService';
import {
  Network,
  Download,
  Upload,
  Settings,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  Search,
  Code,
  Shield,
  Zap,
  RefreshCw,
  Plus,
  Edit3
} from 'lucide-react';
import { ProtocolEditor } from './ProtocolEditor';

interface ProtocolPluginManagerProps {
  plugins?: ProtocolPlugin[];
  onInstall?: (plugin: ProtocolPlugin) => void;
  onUninstall?: (plugin: ProtocolPlugin) => void;
  onToggle?: (plugin: ProtocolPlugin) => void;
  onConfigure?: (plugin: ProtocolPlugin) => void;
  onUploadDefinition?: (file: File) => void;
}

const mockProtocolPlugins: ProtocolPlugin[] = [
  {
    id: 'modbus-tcp',
    name: 'Modbus TCP/RTU',
    version: '1.2.3',
    description: '完整的 Modbus TCP 和 RTU 协议解析器，支持所有标准功能码',
    author: 'ProtoTool Team',
    type: 'protocol',
    protocolName: 'Modbus',
    supportedFormats: ['JSON', 'XML'],
    protocolVersion: '1.1b3',
    ports: [502, 503],
    features: {
      parsing: true,
      generation: true,
      validation: true,
      encryption: false
    },
    status: 'active',
    installed: true,
    rating: 4.8,
    downloads: 1250,
    size: '2.1 MB',
    lastUpdated: new Date('2024-01-10'),
    permissions: ['网络访问', '文件读写'],
    configSchema: {
      slaveId: { type: 'number', default: 1 },
      timeout: { type: 'number', default: 5000 }
    }
  },
  {
    id: 'http-analyzer',
    name: 'HTTP 协议分析器',
    version: '2.0.1',
    description: '深度分析 HTTP/HTTPS 协议，支持 REST API 调试和性能分析',
    author: 'DevTools Inc',
    type: 'protocol',
    protocolName: 'HTTP',
    supportedFormats: ['JSON', 'XML', 'YAML'],
    protocolVersion: '1.1',
    ports: [80, 443, 8080, 8443],
    features: {
      parsing: true,
      generation: true,
      validation: true,
      encryption: true
    },
    status: 'inactive',
    installed: true,
    rating: 4.5,
    downloads: 2100,
    size: '3.5 MB',
    lastUpdated: new Date('2024-01-08'),
    permissions: ['网络访问', '数据处理', '文件读写']
  },
  {
    id: 'can-bus',
    name: 'CAN 总线协议',
    version: '1.1.0',
    description: '汽车 CAN 总线协议解析，支持 OBD-II 和自定义 DBC 文件',
    author: 'AutoTech',
    type: 'protocol',
    protocolName: 'CAN',
    supportedFormats: ['DBC', 'JSON'],
    protocolVersion: '2.0',
    ports: [],
    features: {
      parsing: true,
      generation: false,
      validation: true,
      encryption: false
    },
    status: 'error',
    installed: true,
    rating: 4.2,
    downloads: 650,
    size: '1.8 MB',
    lastUpdated: new Date('2024-01-05'),
    permissions: ['硬件访问', '文件读写']
  },
  {
    id: 'mqtt-protocol',
    name: 'MQTT 协议扩展',
    version: '3.1.1',
    description: 'MQTT 3.1.1 和 5.0 协议完整实现，支持 QoS 和保留消息',
    author: 'IoT Solutions',
    type: 'protocol',
    protocolName: 'MQTT',
    supportedFormats: ['JSON'],
    protocolVersion: '5.0',
    ports: [1883, 8883],
    features: {
      parsing: true,
      generation: true,
      validation: true,
      encryption: true
    },
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

const getFeatureIcon = (feature: string, enabled: boolean) => {
  const iconClass = `w-4 h-4 ${enabled ? 'text-green-500' : 'text-gray-400'}`;
  switch (feature) {
    case 'parsing':
      return <Code className={iconClass} />;
    case 'generation':
      return <Zap className={iconClass} />;
    case 'validation':
      return <Shield className={iconClass} />;
    case 'encryption':
      return <Shield className={iconClass} />;
    default:
      return <CheckCircle className={iconClass} />;
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

export const ProtocolPluginManager: React.FC<ProtocolPluginManagerProps> = ({
  plugins: propPlugins,
  onInstall,
  onUninstall,
  onToggle,
  onConfigure,
  onUploadDefinition
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null);
  const [selectedPlugin, setSelectedPlugin] = useState<ProtocolPlugin | null>(null);
  const [configDialog, setConfigDialog] = useState<{
    isOpen: boolean;
    plugin: ProtocolPlugin | null;
  }>({ isOpen: false, plugin: null });
  const [protocols, setProtocols] = useState<ProtocolMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingProtocol, setEditingProtocol] = useState<ProtocolMetadata | null>(null);
  const [editorContent, setEditorContent] = useState('');

  // Load protocols from backend
  useEffect(() => {
    loadProtocols();
  }, []);

  const loadProtocols = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const protocolList = await protocolRepositoryService.listProtocols();
      setProtocols(protocolList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load protocols');
      console.error('Failed to load protocols:', err);
    } finally {
      setLoading(false);
    }
  };

  // Convert ProtocolMetadata to ProtocolPlugin format for compatibility
  const convertToPluginFormat = (metadata: ProtocolMetadata): ProtocolPlugin => ({
    id: metadata.id,
    name: metadata.name,
    version: metadata.version,
    description: metadata.description,
    author: metadata.author,
    type: 'protocol',
    protocolName: metadata.name,
    supportedFormats: metadata.supported_formats || [], // Safe fallback to empty array
    protocolVersion: metadata.version,
    ports: [], // Not available in metadata
    features: {
      parsing: true,
      generation: false,
      validation: true,
      encryption: false
    },
    status: metadata.enabled ? 'active' : 'inactive',
    installed: true,
    rating: 4.5, // Default rating
    downloads: 0, // Not tracked
    size: `${(metadata.file_size / 1024).toFixed(1)} KB`,
    lastUpdated: new Date(metadata.modified_at),
    permissions: ['文件读写'] // Default permissions
  });

  // Use either prop plugins or loaded protocols
  const plugins = propPlugins || protocols.map(convertToPluginFormat);
  const protocolNames = Array.from(new Set(plugins.map(plugin => plugin.protocolName)));

  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = !searchQuery || 
      plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.protocolName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProtocol = !selectedProtocol || plugin.protocolName === selectedProtocol;

    return matchesSearch && matchesProtocol;
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        if (!file.name.endsWith('.kpt')) {
          setError('Invalid file format. Please upload a .kpt file.');
          return;
        }

        setLoading(true);
        const protocolId = await protocolRepositoryService.importProtocolFromFile(file);
        console.log(`Successfully imported protocol: ${protocolId}`);

        // Reload protocols
        await loadProtocols();

        // Call the prop handler if provided
        if (onUploadDefinition) {
          onUploadDefinition(file);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to import protocol');
        console.error('Failed to import protocol:', err);
      } finally {
        setLoading(false);
      }
    }

    // Reset the input
    event.target.value = '';
  };

  const handleEditProtocol = async (protocol: ProtocolMetadata) => {
    try {
      // For now, we'll load a sample content
      // In a real implementation, you'd load the actual protocol content from the backend
      const sampleContent = `# Protocol: ${protocol.name}
# Version: ${protocol.version}
# Description: ${protocol.description}

metadata:
  name: "${protocol.name}"
  version: "${protocol.version}"
  description: "${protocol.description}"
  category: "${protocol.category}"
  tags: ${JSON.stringify(protocol.tags)}

parsing:
  # Add your parsing rules here

validation:
  # Add your validation rules here

factor_codes:
  # Add your factor codes here

examples:
  # Add example data here
`;

      setEditorContent(sampleContent);
      setEditingProtocol(protocol);
    } catch (error) {
      setError(`Failed to load protocol for editing: ${error}`);
    }
  };

  const handleCloseEditor = () => {
    setEditingProtocol(null);
    setEditorContent('');
  };

  const handleSaveProtocol = async (content: string) => {
    if (!editingProtocol) return;

    try {
      // Save the protocol content
      // In a real implementation, you'd save to the backend
      console.log('Saving protocol content:', content);

      // Refresh the protocols list
      await loadProtocols();
    } catch (error) {
      setError(`Failed to save protocol: ${error}`);
    }
  };

  const handleToggleProtocol = async (plugin: ProtocolPlugin) => {
    try {
      const newEnabled = plugin.status !== 'active';
      await protocolRepositoryService.setProtocolEnabled(plugin.id, newEnabled);
      await loadProtocols();

      if (onToggle) {
        onToggle(plugin);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle protocol');
      console.error('Failed to toggle protocol:', err);
    }
  };

  const handleConfigureProtocol = (plugin: ProtocolPlugin) => {
    setConfigDialog({ isOpen: true, plugin });
  };

  const handleConfigDialogClose = () => {
    setConfigDialog({ isOpen: false, plugin: null });
  };

  const handleToggleProtocolFromDialog = async (plugin: ProtocolPlugin, enabled: boolean) => {
    try {
      await protocolRepositoryService.setProtocolEnabled(plugin.id, enabled);

      // Refresh the protocols list
      await loadProtocols();

      setSuccess(`Protocol "${plugin.name}" ${enabled ? 'enabled' : 'disabled'} successfully`);
      handleConfigDialogClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure protocol');
      console.error('Failed to configure protocol:', err);
    }
  };

  const handleDeleteProtocol = async (plugin: ProtocolPlugin) => {
    if (!confirm(`Are you sure you want to delete the protocol "${plugin.name}"?`)) {
      return;
    }

    try {
      await protocolRepositoryService.deleteProtocol(plugin.id);
      await loadProtocols();

      // Clear selection if deleted protocol was selected
      if (selectedPlugin?.id === plugin.id) {
        setSelectedPlugin(null);
      }

      if (onUninstall) {
        onUninstall(plugin);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete protocol');
      console.error('Failed to delete protocol:', err);
    }
  };

  // Show editor if editing a protocol
  if (editingProtocol) {
    return (
      <ProtocolEditor
        protocolId={editingProtocol.id}
        initialContent={editorContent}
        onSave={handleSaveProtocol}
        onClose={handleCloseEditor}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Network className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">协议插件</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={loadProtocols}
              disabled={loading}
              className="flex items-center space-x-2 px-2.5 py-1.5 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 text-sm disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              <span>刷新</span>
            </button>
            <input
              type="file"
              id="protocol-upload"
              accept=".kpt"
              onChange={handleFileUpload}
              className="hidden"
              disabled={loading}
            />
            <label
              htmlFor="protocol-upload"
              className={cn(
                "flex items-center space-x-2 px-2.5 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm cursor-pointer",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              <Upload className="w-4 h-4" />
              <span>导入协议</span>
            </label>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索协议插件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <select
            value={selectedProtocol || ''}
            onChange={(e) => setSelectedProtocol(e.target.value || null)}
            className="pl-3 pr-8 py-1.5 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors hover:border-accent-foreground"
            disabled={loading}
          >
            <option value="">所有协议</option>
            {protocolNames.map(protocol => (
              <option key={protocol} value={protocol}>
                {protocol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="mx-4 mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-700">{success}</span>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Plugin List */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <RefreshCw className="w-16 h-16 mx-auto mb-4 opacity-50 animate-spin" />
                <h3 className="text-lg font-semibold mb-2">加载中...</h3>
                <p>正在加载协议列表</p>
              </div>
            </div>
          ) : filteredPlugins.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Network className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">暂无协议</h3>
                <p>没有找到匹配的协议，请尝试导入协议文件</p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {filteredPlugins.map((plugin) => (
                <div
                  key={plugin.id}
                  className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"

                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-lg">{plugin.name}</h3>
                          <span className="text-sm text-muted-foreground">
                            v{plugin.version}
                          </span>
                        </div>
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                          {plugin.protocolName}
                        </span>
                        {plugin.installed && (
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(plugin.status)}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {plugin.description}
                      </p>
                      
                      {/* Features */}
                      <div className="flex items-center space-x-4 mb-2">
                        <div className="flex items-center space-x-2">
                          {getFeatureIcon('parsing', plugin.features?.parsing || false)}
                          <span className="text-xs">解析</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getFeatureIcon('generation', plugin.features?.generation || false)}
                          <span className="text-xs">生成</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getFeatureIcon('validation', plugin.features?.validation || false)}
                          <span className="text-xs">验证</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getFeatureIcon('encryption', plugin.features?.encryption || false)}
                          <span className="text-xs">加密</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>作者: {plugin.author}</span>
                        <span>大小: {plugin.size}</span>
                        <span>下载: {plugin.downloads.toLocaleString()}</span>
                        <div>{renderStars(plugin.rating)}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {plugin.installed ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleProtocol(plugin);
                            }}
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              plugin.status === 'active'
                                ? "hover:bg-accent text-green-600"
                                : "hover:bg-accent text-muted-foreground"
                            )}
                            title={plugin.status === 'active' ? '停用' : '启用'}
                            disabled={loading}
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
                              handleConfigureProtocol(plugin);
                            }}
                            className="p-1.5 hover:bg-accent rounded-md"
                            title="配置"
                            disabled={loading}
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Convert ProtocolPlugin to ProtocolMetadata for editing
                              const protocolMetadata: ProtocolMetadata = {
                                id: plugin.id,
                                name: plugin.name,
                                version: plugin.version,
                                author: plugin.author,
                                description: plugin.description,
                                category: plugin.type,
                                tags: [],
                                supported_formats: plugin.supportedFormats || [],
                                enabled: plugin.status === 'active',
                                created_at: new Date().toISOString(),
                                modified_at: new Date().toISOString(),
                                file_path: '',
                                file_size: 0
                              };
                              handleEditProtocol(protocolMetadata);
                            }}
                            className="p-1.5 hover:bg-accent rounded-md"
                            title="编辑"
                            disabled={loading}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProtocol(plugin);
                            }}
                            className="p-1.5 hover:bg-accent rounded-md text-red-600"
                            title="删除"
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onInstall) onInstall(plugin);
                          }}
                          className="flex items-center space-x-2 px-2.5 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
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
              <h3 className="font-semibold">协议插件详情</h3>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div>
                <h4 className="font-medium mb-2">{selectedPlugin.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedPlugin.description}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">协议:</span>
                  <span className="ml-2">{selectedPlugin.protocolName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">版本:</span>
                  <span className="ml-2">{selectedPlugin.protocolVersion}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">作者:</span>
                  <span className="ml-2">{selectedPlugin.author}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">大小:</span>
                  <span className="ml-2">{selectedPlugin.size}</span>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium mb-2">支持格式</h5>
                <div className="flex flex-wrap gap-2">
                  {selectedPlugin.supportedFormats.map((format, index) => (
                    <span key={index} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">
                      {format}
                    </span>
                  ))}
                </div>
              </div>
              
              {selectedPlugin.ports && selectedPlugin.ports.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">默认端口</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlugin.ports.map((port, index) => (
                      <span key={index} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">
                        {port}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <h5 className="font-medium mb-2">功能特性</h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">协议解析</span>
                    {getFeatureIcon('parsing', selectedPlugin.features?.parsing || false)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">数据生成</span>
                    {getFeatureIcon('generation', selectedPlugin.features?.generation || false)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">数据验证</span>
                    {getFeatureIcon('validation', selectedPlugin.features?.validation || false)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">加密支持</span>
                    {getFeatureIcon('encryption', selectedPlugin.features?.encryption || false)}
                  </div>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium mb-2">权限要求</h5>
                <div className="space-y-1">
                  {(selectedPlugin.permissions || []).map((permission, index) => (
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

        {/* Configuration Dialog */}
        {configDialog.isOpen && configDialog.plugin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">配置协议</h3>
                <button
                  onClick={handleConfigDialogClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">{configDialog.plugin.name}</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {configDialog.plugin.description}
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-accent rounded-md">
                  <div>
                    <p className="font-medium">协议状态</p>
                    <p className="text-sm text-muted-foreground">
                      当前状态: {configDialog.plugin.status === 'active' ? '已启用' : '已禁用'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant={configDialog.plugin.status === 'active' ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => handleToggleProtocolFromDialog(
                        configDialog.plugin!,
                        configDialog.plugin!.status !== 'active'
                      )}
                    >
                      {configDialog.plugin.status === 'active' ? '禁用' : '启用'}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleConfigDialogClose}>
                    取消
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
