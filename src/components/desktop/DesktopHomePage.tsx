'use client';

import { AnalysisView } from '../shared/AnalysisView';

/**
 * 桌面端主页
 * 直接使用 AnalysisView，铺满整个界面
 */
export function DesktopHomePage() {
  return (
    <div className="hidden lg:flex h-screen flex-col bg-background">
      {/* 顶部标题栏 */}
      <header className="flex-shrink-0 h-12 bg-primary text-primary-foreground flex items-center px-4 shadow-md">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">GBB 彩票分析</h1>
          <div className="h-6 w-px bg-primary-foreground/20"></div>
          <span className="text-sm opacity-80">
            历史数据分析工具 - 支持 2005-2025 年数据
          </span>
        </div>
        <div className="ml-auto text-sm opacity-80">
          {new Date().toLocaleDateString()}
        </div>
      </header>

      {/* 主内容区域 - 直接使用 AnalysisView */}
      <div className="flex-1 overflow-hidden">
        <AnalysisView />
      </div>

      {/* 底部状态栏 */}
      <footer className="flex-shrink-0 h-6 bg-muted border-t flex items-center px-4 text-xs text-muted-foreground">
        <span className="flex-1">数据来源: 本地数据 | 总计: 21年 (2005-2025)</span>
      </footer>
    </div>
  );
}
