# Wiki 发布说明

## ⚠️ 重要提示

GitHub Wiki 需要先手动启用才能通过 Git 访问。

## 📋 启用 Wiki 的步骤

### 1. 在 GitHub 上启用 Wiki

1. 访问：https://github.com/chenqi92/keke-proto-tool/settings
2. 滚动到 "Features" 部分
3. 勾选 ✅ "Wikis" 复选框
4. 点击保存

### 2. 创建第一个 Wiki 页面

1. 访问：https://github.com/chenqi92/keke-proto-tool/wiki
2. 点击 "Create the first page" 按钮
3. 标题输入：`Home`
4. 内容可以先输入：`Wiki is being set up...`
5. 点击 "Save Page"

### 3. 现在可以通过 Git 访问了

启用并创建第一个页面后，Wiki 仓库就可以通过 Git 访问了。

## 🚀 快速发布（启用 Wiki 后）

### 方法 1: 使用自动化脚本

**Windows (PowerShell)**:
```powershell
.\scripts\publish-wiki.ps1
```

**Linux/macOS**:
```bash
./scripts/publish-wiki.sh
```

### 方法 2: 手动发布

```bash
# 1. 克隆 Wiki 仓库
git clone https://github.com/chenqi92/keke-proto-tool.wiki.git

# 2. 进入目录
cd keke-proto-tool.wiki

# 3. 复制所有 Wiki 文件（除了 README.md 和本文件）
cp ../wiki/Home.md .
cp ../wiki/Getting-Started.md .
cp ../wiki/User-Guide.md .
cp ../wiki/Protocol-System.md .
cp ../wiki/Protocol-Format-Guide.md .
cp ../wiki/Plugin-Development.md .
cp ../wiki/Building-From-Source.md .
cp ../wiki/FAQ.md .
cp ../wiki/Troubleshooting.md .

# 4. 提交并推送
git add .
git commit -m "Add comprehensive wiki documentation"
git push origin master

# 5. 清理
cd ..
rm -rf keke-proto-tool.wiki
```

### 方法 3: 通过 GitHub Web 界面（最简单）

如果不想使用命令行，可以直接在 GitHub 上操作：

1. 访问 https://github.com/chenqi92/keke-proto-tool/wiki
2. 对于每个页面：
   - 点击 "New Page"
   - 页面标题使用文件名（不含 .md）
   - 复制对应 .md 文件的内容
   - 粘贴并保存

## 📚 需要发布的页面列表

按以下顺序创建页面：

1. **Home** - 首页（必须先创建）
2. **Getting-Started** - 快速开始
3. **User-Guide** - 用户指南
4. **Protocol-System** - 协议系统
5. **Protocol-Format-Guide** - 协议格式指南
6. **Plugin-Development** - 插件开发
7. **Building-From-Source** - 从源码构建
8. **FAQ** - 常见问题
9. **Troubleshooting** - 故障排除

## 🔄 后续更新

Wiki 启用并发布后，以后更新只需：

1. 在 `wiki/` 文件夹中编辑文件
2. 运行发布脚本：`.\scripts\publish-wiki.ps1`

## 💡 提示

- Wiki 文档的源文件保存在项目的 `wiki/` 文件夹中
- 这是唯一的源文件位置，不会有多份拷贝
- GitHub Wiki 仓库是发布目标，通过脚本自动同步
- 始终在 `wiki/` 文件夹中编辑，然后发布

## ❓ 遇到问题？

如果克隆 Wiki 仓库时出现 "Repository not found" 错误：
- 说明 Wiki 还没有启用
- 按照上面的步骤 1 和 2 先启用 Wiki

如果网络连接问题：
- 检查网络连接
- 尝试使用 VPN
- 或使用 GitHub Web 界面手动创建页面

---

**准备好了吗？先去 GitHub 启用 Wiki，然后回来运行发布脚本！** 🚀

