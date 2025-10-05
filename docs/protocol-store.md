# 协议商店功能

## 概述

协议商店功能允许用户从 GitHub 仓库浏览和下载协议定义文件，无需手动下载和导入。

## GitHub 仓库

- **仓库地址**: https://github.com/chenqi92/keke-proto-tool-shop
- **协议格式**: `.kkp.yaml`, `.kpt`, `.yaml`

## 功能特性

### 1. 协议浏览

- 从 GitHub 仓库自动获取所有可用协议
- 显示协议的详细信息：
  - 协议名称
  - 版本号
  - 作者
  - 描述
  - 分类
  - 标签

### 2. 搜索和筛选

- **搜索**: 支持按协议名称、描述、分类、标签搜索
- **分类筛选**: 按协议分类筛选显示
- **已安装标识**: 自动标识已安装的协议

### 3. 协议安装

- 一键下载并安装协议
- 自动导入到本地协议仓库
- 安装后自动刷新已安装列表
- 显示安装进度和状态

### 4. 缓存机制

- 协议列表缓存 5 分钟
- 减少 GitHub API 调用次数
- 支持手动刷新

## 使用方法

### 访问协议商店

1. 打开应用程序
2. 点击左侧导航栏的"协议仓库"标签
3. 在顶部选择"协议商店"标签页

### 浏览协议

1. 协议以卡片形式展示
2. 每个卡片显示协议的基本信息
3. 点击卡片可查看更多详情

### 搜索协议

1. 在搜索框中输入关键词
2. 支持搜索协议名称、描述、分类、标签
3. 实时过滤显示结果

### 筛选协议

1. 点击分类按钮筛选特定分类的协议
2. 点击"全部"显示所有协议
3. 每个分类按钮显示该分类的协议数量

### 安装协议

1. 找到需要的协议
2. 点击"安装"按钮
3. 等待下载和安装完成
4. 安装成功后会显示"已安装"标识
5. 可在"已安装协议"标签页中查看和管理

### 刷新协议列表

1. 点击右上角的"刷新"按钮
2. 强制从 GitHub 重新获取最新协议列表
3. 清除缓存并更新显示

## 协议文件格式

### YAML 格式 (.kkp.yaml)

```yaml
meta:
  name: "协议名称"
  version: "1.0.0"
  author: "作者名称"
  description: "协议描述"
  category: "分类"

framing:
  # 帧同步规则
  ...

fields:
  # 字段定义
  ...
```

### KPT 格式 (.kpt)

```
protocol "protocol-id" {
  title "协议名称"
  version "1.0.0"
  description "协议描述"
  
  frame {
    # 帧同步规则
    ...
  }
  
  message "msg-type" {
    # 消息定义
    ...
  }
}
```

## 技术实现

### 前端组件

- **ProtocolStore.tsx**: 协议商店 UI 组件
  - 协议列表展示
  - 搜索和筛选功能
  - 安装操作界面

- **ProtocolPluginManager.tsx**: 协议仓库管理器
  - 标签页切换（已安装/商店）
  - 协议管理功能集成

### 服务层

- **ProtocolStoreService.ts**: 协议商店服务
  - GitHub API 调用
  - 协议元数据解析
  - 缓存管理
  - 搜索和筛选逻辑

- **ProtocolRepositoryService.ts**: 协议仓库服务
  - 协议导入
  - 本地存储管理
  - 协议列表查询

### GitHub API 使用

```typescript
// 获取仓库内容
GET https://api.github.com/repos/chenqi92/keke-proto-tool-shop/contents

// 下载文件内容
GET https://raw.githubusercontent.com/chenqi92/keke-proto-tool-shop/main/{filename}
```

## 注意事项

1. **网络连接**: 需要网络连接才能访问 GitHub 仓库
2. **API 限制**: GitHub API 有速率限制（未认证：60次/小时）
3. **协议格式**: 只支持 `.kkp.yaml`, `.kpt`, `.yaml` 格式
4. **协议验证**: 安装前会验证协议格式的正确性
5. **重复安装**: 已安装的协议会显示"已安装"标识，无法重复安装

## 错误处理

- **网络错误**: 显示 Toast 错误提示
- **解析错误**: 跳过无法解析的协议文件
- **安装失败**: 显示详细错误信息
- **API 限制**: 提示用户稍后重试

## 未来改进

1. **协议评分**: 添加用户评分和评论功能
2. **协议更新**: 检测已安装协议的更新
3. **协议预览**: 安装前预览协议内容
4. **批量安装**: 支持批量选择和安装
5. **离线模式**: 支持离线浏览已缓存的协议
6. **协议推荐**: 基于使用情况推荐相关协议
7. **GitHub 认证**: 支持 GitHub Token 提高 API 限制

## 相关文件

- `src/services/ProtocolStoreService.ts` - 协议商店服务
- `src/components/plugins/ProtocolStore.tsx` - 协议商店组件
- `src/components/plugins/ProtocolPluginManager.tsx` - 协议管理器
- `src/services/ProtocolRepositoryService.ts` - 协议仓库服务
- `docs/proto.md` - KPT 协议格式规范

