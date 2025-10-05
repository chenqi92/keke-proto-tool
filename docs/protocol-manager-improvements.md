# 协议管理器改进说明

## 修改内容

### 1. 移除协议仓库中的标签页切换 ✅

**问题：**
- 协议仓库（ProtocolPluginManager）中有"已安装协议"和"协议商店"两个标签页
- 但在上一级（PluginsPage）已经有"协议插件"和"协议商店"的标签切换
- 造成了重复的导航层级

**解决方案：**
- 移除了 ProtocolPluginManager 中的 Tabs 组件
- 直接显示已安装协议列表
- 标题改为"协议插件"以更准确地反映功能
- 保留了所有原有功能（刷新、导入、搜索、筛选等）

**修改的文件：**
- `src/components/plugins/ProtocolPluginManager.tsx`
  - 移除了 `Tabs`, `TabsList`, `TabsTrigger` 相关导入
  - 移除了 `Package`, `HardDrive` 图标导入
  - 移除了 `ProtocolStore` 组件导入
  - 移除了 `activeTab` 状态
  - 移除了标签页切换 UI
  - 简化了布局结构

**现在的导航结构：**
```
协议仓库（PluginsPage）
├── 协议插件（ProtocolPluginManager）
│   └── 显示已安装协议列表
├── 协议商店（ProtocolStore）
│   └── 显示在线协议商店
├── 协议设置
└── 因子翻译演示
```

### 2. 改进协议导入错误提示 ✅

**问题：**
- 从协议商店下载的协议可能不完整（缺少 framing 配置）
- 后端导入时报错：`Parse error: At least one framing method must be specified`
- 错误信息不够友好，用户不知道如何解决

**解决方案：**
- 在导入前验证协议内容
- 检查是否包含必需的 framing 配置
- 提供更友好的中文错误提示
- 清理和简化错误消息

**修改的文件：**
- `src/services/ProtocolRepositoryService.ts`
  - 添加了 `validateProtocolContent()` 方法
  - 在 `importProtocol()` 中调用验证
  - 改进了错误消息处理

**验证逻辑：**
```typescript
private validateProtocolContent(content: string): { valid: boolean; error?: string } {
  // 检查是否包含帧定义配置
  const hasFraming = content.includes('framing:') || 
                     content.includes('frame {') ||
                     content.includes('delimiters:') ||
                     content.includes('length:') ||
                     content.includes('fixed_size:');
  
  if (!hasFraming) {
    return {
      valid: false,
      error: '协议定义不完整：缺少帧定义（framing）配置。协议必须指定分隔符、长度字段或固定大小中的至少一种帧定义方式。'
    };
  }

  return { valid: true };
}
```

**错误提示改进：**

**之前：**
```
Failed to import protocol: Failed to import protocol: Parse error: At least one framing method must be specified (delimiters, length field, or fixed size)
```

**现在：**
```
协议定义不完整：缺少帧定义（framing）配置。协议必须指定分隔符、长度字段或固定大小中的至少一种帧定义方式。
```

## 使用说明

### 访问协议插件

1. 打开应用
2. 点击左侧导航栏的"协议仓库"标签
3. 点击顶部的"协议插件"标签
4. 查看和管理已安装的协议

### 访问协议商店

1. 打开应用
2. 点击左侧导航栏的"协议仓库"标签
3. 点击顶部的"协议商店"标签
4. 浏览和安装在线协议

### 协议要求

从协议商店安装的协议必须包含完整的协议定义，包括：

#### 必需配置

1. **帧定义（Framing）** - 至少包含以下之一：
   - **分隔符（Delimiters）**：使用特定字符或字节序列分隔帧
   - **长度字段（Length Field）**：使用长度字段指示帧大小
   - **固定大小（Fixed Size）**：使用固定大小的帧

#### YAML 格式示例

```yaml
meta:
  name: "示例协议"
  version: "1.0.0"
  author: "作者名"
  description: "协议描述"
  category: "general"

framing:
  mode: delimiters
  header: "##"
  footer: "\r\n"

# 或使用长度字段
framing:
  mode: length
  header: "##"
  length:
    at: 0
    size: 4
    encoding: dec_ascii
    includes: payload

# 或使用固定大小
framing:
  mode: fixed
  size: 1024
```

#### KPT 格式示例

```
protocol "example" {
  title "示例协议"
  version "1.0.0"
  description "协议描述"
  
  frame {
    mode delimiters
    header "##"
    footer "\r\n"
  }
  
  # 或使用长度字段
  frame {
    mode length
    header "##"
    length at +0 size 4 encoding dec_ascii includes payload
  }
  
  # 或使用固定大小
  frame {
    mode fixed
    size 1024
  }
}
```

## 常见问题

### Q1: 为什么协议安装失败？

**可能原因：**
1. 协议定义不完整，缺少 framing 配置
2. 协议格式不正确
3. 网络连接问题

**解决方法：**
1. 检查错误提示信息
2. 确认协议文件包含完整的 framing 定义
3. 如果是从协议商店下载，联系协议作者更新协议定义
4. 尝试手动下载协议文件并检查内容

### Q2: 如何创建符合要求的协议？

**步骤：**
1. 参考上面的示例格式
2. 确保包含 `meta` 或 `metadata` 部分
3. 必须包含 `framing` 或 `frame` 配置
4. 指定至少一种帧定义方式
5. 测试协议是否能正确导入

### Q3: 协议商店中的协议不完整怎么办？

**解决方法：**
1. 在 GitHub 仓库中提交 Issue 报告问题
2. 如果有能力，可以提交 PR 修复协议定义
3. 联系协议作者更新协议文件
4. 暂时使用其他完整的协议

## 技术细节

### 协议验证流程

```
用户点击安装
    ↓
下载协议内容（ProtocolStoreService）
    ↓
调用 importProtocol（ProtocolRepositoryService）
    ↓
检测格式（KPT/YAML）
    ↓
转换格式（如需要）
    ↓
验证内容（validateProtocolContent）
    ↓
检查 framing 配置
    ↓
调用后端导入（invoke 'import_protocol'）
    ↓
返回协议 ID 或错误
```

### 帧定义检测逻辑

验证函数检查以下关键字：
- `framing:` - YAML 格式的帧定义
- `frame {` - KPT 格式的帧定义
- `delimiters:` - 分隔符配置
- `length:` - 长度字段配置
- `fixed_size:` - 固定大小配置

只要包含其中任何一个，就认为协议包含帧定义。

### 错误消息处理

1. 捕获后端错误
2. 提取有意义的错误信息
3. 清理重复的错误前缀
4. 转换为用户友好的中文提示
5. 通过 Toast 通知显示

## 后续改进建议

1. **协议模板**
   - 提供协议模板生成器
   - 帮助用户快速创建符合要求的协议

2. **协议验证工具**
   - 在协议商店上传前验证
   - 提供详细的验证报告

3. **协议编辑器**
   - 可视化协议编辑界面
   - 实时验证和预览

4. **协议文档**
   - 完善协议格式文档
   - 提供更多示例

5. **错误恢复**
   - 自动修复常见错误
   - 提供修复建议

## 测试建议

### 测试场景 1：正常安装完整协议
1. 访问协议商店
2. 选择一个包含完整 framing 定义的协议
3. 点击安装
4. 验证安装成功
5. 在协议插件中查看已安装协议

### 测试场景 2：安装不完整协议
1. 访问协议商店
2. 选择一个缺少 framing 定义的协议
3. 点击安装
4. 验证显示友好的错误提示
5. 确认协议未被添加到已安装列表

### 测试场景 3：导航流程
1. 在协议仓库的不同标签间切换
2. 验证只有一层标签导航
3. 确认协议插件直接显示已安装列表
4. 确认协议商店显示在线协议

### 测试场景 4：错误恢复
1. 尝试安装失败的协议
2. 查看错误提示
3. 修复协议定义
4. 重新尝试安装
5. 验证成功安装

