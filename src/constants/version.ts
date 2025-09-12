/**
 * 应用版本信息
 * 此文件由版本管理脚本自动更新，请勿手动修改
 */

export const APP_VERSION = '0.0.9';
export const APP_NAME = 'ProtoTool';
export const APP_DESCRIPTION = '跨平台的网络报文工作站，集连接调试、协议解析、规则/插件扩展、数据筛选存储、AI 辅助与批量导出为一体';

// 版本信息对象
export const VERSION_INFO = {
  version: APP_VERSION,
  name: APP_NAME,
  description: APP_DESCRIPTION,
  buildDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
} as const;

// 获取完整版本字符串
export function getFullVersionString(): string {
  return `${APP_NAME} v${APP_VERSION}`;
}

// 获取版本显示文本
export function getVersionDisplayText(): string {
  return `版本 ${APP_VERSION}`;
}