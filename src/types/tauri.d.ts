/**
 * Tauri API 类型声明
 * 为 Tauri v2 API 提供类型支持
 */

declare module '@tauri-apps/api/dialog' {
  export interface OpenDialogOptions {
    title?: string;
    defaultPath?: string;
    directory?: boolean;
    multiple?: boolean;
    filters?: Array<{
      name: string;
      extensions: string[];
    }>;
  }

  export interface SaveDialogOptions {
    title?: string;
    defaultPath?: string;
    filters?: Array<{
      name: string;
      extensions: string[];
    }>;
  }

  export function open(options?: OpenDialogOptions): Promise<string | string[] | null>;
  export function save(options?: SaveDialogOptions): Promise<string | null>;

  // 默认导出以支持不同的导入方式
  const dialog: {
    open: typeof open;
    save: typeof save;
  };
  export default dialog;
}

declare module '@tauri-apps/api/core' {
  export function invoke<T = any>(command: string, args?: Record<string, any>): Promise<T>;

  // 默认导出以支持不同的导入方式
  const core: {
    invoke: typeof invoke;
  };
  export default core;
}

declare module '@tauri-apps/api/event' {
  export interface Event<T> {
    event: string;
    windowLabel: string;
    payload: T;
    id: number;
  }

  export type EventCallback<T> = (event: Event<T>) => void;
  export type UnlistenFn = () => void;

  export function listen<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn>;
  export function once<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn>;
  export function emit(event: string, payload?: any): Promise<void>;

  // 默认导出以支持不同的导入方式
  const eventApi: {
    listen: typeof listen;
    once: typeof once;
    emit: typeof emit;
  };
  export default eventApi;
}

declare module '@tauri-apps/api/fs' {
  export interface FileEntry {
    path: string;
    name?: string;
  }

  export interface DirOptions {
    dir?: string;
    recursive?: boolean;
  }

  export function readTextFile(path: string, options?: { dir?: string }): Promise<string>;
  export function writeTextFile(path: string, contents: string, options?: { dir?: string }): Promise<void>;
  export function readDir(path: string, options?: DirOptions): Promise<FileEntry[]>;
  export function createDir(path: string, options?: DirOptions): Promise<void>;
  export function removeFile(path: string, options?: { dir?: string }): Promise<void>;
  export function removeDir(path: string, options?: DirOptions): Promise<void>;
  export function copyFile(source: string, destination: string, options?: { dir?: string }): Promise<void>;
  export function exists(path: string, options?: { dir?: string }): Promise<boolean>;
}

declare module '@tauri-apps/api/path' {
  export function appDataDir(): Promise<string>;
  export function appConfigDir(): Promise<string>;
  export function appCacheDir(): Promise<string>;
  export function appLocalDataDir(): Promise<string>;
  export function appLogDir(): Promise<string>;
  export function audioDir(): Promise<string>;
  export function cacheDir(): Promise<string>;
  export function configDir(): Promise<string>;
  export function dataDir(): Promise<string>;
  export function desktopDir(): Promise<string>;
  export function documentDir(): Promise<string>;
  export function downloadDir(): Promise<string>;
  export function executableDir(): Promise<string>;
  export function fontDir(): Promise<string>;
  export function homeDir(): Promise<string>;
  export function localDataDir(): Promise<string>;
  export function pictureDir(): Promise<string>;
  export function publicDir(): Promise<string>;
  export function resourceDir(): Promise<string>;
  export function runtimeDir(): Promise<string>;
  export function templateDir(): Promise<string>;
  export function videoDir(): Promise<string>;
  export function join(...paths: string[]): Promise<string>;
  export function dirname(path: string): Promise<string>;
  export function basename(path: string, ext?: string): Promise<string>;
  export function extname(path: string): Promise<string>;
  export function isAbsolute(path: string): Promise<boolean>;
  export function resolve(...paths: string[]): Promise<string>;
  export function normalize(path: string): Promise<string>;
}

declare module '@tauri-apps/plugin-os' {
  export function platform(): Promise<string>;
  export function version(): Promise<string>;
  export function type(): Promise<string>;
  export function arch(): Promise<string>;
  export function tempdir(): Promise<string>;
}

declare module '@tauri-apps/plugin-opener' {
  export function open(path: string): Promise<void>;
}

// 全局 Tauri 对象类型声明
declare global {
  interface Window {
    __TAURI__?: {
      invoke: <T = any>(command: string, args?: Record<string, any>) => Promise<T>;
      dialog: {
        open: (options?: any) => Promise<string | string[] | null>;
        save: (options?: any) => Promise<string | null>;
      };
      fs: any;
      path: any;
      os: any;
    };
  }
}

export {};
