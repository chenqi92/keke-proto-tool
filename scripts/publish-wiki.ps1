# ProtoTool Wiki 发布脚本 (PowerShell)
# 用于将 wiki 文件夹的内容发布到 GitHub Wiki

param(
    [switch]$Force
)

# 配置
$WikiRepo = "https://github.com/chenqi92/keke-proto-tool.wiki.git"
$WikiDir = "wiki"
$TempDir = ".wiki-temp"

Write-Host "=== ProtoTool Wiki 发布工具 ===" -ForegroundColor Green
Write-Host ""

# 检查 wiki 文件夹是否存在
if (-not (Test-Path $WikiDir)) {
    Write-Host "错误: wiki 文件夹不存在" -ForegroundColor Red
    exit 1
}

# 检查是否有 .md 文件
$mdFiles = Get-ChildItem -Path $WikiDir -Filter "*.md"
if ($mdFiles.Count -eq 0) {
    Write-Host "错误: wiki 文件夹中没有 .md 文件" -ForegroundColor Red
    exit 1
}

Write-Host "步骤 1/5: 清理临时目录..." -ForegroundColor Yellow
if (Test-Path $TempDir) {
    Remove-Item -Path $TempDir -Recurse -Force
}

Write-Host "步骤 2/5: 克隆 Wiki 仓库..." -ForegroundColor Yellow
try {
    git clone $WikiRepo $TempDir 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "克隆失败"
    }
} catch {
    Write-Host "错误: 无法克隆 Wiki 仓库" -ForegroundColor Red
    Write-Host "提示: 请确保已在 GitHub 上启用 Wiki 功能" -ForegroundColor Yellow
    exit 1
}

Write-Host "步骤 3/5: 复制 Wiki 文件..." -ForegroundColor Yellow
# 复制所有 .md 文件（除了 README.md）
foreach ($file in $mdFiles) {
    if ($file.Name -ne "README.md") {
        Copy-Item -Path $file.FullName -Destination $TempDir -Force
        Write-Host "  ✓ 复制 $($file.Name)" -ForegroundColor Gray
    }
}

Write-Host "步骤 4/5: 提交更改..." -ForegroundColor Yellow
Push-Location $TempDir

try {
    # 配置 git（如果需要）
    $gitUserName = git config --global user.name
    $gitUserEmail = git config --global user.email
    
    if (-not $gitUserName) {
        git config user.name "Wiki Publisher"
    } else {
        git config user.name $gitUserName
    }
    
    if (-not $gitUserEmail) {
        git config user.email "wiki@prototool.dev"
    } else {
        git config user.email $gitUserEmail
    }
    
    # 添加所有文件
    git add .
    
    # 检查是否有更改
    $status = git status --porcelain
    if (-not $status) {
        Write-Host "没有需要提交的更改" -ForegroundColor Green
    } else {
        # 提交更改
        $commitMessage = @"
Update wiki documentation

- Update all wiki pages
- Generated on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@
        git commit -m $commitMessage
        
        Write-Host "步骤 5/5: 推送到 GitHub..." -ForegroundColor Yellow
        git push origin master
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✓ Wiki 发布成功!" -ForegroundColor Green
            Write-Host "访问: https://github.com/chenqi92/keke-proto-tool/wiki" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "✗ 推送失败" -ForegroundColor Red
            Pop-Location
            exit 1
        }
    }
} finally {
    Pop-Location
}

# 清理
Write-Host ""
Write-Host "清理临时文件..." -ForegroundColor Yellow
Remove-Item -Path $TempDir -Recurse -Force

Write-Host ""
Write-Host "=== 完成 ===" -ForegroundColor Green

