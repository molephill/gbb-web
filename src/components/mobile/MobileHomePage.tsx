'use client';

import { AnalysisView } from '../shared/AnalysisView';

/**
 * 移动端主页
 * 炒股风格：紧凑、高效、重点突出
 */
export function MobileHomePage() {
  return (
    <div className="lg:hidden h-screen flex flex-col bg-background">
      {/* 顶部标题栏 */}
      <header className="flex-shrink-0 z-50 bg-primary text-primary-foreground shadow-md">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">GBB 彩票分析</h1>
              <p className="text-[10px] opacity-80">2005-2025年历史数据</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] opacity-80">{new Date().toLocaleDateString()}</div>
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
          <span>数据来源: 本地</span>
          <span>共21年数据</span>
        </div>
      </footer>
    </div>
  );
}
