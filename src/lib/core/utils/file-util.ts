/**
 * 文件工具类 — 平台自适应
 *
 * 三种运行环境：
 *   1. Web 浏览器：API 不可用，方法抛错（用 /api/data/[year] 走 HTTP 即可）
 *   2. Electron 桌面：window.electron 由 preload 注入，调用主进程 IPC
 *   3. SSR（Node.js 运行时）：理论上不会被调用（FileUtil 主要给客户端组件用）
 *
 * 用法：
 *   if (FileUtil.isDesktop()) {
 *     const data = await FileUtil.readJson<LotteryDraw[]>('/path/to/file.json');
 *   }
 */

declare global {
  interface Window {
    electron?: {
      readFile: (filePath: string) => Promise<string>;
      readJson: <T = unknown>(filePath: string) => Promise<T>;
      exists: (filePath: string) => Promise<boolean>;
      readdir: (dirPath: string) => Promise<string[]>;
      join: (...parts: string[]) => string;
      getAppPath: () => Promise<string>;
      getDataPath: () => Promise<string>;
    };
  }
}

export class FileUtil {
  /** 是否在 Electron 桌面环境 */
  static isDesktop(): boolean {
    return typeof window !== 'undefined' && !!window.electron;
  }

  /** 纯字符串路径拼接（不依赖平台） */
  static join(...paths: string[]): string {
    if (FileUtil.isDesktop()) {
      return window.electron!.join(...paths);
    }
    return paths.join('/').replace(/\\/g, '/');
  }

  /** 读取目录列表（仅桌面端） */
  static async readdir(dir: string): Promise<string[]> {
    if (FileUtil.isDesktop()) {
      return window.electron!.readdir(dir);
    }
    throw new Error('FileUtil.readdir: not available in browser; use API routes');
  }

  /** 读取 JSON 文件（仅桌面端） */
  static async readJson<T = unknown>(filePath: string): Promise<T> {
    if (FileUtil.isDesktop()) {
      return window.electron!.readJson<T>(filePath);
    }
    throw new Error('FileUtil.readJson: not available in browser; use /api/data/[year]?source=xxx');
  }

  /** 读取文本文件（仅桌面端） */
  static async readFile(filePath: string): Promise<string> {
    if (FileUtil.isDesktop()) {
      return window.electron!.readFile(filePath);
    }
    throw new Error('FileUtil.readFile: not available in browser');
  }

  /** 检查文件是否存在（仅桌面端） */
  static async exists(filePath: string): Promise<boolean> {
    if (FileUtil.isDesktop()) {
      return window.electron!.exists(filePath);
    }
    throw new Error('FileUtil.exists: not available in browser');
  }

  /** 获取应用 userData 路径（仅桌面端） */
  static async getAppPath(): Promise<string> {
    if (FileUtil.isDesktop()) {
      return window.electron!.getAppPath();
    }
    throw new Error('FileUtil.getAppPath: only available in Electron');
  }

  /** 获取数据目录路径（仅桌面端） */
  static async getDataPath(): Promise<string> {
    if (FileUtil.isDesktop()) {
      return window.electron!.getDataPath();
    }
    throw new Error('FileUtil.getDataPath: only available in Electron');
  }
}