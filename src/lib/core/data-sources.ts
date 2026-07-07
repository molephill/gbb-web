/**
 * 多数据源注册中心
 *
 * 设计目标：
 * - 集中管理"哪几个数据源可用"以及它们的 gameNo / Gitee 仓库 / 本地目录 / 可用年份
 * - 让 API 路由、客户端 hooks、UI 组件都从同一个 source of truth 派生配置
 * - 新增数据源（如 ssq 双色球）只需追加一项 DEFAULT_DATA_SOURCES，无需改其他代码
 *
 * 数据源说明：
 * - gbb：当前主路径，gameNo=350133，对应"体彩 350133"（每日开奖，22 年）
 * - qxc：来自 D:\tools\gbb-qxc 的历史项目，gameNo=04（七星彩，每年约 150 期，21 年）
 *
 * 字段约定：
 * - gameNo：sporttery 官方 API 的 gameNo 参数
 * - giteeRepo：'owner/name' 形式，不含 .git 后缀
 * - cacheDir：相对 process.cwd() 的本地缓存目录
 * - giteeCacheUrl：Gitee raw 路径前缀，含 /caches 后缀
 * - years：可用年份列表（倒序），用于 UI 年份选择器和跨年视图遍历
 * - minStatsYears：跨年视图要求"至少多少年成功"才显示统计（gbb 22/qxc 21 都 ≥ 18）
 */

export type DataSourceId = 'gbb' | 'qxc';

export type DataSource = {
  id: DataSourceId;
  name: string;
  label: string;
  gameNo: string;
  giteeRepo: string;
  giteeBranch: 'master' | 'main';
  cacheDir: string;
  giteeCacheUrl: string;
  years: readonly string[];
  minStatsYears: number;
};

export const DEFAULT_DATA_SOURCES: readonly DataSource[] = [
  {
    id: 'gbb',
    name: 'gbb',
    label: '体彩 350133',
    gameNo: '350133',
    giteeRepo: 'liar7254/gold-bling-bling-data',
    giteeBranch: 'master',
    cacheDir: 'caches',
    giteeCacheUrl: 'https://gitee.com/liar7254/gold-bling-bling-data/raw/master/caches',
    years: [
      '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017',
      '2016', '2015', '2014', '2013', '2012', '2011', '2010', '2009', '2008', '2007', '2006', '2005',
    ],
    minStatsYears: 18,
  },
  {
    id: 'qxc',
    name: 'qxc',
    label: '七星彩 (04)',
    gameNo: '04',
    giteeRepo: 'liar7254/qxc_data',
    giteeBranch: 'master',
    cacheDir: 'caches/qxc',
    giteeCacheUrl: 'https://gitee.com/liar7254/qxc_data/raw/master/caches',
    years: [
      '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017',
      '2016', '2015', '2014', '2013', '2012', '2011', '2010', '2009', '2008', '2007', '2006', '2005',
    ],
    minStatsYears: 18,
  },
];

export const DEFAULT_DATA_SOURCE_ID: DataSourceId = 'gbb';

export function getDataSource(id: string | null | undefined): DataSource {
  return DEFAULT_DATA_SOURCES.find((s) => s.id === id) ?? DEFAULT_DATA_SOURCES[0];
}

/**
 * 派生 Gitee raw 主备 URL 列表（master 优先，main 兼容）
 */
export function getGiteeBases(source: DataSource): string[] {
  return [
    source.giteeCacheUrl,
    source.giteeCacheUrl.replace('/master/', '/main/'),
  ];
}

/*
 * 扩展第 3 数据源（如 ssq 双色球）示例：
 *
 * {
 *   id: 'ssq',
 *   name: 'ssq',
 *   label: '双色球',
 *   gameNo: '01',  // 需核实官方 gameNo
 *   giteeRepo: 'liar7254/ssq_data',
 *   giteeBranch: 'master',
 *   cacheDir: 'caches/ssq',
 *   giteeCacheUrl: 'https://gitee.com/liar7254/ssq_data/raw/master/caches',
 *   years: [...],
 *   minStatsYears: 18,
 * },
 *
 * 注意：如果新彩种号码位数/玩法与 4 位不同，现有 public/menu.json 不通用，
 * 需要：
 *   1. /api/menu 加 ?source=ssq 分支返回专用菜单
 *   2. 新增专用解析器（如 parseSsq1）
 *   3. AnalysisView.PARSER_MAP 增加映射
 */