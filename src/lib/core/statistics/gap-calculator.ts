import type { ResultInfo, YearGapInfo, LotteryDraw } from '../types';

/**
 * 统计信息管理器
 */
class StatisticsManager {
  private statistics = new Map<number, Map<number, Map<number, ResultInfo>>>();

  /**
   * 获取统计信息
   */
  getResultInfo(menuId: number, subMenuId: number, index: number): ResultInfo | undefined {
    const subStatistics = this.statistics.get(menuId);
    const menuStatistics = subStatistics?.get(subMenuId);
    return menuStatistics?.get(index);
  }

  /**
   * 获取间隔信息文本
   */
  getGapInfo(menuId: number, subMenuId: number, index: number): string {
    const kStatistics = this.getResultInfo(menuId, subMenuId, index);
    if (kStatistics) {
      const timeCount = kStatistics.scoreCount || 0;
      return `最大间隔:${kStatistics.maxGapCount}\n当前间隔:${kStatistics.gapCount || 0}\n总共中奖:${timeCount}`;
    }
    return 'error';
  }

  /**
   * 清除指定菜单的统计信息
   */
  clear(menuId: number): void {
    this.statistics.delete(menuId);
  }

  /**
   * 获取或创建统计信息
   */
  getOrCreate(
    menuId: number,
    subMenuId: number,
    index: number,
    title: string,
    placement: 'left' | 'right'
  ): ResultInfo {
    let subStatistics = this.statistics.get(menuId);
    if (!subStatistics) {
      subStatistics = new Map();
      this.statistics.set(menuId, subStatistics);
    }

    let menuStatistics = subStatistics.get(subMenuId);
    if (!menuStatistics) {
      menuStatistics = new Map();
      subStatistics.set(subMenuId, menuStatistics);
    }

    let kStatistics = menuStatistics.get(index);
    if (!kStatistics) {
      kStatistics = {
        gapCount: 0,
        scoreCount: 0,
        maxGapCount: 0,
        maxGapStartTime: '',
        maxGapEndTime: '',
        maxGapStartId: '',
        maxGapEndId: '',
        title,
        placement,
      };
      menuStatistics.set(index, kStatistics);
    } else {
      // 更新 title 和 placement，确保使用最新的值
      if (!kStatistics.title || kStatistics.title.startsWith('【】')) {
        kStatistics.title = title;
      }
      if (!kStatistics.placement) {
        kStatistics.placement = placement;
      }
    }

    return kStatistics;
  }

  /**
   * 填充年度统计信息
   */
  fillYear(kStatistics: ResultInfo, show: boolean, drawData: LotteryDraw): YearGapInfo {
    const year = drawData.draw_date.split('-')[0] as string;
    let yearGapList = kStatistics.yearGapList || {};
    kStatistics.yearGapList = yearGapList;

    let yearObj = yearGapList[year] as YearGapInfo | undefined;
    if (!yearObj) {
      yearObj = { totalCount: 0 };
      yearGapList[year] = yearObj;
    }

    yearObj.totalCount = (yearObj.totalCount || 0) + 1;
    const gapTime = yearObj.gapCount || 0;

    if (show) {
      const continueCount = yearObj.continueCount || 0;
      yearObj.continueCount = continueCount + 1;
      const yearCount = yearObj.scoreCount || 0;
      yearObj.scoreCount = yearCount + 1;
      const maxGapTime = yearObj.maxGapCount || 0;

      if (gapTime > maxGapTime) {
        yearObj.maxGapCount = gapTime;
        yearObj.maxGapStartTime = yearObj.maxGapStartTime || yearObj.gapStartTime || '';
        yearObj.maxGapEndTime = drawData.draw_date;
        yearObj.maxGapStartId = yearObj.maxGapStartId || yearObj.gapStartId || '';
        yearObj.maxGapEndId = drawData.id;
      }
      yearObj.gapCount = 0;
    } else {
      yearObj.continueCount = 0;

      if (gapTime === 0) {
        yearObj.gapStartTime = drawData.draw_date;
        yearObj.gapStartId = drawData.id;
        if (!yearObj.gapList) {
          yearObj.gapListIndex = 0;
          yearObj.gapList = [];
        } else {
          yearObj.gapListIndex = (yearObj.gapListIndex || 0) + 1;
        }
      }
      yearObj.gapCount = gapTime + 1;

      const gapIndex = yearObj.gapListIndex || 0;
      let gapList = yearObj.gapList || [];
      if (!yearObj.gapList) {
        yearObj.gapList = gapList;
      }
      let gapSubList = gapList[gapIndex];
      if (!gapSubList) {
        gapSubList = [];
        gapList[gapIndex] = gapSubList;
      }
      gapSubList.push(drawData);
    }

    return yearObj;
  }

  /**
   * 更新统计信息
   */
  update(
    kStatistics: ResultInfo,
    show: boolean,
    drawData: LotteryDraw,
    menuName: string,
    rowName: string,
    colName: string
  ): void {
    const yearObj = this.fillYear(kStatistics, show, drawData);
    const maxGapCount = kStatistics.maxGapCount || 0;
    const gapTime = kStatistics.gapCount || 0;

    if (show) {
      if (gapTime > maxGapCount) {
        kStatistics.maxGapCount = gapTime;
        kStatistics.maxGapStartTime = yearObj.maxGapStartTime || '';
        kStatistics.maxGapEndTime = drawData.draw_date;
        kStatistics.maxGapStartId = yearObj.maxGapStartId || '';
        kStatistics.maxGapEndId = drawData.id;
      }

      const continueCount = kStatistics.continueCount || 0;
      kStatistics.continueCount = continueCount + 1;
      kStatistics.scoreCount = (kStatistics.scoreCount || 0) + 1;
      kStatistics.gapCount = 0;
    } else {
      kStatistics.continueCount = 0;
      kStatistics.gapCount = (kStatistics.gapCount || 0) + 1;
    }
  }

  /**
   * 获取指定菜单的所有统计信息
   */
  getAllStatistics(menuId: number): ResultInfo[] {
    const subStatistics = this.statistics.get(menuId);
    if (!subStatistics) return [];

    const allStats: ResultInfo[] = [];
    for (const [_, menuStatistics] of subStatistics) {
      for (const [_, stat] of menuStatistics) {
        allStats.push({ ...stat });
      }
    }
    return allStats;
  }

  /**
   * 获取指定菜单和子菜单的所有统计信息
   */
  getSubMenuStatistics(menuId: number, subMenuId: number): ResultInfo[] {
    const subStatistics = this.statistics.get(menuId);
    if (!subStatistics) return [];

    const menuStatistics = subStatistics.get(subMenuId);
    if (!menuStatistics) return [];

    return Array.from(menuStatistics.values()).map(stat => ({ ...stat }));
  }

  /**
   * 清除所有统计信息
   */
  clearAll(): void {
    this.statistics.clear();
  }
}

export const statisticsManager = new StatisticsManager();
