'use client';

import { useState } from 'react';
import * as Select from '@radix-ui/react-select';
import { AnalysisView } from '../shared/AnalysisView';
import { useDataSource } from '../../lib/core/data-source-context';
import { DEFAULT_DATA_SOURCES } from '../../lib/core/data-sources';

/**
 * 移动端主页
 * 炒股风格：紧凑、高效、重点突出
 * 顶部栏新增数据源切换（与 AnalysisView 顶栏对称）
 */
export function MobileHomePage() {
  const { source, availableYears, setSourceId } = useDataSource();

  return (
    <div className="lg:hidden h-screen flex flex-col bg-background">
      {/* 顶部标题栏 */}
      <header className="flex-shrink-0 z-50 bg-primary text-primary-foreground shadow-md">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">GBB 彩票分析</h1>
              <p className="text-[10px] opacity-80">2005-2025年历史数据</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* 数据源切换 */}
              <Select.Root value={source.id} onValueChange={setSourceId}>
                <Select.Trigger
                  aria-label="数据源"
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary-foreground/10 hover:bg-primary-foreground/20 border border-primary-foreground/20 rounded"
                >
                  <Select.Value />
                  <Select.Icon>▾</Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    position="popper"
                    sideOffset={4}
                    className="z-[100] bg-popover text-popover-foreground border rounded-md shadow-lg min-w-[140px]"
                  >
                    <Select.Viewport className="p-1">
                      {DEFAULT_DATA_SOURCES.map((s) => (
                        <Select.Item
                          key={s.id}
                          value={s.id}
                          className="text-sm px-3 py-1.5 rounded cursor-pointer outline-none data-[highlighted]:bg-muted"
                        >
                          <Select.ItemText>{s.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
              <div className="text-right">
                <div className="text-[10px] opacity-80">{new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区域 - 占据剩余空间 */}
      <div className="flex-1 overflow-hidden">
        <AnalysisView />
      </div>

      {/* 底部状态栏 */}
      <footer className="flex-shrink-0 bg-muted/90 backdrop-blur border-t py-2 px-4 text-[10px] text-muted-foreground z-50">
        <div className="flex justify-between items-center">
          <span>数据来源: {source.label}</span>
          <span>共{availableYears.length}年数据</span>
        </div>
      </footer>
    </div>
  );
}