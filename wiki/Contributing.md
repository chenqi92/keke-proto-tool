# 贡献指南

感谢您对 ProtoTool 项目的关注！我们欢迎所有形式的贡献。

## 目录

- [贡献方式](#贡献方式)
- [开发环境设置](#开发环境设置)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [问题报告](#问题报告)

## 贡献方式

我们欢迎以下形式的贡献：

- 🐛 **报告 Bug** - 发现问题并提交 Issue
- 💡 **提出新功能建议** - 分享您的想法
- 📝 **改进文档** - 完善文档和示例
- 🔧 **提交代码修复** - 修复已知问题
- ✨ **开发新功能** - 实现新特性
- 🌐 **翻译** - 帮助翻译文档
- 🧪 **测试** - 测试新功能和修复

## 开发环境设置

### 环境要求

- **Node.js**: 18.0.0 或更高版本
- **Rust**: 1.70.0 或更高版本
- **Git**: 最新版本
- **操作系统**: Windows 10+, macOS 10.15+, Linux

### 安装步骤

#### 1. Fork 仓库

在 GitHub 上 Fork 项目：
```bash
# 克隆您的 Fork
git clone https://github.com/YOUR_USERNAME/keke-proto-tool.git
cd keke-proto-tool
```

#### 2. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装 Tauri CLI
cargo install tauri-cli
```

#### 3. 运行开发环境

```bash
# 启动开发服务器
npm run tauri dev
```

### 项目结构

```
keke-proto-tool/
├── src/                    # 前端源代码
│   ├── components/         # React 组件
│   ├── services/           # 服务层
│   ├── types/              # TypeScript 类型
│   ├── utils/              # 工具函数
│   └── App.tsx             # 主应用组件
├── src-tauri/              # Rust 后端
│   ├── src/                # Rust 源代码
│   ├── Cargo.toml          # Rust 依赖
│   └── tauri.conf.json     # Tauri 配置
├── docs/                   # 文档
├── wiki/                   # Wiki 文档
└── scripts/                # 脚本
```

## 代码规范

### 前端代码规范

我们使用以下工具确保代码质量：

- **ESLint**: 代码检查
- **Prettier**: 代码格式化
- **TypeScript**: 类型检查

#### 运行代码检查

```bash
# 检查代码规范
npm run lint

# 自动修复可修复的问题
npm run lint:fix

# 格式化代码
npm run format

# TypeScript 类型检查
npm run type-check
```

#### 代码风格

```typescript
// ✅ 推荐
export const MyComponent: React.FC<Props> = ({ data }) => {
  const [state, setState] = useState<string>('');
  
  const handleClick = useCallback(() => {
    setState(data);
  }, [data]);
  
  return (
    <div className="my-component">
      <Button onClick={handleClick}>Click</Button>
    </div>
  );
};

// ❌ 不推荐
export function MyComponent(props: any) {
  let state = '';
  
  return <div><button onClick={() => state = props.data}>Click</button></div>;
}
```

### 后端代码规范

Rust 代码遵循官方规范：

- **rustfmt**: 代码格式化
- **clippy**: 代码检查

#### 运行代码检查

```bash
# 格式化 Rust 代码
cargo fmt --manifest-path src-tauri/Cargo.toml

# 检查 Rust 代码
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

# 运行测试
cargo test --manifest-path src-tauri/Cargo.toml
```

#### 代码风格

```rust
// ✅ 推荐
pub fn process_data(input: &str) -> Result<String, Error> {
    if input.is_empty() {
        return Err(Error::EmptyInput);
    }
    
    let result = input.to_uppercase();
    Ok(result)
}

// ❌ 不推荐
pub fn process_data(input: &str) -> String {
    input.to_uppercase()
}
```

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 提交格式

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 提交类型

- **feat**: 新功能
- **fix**: Bug 修复
- **docs**: 文档更新
- **style**: 代码格式（不影响代码运行）
- **refactor**: 重构（既不是新功能也不是修复）
- **perf**: 性能优化
- **test**: 测试相关
- **chore**: 构建过程或辅助工具的变动

### 示例

```bash
# 新功能
git commit -m "feat(protocol): add HJ212 protocol support"

# Bug 修复
git commit -m "fix(connection): resolve TCP connection timeout issue"

# 文档更新
git commit -m "docs(wiki): add protocol troubleshooting guide"

# 重构
git commit -m "refactor(ui): simplify session management component"
```

### 提交消息规则

1. **使用英文**（如果可能）
2. **使用现在时态**："add feature" 而不是 "added feature"
3. **首字母小写**
4. **不要以句号结尾**
5. **简洁明了**：描述做了什么，而不是为什么

## Pull Request 流程

### 1. 创建分支

```bash
# 从 main 分支创建新分支
git checkout -b feature/my-new-feature

# 或修复分支
git checkout -b fix/issue-123
```

### 2. 开发和测试

```bash
# 进行开发
# ...

# 运行测试
npm run test
cargo test --manifest-path src-tauri/Cargo.toml

# 运行代码检查
npm run lint
cargo clippy --manifest-path src-tauri/Cargo.toml
```

### 3. 提交更改

```bash
# 添加更改
git add .

# 提交（遵循提交规范）
git commit -m "feat: add new feature"

# 推送到您的 Fork
git push origin feature/my-new-feature
```

### 4. 创建 Pull Request

1. 访问您的 Fork 页面
2. 点击 "New Pull Request"
3. 选择您的分支
4. 填写 PR 描述：
   - 描述更改内容
   - 关联相关 Issue
   - 添加截图（如果适用）
   - 说明测试情况

### PR 描述模板

```markdown
## 描述
简要描述这个 PR 的目的和内容。

## 更改类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 重构
- [ ] 文档更新
- [ ] 其他

## 相关 Issue
Closes #123

## 测试
- [ ] 已添加单元测试
- [ ] 已添加集成测试
- [ ] 已手动测试
- [ ] 所有测试通过

## 截图（如果适用）
添加截图展示更改效果。

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 已运行代码检查
- [ ] 已更新相关文档
- [ ] 提交消息遵循规范
```

### 5. 代码审查

- 等待维护者审查
- 根据反馈进行修改
- 保持 PR 更新

### 6. 合并

- PR 被批准后会被合并
- 您的贡献将出现在下一个版本中

## 问题报告

### Bug 报告

使用 Bug 报告模板：

```markdown
## Bug 描述
清晰简洁地描述 Bug。

## 复现步骤
1. 打开应用
2. 点击 '...'
3. 输入 '...'
4. 看到错误

## 预期行为
描述您期望发生什么。

## 实际行为
描述实际发生了什么。

## 截图
如果适用，添加截图帮助解释问题。

## 环境信息
- OS: [e.g. Windows 11]
- ProtoTool 版本: [e.g. 1.0.0]
- Node.js 版本: [e.g. 18.0.0]
- Rust 版本: [e.g. 1.70.0]

## 附加信息
添加任何其他相关信息。
```

### 功能请求

使用功能请求模板：

```markdown
## 功能描述
清晰简洁地描述您想要的功能。

## 问题
这个功能解决什么问题？

## 建议的解决方案
描述您希望如何实现这个功能。

## 替代方案
描述您考虑过的其他解决方案。

## 附加信息
添加任何其他相关信息或截图。
```

## 开发指南

### 添加新协议

1. 在 `src/protocols/` 创建协议文件
2. 实现协议接口
3. 注册协议
4. 添加测试
5. 更新文档

详见 [[Protocol System|Protocol-System]]。

### 添加新工具

1. 在 `src/tools/` 创建工具文件
2. 实现 `BaseTool` 接口
3. 注册工具
4. 添加测试
5. 更新文档

详见 [[Tool Development|Tool-Development]]。

### 添加新插件

1. 创建插件项目
2. 实现插件接口
3. 编译为 WASM
4. 创建 manifest.toml
5. 打包为 .kkpplug

详见 [[Plugin Development|Plugin-Development]]。

## 社区准则

### 行为准则

- 尊重所有贡献者
- 保持友好和专业
- 接受建设性批评
- 关注对项目最有利的事情
- 对社区成员表示同理心

### 沟通渠道

- **GitHub Issues**: Bug 报告和功能请求
- **GitHub Discussions**: 一般讨论和问题
- **Pull Requests**: 代码审查和讨论

## 许可证

通过贡献代码，您同意您的贡献将在与项目相同的许可证下发布。

## 获取帮助

如果您在贡献过程中遇到问题：

1. 查看 [[Building From Source|Building-From-Source]]
2. 查看 [[FAQ|FAQ]]
3. 在 GitHub Discussions 中提问
4. 提交 Issue

## 致谢

感谢所有为 ProtoTool 做出贡献的人！

您的贡献将被记录在：
- CHANGELOG.md
- GitHub Contributors 页面
- 项目文档

---

再次感谢您的贡献！🎉

**相关资源**:
- [[Building From Source|Building-From-Source]]
- [[Tool Development|Tool-Development]]
- [[Plugin Development|Plugin-Development]]
- [GitHub 仓库](https://github.com/chenqi92/keke-proto-tool)

