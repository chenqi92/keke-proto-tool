/**
 * Tauri API 工具函数
 * 提供安全的Tauri API调用，在非Tauri环境中提供fallback
 */

// 检查是否在Tauri环境中
export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
};

// 安全的文件保存对话框
export const showSaveDialog = async (options: {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}): Promise<string | null> => {
  if (!isTauriEnvironment()) {
    console.warn('Tauri environment not detected, save dialog not available');
    return null;
  }

  try {
    // 使用字符串拼接避免Vite静态分析
    const dialogModule = '@tauri-apps/api/' + 'dialog';
    const tauriDialog = await import(/* @vite-ignore */ dialogModule).catch(() => null);

    if (!tauriDialog?.save) {
      console.warn('Tauri dialog API not available');
      return null;
    }

    const result = await tauriDialog.save(options);
    return result || null;
  } catch (error) {
    console.error('Failed to show save dialog:', error);
    return null;
  }
};

// 安全的文件夹选择对话框
export const showDirectoryDialog = async (options: {
  title?: string;
  defaultPath?: string;
}): Promise<string | null> => {
  if (!isTauriEnvironment()) {
    console.warn('Tauri environment not detected, directory dialog not available');
    return null;
  }

  try {
    // 使用字符串拼接避免Vite静态分析
    const dialogModule = '@tauri-apps/api/' + 'dialog';
    const tauriDialog = await import(/* @vite-ignore */ dialogModule).catch(() => null);

    if (!tauriDialog?.open) {
      console.warn('Tauri dialog API not available');
      return null;
    }

    const result = await tauriDialog.open({
      ...options,
      directory: true,
      multiple: false
    });

    return typeof result === 'string' ? result : null;
  } catch (error) {
    console.error('Failed to show directory dialog:', error);
    return null;
  }
};

// 安全的Tauri invoke调用
export const safeTauriInvoke = async <T>(
  command: string,
  args?: Record<string, any>
): Promise<T | null> => {
  if (!isTauriEnvironment()) {
    console.warn('Tauri environment not detected, invoke not available');
    return null;
  }

  try {
    // 使用字符串拼接避免Vite静态分析
    const tauriModule = '@tauri-apps/api/' + 'core';
    const tauriApi = await import(/* @vite-ignore */ tauriModule).catch(() => null);

    if (!tauriApi?.invoke) {
      console.warn('Tauri invoke API not available');
      return null;
    }

    const result = await (tauriApi.invoke as any)(command, args);
    return result as T;
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
    available: isTauriEnvironment(),
    apis: {
      dialog: false,
      invoke: false,
      fs: false,
      path: false,
    },
  };

  if (!result.available) {
    return result;
  }

  try {
    // 使用字符串拼接避免Vite静态分析
    const dialogModule = '@tauri-apps/api/' + 'dialog';
    const coreModule = '@tauri-apps/api/' + 'core';
    const fsModule = '@tauri-apps/api/' + 'fs';
    const pathModule = '@tauri-apps/api/' + 'path';

    // 检查各个API的可用性
    const [dialogApi, tauriApi, fsApi, pathApi] = await Promise.allSettled([
      import(/* @vite-ignore */ dialogModule).catch(() => null),
      import(/* @vite-ignore */ coreModule).catch(() => null),
      import(/* @vite-ignore */ fsModule).catch(() => null),
      import(/* @vite-ignore */ pathModule).catch(() => null),
    ]);

    result.apis.dialog = dialogApi.status === 'fulfilled' && !!dialogApi.value;
    result.apis.invoke = tauriApi.status === 'fulfilled' && !!tauriApi.value;
    result.apis.fs = fsApi.status === 'fulfilled' && !!fsApi.value;
    result.apis.path = pathApi.status === 'fulfilled' && !!pathApi.value;
  } catch (error) {
    console.error('Error checking Tauri API availability:', error);
  }

  return result;
};

// 获取应用数据目录
export const getAppDataDir = async (): Promise<string | null> => {
  if (!isTauriEnvironment()) {
    return null;
  }

  try {
    const pathModule = '@tauri-apps/api/' + 'path';
    const pathApi = await import(/* @vite-ignore */ pathModule).catch(() => null);

    if (!pathApi?.appDataDir) {
      return null;
    }

    return await pathApi.appDataDir();
  } catch (error) {
    console.error('Failed to get app data directory:', error);
    return null;
  }
};

// 获取下载目录
export const getDownloadDir = async (): Promise<string | null> => {
  if (!isTauriEnvironment()) {
    return null;
  }

  try {
    const pathModule = '@tauri-apps/api/' + 'path';
    const pathApi = await import(/* @vite-ignore */ pathModule).catch(() => null);

    if (!pathApi?.downloadDir) {
      return null;
    }

    return await pathApi.downloadDir();
  } catch (error) {
    console.error('Failed to get download directory:', error);
    return null;
  }
};
