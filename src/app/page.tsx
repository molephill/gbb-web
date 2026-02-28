import { MobileHomePage } from '../components/mobile/MobileHomePage';
import { DesktopHomePage } from '../components/desktop/DesktopHomePage';

/**
 * 响应式主页 - 根据设备类型渲染不同组件
 * 移动端和桌面端通过 CSS 媒体查询控制显示
 */
export default function HomePage() {
  return (
    <div className="h-full">
      <MobileHomePage />
      <DesktopHomePage />
    </div>
  );
}
