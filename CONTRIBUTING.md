# 贡献指南

感谢您对 ProtoTool 项目的关注！我们欢迎所有形式的贡献，包括但不限于：

- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码修复
- ✨ 开发新功能

## 开发环境设置

### 环境要求

- **Node.js**: 18.0.0 或更高版本
- **Rust**: 1.70.0 或更高版本
- **Git**: 最新版本
- **操作系统**: Windows 10+, macOS 10.15+, Linux

### 安装步骤

1. **Fork 仓库**
   ```bash
   # 在 GitHub 上 Fork 项目
   # 然后克隆您的 Fork
   git clone https://github.com/YOUR_USERNAME/keke-proto-tool.git
   cd keke-proto-tool
   ```

2. **安装依赖**
   ```bash
   # 安装前端依赖
   npm install
   
   # 安装 Tauri CLI
   cargo install tauri-cli
   ```

3. **运行开发环境**
   ```bash
   # 启动开发服务器
   npm run tauri dev
   ```

## 代码规范

### 前端代码规范

我们使用以下工具确保代码质量：

- **ESLint**: 代码检查
- **Prettier**: 代码格式化
- **TypeScript**: 类型检查

运行代码检查：
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

### 后端代码规范

Rust 代码遵循官方规范：

- **rustfmt**: 代码格式化
- **clippy**: 代码检查

运行代码检查：
```bash
# 格式化 Rust 代码
cargo fmt --manifest-path src-tauri/Cargo.toml

# 检查 Rust 代码
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

# 运行测试
cargo test --manifest-path src-tauri/Cargo.toml
```

### 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**类型 (type):**
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动
- `perf`: 性能优化

**示例:**
```
feat(parser): add support for custom protocol parsing

Add ability to parse custom protocols using YAML configuration files.
This includes validation, field extraction, and error handling.

Closes #123
```

## 开发流程

### 1. 创建分支

```bash
# 从 main 分支创建新分支
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

分支命名规范：
- `feature/`: 新功能
- `fix/`: Bug 修复
- `docs/`: 文档更新
- `refactor/`: 代码重构

### 2. 开发和测试

- 编写代码时请遵循项目的代码规范
- 添加必要的测试用例
- 确保所有测试通过
- 更新相关文档

### 3. 提交代码

```bash
# 添加文件
git add .

# 提交（遵循提交规范）
git commit -m "feat: add new feature description"

# 推送到您的 Fork
git push origin feature/your-feature-name
```

### 4. 创建 Pull Request

1. 在 GitHub 上创建 Pull Request
2. 填写 PR 模板中的所有必要信息
3. 确保 CI 检查通过
4. 等待代码审查

## Pull Request 指南

### PR 标题

使用与提交信息相同的格式：
```
feat(scope): add new feature
fix(scope): resolve issue with component
docs: update installation guide
```

### PR 描述

请包含以下信息：

1. **变更说明**: 简要描述您的更改
2. **相关 Issue**: 如果解决了某个 Issue，请引用它
3. **测试**: 描述您如何测试这些更改
4. **截图**: 如果是 UI 更改，请提供截图
5. **破坏性更改**: 如果有破坏性更改，请详细说明

### 代码审查

- 所有 PR 都需要至少一个维护者的审查
- 请及时回应审查意见
- 如果需要更改，请在同一个分支上提交新的 commit

## 测试指南

### 前端测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式运行测试
npm run test:watch
```

### 后端测试

```bash
# 运行 Rust 测试
cargo test --manifest-path src-tauri/Cargo.toml

# 运行特定测试
cargo test --manifest-path src-tauri/Cargo.toml test_name

# 运行测试并显示输出
cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture
```

## 文档贡献

### 文档类型

- **README.md**: 项目概述和快速开始
- **API 文档**: 代码中的注释和 JSDoc
- **用户指南**: 详细的使用说明
- **开发文档**: 架构设计和开发指南

### 文档规范

- 使用清晰、简洁的语言
- 提供代码示例
- 包含必要的截图或图表
- 保持文档与代码同步

## 报告 Bug

### Bug 报告模板

请使用 GitHub Issues 报告 Bug，并包含以下信息：

1. **环境信息**:
   - 操作系统和版本
   - Node.js 版本
   - Rust 版本
   - 应用版本

2. **重现步骤**:
   - 详细的操作步骤
   - 预期行为
   - 实际行为

3. **附加信息**:
   - 错误日志
   - 截图或录屏
   - 相关配置文件

## 功能建议

使用 GitHub Issues 提出功能建议，请包含：

1. **功能描述**: 详细描述建议的功能
2. **使用场景**: 说明为什么需要这个功能
3. **实现建议**: 如果有想法，可以提供实现建议
4. **替代方案**: 是否有其他解决方案

## 社区准则

- 保持友善和尊重
- 欢迎新贡献者
- 提供建设性的反馈
- 遵循项目的行为准则

## 获得帮助

如果您在贡献过程中遇到问题：

1. 查看现有的 Issues 和 Discussions
2. 在 GitHub Discussions 中提问
3. 联系项目维护者

## 许可证

通过贡献代码，您同意您的贡献将在 MIT 许可证下发布。

---

再次感谢您的贡献！🎉
