import { DataSourceProvider } from '../lib/core/data-source-context';
import { MobileHomePage } from '../components/mobile/MobileHomePage';
import { DesktopHomePage } from '../components/desktop/DesktopHomePage';

/**
 * 响应式主页 - 根据设备类型渲染不同组件
 * 移动端和桌面端通过 CSS 媒体查询控制显示
 *
 * 顶层包一层 DataSourceProvider，让移动/桌面端共享同一数据源状态。
 */
export default function HomePage() {
  return (
    <DataSourceProvider>
      <div className="h-full">
        <MobileHomePage />
        <DesktopHomePage />
      </div>
    </DataSourceProvider>
  );
}