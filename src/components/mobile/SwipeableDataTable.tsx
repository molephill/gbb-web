'use client';

import { useMemo } from 'react';
import { useLotteryData } from '@/lib/hooks';
import type { CellValue, SubMenuConfig } from '@gbb/core';

/**
 * 移动端可滑动数据表格
 * 炒股风格：紧凑、可滑动、高亮显示
 */
interface SwipeableDataTableProps {
  parsedData: CellValue[][][][];
  titles: SubMenuConfig[];
}

export function SwipeableDataTable({ parsedData, titles }: SwipeableDataTableProps) {
  const reversedData = useMemo(() => [...parsedData].reverse(), [parsedData]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-muted">
          <tr>
            {titles.map((title, idx) => {
              const colCount = title.rows[1]?.length || 1;
              const headerText = title.rows[0]?.[0] || '';
              return (
                <th
                  key={idx}
                  colSpan={colCount}
                  className="px-2 py-2 text-xs font-semibold text-center border border-border bg-muted"
                >
                  {headerText}
                </th>
              );
            })}
          </tr>
          <tr>
            {titles.map((title, titleIdx) =>
              title.rows[1]?.map((col, colIdx) => {
                const colName = String(col).split('#')[0];
                const isHighlight = String(col).includes('#cyan');
                return (
                  <th
                    key={`${titleIdx}-${colIdx}`}
                    className={`px-2 py-1 text-[10px] text-center border border-border bg-muted/50 ${
                      isHighlight ? 'text-cyan-600 font-bold' : ''
                    }`}
                    style={{ minWidth: '50px' }}
                  >
                    {colName}
                  </th>
                );
              })
            )}
          </tr>
        </thead>
        <tbody>
          {reversedData.map((rowData, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-muted/30">
              {rowData.map((titleData, titleIdx) =>
                titleData.map((cellData, cellIdx) => {
                  const cell = cellData[0] || { value: '', type: 'default' };
                  const cellValue = String(cell.value || '');
                  const isDanger = cell.type === 'danger';
                  const isGap = cellValue.includes('/') && !isDanger;

                  return (
                    <td
                      key={`${titleIdx}-${cellIdx}`}
                      className={`px-2 py-1 text-xs text-center border border-border min-w-[50px] ${
                        isDanger
                          ? 'bg-red-500 text-white font-bold'
                          : isGap && Number(cellValue) > 5
                          ? 'bg-orange-200 text-orange-900'
                          : 'text-foreground'
                      }`}
                    >
                      {cellValue}
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 紧凑版数据列表（移动端）
 */
interface CompactDataListProps {
  year: string;
}

export function CompactDataList({ year }: CompactDataListProps) {
  const { data, loading, error } = useLotteryData(year);

  const reversedData = useMemo(() => [...data].reverse(), [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32 text-destructive text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-muted">
          <tr>
            <th className="px-2 py-2 text-xs font-semibold text-left border border-border min-w-[70px]">
              日期
            </th>
            <th className="px-2 py-2 text-xs font-semibold text-center border border-border min-w-[50px]">
              期号
            </th>
            <th className="px-2 py-2 text-xs font-semibold text-center border border-border min-w-[80px]">
              开奖
            </th>
            <th className="px-2 py-2 text-xs font-semibold text-center border border-border min-w-[60px]">
              大小
            </th>
            <th className="px-2 py-2 text-xs font-semibold text-center border border-border min-w-[60px]">
              单双
            </th>
          </tr>
        </thead>
        <tbody>
          {reversedData.map((draw) => {
            const results = draw.results.split('');
            const bigCount = results.filter(n => Number(n) > 4).length;
            const smallCount = 4 - bigCount;
            const oddCount = results.filter(n => Number(n) % 2 !== 0).length;
            const evenCount = 4 - oddCount;

            return (
              <tr key={draw.id} className="hover:bg-muted/30">
                <td className="px-2 py-1.5 text-xs border border-border">
                  {draw.draw_date.slice(5)} {/* 只显示 MM-DD */}
                </td>
                <td className="px-2 py-1.5 text-xs text-center border border-border">
                  {draw.id}
                </td>
                <td className="px-2 py-1.5 text-center border border-border">
                  {results.map((r, i) => (
                    <span
                      key={i}
                      className="inline-block w-5 h-5 leading-5 text-sm font-mono font-bold text-red-600"
                    >
                      {r}
                    </span>
                  ))}
                </td>
                <td className="px-2 py-1.5 text-xs text-center border border-border">
                  <span className={bigCount > 2 ? 'text-red-600 font-bold' : ''}>
                    {bigCount}
                  </span>
                  /
                  <span className={smallCount > 2 ? 'text-blue-600 font-bold' : ''}>
                    {smallCount}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-xs text-center border border-border">
                  <span className={oddCount > 2 ? 'text-red-600 font-bold' : ''}>
                    {oddCount}
                  </span>
                  /
                  <span className={evenCount > 2 ? 'text-blue-600 font-bold' : ''}>
                    {evenCount}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 移动端关键指标卡片
 */
interface KeyStatsCardProps {
  menuId: number;
  year: string;
}

export function KeyStatsCard({ menuId, year }: KeyStatsCardProps) {
  const { data, loading } = useLotteryData(year);

  if (loading || data.length === 0) {
    return null;
  }

  const latest = data[data.length - 1];
  const results = latest.results.split('');

  // 计算统计
  const stats = {
    total: data.length,
    latest: latest.results,
    bigCount: results.filter(n => Number(n) > 4).length,
    oddCount: results.filter(n => Number(n) % 2 !== 0).length,
  };

  return (
    <div className="grid grid-cols-4 gap-2 p-3 bg-muted/50">
      <div className="text-center">
        <div className="text-[10px] text-muted-foreground">总期数</div>
        <div className="text-lg font-bold text-primary">{stats.total}</div>
      </div>
      <div className="text-center">
        <div className="text-[10px] text-muted-foreground">最新</div>
        <div className="text-sm font-mono font-bold text-red-600">
          {stats.latest}
        </div>
      </div>
      <div className="text-center">
        <div className="text-[10px] text-muted-foreground">大/单</div>
        <div className="text-sm font-bold">
          <span className="text-red-600">{stats.bigCount}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-orange-600">{stats.oddCount}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-[10px] text-muted-foreground">小/双</div>
        <div className="text-sm font-bold">
          <span className="text-blue-600">{4 - stats.bigCount}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-green-600">{4 - stats.oddCount}</span>
        </div>
      </div>
    </div>
  );
}
