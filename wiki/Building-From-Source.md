# 从源码构建

本指南介绍如何从源码构建 ProtoTool。

## 目录

- [环境要求](#环境要求)
- [获取源码](#获取源码)
- [安装依赖](#安装依赖)
- [开发模式](#开发模式)
- [构建生产版本](#构建生产版本)
- [平台特定说明](#平台特定说明)
- [故障排除](#故障排除)

## 环境要求

### 必需软件

- **Node.js**: 18.0.0 或更高版本（推荐使用 LTS 版本）
- **Rust**: 1.70.0 或更高版本（推荐使用最新稳定版）
- **Git**: 最新版本

### 系统要求

#### Windows
- Windows 10 或更高版本
- Visual Studio 2019 或更高版本（或 Build Tools）
- WebView2 Runtime

#### macOS
- macOS 10.15 (Catalina) 或更高版本
- Xcode Command Line Tools

#### Linux
- 支持 GTK 3.0+ 的现代发行版
- 必需的系统库（见下文）

## 获取源码

### 克隆仓库

```bash
# 使用 HTTPS
git clone https://github.com/chenqi92/keke-proto-tool.git
cd keke-proto-tool

# 或使用 SSH
git clone git@github.com:chenqi92/keke-proto-tool.git
cd keke-proto-tool
```

### 检出特定版本

```bash
# 查看所有标签
git tag

# 检出特定版本
git checkout v0.0.13
```

## 安装依赖

### 安装 Node.js 依赖

```bash
# 使用 npm
npm install

# 或使用 pnpm（推荐）
pnpm install

# 或使用 yarn
yarn install
```

### 安装 Rust 工具链

如果尚未安装 Rust：

```bash
# 安装 rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 重新加载环境变量
source $HOME/.cargo/env
```

### 安装 Tauri CLI

```bash
# 使用 cargo 安装
cargo install tauri-cli

# 或使用 npm
npm install -g @tauri-apps/cli
```

### 平台特定依赖

#### Windows

安装 Visual Studio Build Tools：

1. 下载 [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/)
2. 安装时选择"使用 C++ 的桌面开发"工作负载

或安装完整的 Visual Studio。

#### macOS

安装 Xcode Command Line Tools：

```bash
xcode-select --install
```

#### Linux

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install -y \
    libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

**Fedora**:
```bash
sudo dnf install -y \
    webkit2gtk3-devel \
    openssl-devel \
    curl \
    wget \
    libappindicator-gtk3 \
    librsvg2-devel
```

**Arch Linux**:
```bash
sudo pacman -Syu
sudo pacman -S --needed \
    webkit2gtk \
    base-devel \
    curl \
    wget \
    openssl \
    appmenu-gtk-module \
    gtk3 \
    libappindicator-gtk3 \
    librsvg
```

## 开发模式

### 启动开发服务器

```bash
# 启动 Tauri 开发模式
npm run tauri:dev

# 或使用 pnpm
pnpm tauri:dev

# 或使用 yarn
yarn tauri:dev
```

这将：
1. 启动前端开发服务器（Vite）
2. 编译 Rust 后端
3. 启动应用程序
4. 启用热重载

### 仅启动前端

```bash
npm run dev
```

### 运行测试

```bash
# 前端测试
npm test

# 后端测试
cargo test --manifest-path src-tauri/Cargo.toml

# 测试覆盖率
npm run test:coverage
```

### 代码检查

```bash
# 前端代码检查
npm run lint

# 自动修复
npm run lint:fix

# TypeScript 类型检查
npm run type-check

# Rust 代码检查
cargo clippy --manifest-path src-tauri/Cargo.toml

# Rust 代码格式化
cargo fmt --manifest-path src-tauri/Cargo.toml
```

## 构建生产版本

### 构建所有平台

```bash
# 构建当前平台
npm run tauri:build

# 或使用 pnpm
pnpm tauri:build
```

构建产物位置：
- **Windows**: `src-tauri/target/release/bundle/`
- **macOS**: `src-tauri/target/release/bundle/`
- **Linux**: `src-tauri/target/release/bundle/`

### 构建特定格式

#### Windows

```bash
# MSI 安装包
npm run tauri:build -- --bundles msi

# NSIS 安装包
npm run tauri:build -- --bundles nsis

# 两者都构建
npm run tauri:build -- --bundles msi,nsis
```

#### macOS

```bash
# DMG 镜像
npm run tauri:build -- --bundles dmg

# App Bundle
npm run tauri:build -- --bundles app
```

#### Linux

```bash
# DEB 包
npm run tauri:build -- --bundles deb

# RPM 包
npm run tauri:build -- --bundles rpm

# AppImage
npm run tauri:build -- --bundles appimage

# 所有格式
npm run tauri:build -- --bundles deb,rpm,appimage
```

### 构建特定架构

```bash
# Windows x64
npm run tauri:build -- --target x86_64-pc-windows-msvc

# Windows x86
npm run tauri:build -- --target i686-pc-windows-msvc

# macOS Intel
npm run tauri:build -- --target x86_64-apple-darwin

# macOS Apple Silicon
npm run tauri:build -- --target aarch64-apple-darwin

# Linux x64
npm run tauri:build -- --target x86_64-unknown-linux-gnu

# Linux ARM64
npm run tauri:build -- --target aarch64-unknown-linux-gnu
```

### 优化构建

```bash
# 发布构建（优化）
npm run tauri:build

# 调试构建（更快，但更大）
npm run tauri:build -- --debug
```

## 平台特定说明

### Windows 交叉编译

在 Windows 上构建 x86 版本：

```bash
# 添加 x86 目标
rustup target add i686-pc-windows-msvc

# 构建
npm run tauri:build -- --target i686-pc-windows-msvc
```

### macOS 通用二进制

构建同时支持 Intel 和 Apple Silicon 的通用二进制：

```bash
# 添加目标
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin

# 构建两个架构
npm run tauri:build -- --target x86_64-apple-darwin
npm run tauri:build -- --target aarch64-apple-darwin

# 使用 lipo 合并
lipo -create \
    src-tauri/target/x86_64-apple-darwin/release/proto-tool \
    src-tauri/target/aarch64-apple-darwin/release/proto-tool \
    -output proto-tool-universal
```

### Linux 交叉编译

在 Linux 上为不同架构构建：

```bash
# 安装交叉编译工具
sudo apt install gcc-aarch64-linux-gnu

# 添加目标
rustup target add aarch64-unknown-linux-gnu

# 配置 cargo
export CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_LINKER=aarch64-linux-gnu-gcc

# 构建
npm run tauri:build -- --target aarch64-unknown-linux-gnu
```

## 故障排除

### 常见问题

#### 问题：`cargo` 命令未找到

**解决方法**：
```bash
# 重新加载环境变量
source $HOME/.cargo/env

# 或重新打开终端
```

#### 问题：WebView2 错误（Windows）

**解决方法**：
安装 [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)

#### 问题：GTK 相关错误（Linux）

**解决方法**：
确保安装了所有必需的系统库（见上文"平台特定依赖"）

#### 问题：构建失败，提示内存不足

**解决方法**：
```bash
# 减少并行编译任务
export CARGO_BUILD_JOBS=2

# 或在 .cargo/config.toml 中设置
[build]
jobs = 2
```

#### 问题：前端构建失败

**解决方法**：
```bash
# 清理缓存
rm -rf node_modules
rm -rf dist
npm install

# 或使用 pnpm
pnpm store prune
pnpm install
```

#### 问题：Rust 编译错误

**解决方法**：
```bash
# 更新 Rust 工具链
rustup update

# 清理构建缓存
cargo clean --manifest-path src-tauri/Cargo.toml

# 重新构建
npm run tauri:build
```

### 获取帮助

如果遇到构建问题：

1. 查看 [GitHub Issues](https://github.com/chenqi92/keke-proto-tool/issues)
2. 搜索相关错误信息
3. 提交新 Issue，包含：
   - 操作系统和版本
   - Node.js 和 Rust 版本
   - 完整的错误日志
   - 构建命令

## 开发工具

### 推荐的 IDE

- **Visual Studio Code** + 扩展：
  - Rust Analyzer
  - Tauri
  - ESLint
  - Prettier

- **WebStorm** / **IntelliJ IDEA**
  - Rust 插件
  - Tauri 插件

### 调试

#### 前端调试

在浏览器开发者工具中调试：
- 按 `F12` 打开开发者工具
- 使用 Console、Network、Sources 等面板

#### 后端调试

使用 Rust 调试器：
```bash
# 使用 lldb (macOS/Linux)
rust-lldb target/debug/proto-tool

# 使用 gdb (Linux)
rust-gdb target/debug/proto-tool
```

## 相关资源

- [[Developer Guide|Developer-Guide]] - 开发者指南
- [[Contributing]] - 贡献指南
- [[Project Structure|Project-Structure]] - 项目结构
- [Tauri 文档](https://tauri.app/)
- [Rust 文档](https://doc.rust-lang.org/)

---

**上一页**: [[Developer Guide|Developer-Guide]] | **下一页**: [[Contributing]]

