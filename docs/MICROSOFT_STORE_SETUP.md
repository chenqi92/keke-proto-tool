# Microsoft Store 自动发布配置指南

本文档介绍如何配置 GitHub Actions 自动构建 MSIX 包并提交到微软商店。

## 概述

我们的 GitHub workflow 现在支持：
- 构建 MSIX 包（用于微软商店）
- 自动提交到微软商店
- 独立于常规 release 流程，不影响现有的包打包和上传

## 前置要求

### 1. 微软开发者账户
- 注册微软开发者账户（个人或企业）
- 在 [Partner Center](https://partner.microsoft.com/dashboard) 中创建应用

### 2. Azure AD 应用注册
需要在 Azure AD 中注册应用以获取 API 访问权限：

1. 访问 [Azure Portal](https://portal.azure.com)
2. 进入 "Azure Active Directory" > "App registrations"
3. 点击 "New registration"
4. 填写应用信息：
   - Name: `ProtoTool Store Submission`
   - Supported account types: `Accounts in this organizational directory only`
5. 注册后记录以下信息：
   - Application (client) ID
   - Directory (tenant) ID

### 3. 创建客户端密钥
1. 在注册的应用中，进入 "Certificates & secrets"
2. 点击 "New client secret"
3. 设置描述和过期时间
4. 记录生成的密钥值（只显示一次）

### 4. 配置 API 权限
1. 在应用中进入 "API permissions"
2. 点击 "Add a permission"
3. 选择 "Microsoft Graph"
4. 选择 "Application permissions"
5. 添加以下权限：
   - `Application.ReadWrite.All`
   - `User.Read.All`
6. 点击 "Grant admin consent"

## GitHub 环境变量配置

### 1. 创建 GitHub Environment
1. 在 GitHub 仓库中，进入 Settings > Environments
2. 创建名为 `microsoft-store` 的环境
3. 可选：设置保护规则（如需要审批）

### 2. 设置 Repository Variables
在 Settings > Secrets and variables > Actions > Variables 中添加：

```
ENABLE_MICROSOFT_STORE_SUBMISSION=true
```

### 3. 设置 Environment Secrets
在 `microsoft-store` 环境中添加以下 secrets：

| Secret 名称 | 描述 | 获取方式 |
|------------|------|----------|
| `MICROSOFT_STORE_TENANT_ID` | Azure AD 租户 ID | Azure Portal > Azure AD > Overview > Tenant ID |
| `MICROSOFT_STORE_CLIENT_ID` | 应用客户端 ID | Azure Portal > App registrations > 你的应用 > Application ID |
| `MICROSOFT_STORE_CLIENT_SECRET` | 客户端密钥 | Azure Portal > App registrations > 你的应用 > Certificates & secrets |
| `MICROSOFT_STORE_APP_ID` | 微软商店应用 ID | Partner Center > 你的应用 > Product identity > Store ID |

## 配置文件说明

### 1. 主配置文件 (`src-tauri/tauri.conf.json`)
已添加 MSIX 支持，使用标准的 webview 安装模式。

### 2. 微软商店专用配置 (`src-tauri/tauri.microsoftstore.conf.json`)
专门用于微软商店的配置，使用离线安装器模式：
- `webviewInstallMode.type: "offlineInstaller"` - 微软商店要求

## Workflow 工作流程

### 1. 触发条件
- 版本号变更时自动触发
- 手动触发 workflow
- 需要设置 `ENABLE_MICROSOFT_STORE_SUBMISSION=true`

### 2. 构建流程
1. **常规构建**: 构建所有平台的包（MSI, NSIS, MSIX 等）
2. **微软商店构建**: 使用专用配置构建 MSIX 包
3. **自动提交**: 将 MSIX 包提交到微软商店

### 3. 独立性保证
- 微软商店提交是独立的 job
- 失败不会影响常规 release
- 有独立的环境保护

## 使用方法

### 1. 启用微软商店提交
设置 repository variable:
```
ENABLE_MICROSOFT_STORE_SUBMISSION=true
```

### 2. 配置所有必需的 secrets
确保在 `microsoft-store` 环境中配置了所有必需的 secrets。

### 3. 触发构建
- 更新 `package.json` 中的版本号
- 推送到 main 分支
- 或手动触发 workflow

### 4. 监控提交状态
- 在 GitHub Actions 中查看构建状态
- 在 Partner Center 中查看提交状态

## 故障排除

### 1. 认证失败
- 检查 Azure AD 应用权限
- 确认客户端密钥未过期
- 验证租户 ID 和客户端 ID

### 2. MSIX 包构建失败
- 检查 Tauri 配置
- 确认图标文件存在
- 查看构建日志

### 3. 提交失败
- 检查应用 ID 是否正确
- 确认应用在 Partner Center 中已正确配置
- 查看微软商店提交要求

## 注意事项

1. **首次提交**: 首次提交可能需要在 Partner Center 中手动完成一些配置
2. **审核时间**: 微软商店审核通常需要 1-3 个工作日
3. **版本管理**: 确保每次提交的版本号都是递增的
4. **测试**: 建议先在测试环境中验证整个流程

## 相关链接

- [Microsoft Store 开发者文档](https://docs.microsoft.com/en-us/windows/uwp/publish/)
- [Partner Center](https://partner.microsoft.com/dashboard)
- [Azure Portal](https://portal.azure.com)
- [Tauri MSIX 文档](https://v2.tauri.app/distribute/microsoft-store/)
