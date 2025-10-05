/**
 * Tauri API 工具函数
 * 提供安全的Tauri API调用，专注于桌面端环境
 */

// 安全的文件保存对话框
export const showSaveDialog = async (options: {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}): Promise<string | null> => {
  try {
    // 尝试使用 Tauri v2 API
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      const { save } = (window as any).__TAURI__.dialog;
      const result = await save(options);
      return result || null;
    }

    // 后备方案：尝试动态导入
    try {
      const modulePath = '@tauri-apps/api/' + 'dialog';
      const tauriDialog = await import(/* @vite-ignore */ modulePath);
      if (tauriDialog?.save) {
        const result = await tauriDialog.save(options);
        return result || null;
      }
    } catch (importError) {
      console.warn('Failed to import @tauri-apps/api/dialog:', importError);
    }

    console.warn('Tauri dialog API not available');
    return null;
  } catch (error) {
    console.error('Failed to show save dialog:', error);
    return null;
  }
};

// 安全的文件打开对话框
export const showOpenDialog = async (options: {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  multiple?: boolean;
  directory?: boolean;
}): Promise<string | string[] | null> => {
  console.log('showOpenDialog called with options:', options);

  try {
    console.log('Attempting to access Tauri dialog API...');

    // 尝试使用 Tauri v2 API
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      const { open } = (window as any).__TAURI__.dialog;
      const result = await open(options);
      console.log('Dialog result:', result, 'Type:', typeof result);
      return result || null;
    }

    // 后备方案：尝试动态导入
    try {
      const modulePath = '@tauri-apps/api/' + 'dialog';
      const tauriDialog = await import(/* @vite-ignore */ modulePath);
      if (tauriDialog?.open) {
        console.log('Tauri dialog module imported successfully');
        const result = await tauriDialog.open(options);
        console.log('Dialog result:', result, 'Type:', typeof result);
        return result || null;
      }
    } catch (importError) {
      console.warn('Failed to import @tauri-apps/api/dialog:', importError);
    }

    console.warn('Tauri dialog API not available');
    return null;
  } catch (error) {
    console.error('Failed to show open dialog:', error);
    return null;
  }
};

// 安全的文件夹选择对话框
export const showDirectoryDialog = async (options: {
  title?: string;
  defaultPath?: string;
}): Promise<string | null> => {
  const result = await showOpenDialog({
    ...options,
    directory: true,
    multiple: false
  });
  return typeof result === 'string' ? result : null;
};

// 安全的Tauri invoke调用
export const safeTauriInvoke = async <T>(
  command: string,
  args?: Record<string, any>
): Promise<T | null> => {
  try {
    // 尝试使用 Tauri v2 API
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      const result = await (window as any).__TAURI__.invoke(command, args);
      return result as T;
    }

    // 后备方案：尝试动态导入
    try {
      const modulePath = '@tauri-apps/api/' + 'core';
      const tauriCore = await import(/* @vite-ignore */ modulePath);
      if (tauriCore?.invoke) {
        const result = await tauriCore.invoke(command, args);
        return result as T;
      }
    } catch (importError) {
      console.warn('Failed to import @tauri-apps/api/core:', importError);
    }

    console.warn('Tauri core API not available');
    return null;
  } catch (error) {
    console.error(`Failed to invoke Tauri command ${command}:`, error);
    throw error; // 重新抛出错误，让调用者处理
  }
};

// 检查Tauri API可用性
export const checkTauriApiAvailability = async (): Promise<{
  available: boolean;
  apis: {
    dialog: boolean;
    invoke: boolean;
    fs: boolean;
    path: boolean;
  };
}> => {
  const result = {
    available: true, // 假设在桌面环境中总是可用
    apis: {
      dialog: false,
      invoke: false,
      fs: false,
      path: false,
    },
  };

  try {
    // 首先检查全局 Tauri 对象
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      result.apis.dialog = !!(window as any).__TAURI__.dialog;
      result.apis.invoke = !!(window as any).__TAURI__.invoke;
      result.apis.fs = !!(window as any).__TAURI__.fs;
      result.apis.path = !!(window as any).__TAURI__.path;
      result.available = true;
      return result;
    }

    // 后备方案：检查各个API的可用性
    try {
      const dialogPath = '@tauri-apps/api/' + 'dialog';
      const dialogApi = await import(/* @vite-ignore */ dialogPath).catch(() => null);
      result.apis.dialog = !!dialogApi;
    } catch {
      result.apis.dialog = false;
    }

    try {
      const corePath = '@tauri-apps/api/' + 'core';
      const tauriApi = await import(/* @vite-ignore */ corePath).catch(() => null);
      result.apis.invoke = !!tauriApi;
    } catch {
      result.apis.invoke = false;
    }

    try {
      const fsPath = '@tauri-apps/api/' + 'fs';
      const fsApi = await import(/* @vite-ignore */ fsPath).catch(() => null);
      result.apis.fs = !!fsApi;
    } catch {
      result.apis.fs = false;
    }

    try {
      const pathPath = '@tauri-apps/api/' + 'path';
      const pathApi = await import(/* @vite-ignore */ pathPath).catch(() => null);
      result.apis.path = !!pathApi;
    } catch {
      result.apis.path = false;
    }

    // 如果所有API都不可用，则认为不在Tauri环境中
    result.available = Object.values(result.apis).some(available => available);
  } catch (error) {
    console.error('Error checking Tauri API availability:', error);
    result.available = false;
  }

  return result;
};

// 获取应用数据目录
export const getAppDataDir = async (): Promise<string | null> => {
  try {
    // 尝试使用 Tauri v2 API
    if (typeof window !== 'undefined' && (window as any).__TAURI__?.path) {
      return await (window as any).__TAURI__.path.appDataDir();
    }

    // 后备方案：尝试动态导入
    try {
      const modulePath = '@tauri-apps/api/' + 'path';
      const pathApi = await import(/* @vite-ignore */ modulePath);
      if (pathApi?.appDataDir) {
        return await pathApi.appDataDir();
      }
    } catch (importError) {
      console.warn('Failed to import @tauri-apps/api/path:', importError);
    }

    return null;
  } catch (error) {
    console.error('Failed to get app data directory:', error);
    return null;
  }
};

// 获取下载目录
export const getDownloadDir = async (): Promise<string | null> => {
  try {
    // 尝试使用 Tauri v2 API
    if (typeof window !== 'undefined' && (window as any).__TAURI__?.path) {
      return await (window as any).__TAURI__.path.downloadDir();
    }

    // 后备方案：尝试动态导入
    try {
      const modulePath = '@tauri-apps/api/' + 'path';
      const pathApi = await import(/* @vite-ignore */ modulePath);
      if (pathApi?.downloadDir) {
        return await pathApi.downloadDir();
      }
    } catch (importError) {
      console.warn('Failed to import @tauri-apps/api/path:', importError);
    }

    return null;
  } catch (error) {
    console.error('Failed to get download directory:', error);
    return null;
  }
};

// 安全的文件读取
export const readTextFile = async (filePath: string): Promise<string> => {
  try {
    // 尝试使用 Tauri v2 API
    if (typeof window !== 'undefined' && (window as any).__TAURI__?.fs) {
      return await (window as any).__TAURI__.fs.readTextFile(filePath);
    }

    // 后备方案：尝试动态导入
    try {
      const modulePath = '@tauri-apps/api/' + 'fs';
      const fsApi = await import(/* @vite-ignore */ modulePath);
      if (fsApi?.readTextFile) {
        return await fsApi.readTextFile(filePath);
      }
    } catch (importError) {
      console.warn('Failed to import @tauri-apps/api/fs:', importError);
    }

    throw new Error('Tauri fs API not available');
  } catch (error) {
    console.error('Failed to read file:', error);
    throw error;
  }
};

// 安全的文件写入
export const writeTextFile = async (filePath: string, content: string): Promise<void> => {
  try {
    // 尝试使用 Tauri v2 API
    if (typeof window !== 'undefined' && (window as any).__TAURI__?.fs) {
      await (window as any).__TAURI__.fs.writeTextFile(filePath, content);
      return;
    }

    // 后备方案：尝试动态导入
    try {
      const modulePath = '@tauri-apps/api/' + 'fs';
      const fsApi = await import(/* @vite-ignore */ modulePath);
      if (fsApi?.writeTextFile) {
        await fsApi.writeTextFile(filePath, content);
        return;
      }
    } catch (importError) {
      console.warn('Failed to import @tauri-apps/api/fs:', importError);
    }

    throw new Error('Tauri fs API not available');
  } catch (error) {
    console.error('Failed to write file:', error);
    throw error;
  }
};
