#!/usr/bin/env pwsh
# ProtoTool Wiki 发布脚本（Wiki 启用后使用）
# 此脚本在 GitHub Wiki 功能启用并创建第一个页面后使用

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ProtoTool Wiki 发布脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否已经创建了临时仓库
if (-not (Test-Path ".wiki-temp")) {
    Write-Host "❌ 错误：找不到 .wiki-temp 目录" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先运行以下命令创建临时仓库：" -ForegroundColor Yellow
    Write-Host "  mkdir .wiki-temp" -ForegroundColor Yellow
    Write-Host "  cd .wiki-temp" -ForegroundColor Yellow
    Write-Host "  git init" -ForegroundColor Yellow
    Write-Host "  git config user.name 'chenqi92'" -ForegroundColor Yellow
    Write-Host "  git config user.email 'chenqi92104@icloud.com'" -ForegroundColor Yellow
    Write-Host "  Copy-Item ../wiki/*.md . -Exclude README.md,PUBLISH_INSTRUCTIONS.md" -ForegroundColor Yellow
    Write-Host "  git add ." -ForegroundColor Yellow
    Write-Host "  git commit -m 'Initial wiki content'" -ForegroundColor Yellow
    Write-Host "  cd .." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✓ 找到临时 Wiki 仓库" -ForegroundColor Green
Write-Host ""

# 进入临时目录
Push-Location .wiki-temp

try {
    Write-Host "📡 设置远程仓库..." -ForegroundColor Cyan
    
    # 检查是否已有 origin
    $hasOrigin = git remote | Select-String -Pattern "^origin$"
    
    if ($hasOrigin) {
        Write-Host "  更新远程仓库 URL..." -ForegroundColor Yellow
        git remote set-url origin git@github.com:chenqi92/keke-proto-tool.wiki.git
    } else {
        Write-Host "  添加远程仓库..." -ForegroundColor Yellow
        git remote add origin git@github.com:chenqi92/keke-proto-tool.wiki.git
    }
    
    Write-Host "✓ 远程仓库设置完成" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "🚀 推送到 GitHub Wiki..." -ForegroundColor Cyan
    Write-Host ""
    
    # 推送到 Wiki 仓库
    git push -u origin master --force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  ✅ Wiki 发布成功！" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "📚 Wiki 地址：" -ForegroundColor Cyan
        Write-Host "  https://github.com/chenqi92/keke-proto-tool/wiki" -ForegroundColor White
        Write-Host ""
        Write-Host "📄 已发布的页面：" -ForegroundColor Cyan
        Get-ChildItem *.md | ForEach-Object {
            Write-Host "  ✓ $($_.Name)" -ForegroundColor Green
        }
        Write-Host ""
        Write-Host "🧹 清理临时文件..." -ForegroundColor Cyan
        Pop-Location
        Remove-Item .wiki-temp -Recurse -Force
        Write-Host "✓ 清理完成" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "  ❌ 推送失败" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "可能的原因：" -ForegroundColor Yellow
        Write-Host "  1. Wiki 功能尚未启用" -ForegroundColor Yellow
        Write-Host "  2. 尚未创建第一个 Wiki 页面" -ForegroundColor Yellow
        Write-Host "  3. SSH 密钥未配置" -ForegroundColor Yellow
        Write-Host "  4. 网络连接问题" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "解决方法：" -ForegroundColor Cyan
        Write-Host "  1. 访问 https://github.com/chenqi92/keke-proto-tool/settings" -ForegroundColor White
        Write-Host "     启用 Wiki 功能" -ForegroundColor White
        Write-Host ""
        Write-Host "  2. 访问 https://github.com/chenqi92/keke-proto-tool/wiki" -ForegroundColor White
        Write-Host "     创建第一个页面（标题：Home）" -ForegroundColor White
        Write-Host ""
        Write-Host "  3. 然后重新运行此脚本" -ForegroundColor White
        Write-Host ""
        Pop-Location
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ 发生错误：$_" -ForegroundColor Red
    Pop-Location
    exit 1
}

