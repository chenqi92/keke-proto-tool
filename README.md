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

### 🔥 最新版本 v0.0.7

#### Windows 系统
- **推荐**: [MSI 安装包 (x64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.7/ProtoTool_0.0.5_x64_en-US.msi)
- **推荐**: [MSI 安装包 (x86)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.7/ProtoTool_0.0.5_x86_en-US.msi)
- [NSIS 安装包 (x64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.7/ProtoTool_0.0.5_x64-setup.exe)
- [NSIS 安装包 (x86)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.7/ProtoTool_0.0.5_x86-setup.exe)

#### macOS 系统
- [Intel 芯片 (x64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.7/ProtoTool_0.0.5_x64.dmg)
- [Apple Silicon (ARM64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.7/ProtoTool_0.0.5_aarch64.dmg)

#### Linux 系统
- **通用**: [AppImage (x64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.7/proto-tool_0.0.5_amd64.AppImage)
- **通用**: [AppImage (ARM64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.7/proto-tool_0.0.5_arm64.AppImage)
- **Ubuntu/Debian**: [DEB 包 (x64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.7/proto-tool_0.0.5_amd64.deb)
- **Ubuntu/Debian**: [DEB 包 (ARM64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.7/proto-tool_0.0.5_arm64.deb)
- **RHEL/CentOS**: [RPM 包 (x64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.7/proto-tool-0.0.5-1.x86_64.rpm)
- **RHEL/CentOS**: [RPM 包 (ARM64)](https://github.com/chenqi92/keke-proto-tool/releases/download/v0.0.7/proto-tool-0.0.5-1.aarch64.rpm)

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

### 网络连接管理
- TCP 客户端/服务端连接
- UDP 单播/广播通信
- 串口通信支持
- 连接状态监控和自动重连

### 协议解析引擎
- 基于 YAML 的声明式规则定义
- 支持帧同步、字段解析、校验
- 位段操作和条件解析
- 协议自动识别

### 插件系统
- WASM 沙箱安全隔离
- 插件包 (.kkpplug) 管理
- 支持解析、生成、AI 等多种插件类型
- 数字签名验证

### 数据管理
- 实时数据存储和索引
- 历史数据归档
- KQL 风格查询语言
- 自然语言查询支持

### AI 功能
- 自然语言转查询 DSL
- 协议规则自动生成
- 异常检测和分析
- 数据脱敏建议

## 📚 文档

- [开发计划](./development-plan/README.md) - 详细的开发计划和里程碑
- [项目结构](./development-plan/project-structure.md) - 项目代码结构说明
- [插件开发指南](./Plug-in-development.md) - 插件开发文档
- [系统设计文档](./develop.md) - 完整的系统设计说明

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

## 🗺️ 开发路线图

- [x] **阶段 1**: 项目基础设施 (v0.1.0-alpha)
- [ ] **阶段 2**: 核心架构 (v0.2.0-alpha)
- [ ] **阶段 3**: 基础功能 (v0.3.0-alpha)
- [ ] **阶段 4**: 解析系统 (v0.4.0-beta)
- [ ] **阶段 5**: 用户界面 (v0.5.0-beta)
- [ ] **阶段 6**: 数据管理 (v0.6.0-beta)
- [ ] **阶段 7**: 插件系统 (v0.7.0-rc)
- [ ] **阶段 8**: 高级功能 (v0.8.0-rc)
- [ ] **阶段 9**: 打包发布 (v1.0.0)

详细的开发计划请查看 [里程碑文档](./development-plan/milestones.md)。

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
