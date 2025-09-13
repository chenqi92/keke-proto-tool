# 开发规范

本文档定义了 ProtoTool 项目的开发规范和最佳实践。

## 📦 发布和分发

### Microsoft Store 自动发布
项目现已支持自动构建 MSIX 包并提交到微软商店：

- **MSIX 包构建**: 自动构建适用于微软商店的 MSIX 包
- **自动提交**: 配置后可自动提交到微软商店
- **独立流程**: 不影响现有的 MSI/NSIS 包构建和 GitHub Release

配置指南：
- [完整配置文档](./MICROSOFT_STORE_SETUP.md)
- [快速配置指南](./MICROSOFT_STORE_QUICK_SETUP.md)

## 代码规范

### TypeScript/JavaScript 规范

#### 命名规范

- **变量和函数**: 使用 camelCase
  ```typescript
  const userName = 'john';
  function getUserData() {}
  ```

- **常量**: 使用 SCREAMING_SNAKE_CASE
  ```typescript
  const MAX_RETRY_COUNT = 3;
  const API_BASE_URL = 'https://api.example.com';
  ```

- **类型和接口**: 使用 PascalCase
  ```typescript
  interface UserData {
    id: string;
    name: string;
  }
  
  type ConnectionStatus = 'connected' | 'disconnected';
  ```

- **组件**: 使用 PascalCase
  ```typescript
  const UserProfile = () => {};
  const ConnectionManager = () => {};
  ```

#### 文件命名

- **组件文件**: PascalCase.tsx
  ```
  UserProfile.tsx
  ConnectionManager.tsx
  ```

- **工具文件**: camelCase.ts
  ```
  networkUtils.ts
  dateHelpers.ts
  ```

- **类型文件**: camelCase.ts
  ```
  userTypes.ts
  apiTypes.ts
  ```

#### 代码组织

- 每个文件最多 300 行代码
- 函数最多 50 行代码
- 使用 barrel exports (index.ts)
- 按功能模块组织代码

```typescript
// ✅ 好的例子
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// ❌ 避免的例子
export const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};
```

### Rust 规范

#### 命名规范

- **变量和函数**: 使用 snake_case
  ```rust
  let user_name = "john";
  fn get_user_data() {}
  ```

- **常量**: 使用 SCREAMING_SNAKE_CASE
  ```rust
  const MAX_RETRY_COUNT: u32 = 3;
  const API_BASE_URL: &str = "https://api.example.com";
  ```

- **结构体和枚举**: 使用 PascalCase
  ```rust
  struct UserData {
      id: String,
      name: String,
  }
  
  enum ConnectionStatus {
      Connected,
      Disconnected,
  }
  ```

#### 错误处理

- 使用 `Result<T, E>` 进行错误处理
- 创建自定义错误类型
- 使用 `anyhow` 进行错误传播

```rust
use anyhow::{Context, Result};

fn parse_config(path: &str) -> Result<Config> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("Failed to read config file: {}", path))?;
    
    serde_json::from_str(&content)
        .with_context(|| "Failed to parse config JSON")
}
```

## Git 工作流

### 分支策略

- `main`: 主分支，始终保持可发布状态
- `develop`: 开发分支，集成最新功能
- `feature/*`: 功能分支，从 develop 创建
- `fix/*`: 修复分支，从 develop 或 main 创建
- `release/*`: 发布分支，从 develop 创建

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**类型说明:**
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

**示例:**
```
feat(parser): add support for custom protocol parsing

Add ability to parse custom protocols using YAML configuration files.
This includes validation, field extraction, and error handling.

Closes #123
```

### Pull Request 规范

#### PR 标题
使用与提交信息相同的格式

#### PR 描述模板
```markdown
## 变更说明
简要描述本次变更的内容

## 相关 Issue
- Closes #123
- Related to #456

## 变更类型
- [ ] 新功能
- [ ] Bug 修复
- [ ] 文档更新
- [ ] 代码重构
- [ ] 性能优化
- [ ] 其他

## 测试
描述如何测试这些变更

## 截图
如果是 UI 变更，请提供截图

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 已添加必要的测试
- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] 无破坏性变更
```

## 测试规范

### 前端测试

#### 单元测试
- 使用 Vitest 进行单元测试
- 测试文件命名: `*.test.ts` 或 `*.spec.ts`
- 测试覆盖率目标: 80%+

```typescript
// utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from './utils';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-01-01T12:00:00Z');
    expect(formatDate(date)).toBe('2024-01-01');
  });
});
```

#### 组件测试
- 使用 React Testing Library
- 测试用户交互和行为

```typescript
// UserProfile.test.tsx
import { render, screen } from '@testing-library/react';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  it('should display user name', () => {
    render(<UserProfile name="John Doe" />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

### 后端测试

#### 单元测试
- 使用内置的 `#[cfg(test)]` 模块
- 测试函数命名: `test_*`

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_config() {
        let config = parse_config("test_config.json").unwrap();
        assert_eq!(config.port, 8080);
    }

    #[tokio::test]
    async fn test_async_function() {
        let result = async_function().await;
        assert!(result.is_ok());
    }
}
```

## 性能规范

### 前端性能

- 组件懒加载
- 图片优化
- Bundle 大小控制
- 避免不必要的重渲染

```typescript
// 懒加载组件
const LazyComponent = lazy(() => import('./LazyComponent'));

// 使用 memo 避免重渲染
const MemoizedComponent = memo(({ data }) => {
  return <div>{data}</div>;
});
```

### 后端性能

- 异步处理
- 连接池管理
- 内存使用优化
- 错误处理优化

```rust
// 使用连接池
use sqlx::PgPool;

async fn get_user(pool: &PgPool, id: i32) -> Result<User> {
    sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", id)
        .fetch_one(pool)
        .await
        .map_err(Into::into)
}
```

## 安全规范

### 输入验证
- 所有用户输入必须验证
- 使用类型安全的验证库
- 防止 SQL 注入和 XSS

### 错误处理
- 不暴露敏感信息
- 记录详细的错误日志
- 用户友好的错误消息

### 依赖管理
- 定期更新依赖
- 使用安全扫描工具
- 避免使用有安全漏洞的包

## 文档规范

### 代码注释

#### TypeScript
```typescript
/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param date - 要格式化的日期
 * @returns 格式化后的日期字符串
 */
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};
```

#### Rust
```rust
/// 解析配置文件
/// 
/// # Arguments
/// 
/// * `path` - 配置文件路径
/// 
/// # Returns
/// 
/// 返回解析后的配置对象，如果解析失败则返回错误
/// 
/// # Examples
/// 
/// ```
/// let config = parse_config("config.json")?;
/// ```
pub fn parse_config(path: &str) -> Result<Config> {
    // 实现
}
```

### API 文档
- 使用 JSDoc 注释
- 提供使用示例
- 说明参数和返回值

### README 文档
- 项目简介
- 安装说明
- 使用示例
- 贡献指南

## 发布规范

### 版本号
使用 [Semantic Versioning](https://semver.org/)：
- `MAJOR.MINOR.PATCH`
- `1.0.0`: 初始版本
- `1.1.0`: 新功能
- `1.1.1`: Bug 修复

### 发布流程
1. 创建 release 分支
2. 更新版本号
3. 更新 CHANGELOG
4. 创建 PR 到 main
5. 合并后创建 tag
6. 自动构建和发布

### CHANGELOG
记录每个版本的变更：

```markdown
# Changelog

## [1.1.0] - 2024-01-15

### Added
- 新增协议解析功能
- 支持自定义插件

### Changed
- 优化连接管理性能

### Fixed
- 修复内存泄漏问题
```

---

遵循这些规范有助于保持代码质量和项目的可维护性。如有疑问，请参考相关文档或联系项目维护者。
