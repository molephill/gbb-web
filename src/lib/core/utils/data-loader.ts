import type { LotteryDraw } from '../types';

/**
 * 数据加载器
 * 负责从不同数据源加载彩票数据
 */
export class DataLoader {
  private cache: Map<string, LotteryDraw[]> = new Map();
  private allData: LotteryDraw[] = [];
  private filteredData: Map<number, any[][]> = new Map();

  /**
   * 设置所有数据
   */
  setAllData(data: LotteryDraw[]): void {
    this.allData = data.sort((a, b) => Number(a.id) - Number(b.id));
  }

  /**
   * 获取所有数据
   */
  getAllData(force = false): LotteryDraw[] {
    return this.allData;
  }

  /**
   * 加载 JSON 数据
   * @param json JSON 对象
   */
  loadFromJson(json: Record<string, LotteryDraw>): void {
    this.allData = [];
    for (const key in json) {
      this.allData.push(json[key]);
    }
    this.allData.sort((a, b) => Number(a.id) - Number(b.id));
  }

  /**
   * 加载 JSON 数组数据
   * @param data JSON 数组
   */
  loadFromArray(data: LotteryDraw[]): void {
    this.allData = [...data].sort((a, b) => Number(a.id) - Number(b.id));
  }

  /**
   * 清空数据
   */
  clear(): void {
    this.allData = [];
    this.cache.clear();
    this.filteredData.clear();
  }

  /**
   * 获取数据长度
   */
  get length(): number {
    return this.allData.length;
  }

  /**
   * 获取指定索引的数据
   */
  at(index: number): LotteryDraw | undefined {
    return this.allData[index];
  }

  /**
   * 获取最小最大值信息
   */
  getMinMax(): { minId: number; maxId: number; minDate: string; maxDate: string } {
    if (this.allData.length === 0) {
      return { minId: 0, maxId: 0, minDate: '', maxDate: '' };
    }

    let minId = Number.MAX_SAFE_INTEGER;
    let maxId = Number.MIN_SAFE_INTEGER;
    let minDate: string | null = null;
    let maxDate: string | null = null;

    for (const draw of this.allData) {
      const numId = Number(draw.id);
      if (minId > numId) minId = numId;
      if (maxId < numId) maxId = numId;

      if (minDate === null || minDate > draw.draw_date) minDate = draw.draw_date;
      if (maxDate === null || maxDate < draw.draw_date) maxDate = draw.draw_date;
    }

    return { minId, maxId, minDate: minDate || '', maxDate: maxDate || '' };
  }

  /**
   * 设置过滤后的数据
   */
  setFilteredData(menuId: number, data: any[][]): void {
    this.filteredData.set(menuId, data);
  }

  /**
   * 获取过滤后的数据
   */
  getFilteredData(menuId: number): any[][] | undefined {
    return this.filteredData.get(menuId);
  }
}

export const dataLoader = new DataLoader();
