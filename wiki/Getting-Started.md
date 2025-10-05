# 快速开始

本指南将帮助您快速安装和开始使用 ProtoTool。

## 📦 安装

### 下载安装包

访问 [Releases 页面](https://github.com/chenqi92/keke-proto-tool/releases) 下载最新版本。

#### Windows 系统

**推荐方式**：下载 MSI 安装包
- [MSI 安装包 (x64)](https://github.com/chenqi92/keke-proto-tool/releases/latest)
- [MSI 安装包 (x86)](https://github.com/chenqi92/keke-proto-tool/releases/latest)

**备选方式**：NSIS 安装包
- [NSIS 安装包 (x64)](https://github.com/chenqi92/keke-proto-tool/releases/latest)
- [NSIS 安装包 (x86)](https://github.com/chenqi92/keke-proto-tool/releases/latest)

**安装步骤**：
1. 双击下载的安装包
2. 按照安装向导提示完成安装
3. 从开始菜单启动 ProtoTool

#### macOS 系统

根据您的芯片类型选择对应版本：
- [Intel 芯片 (x64)](https://github.com/chenqi92/keke-proto-tool/releases/latest)
- [Apple Silicon (ARM64)](https://github.com/chenqi92/keke-proto-tool/releases/latest)

**安装步骤**：
1. 下载 DMG 文件
2. 双击打开 DMG 文件
3. 将 ProtoTool 拖动到 Applications 文件夹
4. 首次运行时，右键点击应用选择"打开"

#### Linux 系统

**推荐方式**：AppImage（无需安装）
- [AppImage (x64)](https://github.com/chenqi92/keke-proto-tool/releases/latest)
- [AppImage (ARM64)](https://github.com/chenqi92/keke-proto-tool/releases/latest)

**使用步骤**：
```bash
# 添加执行权限
chmod +x proto-tool_*.AppImage

# 运行应用
./proto-tool_*.AppImage
```

**包管理器安装**：

Ubuntu/Debian:
```bash
# 下载 DEB 包
wget https://github.com/chenqi92/keke-proto-tool/releases/latest/download/proto-tool_*_amd64.deb

# 安装
sudo dpkg -i proto-tool_*_amd64.deb
```

RHEL/CentOS:
```bash
# 下载 RPM 包
wget https://github.com/chenqi92/keke-proto-tool/releases/latest/download/proto-tool-*.x86_64.rpm

# 安装
sudo rpm -i proto-tool-*.x86_64.rpm
```

## 🚀 第一次使用

### 1. 创建连接

启动 ProtoTool 后，您将看到主界面。

**创建 TCP 连接**：
1. 点击左侧导航栏的"工作区"
2. 点击"新建连接"按钮
3. 选择"TCP 客户端"
4. 填写连接信息：
   - 主机地址：例如 `127.0.0.1`
   - 端口：例如 `8080`
   - 连接名称：为连接起一个名字
5. 点击"连接"按钮

**其他协议**：
- **UDP**: 支持单播、广播和组播
- **WebSocket**: 支持 ws:// 和 wss:// 协议
- **MQTT**: 完整的 MQTT 客户端实现
- **SSE**: 服务器推送事件流

详见 [[Connection Management|Connection-Management]]。

### 2. 发送和接收数据

连接成功后：

**发送数据**：
1. 在底部的"发送区域"输入数据
2. 选择数据格式（文本/十六进制/Base64）
3. 点击"发送"按钮

**接收数据**：
- 接收到的数据会实时显示在"接收区域"
- 支持多种显示格式切换
- 可以暂停/继续接收
- 支持数据过滤和搜索

### 3. 使用协议解析

**从协议商店安装协议**：
1. 点击左侧导航栏的"协议仓库"
2. 切换到"协议商店"标签
3. 浏览或搜索需要的协议
4. 点击"安装"按钮

**应用协议解析**：
1. 在会话中选择已安装的协议
2. 接收到的数据将自动解析
3. 查看解析后的结构化数据

详见 [[Protocol System|Protocol-System]]。

### 4. 使用工具箱

ProtoTool 内置了多种实用工具：

**访问工具箱**：
1. 点击左侧导航栏的"工具箱"
2. 选择需要的工具
3. 按照工具界面提示使用

**常用工具**：
- **报文生成器**: 生成测试报文
- **数据转换器**: 格式转换（Hex/ASCII/Base64）
- **CRC 计算器**: 计算各种 CRC 校验值
- **时间戳转换器**: Unix 时间戳转换

详见 [[Toolbox]]。

## 📖 基本概念

### 工作区（Workspace）

工作区是管理连接和会话的主要区域。您可以：
- 创建多个连接
- 管理会话
- 查看连接状态
- 配置连接参数

### 会话（Session）

会话代表一个活动的网络连接。每个会话包含：
- 连接信息
- 收发数据历史
- 协议解析结果
- 会话统计信息

### 协议（Protocol）

协议定义了如何解析和生成网络报文。ProtoTool 支持：
- 从协议商店安装预定义协议
- 创建自定义协议（.kkp.yaml 格式）
- 使用插件扩展协议功能

### 插件（Plugin）

插件是扩展 ProtoTool 功能的方式。支持：
- 协议解析插件
- 数据处理插件
- AI 辅助插件

## 🎯 常见使用场景

### 场景 1：调试 TCP 服务器

```
1. 创建 TCP 客户端连接
2. 连接到服务器
3. 发送测试数据
4. 查看服务器响应
5. 使用协议解析查看结构化数据
```

### 场景 2：分析网络报文

```
1. 创建连接并开始接收数据
2. 从协议商店安装对应协议
3. 应用协议解析
4. 查看解析后的字段和值
5. 导出数据用于进一步分析
```

### 场景 3：测试自定义协议

```
1. 创建自定义协议文件（.kkp.yaml）
2. 导入协议到协议仓库
3. 在会话中应用协议
4. 使用报文生成器生成测试数据
5. 验证协议解析结果
```

## 🔧 配置建议

### 性能优化

- **数据缓冲**: 调整接收缓冲区大小以适应数据流量
- **自动滚动**: 大量数据时可关闭自动滚动提升性能
- **数据过滤**: 使用过滤器减少显示的数据量

### 界面定制

- **主题**: 支持亮色/暗色主题切换
- **字体**: 可调整数据显示区域的字体大小
- **布局**: 支持调整各面板的大小

## 📚 下一步

- 阅读 [[User Guide|User-Guide]] 了解详细功能
- 查看 [[Protocol Format Guide|Protocol-Format-Guide]] 学习创建协议
- 探索 [[Toolbox]] 了解内置工具
- 访问 [[FAQ]] 查看常见问题

## 💡 提示和技巧

1. **快捷键**: 使用 `Ctrl+Enter` (Windows/Linux) 或 `Cmd+Enter` (macOS) 快速发送数据
2. **历史记录**: 发送区域支持历史记录，使用上下箭头键切换
3. **批量操作**: 可以同时管理多个连接和会话
4. **数据导出**: 支持导出原始数据和解析结果
5. **会话录制**: 可以录制会话用于回放和分析

## ❓ 遇到问题？

- 查看 [[Troubleshooting]] 页面
- 搜索 [GitHub Issues](https://github.com/chenqi92/keke-proto-tool/issues)
- 在 [Discussions](https://github.com/chenqi92/keke-proto-tool/discussions) 提问

---

**下一步**: [[User Guide|User-Guide]] | [[Protocol System|Protocol-System]] | [[Toolbox]]

