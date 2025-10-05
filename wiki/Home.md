# ProtoTool Wiki

欢迎来到 ProtoTool 的官方 Wiki！

## 📖 关于 ProtoTool

ProtoTool 是一个专为工业/物联网/环保/交通等行业设计的跨平台网络报文分析工具，提供强大的协议解析、数据分析和可视化功能。

### 核心特性

- 🔌 **多协议连接**: 支持 TCP/UDP/WebSocket/MQTT/SSE 等多种网络协议
- 📋 **智能解析**: 基于 .kkp.yaml 规则文件的协议解析引擎
- 🧩 **插件系统**: WASM 沙箱插件运行时，支持自定义协议扩展
- 🔍 **数据分析**: SQLite 热存储 + Parquet 冷存储，支持 KQL 风格查询
- 🤖 **AI 集成**: 自然语言查询、协议自动推断、异常检测
- 📊 **可视化**: 实时数据流、解析树、时间线等多种展示方式
- 🌐 **跨平台**: 支持 Windows、macOS、Linux

### 技术栈

- **后端**: Rust + Tauri
- **前端**: React + TypeScript + Tailwind CSS + shadcn/ui
- **数据库**: SQLite (热存储) + DuckDB/Parquet (冷存储)
- **插件**: WASM 运行时 (wasmtime)

## 📚 文档导航

### 新手入门

- **[[Getting Started|Getting-Started]]** - 快速开始指南
- **[[User Guide|User-Guide]]** - 用户使用手册
- **[[FAQ]]** - 常见问题解答
- **[[Troubleshooting]]** - 故障排除指南

### 协议系统

- **[[Protocol System|Protocol-System]]** - 协议系统概述
- **[[Protocol Format Guide|Protocol-Format-Guide]]** - 协议格式规范
- **[[Protocol Store|Protocol-Store]]** - 协议商店使用指南
- **[[Creating Protocols|Creating-Protocols]]** - 创建自定义协议
- **[[Protocol Troubleshooting|Protocol-Troubleshooting]]** - 协议问题排查

### 开发者指南

- **[[Developer Guide|Developer-Guide]]** - 开发者指南
- **[[Building From Source|Building-From-Source]]** - 从源码构建
- **[[Contributing]]** - 贡献指南
- **[[Project Structure|Project-Structure]]** - 项目结构说明

### 扩展开发

- **[[Plugin Development|Plugin-Development]]** - 插件开发指南
- **[[Tool Development|Tool-Development]]** - 工具开发指南
- **[[API Reference|API-Reference]]** - API 参考文档

### 功能详解

- **[[Connection Management|Connection-Management]]** - 连接管理
- **[[Session Management|Session-Management]]** - 会话管理
- **[[Data Storage|Data-Storage]]** - 数据存储
- **[[Toolbox]]** - 工具箱功能

## 🚀 快速链接

- [GitHub 仓库](https://github.com/chenqi92/keke-proto-tool)
- [最新版本下载](https://github.com/chenqi92/keke-proto-tool/releases)
- [问题反馈](https://github.com/chenqi92/keke-proto-tool/issues)
- [讨论区](https://github.com/chenqi92/keke-proto-tool/discussions)
- [协议商店仓库](https://github.com/chenqi92/keke-proto-tool-shop)

## 💬 获取帮助

如果您在使用过程中遇到问题：

1. 查看 **[[FAQ]]** 和 **[[Troubleshooting]]** 页面
2. 搜索 [GitHub Issues](https://github.com/chenqi92/keke-proto-tool/issues)
3. 在 [Discussions](https://github.com/chenqi92/keke-proto-tool/discussions) 中提问
4. 提交新的 Issue 报告问题

## 🤝 参与贡献

我们欢迎所有形式的贡献！请查看 **[[Contributing]]** 了解如何参与项目开发。

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](https://github.com/chenqi92/keke-proto-tool/blob/main/LICENSE)。

---

**最后更新**: 2025-10-05  
**当前版本**: v0.0.13

