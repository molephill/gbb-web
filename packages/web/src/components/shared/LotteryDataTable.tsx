'use client';

import { useEffect, useState, useMemo } from 'react';
import { useLotteryData } from '@/lib/hooks';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface LotteryDataTableProps {
  year: string;
  limit?: number;
}

/**
 * 彩票数据表格组件
 */
export function LotteryDataTable({ year, limit }: LotteryDataTableProps) {
  const { data, loading, error } = useLotteryData(year);

  // 显示数据（限制数量）
  const displayData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (limit && limit < data.length) {
      return data.slice(-limit);
    }
    return data;
  }, [data, limit]);

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

  if (!data || data.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        暂无数据
      </div>
    );
  }

  const latestDraw = data[data.length - 1];

  return (
    <div className="space-y-4">
      {/* 最新开奖 */}
      {latestDraw && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">{latestDraw.draw_date}</span>
          <span className="font-mono text-2xl font-bold text-red-600">
            {latestDraw.results.split('').join(' ')}
          </span>
          <span className="text-sm text-muted-foreground">第 {latestDraw.id} 期</span>
        </div>
      )}

      {/* 数据统计 */}
      <div className="text-sm text-muted-foreground">
        总期数: <span className="font-bold">{data.length}</span> |
        年份: <span className="font-bold">{year}</span>
      </div>

      {/* 数据表格 */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">日期</TableHead>
            <TableHead className="w-[80px]">期号</TableHead>
            <TableHead>开奖号码</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayData.slice().reverse().map((draw) => (
            <TableRow key={draw.id}>
              <TableCell className="text-xs">{draw.draw_date}</TableCell>
              <TableCell className="text-xs">{draw.id}</TableCell>
              <TableCell className="font-mono font-bold text-red-600 text-sm">
                {draw.results.split('').join(' ')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
