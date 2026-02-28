'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { statisticsManager } from '@gbb/core';

/**
 * 统计信息面板组件
 * 显示当前选中单元格的统计信息
 */
interface StatisticsPanelProps {
  statistics: {
    title?: string;
    gapCount: number;
    scoreCount: number;
    maxGapCount: number;
    maxGapStartTime: string;
    maxGapEndTime: string;
    maxGapStartId: string;
    maxGapEndId: string;
    continueCount?: number;
    yearGapList?: Record<string, any>;
  } | null;
}

export function StatisticsPanel({ statistics }: StatisticsPanelProps) {
  if (!statistics) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm">统计信息</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          点击数据单元格查看统计信息
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">
          统计信息 - {statistics.title || '未命名'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 当前间隔 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">当前间隔:</span>
          <span className="text-lg font-bold text-orange-600">
            {statistics.gapCount}
          </span>
        </div>

        {/* 中奖次数 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">中奖次数:</span>
          <span className="text-lg font-bold text-red-600">
            {statistics.scoreCount}
          </span>
        </div>

        {/* 最大间隔 */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">最大间隔:</span>
          <span className="text-lg font-bold text-purple-600">
            {statistics.maxGapCount}
          </span>
        </div>

        {/* 连续出现 */}
        {statistics.continueCount !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">连续出现:</span>
            <span className="text-lg font-bold text-blue-600">
              {statistics.continueCount}
            </span>
          </div>
        )}

        {/* 分隔线 */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-2">最大间隔详情</h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">开始期号:</span>
              <span>{statistics.maxGapStartId || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">开始日期:</span>
              <span>{statistics.maxGapStartTime || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">结束期号:</span>
              <span>{statistics.maxGapEndId || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">结束日期:</span>
              <span>{statistics.maxGapEndTime || '-'}</span>
            </div>
          </div>
        </div>

        {/* 按年统计 */}
        {statistics.yearGapList && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-2">按年统计</h3>
            <div className="max-h-40 overflow-auto space-y-1">
              {Object.entries(statistics.yearGapList)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([year, data]: [string, any]) => (
                  <div key={year} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{year}年:</span>
                    <span>
                      中奖 {data.scoreCount || 0} 次 /
                      最大间隔 {data.maxGapCount || 0}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 全局统计信息存储
 */
class StatisticsStore {
  private listeners: Set<(stats: any) => void> = new Set();
  private currentStats: any = null;

  subscribe(listener: (stats: any) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  update(stats: any) {
    this.currentStats = stats;
    this.listeners.forEach(listener => listener(stats));
  }

  get() {
    return this.currentStats;
  }
}

export const statisticsStore = new StatisticsStore();
