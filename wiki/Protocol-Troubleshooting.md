# 协议问题排查

本指南帮助您诊断和解决协议相关的问题。

## 目录

- [安装协议时的问题](#安装协议时的问题)
- [协议解析问题](#协议解析问题)
- [协议验证问题](#协议验证问题)
- [常见错误](#常见错误)
- [调试技巧](#调试技巧)

## 安装协议时的问题

### 错误：缺少帧定义

**错误信息**:
```
协议定义不完整：缺少帧定义（framing）配置。
协议必须包含以下配置之一：
1. 分隔符模式（delimiters）：使用 header/footer 定义帧边界
2. 长度字段模式（length）：使用长度字段指示帧大小
3. 固定大小模式（fixed）：使用固定大小的帧
```

**原因**: 协议文件不完整，缺少必需的 `framing` 配置。

**解决方案**:

#### 方案 1：联系协议作者

1. 在 GitHub 仓库中找到该协议文件
2. 提交 Issue 报告问题
3. 说明缺少 framing 配置
4. 等待作者更新

#### 方案 2：手动修复协议文件

1. **下载协议文件**
   - 访问 [协议商店](https://github.com/chenqi92/keke-proto-tool-shop)
   - 找到对应的协议文件
   - 下载到本地

2. **添加 framing 配置**

   根据协议类型选择合适的 framing 模式：

   **分隔符模式**（适用于文本协议）:
   ```yaml
   framing:
     mode: delimiters
     header: "##"
     footer: "\r\n"
   ```

   **长度字段模式**（适用于二进制协议）:
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

   **固定大小模式**（适用于固定格式协议）:
   ```yaml
   framing:
     mode: fixed
     size: 1024
   ```

3. **手动导入协议**
   - 打开应用
   - 进入"协议仓库" → "协议插件"
   - 点击"导入协议"按钮
   - 选择修复后的协议文件
   - 验证导入成功

### 错误：YAML 语法错误

**错误信息**:
```
YAML parse error: ...
```

**原因**: 协议文件的 YAML 语法不正确。

**解决方案**:

1. **检查缩进**
   - YAML 使用空格缩进（不是 Tab）
   - 每级缩进 2 个空格
   - 确保缩进一致

2. **检查冒号**
   - 冒号后面必须有空格
   - 正确：`name: "value"`
   - 错误：`name:"value"`

3. **检查引号**
   - 字符串值建议使用引号
   - 特殊字符必须使用引号
   - 引号必须成对

4. **使用 YAML 验证工具**
   - 在线工具：http://www.yamllint.com/
   - 粘贴协议文件内容
   - 查看错误提示

### 错误：KPT 语法错误

**错误信息**:
```
Parse error: ...
```

**原因**: 协议文件的 KPT 语法不正确。

**解决方案**:

1. **检查大括号**
   - 每个块必须有开始和结束大括号
   - 大括号必须成对

2. **检查引号**
   - 字符串值必须使用引号
   - 引号必须成对

3. **检查关键字**
   - 使用正确的关键字（protocol, frame, field 等）
   - 关键字区分大小写

4. **参考示例**
   - 查看 [[Protocol Format Guide|Protocol-Format-Guide]]
   - 参考完整的 KPT 示例

## 协议解析问题

### 问题：无法识别帧边界

**症状**: 数据接收后无法正确分帧。

**可能原因**:

1. **分隔符配置错误**
   - header/footer 不匹配实际数据
   - 编码方式不正确

2. **长度字段配置错误**
   - 长度字段位置不正确
   - 长度字段大小不正确
   - 字节序不正确

3. **固定大小配置错误**
   - 大小设置不正确

**解决方案**:

1. **查看原始数据**
   - 在会话中查看十六进制数据
   - 确认实际的帧边界

2. **验证分隔符**
   ```yaml
   # 示例：如果数据是 "##data\r\n"
   framing:
     mode: delimiters
     header: "##"
     footer: "\r\n"
   ```

3. **验证长度字段**
   ```yaml
   # 示例：如果长度字段在第 4 字节，2 字节大端
   framing:
     mode: length
     length:
       at: 4
       size: 2
       encoding: big_endian
       includes: payload
   ```

4. **使用调试模式**
   - 启用详细日志
   - 查看帧解析过程
   - 定位问题所在

### 问题：字段解析错误

**症状**: 字段值不正确或无法解析。

**可能原因**:

1. **字段位置错误**
   - `at` 参数不正确
   - 偏移量计算错误

2. **字段大小错误**
   - `size` 参数不正确
   - 超出数据范围

3. **编码方式错误**
   - `encoding` 参数不匹配实际编码
   - 字节序不正确

**解决方案**:

1. **验证字段定义**
   ```yaml
   fields:
     - name: field1
       at: 0        # 从第 0 字节开始
       size: 4      # 4 字节
       encoding: utf8  # UTF-8 编码
   ```

2. **检查数据对齐**
   - 确认字段边界
   - 检查是否有填充字节

3. **测试不同编码**
   - 尝试不同的编码方式
   - 查看哪种编码能正确解析

4. **使用十六进制查看**
   - 查看原始字节
   - 手动验证字段值

## 协议验证问题

### 验证检查清单

使用以下清单验证协议文件：

- [ ] 文件包含 `meta` 或 `metadata` 部分
- [ ] 文件包含 `framing` 或 `frame` 部分
- [ ] framing 部分指定了 `mode`
- [ ] 根据 mode，包含相应的配置：
  - **delimiters**: 需要 `header` 和/或 `footer`
  - **length**: 需要 `length` 配置（at, size, encoding）
  - **fixed**: 需要 `size`
- [ ] YAML/KPT 语法正确
- [ ] 所有必需字段都已填写

### 完整协议示例

**YAML 格式**:
```yaml
meta:
  name: "My Protocol"
  version: "1.0.0"
  author: "Author"
  description: "Description"
  category: "general"

framing:
  mode: delimiters
  header: "##"
  footer: "\r\n"

fields:
  - name: data
    at: 0
    size: 100
    encoding: utf8
```

**KPT 格式**:
```
protocol "my-protocol" {
  title "My Protocol"
  version "1.0.0"
  description "Description"
  
  frame {
    mode delimiters
    header "##"
    footer "\r\n"
  }
  
  field "data" {
    at +0
    size 100
    encoding utf8
  }
}
```

## 常见错误

### Q1: 为什么协议商店中的协议不完整？

**A**: 可能的原因：
1. 协议作者只上传了元数据，还未完成完整定义
2. 协议文件在上传时出现错误
3. 协议正在开发中，尚未完成

### Q2: 如何知道协议应该使用哪种 framing 模式？

**A**: 根据协议的特点判断：

- **分隔符模式（delimiters）**
  - 协议使用特定字符标识帧的开始和结束
  - 例如：`##...data...\r\n`
  - 适用于：文本协议、行协议

- **长度字段模式（length）**
  - 协议在帧头包含长度字段
  - 例如：`[2字节长度][数据]`
  - 适用于：二进制协议、Modbus、自定义协议

- **固定大小模式（fixed）**
  - 所有帧都是固定大小
  - 例如：每帧固定 1024 字节
  - 适用于：固定格式协议、某些工业协议

### Q3: 验证逻辑是否会误判？

**A**: 当前的验证逻辑检查以下关键字：
- `framing:` 或 `frame {`
- `mode:` 或 `mode `
- `delimiters:` 或 `header:` 或 `footer:`
- `length:` 或 `length at`
- `fixed_size:` 或 `size:`

如果协议文件使用了不同的关键字或格式，可能会误判。如果遇到这种情况，请报告给开发团队。

### Q4: 可以跳过验证直接导入吗？

**A**: 不建议。验证是为了：
1. 提前发现问题，避免后端解析失败
2. 提供友好的错误提示
3. 保护系统稳定性

如果确实需要导入特殊格式的协议，可以：
1. 联系开发团队添加支持
2. 修改协议文件以符合标准格式

## 调试技巧

### 1. 查看浏览器控制台

打开开发者工具（F12），查看控制台输出：

```javascript
// 应该能看到类似的日志：
Importing protocol: XXX
Original content length: XXX
Content preview: ...
Validating protocol content...
Validation checks: {
  hasFramingSection: false,  // ← 如果是 false，说明缺少 framing
  hasDelimiters: false,
  hasLength: false,
  hasFixedSize: false,
  hasMode: false
}
```

### 2. 启用详细日志

在应用设置中启用详细日志：

1. 打开设置
2. 找到"调试"选项
3. 启用"详细日志"
4. 重新尝试操作
5. 查看日志输出

### 3. 使用测试数据

创建简单的测试数据验证协议：

```
# 测试分隔符协议
##test data\r\n

# 测试长度字段协议（十六进制）
00 00 00 0A 74 65 73 74 20 64 61 74 61
```

### 4. 逐步验证

1. 先验证 framing 配置
2. 再验证 fields 配置
3. 最后验证完整协议

### 5. 对比工作示例

参考已经工作的协议：

- HJ212-2017 协议
- Modbus TCP 协议
- 其他已安装的协议

## 贡献协议到商店

如果您想向协议商店贡献协议，请确保：

### 1. 协议文件完整

```yaml
# ✅ 必需部分
meta:
  name: "协议名称"
  version: "1.0.0"
  author: "作者"
  description: "描述"
  category: "分类"

# ✅ 必需部分
framing:
  mode: delimiters  # 或 length、fixed
  header: "##"
  footer: "\r\n"

# ✅ 推荐部分
fields:
  - name: field1
    at: 0
    size: 10
    encoding: utf8
```

### 2. 测试验证

在提交前：
1. 在本地导入测试
2. 验证能否正确解析数据
3. 检查所有字段定义是否正确

### 3. 提交 PR

1. Fork 协议商店仓库
2. 添加您的协议文件
3. 提交 Pull Request
4. 在 PR 描述中说明：
   - 协议用途
   - 测试情况
   - 参考资料

## 获取帮助

如果以上方法都无法解决问题：

1. **查看文档**
   - [[Protocol Format Guide|Protocol-Format-Guide]] - 格式指南
   - [[Protocol System|Protocol-System]] - 协议系统概述

2. **提交 Issue**
   - 仓库：https://github.com/chenqi92/keke-proto-tool
   - 包含：错误信息、协议文件（如果可以）、控制台日志

3. **联系开发团队**
   - 通过 GitHub Issue
   - 提供详细的错误信息和复现步骤

## 相关资源

- [[Protocol System|Protocol-System]] - 协议系统概述
- [[Protocol Format Guide|Protocol-Format-Guide]] - 协议格式规范
- [[Protocol Store|Protocol-Store]] - 协议商店使用
- [协议商店 GitHub](https://github.com/chenqi92/keke-proto-tool-shop)
- [主项目 GitHub](https://github.com/chenqi92/keke-proto-tool)

---

**上一页**: [[Protocol Store|Protocol-Store]] | **下一页**: [[Plugin Development|Plugin-Development]]

