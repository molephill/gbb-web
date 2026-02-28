/**
 * GBB 核心业务逻辑包
 * 提供彩票数据解析和统计功能
 */

// 类型定义
export type {
  LotteryDraw,
  ResultInfo,
  YearGapInfo,
  CellValue,
  MenuConfig,
  SubMenuConfig,
  ParsedData,
  MinMaxInfo,
} from './types';

// 解析器
export {
  Parse1,
  parse1,
  Parse2,
  parse2,
  Parse3,
  parse3,
  Parse4,
  parse4,
  Parse5,
  parse5,
  Parse6,
  parse6,
  Parse8,
  parse8,
  Parse9,
  parse9,
  Parse10,
  parse10,
  Parse11,
  parse11,
  Parse12,
  parse12,
  ParserBase,
} from './parsers';

// 统计管理器
export { statisticsManager } from './statistics/gap-calculator';

// 数据加载器
export { dataLoader, DataLoader } from './utils/data-loader';

// 文件工具
export { FileUtil } from './utils/file-util';
