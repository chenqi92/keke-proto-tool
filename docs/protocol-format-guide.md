# 协议格式指南

## 问题说明

如果在协议商店安装协议时遇到以下错误：

```
协议定义不完整：缺少帧定义（framing）配置。
协议必须包含以下配置之一：
1. 分隔符模式（delimiters）：使用 header/footer 定义帧边界
2. 长度字段模式（length）：使用长度字段指示帧大小
3. 固定大小模式（fixed）：使用固定大小的帧
```

这说明协议文件缺少必需的 **framing（帧定义）** 配置。

## 协议文件要求

一个完整的协议文件必须包含：

### 1. 元数据部分（Meta）
- 协议名称（name）
- 版本号（version）
- 作者（author）
- 描述（description）
- 分类（category）

### 2. 帧定义部分（Framing）⚠️ **必需**
至少包含以下三种模式之一：
- **分隔符模式**：使用特定字符或字节序列分隔帧
- **长度字段模式**：使用长度字段指示帧大小
- **固定大小模式**：使用固定大小的帧

## 协议格式示例

### YAML 格式

#### 示例 1：分隔符模式（Delimiters）

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
```

#### 示例 2：长度字段模式（Length Field）

```yaml
meta:
  name: "Modbus TCP"
  version: "1.0.0"
  author: "Industrial Team"
  description: "Modbus TCP 工业协议"
  category: "industrial"

framing:
  mode: length
  header: "00 00"
  length:
    at: 4
    size: 2
    encoding: big_endian
    includes: payload
```

#### 示例 3：固定大小模式（Fixed Size）

```yaml
meta:
  name: "Fixed Frame Protocol"
  version: "1.0.0"
  author: "Network Team"
  description: "固定帧大小协议"
  category: "network"

framing:
  mode: fixed
  size: 1024
```

### KPT 格式

#### 示例 1：分隔符模式

```
protocol "hj212-2017" {
  title "HJ212-2017 环保数据传输协议"
  version "1.0.0"
  description "用于环保数据采集传输的标准协议"
  
  frame {
    mode delimiters
    header "##"
    footer "\r\n"
  }
  
  field "data_length" {
    at +0
    size 4
    encoding dec_ascii
  }
  
  field "payload" {
    at +4
    size_from "data_length"
    encoding utf8
  }
}
```

#### 示例 2：长度字段模式

```
protocol "modbus-tcp" {
  title "Modbus TCP"
  version "1.0.0"
  description "Modbus TCP 工业协议"
  
  frame {
    mode length
    header "00 00"
    length at +4 size 2 encoding big_endian includes payload
  }
  
  field "transaction_id" {
    at +0
    size 2
    encoding big_endian
  }
  
  field "protocol_id" {
    at +2
    size 2
    encoding big_endian
  }
  
  field "length" {
    at +4
    size 2
    encoding big_endian
  }
  
  field "unit_id" {
    at +6
    size 1
    encoding uint8
  }
  
  field "function_code" {
    at +7
    size 1
    encoding uint8
  }
}
```

#### 示例 3：固定大小模式

```
protocol "fixed-frame" {
  title "固定帧大小协议"
  version "1.0.0"
  description "使用固定大小帧的协议"
  
  frame {
    mode fixed
    size 1024
  }
  
  field "header" {
    at +0
    size 4
    encoding hex
  }
  
  field "data" {
    at +4
    size 1016
    encoding bytes
  }
  
  field "checksum" {
    at +1020
    size 4
    encoding crc32
  }
}
```

## 完整协议示例

### HJ212-2017 完整示例（YAML）

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

### Modbus TCP 完整示例（KPT）

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

## 常见错误和解决方法

### 错误 1：缺少 framing 部分

**错误信息：**
```
协议定义不完整：缺少帧定义（framing）配置
```

**原因：**
协议文件只包含元数据，没有 framing 配置。

**解决方法：**
添加 framing 部分，指定帧定义模式。

**修改前：**
```yaml
meta:
  name: "My Protocol"
  version: "1.0.0"
```

**修改后：**
```yaml
meta:
  name: "My Protocol"
  version: "1.0.0"

framing:
  mode: delimiters
  header: "##"
  footer: "\r\n"
```

### 错误 2：framing 部分不完整

**错误信息：**
```
Parse error: At least one framing method must be specified
```

**原因：**
framing 部分存在，但缺少必要的配置字段。

**解决方法：**
根据选择的模式，添加相应的配置字段。

**分隔符模式需要：**
- `mode: delimiters`
- `header` 和/或 `footer`

**长度字段模式需要：**
- `mode: length`
- `length` 配置（at, size, encoding）

**固定大小模式需要：**
- `mode: fixed`
- `size`

## 验证协议文件

在上传到协议商店之前，请确保：

1. ✅ 包含完整的 meta 部分
2. ✅ 包含完整的 framing 部分
3. ✅ framing 模式正确配置
4. ✅ 所有必需字段都已填写
5. ✅ 语法正确（YAML 或 KPT）

## 协议商店要求

如果您要向协议商店贡献协议，请确保：

1. **文件命名**
   - YAML 格式：`protocol-name.kkp.yaml` 或 `protocol-name.yaml`
   - KPT 格式：`protocol-name.kpt`

2. **文件内容**
   - 包含完整的元数据
   - 包含完整的 framing 配置
   - 添加详细的描述和注释
   - 提供使用示例

3. **测试验证**
   - 在本地测试协议是否能正确导入
   - 验证协议能否正确解析数据
   - 确保没有语法错误

## 获取帮助

如果您在创建协议时遇到问题：

1. 参考本文档中的示例
2. 查看现有的协议文件
3. 在 GitHub 仓库提交 Issue
4. 联系开发团队获取支持

## 相关资源

- [协议仓库 GitHub](https://github.com/chenqi92/keke-proto-tool-shop)
- [协议格式规范](./protocol-specification.md)
- [KPT 语法指南](./kpt-syntax-guide.md)
- [YAML 格式指南](./yaml-format-guide.md)

