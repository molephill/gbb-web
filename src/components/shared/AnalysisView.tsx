'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useLotteryData, fetchLatestData } from '@/lib/hooks';
import { dataLoader, parse1, parse2, parse3, parse4, parse5, parse6, parse8, parse9, parse12, statisticsManager } from '@/lib/core';
import type { CellValue, SubMenuConfig, MenuConfig, ResultInfo } from '@/lib/core';
import { MENU_FULL_CONFIG } from '@/lib/menu-config';

// 可用年份列表
const AVAILABLE_YEARS = [
  '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017',
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

// 解析结果缓存：key = `${year}_${menuId}`, value = ParsedData
const parseCache = new Map<string, { data: CellValue[][][][]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// 数据版本标记，用于检测数据是否真的变化了
let dataVersion = 0;

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
 * 热门统计面板 - 紧凑可折叠
 */
function StatisticsInfoPanel({ menuId, year, dataKey }: { menuId: number; year: string; dataKey?: number }) {
  const [isOpen, setIsOpen] = useState(false); // 默认折叠

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
    <Card className="mt-2 border border-blue-200">
      <CardHeader className="py-1 px-2">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <CardTitle className="text-xs">热门统计 TOP10</CardTitle>
          <span className="text-[10px] text-muted-foreground">
            {isOpen ? '▼' : '▶'}
          </span>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="pt-0 pb-2 px-2">
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            {sorted.map((stat, idx) => (
              <div key={idx} className="flex items-center gap-1 truncate" title={stat.title}>
                <span className="truncate flex-1" title={stat.title}>{stat.title?.substring(0, 8) || '-'}</span>
                <span className="text-red-600 font-medium">{stat.scoreCount ?? 0}</span>
                <span className="text-orange-600">{stat.gapCount ?? 0}</span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * 数据表格组件 - 显示趋势图（带分页优化）
 * 支持固定左侧列和明显分割线
 */
function AnalysisTable({ parsedData, titles, menuId, year }: {
  parsedData: CellValue[][][][];
  titles: SubMenuConfig[];
  menuId: number;
  year: string;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100; // 每页显示100条

  // 数据按日期从小到大排序
  const sortedData = useMemo(() => [...parsedData], [parsedData]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

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
        className={`text-xs font-mono px-2 py-1 border border-gray-300 ${
          isDanger ? 'bg-red-500 text-white font-bold' : 'bg-white text-gray-800'
        } ${isFixed ? 'sticky left-0 z-10 bg-blue-50 border-r-2 border-gray-400 shadow-sm' : ''}`}
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
                    className="text-center text-xs font-semibold border border-gray-400 bg-muted px-2 py-1"
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
                      className={`text-center text-[11px] font-medium border border-gray-400 bg-muted/80 px-1 py-0.5 relative ${
                        isFixed ? 'sticky left-0 z-30 bg-blue-100 border-r-2 border-gray-400 shadow-sm' : ''
                      }`}
                      style={isFixed ? { left: `${leftPos}px`, minWidth: getColumnWidth(titleIdx, cellIdx) } : { minWidth: 60 }}
                    >
                      <div className="flex flex-col items-center leading-tight">
                        <span className="leading-none">{colName}</span>
                        {stats && (
                          <span className="text-[9px] text-orange-600 font-semibold leading-none mt-0.5">
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
            {paginatedData.map((rowData, rowIdx) => (
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
      {/* 分页控件 - 紧凑版 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 px-2 py-1 border-t bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ‹
          </Button>
          <span className="text-xs px-2">
            {currentPage}/{totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            ›
          </Button>
          <select
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
            className="ml-1 px-1 py-0.5 text-xs bg-background border rounded"
          >
            {Array.from({ length: Math.min(totalPages, 20) }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-muted-foreground">
            共{sortedData.length}条
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * 分析面板组件 - 根据菜单ID解析数据（带缓存优化）
 */
function AnalysisPanel({ menuId, year, refreshKey }: { menuId: number; year: string; refreshKey?: number }) {
  const { data, loading, error } = useLotteryData(year, refreshKey);
  const [parsedData, setParsedData] = useState<CellValue[][][][] | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const currentDataVersionRef = useRef<number>(0);

  // 使用 useCallback 避免重复创建解析函数
  const parseData = useCallback(async (dataToParse: any[], targetMenuId: number, currentYear: string, dataVer: number) => {
    const cacheKey = `${currentYear}_${targetMenuId}`;

    // 验证数据年份是否匹配
    const firstDataYear = dataToParse[0]?.id?.substring(0, 2);
    const expectedYearPrefix = currentYear.slice(-2); // 2026 -> 26

    // 如果数据年份与请求年份不匹配，直接丢弃不处理
    if (firstDataYear && firstDataYear !== expectedYearPrefix) {
      console.warn(`Data year mismatch: expected ${currentYear}, got ${firstDataYear}xx`);
      parseCache.clear();
      setParsedData(null);
      return;
    }

    const cached = parseCache.get(cacheKey);

    // 检查缓存是否有效
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setParsedData(cached.data);
      return;
    }

    // 使用 setTimeout 避免阻塞 UI
    setIsParsing(true);

    setTimeout(() => {
      try {
        statisticsManager.clear(targetMenuId);
        dataLoader.loadFromArray(dataToParse);

        const menuInfo = MENU_CONFIG[targetMenuId];
        if (!menuInfo || !menuInfo.titles) {
          setIsParsing(false);
          return;
        }

        const parser = PARSER_MAP[targetMenuId];
        if (parser) {
          const menuName = menuInfo.name || `Menu${targetMenuId}`;
          const result = parser(menuInfo.titles, targetMenuId, menuName);

          parseCache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
          });

          if (currentDataVersionRef.current === dataVer) {
            setParsedData(result);
          }
        }
      } catch (err) {
        console.error('Parse error:', err);
      } finally {
        if (currentDataVersionRef.current === dataVer) {
          setIsParsing(false);
        }
      }
    }, 0);
  }, []);

  // 年份变化时，清除该年份的所有解析缓存
  useEffect(() => {
    for (const [key] of parseCache.entries()) {
      if (key.startsWith(`${year}_`)) {
        parseCache.delete(key);
      }
    }
    setParsedData(null);
  }, [year]);

  // 当数据或菜单变化时，重新解析
  useEffect(() => {
    if (data.length > 0) {
      currentDataVersionRef.current++;
      const dataVer = currentDataVersionRef.current;
      parseData(data, menuId, year, dataVer);
    }
  }, [data, menuId, year, parseData]);

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

  if (isParsing) {
    return (
      <div className="p-4 text-center text-muted-foreground flex items-center justify-center gap-2">
        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        正在计算统计...
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
      <div className="flex-1 overflow-auto p-2">
        <AnalysisTable
          parsedData={parsedData}
          titles={menuInfo.titles}
          menuId={menuId}
          year={year}
        />
      </div>
      <div className="flex-shrink-0 px-2 pb-1">
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
  const [isFetching, setIsFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState('');
  const [dataUpdateKey, setDataUpdateKey] = useState(0); // 用于强制刷新数据

  // 处理更新数据（自动包含补全断层）
  const handleFetchData = async () => {
    setIsFetching(true);
    setFetchMessage('正在获取最新数据...');

    try {
      // 调用更新接口
      const response = await fetch(`/api/fetch?pageSize=300&save=true`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '获取数据失败');
      }

      // 如果没有新数据，直接显示 API 返回的消息
      if (result.total === 0) {
        setFetchMessage(result.message || '已是最新数据');
        setTimeout(() => setFetchMessage(''), 3000);
        return;
      }

      // 构建详细的成功消息
      const years = result.yearsAffected || [];
      const saveResults = result.saveResults || [];
      const warnings = result.warnings || [];
      const totalNew = saveResults.reduce((sum: number, r: any) => sum + r.newCount, 0);

      let message = `✓ 获取 ${result.total} 条`;
      if (years.length > 0) {
        message += ` (${years.join(', ')})`;
      }
      if (totalNew > 0) {
        message += `，新增 ${totalNew} 条`;
      }

      // 添加断层警告
      if (warnings.length > 0) {
        message += ` | ⚠️ ${warnings.join('; ')}`;
      }

      // 添加 Git 提交状态
      if (result.gitResult?.pushed) {
        message += ` | 已推送到 Gitee`;
      }

      setFetchMessage(message);

      // 如果有新年份，自动切换到最新年份
      if (years.length > 0) {
        const latestYear = years[0];
        if (latestYear > year) {
          setYear(latestYear);
        }
      }

      // 强制刷新数据
      setDataUpdateKey(prev => prev + 1);

      // 警告消息显示更久
      const timeout = warnings.length > 0 ? 10000 : 5000;
      setTimeout(() => setFetchMessage(''), timeout);
    } catch (error) {
      console.error('Fetch error:', error);
      setFetchMessage(`✗ 获取失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setTimeout(() => setFetchMessage(''), 5000);
    } finally {
      setIsFetching(false);
    }
  };

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

        {/* 更新数据按钮 */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="default"
            size="sm"
            onClick={handleFetchData}
            disabled={isFetching}
          >
            {isFetching ? '获取中...' : '更新数据'}
          </Button>
          {fetchMessage && (
            <span className={`text-xs ${fetchMessage.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>
              {fetchMessage}
            </span>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto">
        {activeMenu === 0 ? (
          <div className="h-full flex flex-col p-2">
            <div className="flex-shrink-0 mb-2 px-1">
              <h2 className="text-sm font-bold">{year}年 开奖数据</h2>
            </div>
            <div className="flex-1 overflow-auto border rounded">
              <SimpleDataList year={year} refreshKey={dataUpdateKey} />
            </div>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <AnalysisPanel menuId={activeMenu} year={year} refreshKey={dataUpdateKey} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 简化版数据列表组件 - 带固定列和明显分割线
 */
function SimpleDataList({ year, refreshKey }: { year: string; refreshKey?: number }) {
  const { data, loading, error } = useLotteryData(year, refreshKey);

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
            <TableHead className="sticky left-0 z-30 w-[100px] border border-gray-400 bg-blue-50 text-[11px] py-1">日期</TableHead>
            <TableHead className="sticky left-[100px] z-30 w-[70px] border border-gray-400 bg-blue-50 text-[11px] py-1">期号</TableHead>
            <TableHead className="w-[50px] border border-gray-400 text-[11px] py-1">第1位</TableHead>
            <TableHead className="w-[50px] border border-gray-400 text-[11px] py-1">第2位</TableHead>
            <TableHead className="w-[50px] border border-gray-400 text-[11px] py-1">第3位</TableHead>
            <TableHead className="w-[50px] border border-gray-400 text-[11px] py-1">第4位</TableHead>
            <TableHead className="w-[80px] border border-gray-400 text-[11px] py-1">大小</TableHead>
            <TableHead className="w-[80px] border border-gray-400 text-[11px] py-1">单双</TableHead>
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
                <TableCell className="sticky left-0 z-10 text-[11px] border border-gray-300 bg-blue-50 border-r border-gray-400 py-1">
                  {draw.draw_date}
                </TableCell>
                <TableCell className="sticky left-[100px] z-10 text-[11px] border border-gray-300 bg-blue-50 border-r border-gray-400 py-1">
                  {draw.id}
                </TableCell>
                {results.map((r, i) => (
                  <TableCell key={i} className="text-center text-xs font-mono border border-gray-300 py-1">
                    {r}
                  </TableCell>
                ))}
                <TableCell className="text-[11px] border border-gray-300 py-1">大{bigCount}小{smallCount}</TableCell>
                <TableCell className="text-[11px] border border-gray-300 py-1">单{oddCount}双{evenCount}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </table>
    </div>
  );
}
