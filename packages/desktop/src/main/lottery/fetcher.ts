import puppeteer from 'puppeteer';

interface LotteryDraw {
  id: string;
  draw_date: string;
  results: string;
}

/**
 * 抓取彩票数据
 * 复用现有的 Puppeteer 逻辑
 */
export async function fetchLotteryData(): Promise<LotteryDraw[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // 这里需要根据实际的数据源 URL 进行调整
    // 示例：从彩票官网抓取数据
    await page.goto('https://www.example.com/lottery', {
      waitUntil: 'networkidle2',
    });

    // 提取数据逻辑
    const data = await page.evaluate(() => {
      // 根据页面结构提取数据
      // @ts-ignore - 运行在浏览器环境中
      const items = document.querySelectorAll('.lottery-item');
      // @ts-ignore
      return Array.from(items).map((item: any) => ({
        // @ts-ignore
        id: item.querySelector('.id')?.textContent || '',
        // @ts-ignore
        draw_date: item.querySelector('.date')?.textContent || '',
        // @ts-ignore
        results: item.querySelector('.result')?.textContent || '',
      }));
    });

    return data;
  } finally {
    await browser.close();
  }
}

/**
 * 同步数据到 Git 仓库
 */
export async function syncDataToGit(data: LotteryDraw[], message: string = 'sync data'): Promise<void> {
  const { gitPush } = await import('../git/sync');
  await gitPush(message);
}
