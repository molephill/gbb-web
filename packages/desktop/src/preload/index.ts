import { contextBridge, ipcRenderer } from 'electron';

/**
 * 暴露安全的 API 到渲染进程
 */
const electronAPI = {
  // 文件系统操作
  readFile: (filePath: string) => ipcRenderer.invoke('fs-readFile', filePath),
  readJson: (filePath: string) => ipcRenderer.invoke('fs-readJson', filePath),
  exists: (filePath: string) => ipcRenderer.invoke('fs-exists', filePath),
  readdir: (dirPath: string, extensions: string[]) =>
    ipcRenderer.invoke('fs-readdir', dirPath, extensions),

  // 路径操作
  join: (...paths: string[]) => paths.join('/').replace(/\\/g, '/'),

  // 应用路径
  getAppPath: (name: string) => ipcRenderer.invoke('app-getPath', name),
  getDataPath: () => ipcRenderer.invoke('app-getDataPath'),

  // 平台信息
  platform: process.platform,
};

/**
 * 将 API 暴露为 window.electron
 */
contextBridge.exposeInMainWorld('electron', electronAPI);

/**
 * 类型声明
 */
declare global {
  interface Window {
    electron: typeof electronAPI;
  }
}
