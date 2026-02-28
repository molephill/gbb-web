import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 代理获取最新彩票数据并保存到文件
 * 从官方网站 API 获取，避免 CORS 限制
 * 支持自动获取所有页数据、按年分组、合并现有数据、保存到文件
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageSize = searchParams.get('pageSize') || '300';
    const saveToFile = searchParams.get('save') !== 'false'; // 默认保存

    // 存储所有获取的数据
    const allFetchedData: any[] = [];
    let currentPage = 1;
    let hasMoreData = true;
    let lastId: string | null = null;

    // 循环获取所有页数据，直到没有新数据
    while (hasMoreData) {
      const apiUrl = `https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry?gameNo=350133&provinceId=0&pageSize=${pageSize}&isVerify=1&pageNo=${currentPage}`;

      console.log(`Fetching page ${currentPage}...`);

      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.sporttery.cn/',
          'Origin': 'https://www.sporttery.cn',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();

      // 检查是否返回了错误 HTML
      if (text.startsWith('<!DOCTYPE') || text.includes('<html>')) {
        throw new Error('API returned HTML instead of JSON');
      }

      const data = JSON.parse(text);

      // 转换数据格式
      const list = data?.value?.list || [];
      if (list.length === 0) {
        hasMoreData = false;
        break;
      }

      const transformedList = list.map((item: any) => ({
        id: item.lotteryDrawNum,
        draw_date: item.lotteryDrawTime,
        results: item.lotteryDrawResult.replace(/\s+/g, '').substring(0, 4),
      }));

      // 检查是否重复（如果当前页的第一条数据已经在之前获取过，说明循环结束）
      if (lastId && transformedList[0]?.id === lastId) {
        console.log('Detected duplicate data, stopping fetch.');
        hasMoreData = false;
        break;
      }

      allFetchedData.push(...transformedList);
      lastId = transformedList[0]?.id;

      // 如果返回的数据少于 pageSize，说明已经到最后一页
      if (list.length < Number(pageSize)) {
        hasMoreData = false;
      } else {
        currentPage++;
      }

      // 防止无限循环，最多获取 20 页
      if (currentPage > 20) {
        console.log('Reached maximum page limit (20).');
        hasMoreData = false;
      }
    }

    console.log(`Total fetched: ${allFetchedData.length} records`);

    // 按年份分组
    const yearGroups = new Map<string, any[]>();
    for (const item of allFetchedData) {
      const year = item.draw_date.split('-')[0];
      if (!yearGroups.has(year)) {
        yearGroups.set(year, []);
      }
      yearGroups.get(year)!.push(item);
    }

    const yearKeys = Array.from(yearGroups.keys());
    console.log(`Data grouped into ${yearGroups.size} years:`, yearKeys.sort());

    // 保存结果统计
    const saveResults: { year: string; newCount: number; totalCount: number }[] = [];

    // 对每个年份进行处理
    if (saveToFile) {
      const dataDir = path.join(process.cwd(), 'public', 'data');

      // 确保目录存在
      await fs.mkdir(dataDir, { recursive: true });

      const yearEntries = Array.from(yearGroups.entries());
      for (const [year, newData] of yearEntries) {
        const filePath = path.join(dataDir, `${year}.json`);

        // 读取现有数据
        let existingData: any[] = [];
        try {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          existingData = JSON.parse(fileContent);
        } catch {
          // 文件不存在，使用空数组
          console.log(`File ${year}.json not found, will create new.`);
        }

        // 合并数据（使用 Map 去重，期号作为 key）
        const dataMap = new Map<string, any>();
        existingData.forEach(d => dataMap.set(d.id, d));
        const existingCount = dataMap.size;
        newData.forEach(d => dataMap.set(d.id, d));

        // 转换为数组并排序
        const mergedData = Array.from(dataMap.values())
          .sort((a, b) => Number(a.id) - Number(b.id));

        // 保存到文件
        await fs.writeFile(filePath, JSON.stringify(mergedData, null, 2), 'utf-8');

        const newCount = mergedData.length - existingCount;
        saveResults.push({
          year,
          newCount,
          totalCount: mergedData.length,
        });

        console.log(`Saved ${year}.json: ${mergedData.length} records (${newCount} new)`);
      }
    }

    // 提取年份列表用于更新前端
    const yearsAffected = Array.from(yearGroups.keys()).sort().reverse();

    return NextResponse.json({
      success: true,
      list: allFetchedData,
      total: allFetchedData.length,
      pages: currentPage - 1,
      saveResults,
      yearsAffected,
      message: `成功获取 ${allFetchedData.length} 条数据，已更新 ${saveResults.length} 个年份文件`,
    });
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch data',
        success: false,
      },
      { status: 500 }
    );
  }
}
