/**
 * 彩票开奖数据结构
 */
export interface LotteryDraw {
  /** 期号 */
  id: string;
  /** 开奖日期 YYYY-MM-DD */
  draw_date: string;
  /** 开奖号码，如 "12345" */
  results: string;
}

/**
 * 统计信息
 */
export interface ResultInfo {
  /** 当前间隔次数 */
  gapCount: number;
  /** 中奖次数 */
  scoreCount: number;
  /** 最大间隔次数 */
  maxGapCount: number;
  /** 最大间隔开始时间 */
  maxGapStartTime: string;
  /** 最大间隔结束时间 */
  maxGapEndTime: string;
  /** 最大间隔开始期号 */
  maxGapStartId: string;
  /** 最大间隔结束期号 */
  maxGapEndId: string;
  /** 连续出现次数 */
  continueCount?: number;
  /** 标题 */
  title?: string;
  /** 显示位置 */
  placement?: 'left' | 'right';
  /** 按年统计的间隔信息 */
  yearGapList?: Record<string, YearGapInfo>;
}

/**
 * 按年统计的间隔信息
 */
export interface YearGapInfo {
  /** 总期数 */
  totalCount: number;
  /** 中奖次数 */
  scoreCount?: number;
  /** 当前间隔 */
  gapCount?: number;
  /** 最大间隔 */
  maxGapCount?: number;
  /** 最大间隔开始时间 */
  maxGapStartTime?: string;
  /** 最大间隔结束时间 */
  maxGapEndTime?: string;
  /** 最大间隔开始期号 */
  maxGapStartId?: string;
  /** 最大间隔结束期号 */
  maxGapEndId?: string;
  /** 连续出现次数 */
  continueCount?: number;
  /** 间隔开始时间 */
  gapStartTime?: string;
  /** 间隔开始期号 */
  gapStartId?: string;
  /** 间隔列表 */
  gapList?: LotteryDraw[][];
  /** 间隔列表索引 */
  gapListIndex?: number;
}

/**
 * 单元格显示值
 */
export interface CellValue {
  /** 值 */
  value: string | number;
  /** 类型：danger 表示中奖 */
  type?: 'danger' | 'default';
}

/**
 * 菜单配置
 */
export interface MenuConfig {
  /** 菜单ID (1-12) */
  id: number;
  /** 菜单名称 */
  name: string;
  /** 排序 */
  sort?: number;
  /** 子菜单列表 */
  titles: SubMenuConfig[];
}

/**
 * 子菜单配置
 */
export interface SubMenuConfig {
  /** 子菜单ID */
  id: number;
  /** 子菜单名称 */
  name?: string;
  /** 行配置 */
  rows: [string[], string[]];
  /** 类型标识 */
  type?: string;
  /** 是否固定 */
  fix?: boolean;
  /** 列宽 */
  size?: string;
}

/**
 * 解析结果类型
 */
export type ParsedData = CellValue[][][][];

/**
 * 最小最大值信息
 */
export interface MinMaxInfo {
  /** 最小期号 */
  minId: number;
  /** 最大期号 */
  maxId: number;
  /** 最小日期 */
  minDate: string;
  /** 最大日期 */
  maxDate: string;
}
