# 协议系统

ProtoTool 的协议系统提供强大的协议解析和生成功能，支持多种协议格式和自定义扩展。

## 目录

- [协议系统概述](#协议系统概述)
- [协议格式](#协议格式)
- [协议商店](#协议商店)
- [协议管理](#协议管理)
- [使用协议](#使用协议)
- [创建自定义协议](#创建自定义协议)

## 协议系统概述

### 核心功能

- **协议识别**: 自动识别网络报文的协议类型
- **协议解析**: 将原始字节流解析为结构化数据
- **协议生成**: 根据结构化数据生成原始字节流
- **协议验证**: 验证报文的完整性和正确性

### 支持的协议格式

ProtoTool 支持两种协议定义格式：

1. **YAML 格式** (`.kkp.yaml`)
   - 声明式配置
   - 易于阅读和编辑
   - 适合简单到中等复杂度的协议

2. **KPT 格式** (`.kpt`)
   - 专用协议定义语言
   - 更强大的表达能力
   - 适合复杂协议

详见 [[Protocol Format Guide|Protocol-Format-Guide]]。

### 协议组成

一个完整的协议定义包含：

1. **元数据（Meta）**
   - 协议名称、版本、作者
   - 描述、分类、标签

2. **帧定义（Framing）** ⚠️ 必需
   - 分隔符模式
   - 长度字段模式
   - 固定大小模式

3. **字段定义（Fields）**
   - 字段名称、位置、大小
   - 数据类型、编码方式
   - 验证规则

4. **校验规则（Validation）**
   - CRC/校验和
   - 范围检查
   - 自定义验证

## 协议格式

### YAML 格式示例

```yaml
meta:
  name: "HJ212-2017"
  version: "1.0.0"
  author: "Environmental Team"
  description: "HJ212-2017 环保数据传输协议"
  category: "environmental"

framing:
  mode: delimiters
  header: "##"
  footer: "\r\n"

fields:
  - name: data_length
    at: 0
    size: 4
    encoding: dec_ascii
    description: "数据段长度"
  
  - name: data_segment
    at: 4
    size_from: data_length
    encoding: utf8
    description: "数据段内容"
```

### KPT 格式示例

```
protocol "modbus-tcp" {
  title "Modbus TCP"
  version "1.0.0"
  description "Modbus TCP 工业通信协议"
  
  frame {
    mode length
    header "00 00"
    length at +4 size 2 encoding big_endian includes payload
  }
  
  field "transaction_id" {
    at +0
    size 2
    encoding big_endian
    description "事务标识符"
  }
  
  field "function_code" {
    at +7
    size 1
    encoding uint8
    description "功能码"
  }
}
```

## 协议商店

详见 [[Protocol Store|Protocol-Store]]。

### 访问协议商店

1. 点击左侧导航栏的"协议仓库"
2. 切换到"协议商店"标签
3. 浏览可用的协议

### 浏览协议

协议商店提供：
- **搜索功能**: 按名称、描述、标签搜索
- **分类筛选**: 按协议分类筛选
- **详细信息**: 查看协议的详细信息
- **安装状态**: 显示已安装的协议

### 安装协议

1. 在协议商店中找到需要的协议
2. 点击"安装"按钮
3. 等待下载和安装完成
4. 在"已安装协议"标签中查看

### 协议分类

- **environmental**: 环保协议（如 HJ212）
- **industrial**: 工业协议（如 Modbus）
- **iot**: 物联网协议
- **network**: 网络协议
- **custom**: 自定义协议

## 协议管理

### 已安装协议

在"协议仓库"的"已安装协议"标签中可以：
- 查看所有已安装的协议
- 查看协议详细信息
- 导出协议文件
- 删除协议

### 导入协议

**从文件导入**：
1. 点击"导入协议"按钮
2. 选择协议文件（.kkp.yaml 或 .kpt）
3. 验证协议格式
4. 确认导入

**从协议商店安装**：
- 直接从协议商店一键安装

### 导出协议

1. 在已安装协议列表中选择协议
2. 点击"导出"按钮
3. 选择保存位置
4. 协议文件将被导出

### 删除协议

1. 在已安装协议列表中选择协议
2. 点击"删除"按钮
3. 确认删除操作

⚠️ 注意：删除协议不会影响已使用该协议的会话。

## 使用协议

### 在会话中应用协议

1. 打开一个活动会话
2. 点击"选择协议"按钮
3. 从列表中选择协议
4. 协议自动应用到新接收的数据

### 查看解析结果

解析结果以树形结构显示：

```
📦 消息 #1
├─ 📄 header: "##"
├─ 🔢 data_length: 100
├─ 📝 data_segment: "..."
└─ ✓ crc: 0xABCD (验证通过)
```

每个字段显示：
- 字段名称
- 解析后的值
- 数据类型
- 字节偏移和长度
- 验证状态

### 解析选项

**自动解析**：
- 接收数据时自动解析
- 实时显示解析结果

**手动解析**：
- 选择数据后手动触发解析
- 适合调试和测试

**容错模式**：
- 严格模式：解析失败时报错
- 宽松模式：尽可能解析，忽略错误
- 保留原始：解析失败时保留原始数据

## 创建自定义协议

详见 [[Creating Protocols|Creating-Protocols]]。

### 创建步骤

1. **确定协议规范**
   - 帧结构
   - 字段定义
   - 校验规则

2. **选择格式**
   - YAML 格式（推荐新手）
   - KPT 格式（高级用户）

3. **编写协议文件**
   - 定义元数据
   - 定义帧结构
   - 定义字段
   - 添加验证规则

4. **测试协议**
   - 导入协议
   - 使用测试数据验证
   - 调试和优化

5. **分享协议**
   - 导出协议文件
   - 提交到协议商店

### 协议文件要求

一个有效的协议文件必须包含：

✅ **必需部分**：
- 元数据（meta）
- 帧定义（framing）

✅ **推荐部分**：
- 字段定义（fields）
- 验证规则（validation）

✅ **可选部分**：
- 示例数据（examples）
- 测试用例（tests）

### 帧定义模式

**分隔符模式**：
```yaml
framing:
  mode: delimiters
  header: "##"
  footer: "\r\n"
```

**长度字段模式**：
```yaml
framing:
  mode: length
  header: "00 00"
  length:
    at: 4
    size: 2
    encoding: big_endian
    includes: payload
```

**固定大小模式**：
```yaml
framing:
  mode: fixed
  size: 1024
```

## 协议调试

### 使用协议解析器工具

1. 打开工具箱中的"协议解析器"
2. 选择要测试的协议
3. 输入测试数据
4. 查看解析结果
5. 调试和修改协议

### 常见问题

**解析失败**：
- 检查帧定义是否正确
- 验证字段偏移和大小
- 查看错误日志

**字段值不正确**：
- 检查编码方式
- 验证字节序（大端/小端）
- 确认字段位置

**校验失败**：
- 验证校验算法
- 检查校验范围
- 确认校验字段位置

详见 [[Protocol Troubleshooting|Protocol-Troubleshooting]]。

## 高级功能

### 协议插件

使用 WASM 插件扩展协议功能：
- 复杂的解析逻辑
- 自定义校验算法
- 数据加密/解密
- 压缩/解压缩

详见 [[Plugin Development|Plugin-Development]]。

### 协议组合

支持组合多个协议：
- 传输层协议 + 应用层协议
- 协议栈解析
- 多阶段解析

### AI 辅助

- 自动推断协议结构
- 协议识别
- 异常检测
- 字段建议

## 相关资源

- [[Protocol Format Guide|Protocol-Format-Guide]] - 协议格式详细指南
- [[Protocol Store|Protocol-Store]] - 协议商店使用指南
- [[Creating Protocols|Creating-Protocols]] - 创建协议教程
- [[Protocol Troubleshooting|Protocol-Troubleshooting]] - 协议问题排查
- [协议商店仓库](https://github.com/chenqi92/keke-proto-tool-shop) - 协议文件仓库

## 贡献协议

欢迎向协议商店贡献协议！

1. Fork [协议商店仓库](https://github.com/chenqi92/keke-proto-tool-shop)
2. 添加您的协议文件
3. 提交 Pull Request
4. 等待审核

详见协议商店的贡献指南。

---

**上一页**: [[User Guide|User-Guide]] | **下一页**: [[Protocol Format Guide|Protocol-Format-Guide]]

