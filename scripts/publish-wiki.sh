#!/bin/bash

# ProtoTool Wiki 发布脚本
# 用于将 wiki 文件夹的内容发布到 GitHub Wiki

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
WIKI_REPO="https://github.com/chenqi92/keke-proto-tool.wiki.git"
WIKI_DIR="wiki"
TEMP_DIR=".wiki-temp"

echo -e "${GREEN}=== ProtoTool Wiki 发布工具 ===${NC}\n"

# 检查 wiki 文件夹是否存在
if [ ! -d "$WIKI_DIR" ]; then
    echo -e "${RED}错误: wiki 文件夹不存在${NC}"
    exit 1
fi

# 检查是否有 .md 文件
if [ -z "$(ls -A $WIKI_DIR/*.md 2>/dev/null)" ]; then
    echo -e "${RED}错误: wiki 文件夹中没有 .md 文件${NC}"
    exit 1
fi

echo -e "${YELLOW}步骤 1/5: 清理临时目录...${NC}"
if [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
fi

echo -e "${YELLOW}步骤 2/5: 克隆 Wiki 仓库...${NC}"
git clone "$WIKI_REPO" "$TEMP_DIR"

if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 无法克隆 Wiki 仓库${NC}"
    echo -e "${YELLOW}提示: 请确保已在 GitHub 上启用 Wiki 功能${NC}"
    exit 1
fi

echo -e "${YELLOW}步骤 3/5: 复制 Wiki 文件...${NC}"
# 复制所有 .md 文件（除了 README.md）
for file in "$WIKI_DIR"/*.md; do
    filename=$(basename "$file")
    if [ "$filename" != "README.md" ]; then
        cp "$file" "$TEMP_DIR/"
        echo "  ✓ 复制 $filename"
    fi
done

echo -e "${YELLOW}步骤 4/5: 提交更改...${NC}"
cd "$TEMP_DIR"

# 配置 git（如果需要）
git config user.name "$(git config --global user.name)" || git config user.name "Wiki Publisher"
git config user.email "$(git config --global user.email)" || git config user.email "wiki@prototool.dev"

# 添加所有文件
git add .

# 检查是否有更改
if git diff --staged --quiet; then
    echo -e "${GREEN}没有需要提交的更改${NC}"
else
    # 提交更改
    git commit -m "Update wiki documentation

- Update all wiki pages
- Generated on $(date '+%Y-%m-%d %H:%M:%S')
"
    
    echo -e "${YELLOW}步骤 5/5: 推送到 GitHub...${NC}"
    git push origin master
    
    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}✓ Wiki 发布成功!${NC}"
        echo -e "${GREEN}访问: https://github.com/chenqi92/keke-proto-tool/wiki${NC}"
    else
        echo -e "\n${RED}✗ 推送失败${NC}"
        cd ..
        exit 1
    fi
fi

# 清理
cd ..
echo -e "\n${YELLOW}清理临时文件...${NC}"
rm -rf "$TEMP_DIR"

echo -e "\n${GREEN}=== 完成 ===${NC}"

