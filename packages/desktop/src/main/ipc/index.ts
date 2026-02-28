import { ipcMain, IpcMainInvokeEvent } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 注册所有 IPC 处理器
 */
export function registerIpcHandlers() {
  /**
   * 读取文件
   */
  ipcMain.handle('fs-readFile', async (_event: IpcMainInvokeEvent, filePath: string) => {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`读取文件失败: ${error}`);
    }
  });

  /**
   * 读取 JSON 文件
   */
  ipcMain.handle('fs-readJson', async (_event: IpcMainInvokeEvent, filePath: string) => {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`读取 JSON 文件失败: ${error}`);
    }
  });

  /**
   * 检查文件是否存在
   */
  ipcMain.handle('fs-exists', async (_event: IpcMainInvokeEvent, filePath: string) => {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  });

  /**
   * 读取目录
   */
  ipcMain.handle('fs-readdir', async (_event: IpcMainInvokeEvent, dirPath: string, extensions: string[] = []) => {
    try {
      const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const result: string[] = [];

      for (const file of files) {
        if (file.isFile()) {
          if (extensions.length === 0 || extensions.some(ext => file.name.endsWith(ext))) {
            result.push(path.join(dirPath, file.name));
          }
        }
      }

      return result;
    } catch (error) {
      throw new Error(`读取目录失败: ${error}`);
    }
  });

  /**
   * 获取应用路径
   */
  ipcMain.handle('app-getPath', async (_event: IpcMainInvokeEvent, name: string) => {
    return path.join(__dirname, '../../..', name);
  });

  /**
   * 获取数据路径
   */
  ipcMain.handle('app-getDataPath', async () => {
    // 返回 extends 目录路径
    return path.join(__dirname, '../../../extends');
  });
}
