'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useLotteryData } from '@/lib/hooks';
import { dataLoader, parse1, parse2, parse3, parse4, parse5, parse6, parse8, parse9, parse12, statisticsManager } from '@gbb/core';
import type { CellValue, SubMenuConfig, MenuConfig, ResultInfo } from '@gbb/core';
import { MENU_FULL_CONFIG } from '@/lib/menu-config';

// 可用年份列表
const AVAILABLE_YEARS = [
  '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017',
  '2016', '2015', '2014', '2013', '2012', '2011', '2010', '2009', '2008',
  '2007', '2006', '2005'
];

// 解析器映射
const PARSER_MAP: Record<number, (titles: SubMenuConfig[], menuId: number, menuName: string) => CellValue[][][][]> = {
  1: parse1,
  2: parse2,
  3: parse3,
  4: parse4,
  5: parse5,
  6: parse6,
  8: parse8,
  9: parse9,
  12: parse12,
};

// 从菜单配置中提取菜单信息
const MENU_CONFIG = MENU_FULL_CONFIG.reduce((acc: any, item: MenuConfig) => {
  if (item.titles && item.titles.length > 0) {
    acc[item.id] = { name: item.name, titles: item.titles };
  }
  return acc;
}, {} as Record<number, { name: string; titles: SubMenuConfig[] }>);

// 菜单按钮列表（按 ID 排序）
const MENU_BUTTONS = MENU_FULL_CONFIG
  .filter((m: MenuConfig) => m.titles && m.titles.length > 0)
  .sort((a: MenuConfig, b: MenuConfig) => a.id - b.id);

/**
 * 渲染单元格内容
 */
function renderCell(cell: CellValue): string {
  return String(cell.value || '');
}

/**
 * 获取单元格样式
 */
function getCellStyle(cell: CellValue, isFixed = false): string {
  const base = 'text-center text-sm font-mono min-w-[50px] p-2 border-r border-b border-gray-300';
  if (cell.type === 'danger') {
    return `${base} bg-red-100 text-red-700 font-bold`;
  }
  return `${base} text-muted-foreground bg-white`;
}

/**
 * 热门统计面板 - 可折叠
 */
function StatisticsInfoPanel({ menuId, year, dataKey }: { menuId: number; year: string; dataKey?: number }) {
  const [isOpen, setIsOpen] = useState(false);

  // 获取统计数据并排序，使用 dataKey 确保数据更新时重新计算
  const sorted = useMemo(() => {
    const allStats = statisticsManager.getAllStatistics(menuId);
    return allStats
      .filter(s => s.scoreCount > 0)
      .sort((a, b) => b.scoreCount - a.scoreCount)
      .slice(0, 10);
  }, [menuId, dataKey]);

  if (sorted.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4 border-2 border-blue-300">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <CardTitle className="text-sm">热门统计 (TOP 10)</CardTitle>
          <span className="text-xs text-muted-foreground">
            {isOpen ? '▼' : '▶'}
          </span>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">项目</TableHead>
                <TableHead className="text-xs text-center">中奖</TableHead>
                <TableHead className="text-xs text-center">当前间隔</TableHead>
                <TableHead className="text-xs text-center">最大间隔</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((stat, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-xs truncate max-w-[200px]" title={stat.title}>
                    {stat.title || '-'}
                  </TableCell>
                  <TableCell className="text-xs text-center font-bold text-red-600">
                    {stat.scoreCount ?? 0}
                  </TableCell>
                  <TableCell className="text-xs text-center text-orange-600">
                    {stat.gapCount ?? 0}
                  </TableCell>
                  <TableCell className="text-xs text-center text-purple-600">
                    {stat.maxGapCount ?? 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * 数据表格组件 - 显示趋势图
 * 支持固定左侧列和明显分割线
 */
function AnalysisTable({ parsedData, titles, menuId, year }: {
  parsedData: CellValue[][][][];
  titles: SubMenuConfig[];
  menuId: number;
  year: string;
}) {
  // 数据按日期从小到大排序
  const sortedData = useMemo(() => [...parsedData], [parsedData]);

  // 定义每列的宽度（与表头一致）
  const getColumnWidth = (titleIdx: number, cellIdx: number): number => {
    // 第一列（日期）120px，第二列（期号）80px，其余 70px
    if (titleIdx === 0 && cellIdx === 0) return 120;
    if (titleIdx === 0 && cellIdx === 1) return 80;
    return 70;
  };

  // 计算每个 title 的列数和累计位置（像素）
  const titleColCounts = titles.map(t => t.rows[1]?.length || 0);

  // 计算每个单元格的 left 位置
  const cellLeftPositions: number[][] = [];
  let currentLeft = 0;
  for (let titleIdx = 0; titleIdx < titles.length; titleIdx++) {
    cellLeftPositions[titleIdx] = [];
    for (let cellIdx = 0; cellIdx < titleColCounts[titleIdx]; cellIdx++) {
      cellLeftPositions[titleIdx][cellIdx] = currentLeft;
      currentLeft += getColumnWidth(titleIdx, cellIdx);
    }
  }

  // 计算固定列的总宽度
  const fixedColCount = titleColCounts[0];

  // 获取统计信息 - 修复：总是获取统计，对于数据列统计会在数据渲染时自动创建
  const getStatistics = (titleIdx: number, cellIdx: number) => {
    if (titleIdx === 0) return null; // 第一行（固定列）不显示统计
    // 尝试获取统计信息，如果还没有就返回 null
    const stats = statisticsManager.getResultInfo(menuId, titles[titleIdx].id, cellIdx);
    return stats;
  };

  // 渲染单个单元格
  function renderCell(cell: CellValue, titleIdx: number, cellIdx: number): React.ReactNode {
    const cellValue = String(cell.value || '');
    const isDanger = cell.type === 'danger';
    const isFixed = titleIdx === 0;
    const leftPos = cellLeftPositions[titleIdx]?.[cellIdx] || 0;

    return (
      <td
        key={`${titleIdx}-${cellIdx}`}
        className={`text-sm font-mono p-2 border-2 border-gray-300 ${
          isDanger ? 'bg-red-500 text-white font-bold' : 'bg-white text-gray-800'
        } ${isFixed ? 'sticky left-0 z-10 bg-blue-50 border-r-4 border-gray-500 shadow-md' : ''}`}
        style={isFixed ? { left: `${leftPos}px` } : undefined}
      >
        {cellValue}
      </td>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse" style={{ minWidth: `${currentLeft + 100}px` }}>
          <thead className="sticky top-0 z-20 bg-muted">
            {/* 第一行表头 - 大标题 */}
            <tr>
              {titles.map((title, idx) => {
                const colCount = titleColCounts[idx];
                const headerText = title.rows[0]?.[0] || '';
                return (
                  <th
                    key={idx}
                    colSpan={colCount}
                    className="text-center text-sm font-semibold border-2 border-gray-400 bg-muted px-2 py-2"
                  >
                    {headerText}
                  </th>
                );
              })}
            </tr>
            {/* 第二行表头 - 子标题（带统计信息） */}
            <tr>
              {titles.map((title, titleIdx) => {
                const cols = title.rows[1] || [];
                return cols.map((col, cellIdx) => {
                  const isFixed = titleIdx === 0;
                  const leftPos = cellLeftPositions[titleIdx]?.[cellIdx] || 0;
                  const stats = getStatistics(titleIdx, cellIdx);
                  const colName = String(col).split('#')[0];

                  return (
                    <th
                      key={`${titleIdx}-${cellIdx}`}
                      className={`text-center text-xs font-medium border-2 border-gray-400 bg-muted/80 p-1 relative ${
                        isFixed ? 'sticky left-0 z-30 bg-blue-100 border-r-4 border-gray-500 shadow-md' : ''
                      }`}
                      style={isFixed ? { left: `${leftPos}px`, minWidth: getColumnWidth(titleIdx, cellIdx) } : { minWidth: 70 }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span>{colName}</span>
                        {stats && (
                          <span className="text-[10px] text-orange-600 font-semibold">
                            {stats.gapCount ?? 0}/{stats.maxGapCount ?? 0}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                });
              })}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((rowData, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50">
                {rowData.map((titleData, titleIdx) => {
                  const cells = titleData[0] || [];
                  return cells.map((cell, cellIdx) => renderCell(cell, titleIdx, cellIdx));
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * 分析面板组件 - 根据菜单ID解析数据
 */
function AnalysisPanel({ menuId, year }: { menuId: number; year: string }) {
  const { data, loading, error } = useLotteryData(year);
  const [parsedData, setParsedData] = useState<CellValue[][][][] | null>(null);

  // 当数据或菜单变化时，重新解析
  useEffect(() => {
    if (data.length > 0) {
      // 清除旧的统计信息
      statisticsManager.clear(menuId);

      // 设置数据到 dataLoader
      dataLoader.loadFromArray(data);

      // 获取菜单配置
      const menuInfo = MENU_CONFIG[menuId];
      if (!menuInfo || !menuInfo.titles) {
        console.warn('Menu not found:', menuId);
        return;
      }

      // 使用对应的解析器
      const parser = PARSER_MAP[menuId];
      if (parser) {
        try {
          const menuName = menuInfo.name || `Menu${menuId}`;
          const result = parser(menuInfo.titles, menuId, menuName);
          setParsedData(result);
        } catch (err) {
          console.error('Parse error:', err);
        }
      } else {
        console.warn('Parser not found for menu:', menuId);
      }
    }
  }, [data, menuId]);

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        数据加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        错误: {error}
      </div>
    );
  }

  if (!parsedData || parsedData.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        暂无数据
      </div>
    );
  }

  const menuInfo = MENU_CONFIG[menuId];
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4">
        <AnalysisTable
          parsedData={parsedData}
          titles={menuInfo.titles}
          menuId={menuId}
          year={year}
        />
      </div>
      <div className="flex-shrink-0 p-4 pt-0">
        <StatisticsInfoPanel menuId={menuId} year={year} dataKey={parsedData?.length} />
      </div>
    </div>
  );
}

/**
 * 带年份选择和分析功能的主视图
 */
export function AnalysisView() {
  const [year, setYear] = useState('2025');
  const [activeMenu, setActiveMenu] = useState<number>(1);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 顶部栏：年份选择和菜单 */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-3 p-3 bg-muted border-b">
        {/* 年份选择器 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">年份:</span>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-3 py-1.5 text-sm bg-background border rounded-md"
          >
            {AVAILABLE_YEARS.map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
        </div>

        {/* 菜单按钮 */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeMenu === 0 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveMenu(0)}
          >
            数据列表
          </Button>
          {MENU_BUTTONS.map((menu: MenuConfig) => (
            <Button
              key={menu.id}
              variant={activeMenu === menu.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveMenu(menu.id)}
            >
              {menu.name}
            </Button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto">
        {activeMenu === 0 ? (
          <div className="h-full flex flex-col p-4">
            <div className="flex-shrink-0 mb-3">
              <h2 className="text-lg font-bold">{year}年 开奖数据</h2>
            </div>
            <div className="flex-1 overflow-auto border rounded-lg">
              <SimpleDataList year={year} />
            </div>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <AnalysisPanel menuId={activeMenu} year={year} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 简化版数据列表组件 - 带固定列和明显分割线
 */
function SimpleDataList({ year }: { year: string }) {
  const { data, loading, error } = useLotteryData(year);

  // 数据按日期从小到大排序
  const sortedData = useMemo(() => [...data], [data]);

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">数据加载中...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-destructive">错误: {error}</div>;
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-20 bg-muted">
          <tr>
            <TableHead className="sticky left-0 z-30 w-[120px] border-2 border-gray-400 bg-blue-50">日期</TableHead>
            <TableHead className="sticky left-[120px] z-30 w-[80px] border-2 border-gray-400 bg-blue-50">期号</TableHead>
            <TableHead className="w-[60px] border-2 border-gray-400">第1位</TableHead>
            <TableHead className="w-[60px] border-2 border-gray-400">第2位</TableHead>
            <TableHead className="w-[60px] border-2 border-gray-400">第3位</TableHead>
            <TableHead className="w-[60px] border-2 border-gray-400">第4位</TableHead>
            <TableHead className="w-[100px] border-2 border-gray-400">大小分布</TableHead>
            <TableHead className="w-[100px] border-2 border-gray-400">单双分布</TableHead>
          </tr>
        </thead>
        <TableBody>
          {sortedData.map((draw) => {
            const results = draw.results.split('');
            const bigCount = results.filter(n => Number(n) > 4).length;
            const smallCount = 4 - bigCount;
            const oddCount = results.filter(n => Number(n) % 2 !== 0).length;
            const evenCount = 4 - oddCount;

            return (
              <TableRow key={draw.id} className="hover:bg-gray-50">
                <TableCell className="sticky left-0 z-10 text-xs border border-gray-300 bg-blue-50 border-r-2 border-gray-400">
                  {draw.draw_date}
                </TableCell>
                <TableCell className="sticky left-[120px] z-10 text-xs border border-gray-300 bg-blue-50 border-r-2 border-gray-400">
                  {draw.id}
                </TableCell>
                {results.map((r, i) => (
                  <TableCell key={i} className="text-center text-sm font-mono border border-gray-300">
                    {r}
                  </TableCell>
                ))}
                <TableCell className="text-xs border border-gray-300">大{bigCount}小{smallCount}</TableCell>
                <TableCell className="text-xs border border-gray-300">单{oddCount}双{evenCount}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </table>
    </div>
  );
}
