import type { LotteryDraw, CellValue, ParsedData, SubMenuConfig } from '../types';
import { statisticsManager } from '../statistics/gap-calculator';
import { dataLoader } from '../utils/data-loader';

/**
 * 解析器基类
 * 提供通用的解析方法和工具
 */
export abstract class ParserBase {
  protected allData: LotteryDraw[] = [];
  protected currentMenuId = 0;
  protected rootMenu: SubMenuConfig | null = null;
  protected menuName = '';

  constructor() {
    this.allData = dataLoader.getAllData();
  }

  /**
   * 解析数据
   */
  abstract parse(titles: SubMenuConfig[], menuId: number): ParsedData;

  /**
   * 初始化解析
   */
  protected initParse(menuId: number): void {
    this.currentMenuId = menuId;
    this.allData = dataLoader.getAllData();
  }

  /**
   * 创建基础行（日期、期号、开奖号码）
   */
  protected createBaseRow(draw: LotteryDraw): CellValue[] {
    return [
      { value: draw.draw_date },
      { value: draw.id },
      { value: draw.results },
    ];
  }

  /**
   * 设置单元格值并更新统计
   */
  protected setShowValue(
    show: boolean,
    child: CellValue[],
    k: number,
    menu: SubMenuConfig,
    draw: LotteryDraw,
    rowName: string,
    colName: string
  ): void {
    const kStatistics = statisticsManager.getOrCreate(
      this.currentMenuId,
      menu.id,
      k,
      `【${this.menuName}】-【${rowName}】-【${colName}】`,
      menu.id > 2 ? 'left' : 'right'
    );

    const yearObj = statisticsManager.fillYear(kStatistics, show, draw);
    const maxGapCount = kStatistics.maxGapCount || 0;
    const gapTime = kStatistics.gapCount || 0;

    if (show) {
      if (gapTime > maxGapCount) {
        kStatistics.maxGapCount = gapTime;
        kStatistics.maxGapStartTime = yearObj.maxGapStartTime || '';
        kStatistics.maxGapEndTime = draw.draw_date;
        kStatistics.maxGapStartId = yearObj.maxGapStartId || '';
        kStatistics.maxGapEndId = draw.id;
      }

      const continueCount = kStatistics.continueCount || 0;
      kStatistics.continueCount = continueCount + 1;
      kStatistics.scoreCount = (kStatistics.scoreCount || 0) + 1;

      // 显示格式: 中奖次数/间隔/连续
      child.push({
        type: 'danger',
        value: `${(yearObj.scoreCount || 0)}/${gapTime}/${kStatistics.continueCount}`,
      });
      kStatistics.gapCount = 0;
    } else {
      kStatistics.continueCount = 0;
      kStatistics.gapCount = (kStatistics.gapCount || 0) + 1;
      child.push({
        value: `${kStatistics.gapCount}`,
      });
    }
  }

  /**
   * 解析过滤字符串获取列名
   */
  protected getColName(title: SubMenuConfig, index: number): string {
    if (title.rows[1] && title.rows[1][index]) {
      const str = title.rows[1][index] as string;
      return str.split('#')[0];
    }
    return `列${index}`;
  }

  /**
   * 获取行名
   */
  protected getRowName(title: SubMenuConfig): string {
    return (title.rows[0] && title.rows[0][0]) || '';
  }

  /**
   * 设置根菜单
   */
  protected setRootMenu(menu: SubMenuConfig): void {
    this.rootMenu = menu;
  }

  /**
   * 设置菜单名称
   */
  setMenuName(name: string): void {
    this.menuName = name;
  }
}
