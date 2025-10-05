# 协议格式指南

本指南详细介绍 ProtoTool 支持的协议定义格式和规范。

## 目录

- [协议文件要求](#协议文件要求)
- [YAML 格式](#yaml-格式)
- [KPT 格式](#kpt-格式)
- [帧定义模式](#帧定义模式)
- [字段定义](#字段定义)
- [数据类型和编码](#数据类型和编码)
- [验证规则](#验证规则)
- [完整示例](#完整示例)

## 协议文件要求

### 必需部分

一个完整的协议文件必须包含：

1. **元数据部分（Meta）**
   - 协议名称（name）
   - 版本号（version）
   - 作者（author）
   - 描述（description）
   - 分类（category）

2. **帧定义部分（Framing）** ⚠️ **必需**
   - 至少包含以下三种模式之一：
     - 分隔符模式（delimiters）
     - 长度字段模式（length）
     - 固定大小模式（fixed）

### 推荐部分

- **字段定义（Fields）**: 定义协议字段
- **验证规则（Validation）**: 定义校验规则
- **示例数据（Examples）**: 提供测试数据

## YAML 格式

### 基本结构

```yaml
meta:
  name: "协议名称"
  version: "1.0.0"
  author: "作者名称"
  description: "协议描述"
  category: "分类"
  tags:
    - tag1
    - tag2

framing:
  mode: delimiters  # 或 length、fixed
  # 模式特定配置...

fields:
  - name: field1
    at: 0
    size: 4
    encoding: utf8
    description: "字段描述"

validation:
  checksum:
    algorithm: crc16
    field: crc
    range:
      start: 0
      end: -4
```

### 元数据字段

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 协议名称 |
| `version` | string | ✅ | 版本号（SemVer） |
| `author` | string | ✅ | 作者或组织 |
| `description` | string | ✅ | 协议描述 |
| `category` | string | ✅ | 分类（environmental/industrial/iot/network/custom） |
| `tags` | array | ❌ | 标签列表 |
| `homepage` | string | ❌ | 项目主页 |
| `license` | string | ❌ | 许可证 |

### 分类说明

- `environmental`: 环保协议（如 HJ212）
- `industrial`: 工业协议（如 Modbus）
- `iot`: 物联网协议
- `network`: 网络协议
- `custom`: 自定义协议

## KPT 格式

### 基本结构

```
protocol "protocol-id" {
  title "协议名称"
  version "1.0.0"
  description "协议描述"
  author "作者名称"
  category "分类"
  
  frame {
    mode delimiters
    header "##"
    footer "\r\n"
  }
  
  field "field1" {
    at +0
    size 4
    encoding utf8
    description "字段描述"
  }
}
```

### KPT 语法特点

- 使用大括号 `{}` 定义块
- 使用引号定义字符串
- 支持相对偏移（`+0`, `+4`）
- 更紧凑的语法

## 帧定义模式

### 分隔符模式（Delimiters）

使用特定字符或字节序列标识帧的开始和结束。

**YAML 格式**：
```yaml
framing:
  mode: delimiters
  header: "##"          # 帧头（可选）
  footer: "\r\n"        # 帧尾（可选）
```

**KPT 格式**：
```
frame {
  mode delimiters
  header "##"
  footer "\r\n"
}
```

**适用场景**：
- 文本协议
- 行协议
- 使用特定分隔符的协议

**示例协议**：
- HJ212-2017（`##...data...\r\n`）
- HTTP（`\r\n\r\n` 分隔头和体）

### 长度字段模式（Length Field）

使用长度字段指示帧的大小。

**YAML 格式**：
```yaml
framing:
  mode: length
  header: "00 00"       # 可选的固定帧头
  length:
    at: 4               # 长度字段的偏移
    size: 2             # 长度字段的大小（字节）
    encoding: big_endian  # 编码方式
    includes: payload   # 长度包含的范围
```

**KPT 格式**：
```
frame {
  mode length
  header "00 00"
  length at +4 size 2 encoding big_endian includes payload
}
```

**长度包含范围**：
- `payload`: 仅数据部分
- `header`: 包含帧头
- `all`: 包含整个帧

**适用场景**：
- 二进制协议
- 工业协议
- 自定义协议

**示例协议**：
- Modbus TCP
- 自定义二进制协议

### 固定大小模式（Fixed Size）

所有帧都是固定大小。

**YAML 格式**：
```yaml
framing:
  mode: fixed
  size: 1024            # 固定帧大小（字节）
```

**KPT 格式**：
```
frame {
  mode fixed
  size 1024
}
```

**适用场景**：
- 固定格式协议
- 某些工业协议
- 简单的数据包协议

## 字段定义

### 字段属性

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 字段名称 |
| `at` | integer | ✅ | 字段偏移（字节） |
| `size` | integer | ✅* | 字段大小（字节） |
| `size_from` | string | ✅* | 从其他字段获取大小 |
| `encoding` | string | ✅ | 编码方式 |
| `description` | string | ❌ | 字段描述 |
| `optional` | boolean | ❌ | 是否可选 |
| `default` | any | ❌ | 默认值 |

\* `size` 和 `size_from` 二选一

### 偏移方式

**绝对偏移**：
```yaml
fields:
  - name: field1
    at: 0      # 从帧开始的绝对偏移
    size: 4
```

**相对偏移**（KPT）：
```
field "field1" {
  at +0        # 相对于前一个字段
  size 4
}
```

**负偏移**（从末尾）：
```yaml
fields:
  - name: crc
    at: -4     # 从帧末尾倒数第4个字节
    size: 4
```

### 动态大小

从其他字段获取大小：

```yaml
fields:
  - name: data_length
    at: 0
    size: 2
    encoding: big_endian
  
  - name: data
    at: 2
    size_from: data_length  # 大小由 data_length 字段决定
    encoding: bytes
```

## 数据类型和编码

### 整数类型

| 编码 | 说明 | 大小 |
|------|------|------|
| `uint8` | 无符号 8 位整数 | 1 字节 |
| `uint16` | 无符号 16 位整数 | 2 字节 |
| `uint32` | 无符号 32 位整数 | 4 字节 |
| `uint64` | 无符号 64 位整数 | 8 字节 |
| `int8` | 有符号 8 位整数 | 1 字节 |
| `int16` | 有符号 16 位整数 | 2 字节 |
| `int32` | 有符号 32 位整数 | 4 字节 |
| `int64` | 有符号 64 位整数 | 8 字节 |

### 字节序

| 编码 | 说明 |
|------|------|
| `big_endian` | 大端序（网络字节序） |
| `little_endian` | 小端序 |

示例：
```yaml
- name: value
  at: 0
  size: 4
  encoding: big_endian  # 或 little_endian
```

### 字符串类型

| 编码 | 说明 |
|------|------|
| `utf8` | UTF-8 编码字符串 |
| `ascii` | ASCII 字符串 |
| `gbk` | GBK 编码字符串 |
| `gb2312` | GB2312 编码字符串 |

### 特殊类型

| 编码 | 说明 |
|------|------|
| `hex` | 十六进制字符串 |
| `bytes` | 原始字节 |
| `dec_ascii` | 十进制 ASCII 表示 |
| `bcd` | BCD 编码 |

### 校验类型

| 编码 | 说明 |
|------|------|
| `crc8` | CRC-8 校验 |
| `crc16` | CRC-16 校验 |
| `crc32` | CRC-32 校验 |
| `checksum` | 简单校验和 |
| `xor` | 异或校验 |

## 验证规则

### 校验和验证

```yaml
validation:
  checksum:
    algorithm: crc16      # 校验算法
    field: crc            # 校验字段名
    range:
      start: 0            # 校验范围开始
      end: -4             # 校验范围结束（负数表示从末尾）
    polynomial: 0x1021    # 可选：自定义多项式
```

### 范围验证

```yaml
fields:
  - name: temperature
    at: 0
    size: 2
    encoding: int16
    validation:
      min: -40
      max: 125
```

### 枚举验证

```yaml
fields:
  - name: status
    at: 0
    size: 1
    encoding: uint8
    validation:
      enum: [0, 1, 2, 3]  # 允许的值
```

## 完整示例

### HJ212-2017 协议（YAML）

```yaml
meta:
  name: "HJ212-2017"
  version: "1.0.0"
  author: "Environmental Team"
  description: "HJ212-2017 环保数据传输协议"
  category: "environmental"
  tags:
    - environmental
    - pollution
    - monitoring

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
  
  - name: crc
    at: -4
    size: 4
    encoding: hex
    description: "CRC校验码"

validation:
  checksum:
    algorithm: crc16
    field: crc
    range:
      start: 0
      end: -4
```

### Modbus TCP 协议（KPT）

```
protocol "modbus-tcp" {
  title "Modbus TCP"
  version "1.0.0"
  description "Modbus TCP 工业通信协议"
  author "Industrial Automation Team"
  category "industrial"
  
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
  
  field "protocol_id" {
    at +2
    size 2
    encoding big_endian
    description "协议标识符（固定为0）"
  }
  
  field "length" {
    at +4
    size 2
    encoding big_endian
    description "后续字节长度"
  }
  
  field "unit_id" {
    at +6
    size 1
    encoding uint8
    description "单元标识符"
  }
  
  field "function_code" {
    at +7
    size 1
    encoding uint8
    description "功能码"
  }
  
  field "data" {
    at +8
    size_from "length"
    offset -2
    encoding bytes
    description "数据域"
  }
}
```

## 常见错误

### 错误 1：缺少 framing 部分

❌ **错误**：
```yaml
meta:
  name: "My Protocol"
  version: "1.0.0"
# 缺少 framing 部分
```

✅ **正确**：
```yaml
meta:
  name: "My Protocol"
  version: "1.0.0"

framing:
  mode: delimiters
  header: "##"
  footer: "\r\n"
```

### 错误 2：framing 配置不完整

❌ **错误**：
```yaml
framing:
  mode: delimiters
  # 缺少 header 或 footer
```

✅ **正确**：
```yaml
framing:
  mode: delimiters
  header: "##"
  footer: "\r\n"
```

### 错误 3：字段偏移错误

❌ **错误**：
```yaml
fields:
  - name: field1
    at: 0
    size: 4
  - name: field2
    at: 2  # 与 field1 重叠
    size: 4
```

✅ **正确**：
```yaml
fields:
  - name: field1
    at: 0
    size: 4
  - name: field2
    at: 4  # 正确的偏移
    size: 4
```

## 验证协议

在提交协议前，请确保：

- ✅ 包含完整的 meta 部分
- ✅ 包含完整的 framing 部分
- ✅ framing 模式正确配置
- ✅ 所有必需字段都已填写
- ✅ 语法正确（YAML 或 KPT）
- ✅ 字段偏移和大小正确
- ✅ 编码方式正确
- ✅ 已测试验证

## 相关资源

- [[Protocol System|Protocol-System]] - 协议系统概述
- [[Creating Protocols|Creating-Protocols]] - 创建协议教程
- [[Protocol Troubleshooting|Protocol-Troubleshooting]] - 问题排查
- [示例协议文件](https://github.com/chenqi92/keke-proto-tool-shop) - 协议商店

---

**上一页**: [[Protocol System|Protocol-System]] | **下一页**: [[Creating Protocols|Creating-Protocols]]

