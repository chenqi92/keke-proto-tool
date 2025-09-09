#!/usr/bin/env node

/**
 * 版本管理脚本
 * 用于更新项目版本号，包括 package.json 和 Cargo.toml
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PACKAGE_JSON_PATH = 'package.json';
const CARGO_TOML_PATH = 'src-tauri/Cargo.toml';
const TAURI_CONF_PATH = 'src-tauri/tauri.conf.json';
const VERSION_TS_PATH = 'src/constants/version.ts';

/**
 * 读取JSON文件
 */
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * 写入JSON文件
 */
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * 读取TOML文件
 */
function readTomlFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * 写入TOML文件
 */
function writeTomlFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content);
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * 更新Cargo.toml中的版本号
 */
function updateCargoVersion(newVersion) {
  const content = readTomlFile(CARGO_TOML_PATH);
  const updatedContent = content.replace(
    /^version\s*=\s*"[^"]*"/m,
    `version = "${newVersion}"`
  );
  writeTomlFile(CARGO_TOML_PATH, updatedContent);
}

/**
 * 更新tauri.conf.json中的版本号
 */
function updateTauriVersion(newVersion) {
  const config = readJsonFile(TAURI_CONF_PATH);
  // Check if version is already set to reference package.json
  if (config.version === "../package.json") {
    console.log('  - Tauri config already references package.json version');
    return;
  }
  config.version = "../package.json";
  writeJsonFile(TAURI_CONF_PATH, config);
}

/**
 * 更新前端版本常量文件
 */
function updateFrontendVersion(newVersion) {
  const packageJson = readJsonFile(PACKAGE_JSON_PATH);
  const content = `/**
 * 应用版本信息
 * 此文件由版本管理脚本自动更新，请勿手动修改
 */

export const APP_VERSION = '${newVersion}';
export const APP_NAME = 'ProtoTool';
export const APP_DESCRIPTION = '${packageJson.description || '跨平台的网络报文工作站'}';

// 版本信息对象
export const VERSION_INFO = {
  version: APP_VERSION,
  name: APP_NAME,
  description: APP_DESCRIPTION,
  buildDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
} as const;

// 获取完整版本字符串
export function getFullVersionString(): string {
  return \`\${APP_NAME} v\${APP_VERSION}\`;
}

// 获取版本显示文本
export function getVersionDisplayText(): string {
  return \`版本 \${APP_VERSION}\`;
}`;

  fs.writeFileSync(VERSION_TS_PATH, content, 'utf8');
}

/**
 * 验证版本号格式
 */
function validateVersion(version) {
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  return semverRegex.test(version);
}

/**
 * 增加版本号
 */
function bumpVersion(currentVersion, type = 'patch') {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * 执行Git命令
 */
function gitCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error(`Git command failed: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * 检查是否有未提交的更改
 */
function checkGitStatus(strict = false) {
  if (!strict) {
    console.log('Info: Allowing version update with uncommitted changes');
    return;
  }

  const status = gitCommand('git status --porcelain');
  if (status) {
    console.error('Error: There are uncommitted changes. Please commit or stash them first.');
    console.error('Use without --strict flag to allow uncommitted changes.');
    process.exit(1);
  }
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Check for --strict flag
  const strictIndex = args.indexOf('--strict');
  const strict = strictIndex !== -1;
  if (strict) {
    args.splice(strictIndex, 1); // Remove --strict from args
  }

  if (!command) {
    console.log('Usage:');
    console.log('  node scripts/version.js bump [major|minor|patch] [--strict]  # 自动增加版本号');
    console.log('  node scripts/version.js set <version> [--strict]             # 设置指定版本号');
    console.log('  node scripts/version.js current                              # 显示当前版本号');
    console.log('');
    console.log('Options:');
    console.log('  --strict   Require clean git status (no uncommitted changes)');
    process.exit(1);
  }

  // 读取当前版本
  const packageJson = readJsonFile(PACKAGE_JSON_PATH);
  const currentVersion = packageJson.version;

  switch (command) {
    case 'current':
      console.log(`Current version: ${currentVersion}`);
      break;

    case 'bump': {
      const type = args[1] || 'patch';
      if (!['major', 'minor', 'patch'].includes(type)) {
        console.error('Error: Invalid bump type. Use major, minor, or patch.');
        process.exit(1);
      }

      checkGitStatus(strict);

      const newVersion = bumpVersion(currentVersion, type);
      console.log(`Bumping version from ${currentVersion} to ${newVersion}`);

      // 更新所有文件中的版本号
      packageJson.version = newVersion;
      writeJsonFile(PACKAGE_JSON_PATH, packageJson);
      updateCargoVersion(newVersion);
      updateTauriVersion(newVersion);
      updateFrontendVersion(newVersion);

      console.log('Version updated successfully!');
      console.log('Files updated:');
      console.log(`  - ${PACKAGE_JSON_PATH}`);
      console.log(`  - ${CARGO_TOML_PATH}`);
      console.log(`  - ${TAURI_CONF_PATH}`);
      console.log(`  - ${VERSION_TS_PATH}`);
      break;
    }

    case 'set': {
      const newVersion = args[1];
      if (!newVersion) {
        console.error('Error: Please specify a version number.');
        process.exit(1);
      }

      if (!validateVersion(newVersion)) {
        console.error('Error: Invalid version format. Use semantic versioning (e.g., 1.0.0).');
        process.exit(1);
      }

      checkGitStatus(strict);

      console.log(`Setting version from ${currentVersion} to ${newVersion}`);

      // 更新所有文件中的版本号
      packageJson.version = newVersion;
      writeJsonFile(PACKAGE_JSON_PATH, packageJson);
      updateCargoVersion(newVersion);
      updateTauriVersion(newVersion);
      updateFrontendVersion(newVersion);

      console.log('Version updated successfully!');
      console.log('Files updated:');
      console.log(`  - ${PACKAGE_JSON_PATH}`);
      console.log(`  - ${CARGO_TOML_PATH}`);
      console.log(`  - ${TAURI_CONF_PATH}`);
      console.log(`  - ${VERSION_TS_PATH}`);
      break;
    }

    default:
      console.error(`Error: Unknown command '${command}'`);
      process.exit(1);
  }
}

main();
