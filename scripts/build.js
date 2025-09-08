#!/usr/bin/env node

/**
 * 构建脚本
 * 用于构建不同平台的应用程序包
 */

import fs from 'fs';
import path from 'path';
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
 * 获取包信息
 */
function getPackageInfo() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return {
      name: packageJson.name,
      version: packageJson.version
    };
  } catch (error) {
    console.error('Error reading package.json:', error.message);
    process.exit(1);
  }
}

/**
 * 清理构建目录
 */
function cleanBuildDir() {
  console.log('🧹 Cleaning build directories...');
  
  const dirsToClean = [
    'src-tauri/target/release',
    'dist',
    'build'
  ];
  
  dirsToClean.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`  Removing ${dir}`);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

/**
 * 构建前端
 */
function buildFrontend() {
  console.log('🔨 Building frontend...');
  execCommand('npm run build');
}

/**
 * 构建Tauri应用
 */
function buildTauri(target = null) {
  console.log('🦀 Building Tauri application...');
  
  let command = 'npm run tauri:build';
  if (target) {
    command += ` -- --target ${target}`;
  }
  
  execCommand(command);
}

/**
 * 获取构建产物信息
 */
function getBuildArtifacts() {
  const artifacts = [];
  const bundleDir = 'src-tauri/target/release/bundle';
  
  if (!fs.existsSync(bundleDir)) {
    console.warn('Warning: Bundle directory not found');
    return artifacts;
  }
  
  // 查找不同平台的构建产物
  const platforms = ['msi', 'nsis', 'deb', 'rpm', 'dmg', 'app'];
  
  platforms.forEach(platform => {
    const platformDir = path.join(bundleDir, platform);
    if (fs.existsSync(platformDir)) {
      const files = fs.readdirSync(platformDir);
      files.forEach(file => {
        const filePath = path.join(platformDir, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          artifacts.push({
            platform,
            file,
            path: filePath,
            size: stats.size
          });
        }
      });
    }
  });
  
  return artifacts;
}

/**
 * 显示构建结果
 */
function showBuildResults(artifacts, packageInfo) {
  console.log('\n✅ Build completed successfully!');
  console.log(`📦 Package: ${packageInfo.name} v${packageInfo.version}`);
  
  if (artifacts.length === 0) {
    console.log('⚠️  No build artifacts found');
    return;
  }
  
  console.log('\n📁 Build artifacts:');
  artifacts.forEach(artifact => {
    const sizeInMB = (artifact.size / 1024 / 1024).toFixed(2);
    console.log(`  ${artifact.platform.toUpperCase()}: ${artifact.file} (${sizeInMB} MB)`);
  });
  
  console.log('\n📍 Artifacts location: src-tauri/target/release/bundle/');
}

/**
 * 验证构建环境
 */
function validateBuildEnvironment() {
  console.log('🔍 Validating build environment...');
  
  // 检查Node.js版本
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    console.log(`  Node.js: ${nodeVersion}`);
  } catch (error) {
    console.error('Error: Node.js not found');
    process.exit(1);
  }
  
  // 检查Rust版本
  try {
    const rustVersion = execSync('rustc --version', { encoding: 'utf8' }).trim();
    console.log(`  Rust: ${rustVersion}`);
  } catch (error) {
    console.error('Error: Rust not found');
    process.exit(1);
  }
  
  // 检查Tauri CLI
  try {
    const tauriVersion = execSync('npm run tauri -- --version', { encoding: 'utf8' }).trim();
    console.log(`  Tauri CLI: ${tauriVersion}`);
  } catch (error) {
    console.error('Error: Tauri CLI not found');
    process.exit(1);
  }
  
  console.log('✅ Build environment validated\n');
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const options = {
    clean: args.includes('--clean'),
    target: args.find(arg => arg.startsWith('--target='))?.split('=')[1],
    skipFrontend: args.includes('--skip-frontend'),
    validate: args.includes('--validate')
  };
  
  console.log('🚀 Starting build process...\n');
  
  // 获取包信息
  const packageInfo = getPackageInfo();
  console.log(`📦 Building ${packageInfo.name} v${packageInfo.version}\n`);
  
  // 验证构建环境
  if (options.validate) {
    validateBuildEnvironment();
  }
  
  // 清理构建目录
  if (options.clean) {
    cleanBuildDir();
    console.log('');
  }
  
  try {
    // 构建前端
    if (!options.skipFrontend) {
      buildFrontend();
      console.log('');
    }
    
    // 构建Tauri应用
    buildTauri(options.target);
    console.log('');
    
    // 获取构建产物
    const artifacts = getBuildArtifacts();
    
    // 显示构建结果
    showBuildResults(artifacts, packageInfo);
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

main();
