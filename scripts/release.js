#!/usr/bin/env node

/**
 * 发布脚本
 * 用于自动化版本发布流程
 */

import fs from 'fs';
import { execSync } from 'child_process';

/**
 * 执行命令并输出结果
 */
function execCommand(command, options = {}) {
  try {
    console.log(`Executing: ${command}`);
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'inherit',
      ...options 
    });
    return result;
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * 读取package.json获取版本信息
 */
function getPackageInfo() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description
    };
  } catch (error) {
    console.error('Error reading package.json:', error.message);
    process.exit(1);
  }
}

/**
 * 检查是否有未提交的更改
 */
function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    if (status) {
      console.error('Error: There are uncommitted changes. Please commit them first.');
      console.log('Uncommitted changes:');
      console.log(status);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error checking git status:', error.message);
    process.exit(1);
  }
}

/**
 * 检查是否在main分支
 */
function checkBranch() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    if (branch !== 'main' && branch !== 'master') {
      console.error(`Error: You are on branch '${branch}'. Please switch to main/master branch for release.`);
      process.exit(1);
    }
    return branch;
  } catch (error) {
    console.error('Error checking current branch:', error.message);
    process.exit(1);
  }
}

/**
 * 检查标签是否已存在
 */
function checkTagExists(version) {
  try {
    const tags = execSync('git tag -l', { encoding: 'utf8' });
    const tagName = `v${version}`;
    if (tags.includes(tagName)) {
      console.error(`Error: Tag '${tagName}' already exists.`);
      process.exit(1);
    }
    return tagName;
  } catch (error) {
    console.error('Error checking git tags:', error.message);
    process.exit(1);
  }
}

/**
 * 生成变更日志
 */
function generateChangelog(version) {
  try {
    // 获取上一个标签
    let lastTag;
    try {
      lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    } catch {
      // 如果没有标签，使用第一个提交
      lastTag = execSync('git rev-list --max-parents=0 HEAD', { encoding: 'utf8' }).trim();
    }

    // 获取提交历史
    const commits = execSync(
      `git log ${lastTag}..HEAD --pretty=format:"- %s (%h)"`,
      { encoding: 'utf8' }
    ).trim();

    if (!commits) {
      return `## Version ${version}\n\nNo changes since last release.`;
    }

    return `## Version ${version}\n\n${commits}`;
  } catch (error) {
    console.error('Error generating changelog:', error.message);
    return `## Version ${version}\n\nChangelog generation failed.`;
  }
}

/**
 * 创建发布
 */
function createRelease(packageInfo, tagName, changelog) {
  console.log('\n=== Creating Release ===');
  
  // 提交版本更改
  execCommand('git add .');
  execCommand(`git commit -m "chore: bump version to ${packageInfo.version}"`);
  
  // 创建标签
  execCommand(`git tag -a ${tagName} -m "Release ${packageInfo.version}"`);
  
  // 推送到远程
  execCommand('git push origin main');
  execCommand(`git push origin ${tagName}`);
  
  console.log(`\n✅ Release ${tagName} created successfully!`);
  console.log(`📝 Changelog:\n${changelog}`);
  console.log('\n🚀 GitHub Actions will automatically build and publish the release.');
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  
  console.log('🚀 Starting release process...\n');
  
  // 获取包信息
  const packageInfo = getPackageInfo();
  console.log(`📦 Package: ${packageInfo.name}`);
  console.log(`📋 Version: ${packageInfo.version}`);
  console.log(`📄 Description: ${packageInfo.description}\n`);
  
  // 检查Git状态
  console.log('🔍 Checking git status...');
  checkGitStatus();
  
  // 检查分支
  console.log('🌿 Checking current branch...');
  const branch = checkBranch();
  console.log(`✅ On branch: ${branch}\n`);
  
  // 检查标签
  console.log('🏷️  Checking if tag exists...');
  const tagName = checkTagExists(packageInfo.version);
  console.log(`✅ Tag '${tagName}' is available\n`);
  
  // 生成变更日志
  console.log('📝 Generating changelog...');
  const changelog = generateChangelog(packageInfo.version);
  
  if (isDryRun) {
    console.log('\n=== DRY RUN MODE ===');
    console.log('The following actions would be performed:');
    console.log(`1. Commit version changes`);
    console.log(`2. Create tag: ${tagName}`);
    console.log(`3. Push to origin/${branch}`);
    console.log(`4. Push tag: ${tagName}`);
    console.log(`\nChangelog:\n${changelog}`);
    console.log('\nTo perform the actual release, run without --dry-run flag.');
    return;
  }
  
  // 确认发布
  console.log('\n=== Release Summary ===');
  console.log(`Version: ${packageInfo.version}`);
  console.log(`Tag: ${tagName}`);
  console.log(`Branch: ${branch}`);
  console.log(`\nChangelog:\n${changelog}`);
  
  // 在实际环境中，这里可以添加用户确认
  // 为了自动化，我们直接进行发布
  
  createRelease(packageInfo, tagName, changelog);
}

main();
