# 插件开发指南

本指南介绍如何为 ProtoTool 开发 .kkpplug 插件，扩展协议解析、生成和 AI 功能。

## 目录

- [插件概述](#插件概述)
- [开发环境](#开发环境)
- [插件结构](#插件结构)
- [Manifest 规范](#manifest-规范)
- [接口契约](#接口契约)
- [开发流程](#开发流程)
- [测试和调试](#测试和调试)
- [打包和发布](#打包和发布)

## 插件概述

### 什么是插件

**.kkpplug** 是 ProtoTool 的标准插件封装格式，用于扩展：

- **协议识别**（guess）：自动识别协议类型
- **报文解析**（decode）：解析原始字节流
- **报文生成**（encode）：生成原始字节流
- **数据变换**（transform/enrich）：数据转换和富化
- **AI 能力**：自然语言处理、协议推断、异常检测等

### 运行环境

- **推荐 ABI**: wasm32-wasi（WASI 预览版）
- **支持架构**: x86_64 / arm64
- **沙箱**: WASM 沙箱运行时，安全隔离
- **性能**: 支持多实例并行

### 插件优势

- ✅ **跨平台**: 一次编写，到处运行
- ✅ **安全**: 沙箱隔离，权限控制
- ✅ **高性能**: 接近原生性能
- ✅ **易分发**: 单文件封装
- ✅ **可审计**: 代码可审查

## 开发环境

### 环境要求

- **Rust**: 1.70+ （推荐使用 rustup）
- **wasm32-wasi target**: 
  ```bash
  rustup target add wasm32-wasi
  ```
- **开发工具**:
  - cargo
  - wasm-pack（可选）
  - wasmtime（用于本地测试）

### 安装工具

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 添加 WASM 目标
rustup target add wasm32-wasi

# 安装 wasmtime（用于测试）
curl https://wasmtime.dev/install.sh -sSf | bash
```

## 插件结构

### 文件结构

```
my-plugin.kkpplug (ZIP 容器)
├── manifest.toml          # 插件清单（必需）
├── plugin.wasm            # WASM 二进制（必需）
├── logo.png               # 插件图标（推荐）
├── rules/                 # 配套规则文件（可选）
│   └── protocol.kkp.yaml
├── examples/              # 示例数据（可选）
│   └── sample.bin
├── tests/                 # 测试用例（可选）
│   └── test_vectors.json
└── sig/                   # 签名文件（可选）
    └── signature.sig
```

### 命名规范

- **文件名**: `<vendor>.<name>-<version>.kkpplug`
  - 例: `kkape.hj212-1.0.0.kkpplug`
- **插件 ID**: 反向域名风格
  - 例: `com.kkape.hj212`

## Manifest 规范

### 基本结构

```toml
[meta]
id = "com.vendor.plugin"
name = "插件名称"
version = "1.0.0"
description = "插件描述"
author = "作者名称"
homepage = "https://example.com"
license = "MIT"

[entry]
kind = "wasm"
path = "plugin.wasm"

[compat]
core_min_version = "0.1.0"
abi = "wasm32-wasi-preview1"

[capabilities]
decode = true
encode = true
guess = true
transform = false
enrich = false

[capabilities.ai]
nl2dsl = false
infer_schema = false
summarize = false
detect_anomaly = false
suggest_redaction = false

[permissions]
fs_read = false
fs_write = false
net_dns = false
net_http = false
clock = true
rand = true
mem_max_mb = 128
cpu_time_ms = 1000

[ui]
config_schema = "config_schema.json"

[resources]
icons = ["logo.png"]
examples = ["examples/"]

[signature]
public_key_fingerprint = "SHA256:..."
```

### 必要字段

| 字段 | 说明 |
|------|------|
| `meta.id` | 插件唯一标识 |
| `meta.name` | 显示名称 |
| `meta.version` | 版本号（SemVer） |
| `meta.description` | 描述 |
| `meta.author` | 作者 |
| `entry.kind` | 入口类型（wasm/dynamic） |
| `entry.path` | 二进制路径 |
| `compat.core_min_version` | 最低核心版本 |
| `compat.abi` | ABI 标识 |
| `capabilities` | 能力声明 |
| `permissions` | 权限请求 |

### 能力声明

```toml
[capabilities]
decode = true          # 报文解析
encode = true          # 报文生成
guess = true           # 协议识别
transform = false      # 数据变换
enrich = false         # 数据富化

[capabilities.ai]
nl2dsl = false         # 自然语言转 DSL
infer_schema = false   # 推断协议结构
summarize = false      # 数据摘要
detect_anomaly = false # 异常检测
suggest_redaction = false # 脱敏建议
```

### 权限声明

```toml
[permissions]
fs_read = false        # 文件系统读
fs_write = false       # 文件系统写
net_dns = false        # DNS 查询
net_http = false       # HTTP 访问
clock = true           # 时间访问
rand = true            # 随机数
mem_max_mb = 128       # 最大内存（MB）
cpu_time_ms = 1000     # CPU 时间限制（ms）
```

## 接口契约

### 协议识别（guess）

**功能**: 判断数据是否匹配该协议

**输入**:
- 原始字节视图（首 N 字节）
- 上下文信息（方向、端口、历史统计）

**输出**:
- 评分（0.0-1.0）：越高表示越可能匹配

**性能要求**:
- 平均 ≤ 100 微秒/调用
- 不得扫描过长数据
- 不得阻塞 I/O

### 报文解析（decode）

**功能**: 将原始字节流解析为结构化数据

**输入**:
- 时间戳、方向、源/宿端标识
- 原始字节块（可能含半包/粘包）
- 会话上下文句柄

**输出**:
- 拆出的帧集合（起止偏移、长度、校验结果）
- 结构化消息集合（字段树）
- 解析诊断（错误类别、严重性）

**要求**:
- 支持半包累积与粘包切分
- 校验失败需返回明确错误原因
- 支持容错策略

### 报文生成（encode）

**功能**: 根据结构化数据生成原始字节流

**输入**:
- 结构化字段树或键值对
- 生成策略（转义/校验/长度含义/编码）

**输出**:
- 原始字节序列
- 生成诊断

**要求**:
- 与 decode 对偶
- 保证 round-trip 一致性

### 数据变换（transform/enrich）

**功能**: 增强或转换结构化数据

**输入**:
- 结构化消息
- 可选字典/外部资源

**输出**:
- 增强后的消息（新增字段、单位换算、标签）

**权限**:
- 访问外部资源需声明权限

### AI 任务

**nl2dsl**: 自然语言 → 查询 DSL
**infer_schema**: 样本 → 规则草案
**summarize**: 消息切片 → 摘要
**detect_anomaly**: 切片 → 异常项列表
**suggest_redaction**: 切片 → 脱敏方案

## 开发流程

### 1. 创建项目

```bash
# 创建新项目
cargo new --lib my-plugin
cd my-plugin

# 配置 Cargo.toml
```

**Cargo.toml**:
```toml
[package]
name = "my-plugin"
version = "1.0.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
# 添加依赖...

[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
```

### 2. 实现接口

**src/lib.rs**:
```rust
// 导出函数示例
#[no_mangle]
pub extern "C" fn guess(data: *const u8, len: usize) -> f32 {
    // 实现协议识别逻辑
    // 返回 0.0-1.0 的评分
    0.0
}

#[no_mangle]
pub extern "C" fn decode(
    data: *const u8,
    len: usize,
    output: *mut u8,
    output_len: *mut usize
) -> i32 {
    // 实现解析逻辑
    // 返回 0 表示成功，非 0 表示错误
    0
}

#[no_mangle]
pub extern "C" fn encode(
    input: *const u8,
    input_len: usize,
    output: *mut u8,
    output_len: *mut usize
) -> i32 {
    // 实现生成逻辑
    0
}
```

### 3. 编译为 WASM

```bash
# 编译为 WASM
cargo build --target wasm32-wasi --release

# 输出位置
# target/wasm32-wasi/release/my_plugin.wasm
```

### 4. 创建 Manifest

创建 `manifest.toml` 文件，填写插件信息。

### 5. 打包插件

```bash
# 创建 ZIP 容器
zip -r my-plugin.kkpplug \
    manifest.toml \
    plugin.wasm \
    logo.png \
    rules/ \
    examples/
```

## 测试和调试

### 本地测试

使用 wasmtime 测试 WASM 模块：

```bash
# 运行 WASM 模块
wasmtime target/wasm32-wasi/release/my_plugin.wasm

# 调试模式
wasmtime --invoke guess target/wasm32-wasi/release/my_plugin.wasm
```

### 集成测试

1. 将插件导入 ProtoTool
2. 创建测试会话
3. 使用测试数据验证
4. 检查解析结果
5. 查看日志和错误

### 性能测试

- **guess**: 测试识别速度（目标 ≤ 100μs）
- **decode**: 测试解析吞吐量
- **内存**: 监控内存使用
- **并发**: 测试多实例并行

### 调试技巧

1. **日志输出**: 使用 `eprintln!` 输出调试信息
2. **断言**: 使用 `assert!` 验证假设
3. **单元测试**: 编写 Rust 单元测试
4. **边界测试**: 测试边界条件和异常输入

## 打包和发布

### 打包步骤

1. **准备文件**:
   - 编译 WASM 二进制
   - 创建 manifest.toml
   - 准备图标和资源
   - 编写示例和测试

2. **创建容器**:
   ```bash
   zip -r vendor.plugin-1.0.0.kkpplug \
       manifest.toml \
       plugin.wasm \
       logo.png \
       rules/ \
       examples/ \
       tests/
   ```

3. **验证插件**:
   - 在 ProtoTool 中导入测试
   - 验证所有功能
   - 检查性能指标

4. **生成校验和**:
   ```bash
   sha256sum vendor.plugin-1.0.0.kkpplug > checksums.txt
   ```

### 发布渠道

1. **GitHub Release**:
   - 创建 Release
   - 上传 .kkpplug 文件
   - 附加 Release Notes

2. **企业插件仓库**:
   - 提交到企业内部仓库
   - 等待审核

3. **公共市场**:
   - 提交到插件市场
   - 填写插件信息
   - 等待审核

### 版本管理

遵循 SemVer 规范：
- **主版本**: 破坏性变更
- **次版本**: 新功能（向后兼容）
- **修订版本**: Bug 修复

## 最佳实践

### 性能优化

1. **减少分配**: 使用栈分配，避免频繁堆分配
2. **流式处理**: 增量处理数据，避免一次性加载
3. **缓存结果**: 缓存计算结果
4. **并发友好**: 设计为无状态或线程安全

### 安全考虑

1. **最小权限**: 只请求必需的权限
2. **输入验证**: 验证所有输入数据
3. **错误处理**: 优雅处理错误，不崩溃
4. **资源限制**: 遵守内存和 CPU 限制

### 代码质量

1. **单元测试**: 编写充分的单元测试
2. **文档注释**: 添加清晰的文档注释
3. **错误信息**: 提供有用的错误信息
4. **代码审查**: 进行代码审查

## 示例插件

查看以下示例插件：

- **HJ212 插件**: 环保协议解析
- **Modbus 插件**: 工业协议解析
- **JSON 插件**: JSON 数据处理

## 相关资源

- [[Tool Development|Tool-Development]] - 工具开发指南
- [[API Reference|API-Reference]] - API 参考
- [WASM 文档](https://webassembly.org/)
- [WASI 文档](https://wasi.dev/)

## 获取帮助

- [GitHub Issues](https://github.com/chenqi92/keke-proto-tool/issues)
- [Discussions](https://github.com/chenqi92/keke-proto-tool/discussions)
- 开发者社区

---

**上一页**: [[Protocol System|Protocol-System]] | **下一页**: [[Tool Development|Tool-Development]]

