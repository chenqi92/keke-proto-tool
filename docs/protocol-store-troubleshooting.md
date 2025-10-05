# 协议商店故障排除指南

## 问题：安装协议时出现 "缺少帧定义" 错误

### 错误信息

```
协议定义不完整：缺少帧定义（framing）配置。
协议必须包含以下配置之一：
1. 分隔符模式（delimiters）：使用 header/footer 定义帧边界
2. 长度字段模式（length）：使用长度字段指示帧大小
3. 固定大小模式（fixed）：使用固定大小的帧
```

或者：

```
Parse error: At least one framing method must be specified (delimiters, length field, or fixed size)
```

### 原因分析

这个错误表明从协议商店下载的协议文件**不完整**，缺少必需的 `framing`（帧定义）配置。

协议文件可能只包含元数据（meta），而没有实际的协议定义部分。

### 解决方案

#### 方案 1：联系协议作者更新协议文件

1. 在 GitHub 仓库中找到该协议文件
2. 提交 Issue 报告问题
3. 说明缺少 framing 配置
4. 等待作者更新

#### 方案 2：手动下载并修复协议文件

1. **下载协议文件**
   - 访问 [协议商店 GitHub 仓库](https://github.com/chenqi92/keke-proto-tool-shop)
   - 找到对应的协议文件
   - 下载到本地

2. **添加 framing 配置**
   
   根据协议的实际需求，添加相应的 framing 配置：

   **示例 1：如果协议使用分隔符**
   ```yaml
   framing:
     mode: delimiters
     header: "##"
     footer: "\r\n"
   ```

   **示例 2：如果协议使用长度字段**
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

   **示例 3：如果协议使用固定大小**
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

#### 方案 3：使用示例协议模板

我们提供了完整的协议模板，您可以参考：

- `docs/example-protocol.kkp.yaml` - 完整的 YAML 格式示例
- `docs/protocol-format-guide.md` - 详细的格式指南

## 调试步骤

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
Validation failed: 协议定义不完整...
```

### 2. 检查协议文件内容

如果您有权限访问协议文件，检查其内容：

**不完整的协议文件（会导致错误）：**
```yaml
meta:
  name: "My Protocol"
  version: "1.0.0"
  author: "Author"
  description: "Description"
  category: "general"

# ❌ 缺少 framing 部分！
```

**完整的协议文件（可以正常导入）：**
```yaml
meta:
  name: "My Protocol"
  version: "1.0.0"
  author: "Author"
  description: "Description"
  category: "general"

# ✅ 包含 framing 配置
framing:
  mode: delimiters
  header: "##"
  footer: "\r\n"

# ✅ 可选：字段定义
fields:
  - name: data
    at: 0
    size: 100
    encoding: utf8
```

### 3. 验证协议格式

使用以下检查清单验证协议文件：

- [ ] 文件包含 `meta` 或 `metadata` 部分
- [ ] 文件包含 `framing` 或 `frame` 部分
- [ ] framing 部分指定了 `mode`（delimiters/length/fixed）
- [ ] 根据 mode，包含相应的配置：
  - delimiters: 需要 `header` 和/或 `footer`
  - length: 需要 `length` 配置（at, size, encoding）
  - fixed: 需要 `size`
- [ ] YAML 语法正确（缩进、冒号、引号）
- [ ] KPT 语法正确（大括号、分号）

## 常见问题

### Q1: 为什么协议商店中的协议不完整？

**A:** 可能的原因：
1. 协议作者只上传了元数据，还未完成完整定义
2. 协议文件在上传时出现错误
3. 协议正在开发中，尚未完成

### Q2: 我可以自己修复协议文件吗？

**A:** 可以！步骤如下：
1. 下载协议文件
2. 根据协议的实际需求添加 framing 配置
3. 手动导入到应用中
4. 如果修复成功，可以向原仓库提交 PR

### Q3: 如何知道协议应该使用哪种 framing 模式？

**A:** 根据协议的特点判断：

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

### Q4: 验证逻辑是否会误判？

**A:** 当前的验证逻辑检查以下关键字：
- `framing:` 或 `frame {`
- `mode:` 或 `mode `
- `delimiters:` 或 `header:` 或 `footer:`
- `length:` 或 `length at`
- `fixed_size:` 或 `size:`

如果协议文件使用了不同的关键字或格式，可能会误判。如果遇到这种情况，请报告给开发团队。

### Q5: 可以跳过验证直接导入吗？

**A:** 不建议。验证是为了：
1. 提前发现问题，避免后端解析失败
2. 提供友好的错误提示
3. 保护系统稳定性

如果确实需要导入特殊格式的协议，可以：
1. 联系开发团队添加支持
2. 修改协议文件以符合标准格式

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
   - `docs/protocol-format-guide.md` - 格式指南
   - `docs/example-protocol.kkp.yaml` - 示例协议

2. **提交 Issue**
   - 仓库：https://github.com/chenqi92/keke-proto-tool
   - 包含：错误信息、协议文件（如果可以）、控制台日志

3. **联系开发团队**
   - 通过 GitHub Issue
   - 提供详细的错误信息和复现步骤

## 相关资源

- [协议格式指南](./protocol-format-guide.md)
- [示例协议文件](./example-protocol.kkp.yaml)
- [协议商店 GitHub](https://github.com/chenqi92/keke-proto-tool-shop)
- [主项目 GitHub](https://github.com/chenqi92/keke-proto-tool)

