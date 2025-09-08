# ProtoTool API 文档

本文档描述了 ProtoTool 的 API 接口，包括前端与后端之间的通信接口。

## 概述

ProtoTool 使用 Tauri 框架，前端通过 Tauri API 与 Rust 后端进行通信。所有的 API 调用都是异步的，返回 Promise 对象。

## 基础 API

### 应用信息

#### `get_app_version()`

获取应用版本信息。

**返回值:**
```typescript
Promise<string>
```

**示例:**
```typescript
import { invoke } from '@tauri-apps/api/core';

const version = await invoke('get_app_version');
console.log('应用版本:', version);
```

## 网络连接 API

### TCP 连接

#### `create_tcp_connection(config: TcpConfig)`

创建 TCP 连接。

**参数:**
```typescript
interface TcpConfig {
  host: string;
  port: number;
  timeout?: number;
}
```

**返回值:**
```typescript
Promise<string> // 连接 ID
```

#### `send_tcp_data(connectionId: string, data: Uint8Array)`

发送 TCP 数据。

**参数:**
- `connectionId`: 连接 ID
- `data`: 要发送的数据

**返回值:**
```typescript
Promise<void>
```

### UDP 连接

#### `create_udp_connection(config: UdpConfig)`

创建 UDP 连接。

**参数:**
```typescript
interface UdpConfig {
  local_port?: number;
  remote_host?: string;
  remote_port?: number;
}
```

**返回值:**
```typescript
Promise<string> // 连接 ID
```

## 协议解析 API

### 解析规则管理

#### `load_protocol_rules(filePath: string)`

加载协议解析规则文件。

**参数:**
- `filePath`: 规则文件路径

**返回值:**
```typescript
Promise<ProtocolRule[]>
```

#### `parse_data(data: Uint8Array, ruleId: string)`

使用指定规则解析数据。

**参数:**
- `data`: 要解析的数据
- `ruleId`: 规则 ID

**返回值:**
```typescript
Promise<ParsedData>
```

```typescript
interface ParsedData {
  fields: Record<string, any>;
  metadata: {
    timestamp: number;
    size: number;
    checksum?: string;
  };
}
```

## 数据管理 API

### 数据存储

#### `save_packet_data(packet: PacketData)`

保存数据包到数据库。

**参数:**
```typescript
interface PacketData {
  id?: string;
  timestamp: number;
  source: string;
  destination?: string;
  protocol: string;
  raw_data: Uint8Array;
  parsed_data?: ParsedData;
}
```

**返回值:**
```typescript
Promise<string> // 数据包 ID
```

#### `query_packets(query: QueryOptions)`

查询数据包。

**参数:**
```typescript
interface QueryOptions {
  start_time?: number;
  end_time?: number;
  protocol?: string;
  source?: string;
  limit?: number;
  offset?: number;
}
```

**返回值:**
```typescript
Promise<PacketData[]>
```

## 插件系统 API

### 插件管理

#### `load_plugin(pluginPath: string)`

加载插件。

**参数:**
- `pluginPath`: 插件文件路径

**返回值:**
```typescript
Promise<PluginInfo>
```

```typescript
interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  capabilities: string[];
}
```

#### `execute_plugin(pluginId: string, method: string, params: any)`

执行插件方法。

**参数:**
- `pluginId`: 插件 ID
- `method`: 方法名
- `params`: 参数

**返回值:**
```typescript
Promise<any>
```

## 事件系统

ProtoTool 使用 Tauri 的事件系统进行实时通信。

### 监听事件

```typescript
import { listen } from '@tauri-apps/api/event';

// 监听新数据包事件
const unlisten = await listen('packet-received', (event) => {
  const packet = event.payload as PacketData;
  console.log('收到新数据包:', packet);
});

// 取消监听
unlisten();
```

### 可用事件

- `packet-received`: 收到新数据包
- `connection-status-changed`: 连接状态变化
- `parsing-error`: 解析错误
- `plugin-loaded`: 插件加载完成
- `plugin-error`: 插件执行错误

## 错误处理

所有 API 调用都可能抛出错误，建议使用 try-catch 进行错误处理：

```typescript
try {
  const result = await invoke('some_api_method', { param: 'value' });
  // 处理成功结果
} catch (error) {
  console.error('API 调用失败:', error);
  // 处理错误
}
```

### 常见错误类型

- `ConnectionError`: 网络连接错误
- `ParseError`: 数据解析错误
- `PluginError`: 插件执行错误
- `ValidationError`: 参数验证错误
- `DatabaseError`: 数据库操作错误

## 类型定义

完整的 TypeScript 类型定义请参考 `src/types/api.ts` 文件。

## 示例

### 完整的数据包处理流程

```typescript
import { invoke, listen } from '@tauri-apps/api/core';

// 1. 创建连接
const connectionId = await invoke('create_tcp_connection', {
  host: '192.168.1.100',
  port: 8080
});

// 2. 监听数据包
const unlisten = await listen('packet-received', async (event) => {
  const packet = event.payload as PacketData;
  
  // 3. 解析数据包
  try {
    const parsed = await invoke('parse_data', {
      data: packet.raw_data,
      ruleId: 'modbus-tcp'
    });
    
    // 4. 保存到数据库
    await invoke('save_packet_data', {
      ...packet,
      parsed_data: parsed
    });
    
    console.log('数据包处理完成:', parsed);
  } catch (error) {
    console.error('数据包处理失败:', error);
  }
});

// 5. 发送数据
await invoke('send_tcp_data', {
  connectionId,
  data: new Uint8Array([0x01, 0x03, 0x00, 0x00, 0x00, 0x01])
});
```

## 更新日志

- **v0.1.0**: 初始 API 版本
- 后续版本的更新将在此记录

---

更多详细信息请参考源代码中的注释和类型定义。
