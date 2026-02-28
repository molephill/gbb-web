'use client';

import { useEffect, useRef, useState } from 'react';
import { GoldenLayout } from 'golden-layout';
import { AnalysisView } from '@/components/shared/AnalysisView';
import { StatisticsPanel } from '@/components/shared/StatisticsPanel';

/**
 * Golden Layout 容器组件
 */
export function GoldenLayoutView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<GoldenLayout | null>(null);
  const initializedRef = useRef(false);
  const [selectedStats, setSelectedStats] = useState<any>(null);

  useEffect(() => {
    if (!containerRef.current || layoutRef.current || initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    // 配置 Golden Layout
    const config: any = {
      settings: {
        showPopoutIcon: false,
        showMaximiseIcon: true,
        showCloseIcon: false,
      },
      dimensions: {
        headerHeight: 32,
      },
      content: [
        {
          type: 'row',
          content: [
            {
              type: 'stack',
              width: 70,
              content: [
                {
                  type: 'component',
                  componentName: 'AnalysisView',
                  title: '数据分析',
                  isClosable: false,
                },
              ],
            },
            {
              type: 'stack',
              width: 30,
              content: [
                {
                  type: 'component',
                  componentName: 'StatisticsPanel',
                  title: '统计信息',
                  isClosable: false,
                  componentState: { onUpdateStats: setSelectedStats },
                },
              ],
            },
          ],
        },
      ],
    };

    // 创建布局
    const layout = new GoldenLayout(config, containerRef.current);
    layoutRef.current = layout;

    // 注册组件
    layout.registerComponent('AnalysisView', (container: any) => {
      // 创建一个容器元素
      const element = document.createElement('div');
      element.className = 'h-full w-full';
      container.element.appendChild(element);

      // 使用 React 渲染组件
      import('react-dom/client').then(({ createRoot }) => {
        const root = createRoot(element);
        root.render(<AnalysisView />);
      });
    });

    layout.registerComponent('StatisticsPanel', (container: any) => {
      const element = document.createElement('div');
      element.className = 'h-full w-full overflow-auto';
      container.element.appendChild(element);

      import('react-dom/client').then(({ createRoot }) => {
        const root = createRoot(element);
        root.render(<StatisticsPanel statistics={selectedStats} />);
      });
    });

    // 初始化布局
    layout.init();

    // 清理
    return () => {
      if (layoutRef.current) {
        layoutRef.current.destroy();
        layoutRef.current = null;
      }
      initializedRef.current = false;
    };
  }, [selectedStats]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ position: 'relative' }}
    />
  );
}
