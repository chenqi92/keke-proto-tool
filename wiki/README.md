# ProtoTool Wiki 文档

这个文件夹包含了 ProtoTool 项目的所有 Wiki 页面内容。

## ⚠️ 重要说明

**这是 Wiki 文档的唯一源文件位置**，不会有其他副本。

## 📚 包含的页面

- **Home.md** - Wiki 首页
- **Getting-Started.md** - 快速开始指南
- **User-Guide.md** - 用户使用手册
- **Protocol-System.md** - 协议系统概述
- **Protocol-Format-Guide.md** - 协议格式规范
- **Plugin-Development.md** - 插件开发指南
- **Building-From-Source.md** - 从源码构建
- **FAQ.md** - 常见问题
- **Troubleshooting.md** - 故障排除

## 🚀 如何发布到 GitHub Wiki

### 第一步：启用 Wiki（如果还没启用）

1. 访问 https://github.com/chenqi92/keke-proto-tool/settings
2. 勾选 "Wikis" 功能
3. 访问 https://github.com/chenqi92/keke-proto-tool/wiki
4. 创建第一个页面（标题：Home，内容随意）

### 第二步：发布内容

**使用自动化脚本（推荐）**:

```powershell
# Windows
.\scripts\publish-wiki.ps1

# Linux/macOS
./scripts/publish-wiki.sh
```

**或手动发布**:

详见 `PUBLISH_INSTRUCTIONS.md` 文件。

## 🔄 更新 Wiki

1. 在此文件夹中编辑 .md 文件
2. 提交到主仓库
3. 运行发布脚本同步到 GitHub Wiki

## 📝 Wiki 链接格式

在 Wiki 页面中链接其他页面：

```markdown
[[显示文本|文件名]]
```

例如：
```markdown
[[快速开始|Getting-Started]]
[[协议系统|Protocol-System]]
```

## 📞 需要帮助？

查看 `PUBLISH_INSTRUCTIONS.md` 获取详细的发布说明。

