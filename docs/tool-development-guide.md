# ProtoTool 工具开发指南

本指南介绍如何为 ProtoTool 开发自定义工具，包括工具架构、API 接口、集成方式和最佳实践。

## 目录

1. [工具架构概述](#工具架构概述)
2. [创建基础工具](#创建基础工具)
3. [工具接口规范](#工具接口规范)
4. [UI 组件开发](#ui-组件开发)
5. [集成与注册](#集成与注册)
6. [测试工具](#测试工具)
7. [最佳实践](#最佳实践)

## 工具架构概述

ProtoTool 的工具系统采用插件化架构，每个工具都是一个独立的模块，实现 `BaseTool` 接口。工具可以：

- 处理各种数据格式（Hex、ASCII、Binary、JSON 等）
- 支持多种网络协议（TCP、UDP、WebSocket、MQTT 等）
- 提供可视化界面和程序化调用接口
- 与会话系统集成，提供上下文感知功能

### 核心组件

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Tool Registry │    │  Tool Executor  │    │ Integration Mgr │
│                 │    │                 │    │                 │
│ • 工具注册      │    │ • 工具执行      │    │ • 上下文感知    │
│ • 工具发现      │    │ • 状态管理      │    │ • 自动建议      │
│ • 配置管理      │    │ • 错误处理      │    │ • 菜单集成      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 创建基础工具

### 1. 实现 BaseTool 接口

```typescript
import { BaseTool, ToolInput, ToolOutput, ToolContext } from '@/types/toolbox';

class MyCustomTool implements BaseTool {
  // 基本信息
  id = 'my-custom-tool';
  name = '我的自定义工具';
  description = '这是一个示例工具';
  version = '1.0.0';
  category = 'utility' as const;
  icon = MyIcon; // Lucide React 图标
  author = 'Your Name';

  // 支持的格式和协议
  supportedFormats = ['hex', 'ascii', 'binary'];
  supportedProtocols = ['TCP', 'UDP', 'Custom'];
  
  // 工具特性
  requiresConnection = false;
  canProcessStreaming = false;

  // 默认配置
  defaultConfig = {
    option1: 'default_value',
    option2: true
  };

  // 生命周期方法
  async initialize(context: ToolContext): Promise<void> {
    console.log('Tool initialized');
  }

  async execute(input: ToolInput): Promise<ToolOutput> {
    try {
      // 处理输入数据
      const result = this.processData(input.data);
      
      return {
        data: result,
        format: input.format || 'ascii',
        result: 'Processing completed',
        metadata: {
          processedBytes: input.data?.length || 0
        }
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Processing failed'
      };
    }
  }

  async cleanup(): Promise<void> {
    console.log('Tool cleaned up');
  }

  // UI 渲染
  renderUI(container: HTMLElement, context: ToolContext): React.ReactElement {
    return <MyToolUI tool={this} context={context} />;
  }

  // 快速操作
  getQuickActions(context: ToolContext) {
    return [
      {
        id: 'quick-process',
        label: '快速处理',
        icon: MyIcon,
        handler: async (ctx) => {
          // 快速操作逻辑
        }
      }
    ];
  }

  // 上下文菜单
  getContextMenuItems(data: any, context: ToolContext) {
    return [
      {
        id: 'process-data',
        label: '处理数据',
        icon: MyIcon,
        handler: async (inputData) => {
          // 上下文菜单操作
        }
      }
    ];
  }

  // 私有方法
  private processData(data: Uint8Array): Uint8Array {
    // 实际的数据处理逻辑
    return data;
  }
}
```

### 2. 创建 UI 组件

```typescript
interface MyToolUIProps {
  tool: MyCustomTool;
  context: ToolContext;
}

const MyToolUI: React.FC<MyToolUIProps> = ({ tool, context }) => {
  const [inputData, setInputData] = useState('');
  const [result, setResult] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const output = await tool.execute({
        data: new TextEncoder().encode(inputData)
      });
      
      if (output.error) {
        context.showNotification(output.error, 'error');
      } else {
        setResult(output.result || '');
        context.showNotification('处理完成', 'success');
      }
    } catch (error) {
      context.showNotification('处理失败', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">输入数据</label>
        <textarea
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          className="w-full h-32 p-3 border rounded-md font-mono text-sm"
          placeholder="输入要处理的数据..."
        />
      </div>

      <button
        onClick={handleProcess}
        disabled={isProcessing || !inputData.trim()}
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
      >
        {isProcessing ? '处理中...' : '开始处理'}
      </button>

      {result && (
        <div>
          <label className="block text-sm font-medium mb-2">处理结果</label>
          <div className="p-3 border rounded-md bg-muted font-mono text-sm">
            {result}
          </div>
        </div>
      )}
    </div>
  );
};
```

## 工具接口规范

### ToolInput 接口

```typescript
interface ToolInput {
  data?: Uint8Array;           // 输入数据
  format?: DataFormat;         // 数据格式
  metadata?: Record<string, any>; // 元数据
  context?: Record<string, any>;  // 上下文信息
}
```

### ToolOutput 接口

```typescript
interface ToolOutput {
  data?: Uint8Array;           // 输出数据
  format?: DataFormat;         // 输出格式
  result?: string;             // 结果描述
  metadata?: Record<string, any>; // 输出元数据
  error?: string;              // 错误信息
}
```

### ToolContext 接口

```typescript
interface ToolContext {
  sessionId?: string;          // 会话ID
  selectedData?: Uint8Array;   // 选中的数据
  protocol?: string;           // 当前协议
  connectionState?: string;    // 连接状态
  emit: (event: string, data: any) => void;        // 事件发射
  showNotification: (message: string, type: string) => void; // 通知显示
}
```

## UI 组件开发

### 组件设计原则

1. **响应式设计**: 适配不同屏幕尺寸
2. **一致性**: 遵循应用的设计系统
3. **可访问性**: 支持键盘导航和屏幕阅读器
4. **性能**: 避免不必要的重渲染

### 常用组件模式

```typescript
// 输入组件
<div>
  <label className="block text-sm font-medium mb-2">标签</label>
  <input
    type="text"
    className="w-full p-2 border border-border rounded-md bg-background"
    placeholder="占位符文本"
  />
</div>

// 按钮组件
<button
  onClick={handleClick}
  disabled={isLoading}
  className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
>
  <Icon className="w-4 h-4" />
  <span>{isLoading ? '处理中...' : '执行'}</span>
</button>

// 结果显示
<div className="p-3 border border-border rounded-md bg-muted font-mono text-sm">
  {result}
</div>
```

## 集成与注册

### 1. 注册工具

```typescript
// 在 src/tools/index.ts 中添加
import MyCustomTool from './MyCustomTool';

export const myCustomTool = new MyCustomTool();

export const allTools = [
  // ... 其他工具
  myCustomTool
];

// 在初始化函数中注册
export async function initializeTools(): Promise<void> {
  // ... 其他工具注册
  
  await toolRegistry.register(myCustomTool, {
    enabled: true,
    priority: 1,
    tags: ['custom', 'utility'],
    metadata: {
      isBuiltIn: false,
      version: myCustomTool.version,
      author: myCustomTool.author
    }
  });
}
```

### 2. 配置工具

```typescript
// 工具配置示例
const toolConfig = {
  enabled: true,           // 是否启用
  priority: 1,            // 优先级 (1-10)
  tags: ['parsing'],      // 标签
  quickAccess: true,      // 是否显示在快速访问栏
  contextMenu: true,      // 是否显示在上下文菜单
  autoSuggest: true,      // 是否参与自动建议
  metadata: {
    category: 'parsing',
    complexity: 'medium'
  }
};
```

## 测试工具

### 1. 单元测试

```typescript
import { describe, it, expect } from 'vitest';
import MyCustomTool from '../MyCustomTool';

describe('MyCustomTool', () => {
  const tool = new MyCustomTool();

  it('should process data correctly', async () => {
    const input = {
      data: new TextEncoder().encode('test data')
    };

    const result = await tool.execute(input);
    
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
  });

  it('should handle empty input', async () => {
    const result = await tool.execute({});
    
    expect(result.error).toBeDefined();
  });
});
```

### 2. 集成测试

```typescript
import { toolRegistry } from '@/services/ToolRegistry';
import { toolIntegrationManager } from '@/services/ToolIntegrationManager';

describe('Tool Integration', () => {
  it('should register tool successfully', async () => {
    const tool = new MyCustomTool();
    await toolRegistry.register(tool);
    
    const registered = toolRegistry.getById(tool.id);
    expect(registered).toBeDefined();
  });

  it('should provide context suggestions', async () => {
    const context = {
      protocol: 'TCP',
      selectedData: new Uint8Array([1, 2, 3])
    };

    const suggestions = await toolIntegrationManager.getToolSuggestions(context);
    expect(suggestions.length).toBeGreaterThan(0);
  });
});
```

## 最佳实践

### 1. 错误处理

```typescript
async execute(input: ToolInput): Promise<ToolOutput> {
  try {
    // 输入验证
    if (!input.data || input.data.length === 0) {
      throw new Error('No input data provided');
    }

    // 格式验证
    if (input.format && !this.supportedFormats.includes(input.format)) {
      throw new Error(`Unsupported format: ${input.format}`);
    }

    // 处理逻辑
    const result = await this.processData(input.data);
    
    return {
      data: result,
      format: input.format || 'ascii',
      result: 'Success'
    };
  } catch (error) {
    console.error(`Tool ${this.id} execution failed:`, error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### 2. 性能优化

```typescript
// 使用 Web Workers 处理大数据
private async processLargeData(data: Uint8Array): Promise<Uint8Array> {
  if (data.length > 1024 * 1024) { // 1MB
    return new Promise((resolve, reject) => {
      const worker = new Worker('/workers/data-processor.js');
      worker.postMessage(data);
      worker.onmessage = (e) => resolve(e.data);
      worker.onerror = (e) => reject(e);
    });
  }
  
  return this.processData(data);
}

// 缓存计算结果
private resultCache = new Map<string, ToolOutput>();

private getCacheKey(input: ToolInput): string {
  return `${this.id}-${input.format}-${this.hashData(input.data)}`;
}
```

### 3. 状态管理

```typescript
// 使用工具状态管理器
async execute(input: ToolInput): Promise<ToolOutput> {
  const sessionId = input.metadata?.sessionId;
  
  // 加载工具状态
  const state = toolStateManager.getState(this.id, sessionId);
  
  // 处理数据
  const result = await this.processWithState(input, state);
  
  // 保存状态
  toolStateManager.setState(this.id, {
    lastProcessed: Date.now(),
    resultCount: (state.resultCount || 0) + 1
  }, sessionId);
  
  return result;
}
```

### 4. 国际化支持

```typescript
// 使用 i18n
import { useTranslation } from 'react-i18next';

const MyToolUI: React.FC<Props> = ({ tool, context }) => {
  const { t } = useTranslation('tools');
  
  return (
    <div>
      <label>{t('input_data')}</label>
      <button>{t('process')}</button>
    </div>
  );
};
```

## 工具示例

查看以下内置工具的实现作为参考：

- `MessageGeneratorTool` - 报文生成器
- `ProtocolParserTool` - 协议解析器  
- `DataConverterTool` - 数据转换器
- `CRCCalculatorTool` - CRC 校验计算器
- `TimestampConverterTool` - 时间戳转换器

这些工具展示了不同类型工具的实现模式和最佳实践。
