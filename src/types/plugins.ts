// 插件基础接口
export interface BasePlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  status: 'active' | 'inactive' | 'error';
  installed: boolean;
  rating: number;
  downloads: number;
  size: string;
  lastUpdated: Date;
  permissions: string[];
}

// 协议插件接口
export interface ProtocolPlugin extends BasePlugin {
  type: 'protocol';
  protocolName: string;
  supportedFormats: string[]; // JSON, XML, 自定义格式等
  protocolVersion: string;
  ports: number[]; // 支持的默认端口
  features: {
    parsing: boolean;
    generation: boolean;
    validation: boolean;
    encryption: boolean;
  };
  configSchema?: any; // 协议配置模式
  sampleData?: string; // 示例数据
}

// 工具插件接口
export interface ToolPlugin extends BasePlugin {
  type: 'tool';
  category: 'data-processing' | 'analysis' | 'visualization' | 'utility' | 'security';
  executable: boolean;
  sandboxed: boolean;
  runtime: 'javascript' | 'wasm' | 'native';
  entryPoint: string;
  dependencies: string[];
  capabilities: {
    fileAccess: boolean;
    networkAccess: boolean;
    systemAccess: boolean;
    dataModification: boolean;
  };
  resourceLimits: {
    memory: string;
    cpu: string;
    timeout: number;
  };
}

// 插件类型联合
export type Plugin = ProtocolPlugin | ToolPlugin;

// 插件安装状态
export interface PluginInstallation {
  pluginId: string;
  installedAt: Date;
  configuredAt?: Date;
  lastUsed?: Date;
  configuration?: any;
  enabled: boolean;
}

// 插件商店项目
export interface PluginStoreItem {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  type: 'protocol' | 'tool';
  category: string;
  rating: number;
  downloads: number;
  size: string;
  screenshots: string[];
  changelog: string;
  requirements: string[];
  price: number; // 0 for free
  featured: boolean;
  verified: boolean;
}

// 协议定义文件格式
export interface ProtocolDefinition {
  name: string;
  version: string;
  description: string;
  format: 'json' | 'xml' | 'yaml' | 'custom';
  schema: any;
  examples: any[];
  validation: {
    rules: any[];
    required: string[];
  };
  parsing: {
    patterns: any[];
    transformations: any[];
  };
}

// 插件运行时状态
export interface PluginRuntimeStatus {
  pluginId: string;
  status: 'running' | 'stopped' | 'error' | 'suspended';
  startedAt?: Date;
  lastActivity?: Date;
  resourceUsage: {
    memory: number;
    cpu: number;
  };
  errorMessage?: string;
  logs: string[];
}

// 插件事件
export interface PluginEvent {
  type: 'install' | 'uninstall' | 'enable' | 'disable' | 'configure' | 'error';
  pluginId: string;
  timestamp: Date;
  data?: any;
  error?: string;
}
