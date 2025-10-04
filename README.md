# ProtoTool

> 跨平台的网络报文工作站，集连接调试、协议解析、规则/插件扩展、数据筛选存储、AI 辅助与批量导出为一体

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/chenqi92/keke-proto-tool/workflows/CI/badge.svg)](https://github.com/chenqi92/keke-proto-tool/actions)
[![Release](https://img.shields.io/github/v/release/chenqi92/keke-proto-tool)](https://github.com/chenqi92/keke-proto-tool/releases)
[![Downloads](https://img.shields.io/github/downloads/chenqi92/keke-proto-tool/total)](https://github.com/chenqi92/keke-proto-tool/releases)

## 🚀 项目简介

ProtoTool 是一个专为工业/物联网/环保/交通等行业设计的网络报文分析工具，提供：

- 🔌 **多协议连接**: 支持 TCP/UDP/串口连接，可同时管理多个会话
- 📋 **智能解析**: 基于 .kkp.yaml 规则文件的协议解析引擎
- 🧩 **插件系统**: WASM 沙箱插件运行时，支持自定义协议扩展
- 🔍 **数据分析**: SQLite 热存储 + Parquet 冷存储，支持 KQL 风格查询
- 🤖 **AI 集成**: 自然语言查询、协议自动推断、异常检测
- 📊 **可视化**: 实时数据流、解析树、时间线等多种展示方式
- 🌐 **跨平台**: 支持 Windows、macOS、Linux

## 📸 界面预览

> 界面截图将在开发完成后添加

## 🛠️ 技术栈

- **后端**: Rust + Tauri
- **前端**: React + TypeScript + Tailwind CSS + shadcn/ui
- **数据库**: SQLite (热存储) + DuckDB/Parquet (冷存储)
- **插件**: WASM 运行时 (wasmtime)
- **构建**: Vite + Cargo

## 📦 快速下载

### 🔥 最新版本 v0.0.13

#### Windows 系统
- **推荐**: [MSI 安装包 (x64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.13/ProtoTool_0.0.13_x64_en-US.msi)
- **推荐**: [MSI 安装包 (x86)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.13/ProtoTool_0.0.13_x86_en-US.msi)
- [NSIS 安装包 (x64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.13/ProtoTool_0.0.13_x64-setup.exe)
- [NSIS 安装包 (x86)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.13/ProtoTool_0.0.13_x86-setup.exe)


#### macOS 系统
- [Intel 芯片 (x64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.13/ProtoTool_0.0.13_x64.dmg)
- [Apple Silicon (ARM64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.13/ProtoTool_0.0.13_aarch64.dmg)

#### Linux 系统
- **通用**: [AppImage (x64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.13/proto-tool_0.0.13_amd64.AppImage)
- **通用**: [AppImage (ARM64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.13/proto-tool_0.0.13_arm64.AppImage)
- **Ubuntu/Debian**: [DEB 包 (x64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.13/proto-tool_0.0.13_amd64.deb)
- **Ubuntu/Debian**: [DEB 包 (ARM64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.13/proto-tool_0.0.13_arm64.deb)
- **RHEL/CentOS**: [RPM 包 (x64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.13/proto-tool-0.0.13-1.x86_64.rpm)
- **RHEL/CentOS**: [RPM 包 (ARM64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.13/proto-tool-0.0.13-1.aarch64.rpm)

> 💡 **安装提示**:
> - Windows 用户推荐使用 MSI 安装包，支持自动更新
> - macOS 用户请根据芯片类型选择对应版本
> - Linux 用户推荐使用 AppImage，无需安装直接运行

### 历史版本

查看所有版本: [Releases 页面](https://github.com/chenqi92/keke-proto-tool/releases)

## 🔧 从源码构建

### 环境要求

- **Node.js**: 18.0+ (推荐使用 LTS 版本)
- **Rust**: 1.70+ (推荐使用最新稳定版)
- **系统要求**:
  - Windows: Windows 10+ (支持 WebView2)
  - macOS: macOS 10.15+
  - Linux: 支持 GTK 3.0+ 的现代发行版

### 构建步骤

```bash
# 1. 克隆仓库
git clone https://github.com/chenqi92/keke-proto-tool.git
cd keke-proto-tool

# 2. 安装前端依赖
npm install

# 3. 安装 Tauri CLI (如果尚未安装)
cargo install tauri-cli

# 4. 开发模式运行
npm run tauri:dev

# 5. 构建生产版本
npm run tauri:build
```

### 构建选项

```bash
# 构建特定平台
npm run tauri:build -- --target x86_64-pc-windows-msvc  # Windows x64
npm run tauri:build -- --target i686-pc-windows-msvc    # Windows x86
npm run tauri:build -- --target x86_64-apple-darwin     # macOS Intel
npm run tauri:build -- --target aarch64-apple-darwin    # macOS Apple Silicon

# 构建特定格式
npm run tauri:build -- --bundles msi     # Windows MSI
npm run tauri:build -- --bundles nsis    # Windows NSIS
npm run tauri:build -- --bundles deb     # Linux DEB
npm run tauri:build -- --bundles rpm     # Linux RPM
npm run tauri:build -- --bundles appimage # Linux AppImage
```

## 🎯 核心功能

### 🌐 多协议支持
ProtoTool 提供全面的网络协议支持，满足各种通信场景需求：

- **TCP 通信**：支持 TCP 客户端和服务端连接，提供可靠的数据传输
- **UDP 通信**：支持 UDP 单播、广播和组播，适用于低延迟场景
- **WebSocket**：支持标准 WebSocket 协议（ws:// 和 wss://），实现实时双向通信
- **MQTT 消息队列**：完整的 MQTT 客户端实现，支持主题订阅发布和 QoS 控制
- **SSE (Server-Sent Events)**：支持服务器推送事件流，适用于实时数据推送

### 📊 实时网络数据包分析
强大的实时分析能力，帮助您深入了解网络通信：

- **实时数据捕获**：实时显示收发数据，支持高频数据流监控
- **智能协议识别**：自动识别和解析常见网络协议
- **数据流可视化**：提供时间线、统计图表等多种数据展示方式
- **性能监控**：实时监控连接状态、延迟、吞吐量等关键指标
- **历史数据管理**：完整保存通信记录，支持历史数据查询和分析

### 🛠️ 内置工具集
丰富的网络调试和分析工具，提升工作效率：

- **报文生成器**：支持多种数据格式（文本、十六进制、Base64），可批量发送和定时发送
- **协议解析器**：自动解析 HTTP/HTTPS、JSON、XML 等常见协议和数据格式
- **数据转换器**：提供编码转换、进制转换、加密解密等数据处理功能
- **CRC 校验计算器**：支持 CRC8/16/32 等多种校验算法，可自定义参数
- **时间戳转换器**：Unix 时间戳与日期时间的相互转换，支持多时区

### 📝 会话管理和录制
完善的会话管理功能，支持复杂的测试场景：

- **多会话并发**：同时管理多个不同协议的连接会话
- **会话模板**：保存常用连接配置，快速创建新会话
- **连接状态监控**：实时显示连接状态、字节统计和活动时间
- **自动重连机制**：支持连接断开后的自动重连和重试策略
- **会话录制回放**：记录完整的通信过程，支持会话回放和分析

### 🧩 插件系统和扩展性
灵活的插件架构，支持功能扩展和定制：

- **WASM 插件运行时**：安全的沙箱环境，支持多语言插件开发
- **协议扩展插件**：支持自定义协议解析和生成插件
- **数据处理插件**：扩展数据转换和分析功能
- **插件包管理**：统一的插件安装、更新和管理机制
- **数字签名验证**：确保插件安全性和完整性

### 💻 跨平台桌面应用
基于 Tauri 构建的现代桌面应用：

- **原生性能**：Rust 后端提供高性能的网络处理能力
- **现代界面**：React + TypeScript + Tailwind CSS 构建的直观用户界面
- **系统集成**：支持系统托盘、原生菜单和快捷键
- **跨平台支持**：完整支持 Windows、macOS 和 Linux 系统
- **自动更新**：内置更新机制，确保始终使用最新版本

## 📚 文档

- [开发计划](./development-plan/README.md) - 详细的开发计划和里程碑
- [项目结构](./development-plan/project-structure.md) - 项目代码结构说明
- [插件开发指南](./Plug-in-development.md) - 插件开发文档
- [系统设计文档](./develop.md) - 完整的系统设计说明
- [MSIX 问题解决方案](./docs/MSIX_ISSUE_RESOLUTION.md) - MSIX 打包问题的解决方案

## 🤝 贡献指南

我们欢迎所有形式的贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详细信息。

### 开发环境设置

1. Fork 本仓库
2. 创建功能分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 创建 Pull Request

### 代码规范

- 使用 ESLint 和 Prettier 格式化代码
- 遵循 Rust 官方代码规范
- 提交前运行测试: `npm test`



## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](./LICENSE) 文件了解详情。

## 🙏 致谢

- [Tauri](https://tauri.app/) - 跨平台应用框架
- [React](https://reactjs.org/) - 用户界面库
- [Rust](https://www.rust-lang.org/) - 系统编程语言
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库

## 📞 联系我们

- 项目主页: [https://github.com/chenqi92/keke-proto-tool](https://github.com/chenqi92/keke-proto-tool)
- 问题反馈: [Issues](https://github.com/chenqi92/keke-proto-tool/issues)
- 讨论交流: [Discussions](https://github.com/chenqi92/keke-proto-tool/discussions)

---

<div align="center">

**如果这个项目对您有帮助，请给我们一个 ⭐️**

Made with ❤️ by ProtoTool Team

</div>
