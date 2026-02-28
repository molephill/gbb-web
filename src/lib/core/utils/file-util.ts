/**
 * 文件工具类
 */
export class FileUtil {
  /**
   * 递归读取目录下的所有文件
   * @param dir 目录路径
   * @param extensions 文件扩展名过滤，如 ['.json']
   * @returns 文件路径数组
   */
  static readdirSync(dir: string, extensions: string[] = []): string[] {
    // 这个方法在 Web 环境中需要从 API 获取
    // 在 Desktop 环境中使用 Node.js fs 模块
    throw new Error('Not implemented: Use platform-specific implementation');
  }

  /**
   * 读取 JSON 文件
   * @param path 文件路径
   * @returns JSON 对象
   */
  static readJsonSync<T = any>(path: string): T {
    // 这个方法在 Web 环境中需要从 API 获取
    // 在 Desktop 环境中使用 Node.js fs 模块
    throw new Error('Not implemented: Use platform-specific implementation');
  }

  /**
   * 检查文件是否存在
   * @param path 文件路径
   * @returns 是否存在
   */
  static existsSync(path: string): boolean {
    throw new Error('Not implemented: Use platform-specific implementation');
  }

  /**
   * 路径拼接
   * @param paths 路径片段
   * @returns 拼接后的路径
   */
  static join(...paths: string[]): string {
    return paths.join('/').replace(/\\/g, '/');
  }
}
