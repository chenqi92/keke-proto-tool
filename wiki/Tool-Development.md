# 工具开发指南

本指南介绍如何为 ProtoTool 开发自定义工具，包括工具架构、API 接口、集成方式和最佳实践。

## 目录

- [工具架构概述](#工具架构概述)
- [创建基础工具](#创建基础工具)
- [工具接口规范](#工具接口规范)
- [UI 组件开发](#ui-组件开发)
- [集成与注册](#集成与注册)
- [测试工具](#测试工具)
- [最佳实践](#最佳实践)

## 工具架构概述

ProtoTool 的工具系统采用插件化架构，每个工具都是一个独立的模块，实现 `BaseTool` 接口。

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

### 工具特性

工具可以：
- 处理各种数据格式（Hex、ASCII、Binary、JSON 等）
- 支持多种网络协议（TCP、UDP、WebSocket、MQTT 等）
- 提供可视化界面和程序化调用接口
- 与会话系统集成，提供上下文感知功能

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

  // 辅助方法
  private processData(data: string): string {
    // 实现数据处理逻辑
    return data.toUpperCase();
  }
}
```

### 2. 定义工具类型

```typescript
// types/toolbox.ts

export interface BaseTool {
  // 基本信息
  id: string;
  name: string;
  description: string;
  version: string;
  category: ToolCategory;
  icon: React.ComponentType;
  author?: string;

  // 能力声明
  supportedFormats?: DataFormat[];
  supportedProtocols?: ProtocolType[];
  requiresConnection?: boolean;
  canProcessStreaming?: boolean;

  // 配置
  defaultConfig?: Record<string, any>;

  // 生命周期
  initialize?(context: ToolContext): Promise<void>;
  execute(input: ToolInput): Promise<ToolOutput>;
  cleanup?(): Promise<void>;

  // UI
  renderUI?(container: HTMLElement, context: ToolContext): React.ReactElement;
}

export type ToolCategory = 
  | 'converter'    // 转换工具
  | 'encoder'      // 编码工具
  | 'analyzer'     // 分析工具
  | 'generator'    // 生成工具
  | 'utility';     // 实用工具

export type DataFormat = 
  | 'hex' | 'ascii' | 'binary' | 'json' | 'xml' | 'base64';

export type ProtocolType = 
  | 'TCP' | 'UDP' | 'WebSocket' | 'MQTT' | 'SSE' | 'Custom';
```

## 工具接口规范

### ToolInput

```typescript
export interface ToolInput {
  data?: string;              // 输入数据
  format?: DataFormat;        // 数据格式
  config?: Record<string, any>; // 工具配置
  context?: {
    sessionId?: string;       // 会话 ID
    connectionType?: string;  // 连接类型
    protocol?: string;        // 协议名称
  };
}
```

### ToolOutput

```typescript
export interface ToolOutput {
  data?: string;              // 输出数据
  format?: DataFormat;        // 输出格式
  result?: string;            // 结果描述
  error?: string;             // 错误信息
  metadata?: Record<string, any>; // 元数据
}
```

### ToolContext

```typescript
export interface ToolContext {
  sessionId?: string;
  connectionType?: string;
  protocol?: string;
  onDataSend?: (data: string, format: DataFormat) => void;
  onError?: (error: string) => void;
}
```

## UI 组件开发

### 1. 创建工具 UI 组件

```typescript
import React, { useState } from 'react';
import { Button, Input, Select } from '@/components/ui';

interface MyToolUIProps {
  tool: MyCustomTool;
  context: ToolContext;
}

export const MyToolUI: React.FC<MyToolUIProps> = ({ tool, context }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [format, setFormat] = useState<DataFormat>('ascii');

  const handleExecute = async () => {
    const result = await tool.execute({
      data: input,
      format,
      context
    });

    if (result.error) {
      context.onError?.(result.error);
    } else {
      setOutput(result.data || '');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label>输入数据</label>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入数据..."
        />
      </div>

      <div>
        <label>数据格式</label>
        <Select value={format} onChange={setFormat}>
          <option value="ascii">ASCII</option>
          <option value="hex">Hex</option>
          <option value="binary">Binary</option>
        </Select>
      </div>

      <Button onClick={handleExecute}>
        执行
      </Button>

      <div>
        <label>输出结果</label>
        <Input
          value={output}
          readOnly
          placeholder="输出结果..."
        />
      </div>
    </div>
  );
};
```

### 2. 使用 UI 组件库

ProtoTool 提供了一套 UI 组件库：

```typescript
import {
  Button,
  Input,
  Select,
  Checkbox,
  Radio,
  Textarea,
  Card,
  Tabs,
  Modal,
  Toast
} from '@/components/ui';
```

## 集成与注册

### 1. 注册工具

```typescript
// src/tools/index.ts

import { MyCustomTool } from './MyCustomTool';
import { ToolRegistry } from '@/services/ToolRegistry';

// 注册工具
ToolRegistry.register(new MyCustomTool());

// 或批量注册
ToolRegistry.registerAll([
  new MyCustomTool(),
  new AnotherTool(),
  // ...
]);
```

### 2. 工具注册表

```typescript
// services/ToolRegistry.ts

class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map();

  register(tool: BaseTool): void {
    if (this.tools.has(tool.id)) {
      console.warn(`Tool ${tool.id} already registered`);
      return;
    }
    this.tools.set(tool.id, tool);
  }

  get(id: string): BaseTool | undefined {
    return this.tools.get(id);
  }

  getAll(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: ToolCategory): BaseTool[] {
    return this.getAll().filter(tool => tool.category === category);
  }
}

export const toolRegistry = new ToolRegistry();
```

## 测试工具

### 1. 单元测试

```typescript
// __tests__/MyCustomTool.test.ts

import { describe, it, expect } from 'vitest';
import { MyCustomTool } from '../MyCustomTool';

describe('MyCustomTool', () => {
  const tool = new MyCustomTool();

  it('should have correct metadata', () => {
    expect(tool.id).toBe('my-custom-tool');
    expect(tool.name).toBe('我的自定义工具');
    expect(tool.category).toBe('utility');
  });

  it('should process data correctly', async () => {
    const result = await tool.execute({
      data: 'test',
      format: 'ascii'
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toBe('TEST');
  });

  it('should handle errors', async () => {
    const result = await tool.execute({
      data: null as any,
      format: 'ascii'
    });

    expect(result.error).toBeDefined();
  });
});
```

### 2. 集成测试

```typescript
// __tests__/integration/ToolIntegration.test.ts

import { describe, it, expect } from 'vitest';
import { toolRegistry } from '@/services/ToolRegistry';
import { MyCustomTool } from '@/tools/MyCustomTool';

describe('Tool Integration', () => {
  it('should register tool successfully', () => {
    const tool = new MyCustomTool();
    toolRegistry.register(tool);

    const registered = toolRegistry.get(tool.id);
    expect(registered).toBeDefined();
    expect(registered?.id).toBe(tool.id);
  });

  it('should execute tool through registry', async () => {
    const tool = toolRegistry.get('my-custom-tool');
    expect(tool).toBeDefined();

    const result = await tool!.execute({
      data: 'test',
      format: 'ascii'
    });

    expect(result.error).toBeUndefined();
  });
});
```

## 最佳实践

### 1. 错误处理

```typescript
async execute(input: ToolInput): Promise<ToolOutput> {
  try {
    // 验证输入
    if (!input.data) {
      throw new Error('Input data is required');
    }

    // 处理数据
    const result = this.processData(input.data);

    return {
      data: result,
      format: input.format,
      result: 'Success'
    };
  } catch (error) {
    // 记录错误
    console.error('Tool execution failed:', error);

    // 返回友好的错误信息
    return {
      error: error instanceof Error 
        ? error.message 
        : 'Unknown error occurred'
    };
  }
}
```

### 2. 性能优化

```typescript
class MyCustomTool implements BaseTool {
  private cache: Map<string, string> = new Map();

  async execute(input: ToolInput): Promise<ToolOutput> {
    // 使用缓存
    const cacheKey = `${input.data}_${input.format}`;
    if (this.cache.has(cacheKey)) {
      return {
        data: this.cache.get(cacheKey),
        format: input.format
      };
    }

    // 处理数据
    const result = await this.processData(input.data!);

    // 缓存结果
    this.cache.set(cacheKey, result);

    return {
      data: result,
      format: input.format
    };
  }

  async cleanup(): Promise<void> {
    // 清理缓存
    this.cache.clear();
  }
}
```

### 3. 配置管理

```typescript
class MyCustomTool implements BaseTool {
  defaultConfig = {
    maxLength: 1000,
    encoding: 'utf8',
    timeout: 5000
  };

  async execute(input: ToolInput): Promise<ToolOutput> {
    // 合并配置
    const config = {
      ...this.defaultConfig,
      ...input.config
    };

    // 使用配置
    if (input.data!.length > config.maxLength) {
      return {
        error: `Data exceeds maximum length of ${config.maxLength}`
      };
    }

    // ...
  }
}
```

### 4. 上下文感知

```typescript
async execute(input: ToolInput): Promise<ToolOutput> {
  const { context } = input;

  // 根据连接类型调整行为
  if (context?.connectionType === 'TCP') {
    // TCP 特定处理
  } else if (context?.connectionType === 'UDP') {
    // UDP 特定处理
  }

  // 根据协议调整行为
  if (context?.protocol === 'modbus') {
    // Modbus 特定处理
  }

  // ...
}
```

## 示例工具

### 1. 数据转换工具

```typescript
class HexConverter implements BaseTool {
  id = 'hex-converter';
  name = 'Hex 转换器';
  description = '在 Hex 和 ASCII 之间转换';
  category = 'converter' as const;
  
  async execute(input: ToolInput): Promise<ToolOutput> {
    if (input.format === 'hex') {
      // Hex to ASCII
      const ascii = Buffer.from(input.data!, 'hex').toString('ascii');
      return { data: ascii, format: 'ascii' };
    } else {
      // ASCII to Hex
      const hex = Buffer.from(input.data!, 'ascii').toString('hex');
      return { data: hex, format: 'hex' };
    }
  }
}
```

### 2. 数据生成工具

```typescript
class DataGenerator implements BaseTool {
  id = 'data-generator';
  name = '数据生成器';
  description = '生成测试数据';
  category = 'generator' as const;
  
  async execute(input: ToolInput): Promise<ToolOutput> {
    const { config } = input;
    const length = config?.length || 100;
    const pattern = config?.pattern || 'random';
    
    let data: string;
    if (pattern === 'random') {
      data = this.generateRandom(length);
    } else if (pattern === 'sequential') {
      data = this.generateSequential(length);
    } else {
      data = pattern.repeat(Math.ceil(length / pattern.length)).slice(0, length);
    }
    
    return { data, format: 'ascii' };
  }
  
  private generateRandom(length: number): string {
    return Array.from({ length }, () => 
      String.fromCharCode(Math.floor(Math.random() * 26) + 97)
    ).join('');
  }
  
  private generateSequential(length: number): string {
    return Array.from({ length }, (_, i) => (i % 10).toString()).join('');
  }
}
```

## 相关资源

- [[Plugin Development|Plugin-Development]] - 插件开发指南
- [[Building From Source|Building-From-Source]] - 从源码构建
- [[Contributing|Contributing]] - 贡献指南
- [TypeScript 文档](https://www.typescriptlang.org/)
- [React 文档](https://react.dev/)

---

**上一页**: [[Plugin Development|Plugin-Development]] | **下一页**: [[Contributing|Contributing]]

