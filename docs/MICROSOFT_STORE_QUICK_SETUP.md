# Microsoft Store 快速配置指南

## 🚀 快速开始

### 1. 启用功能
在 GitHub 仓库的 Settings > Secrets and variables > Actions > Variables 中添加：
```
ENABLE_MICROSOFT_STORE_SUBMISSION=true
```

### 2. 创建 GitHub Environment
1. 进入 Settings > Environments
2. 创建名为 `microsoft-store` 的环境

### 3. 配置必需的 Secrets
在 `microsoft-store` 环境中添加以下 4 个 secrets：

| Secret 名称 | 获取位置 |
|------------|----------|
| `MICROSOFT_STORE_TENANT_ID` | Azure Portal > Azure AD > Tenant ID |
| `MICROSOFT_STORE_CLIENT_ID` | Azure Portal > App registrations > Application ID |
| `MICROSOFT_STORE_CLIENT_SECRET` | Azure Portal > App registrations > Client secret |
| `MICROSOFT_STORE_APP_ID` | Partner Center > Product identity > Store ID |

## 📋 详细步骤

### Azure AD 应用注册
1. 访问 [Azure Portal](https://portal.azure.com)
2. Azure Active Directory > App registrations > New registration
3. 记录 Tenant ID 和 Client ID
4. Certificates & secrets > New client secret > 记录密钥值
5. API permissions > Add permission > Microsoft Graph > Application permissions
6. 添加权限：`Application.ReadWrite.All`, `User.Read.All`
7. Grant admin consent

### Partner Center 配置
1. 访问 [Partner Center](https://partner.microsoft.com/dashboard)
2. 创建新应用或选择现有应用
3. Product identity > 记录 Store ID

### 测试配置
1. 更新 `package.json` 版本号
2. 推送到 main 分支
3. 查看 GitHub Actions 执行结果

## ⚠️ 重要提醒

- 首次提交可能需要在 Partner Center 中完成额外配置
- 微软商店审核需要 1-3 个工作日
- 确保版本号递增
- 微软商店提交独立于常规 release，失败不影响其他包的发布

## 🔗 完整文档
详细配置请参考：[MICROSOFT_STORE_SETUP.md](./MICROSOFT_STORE_SETUP.md)
