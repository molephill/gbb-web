import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface LotteryDraw {
  id: string;
  draw_date: string;
  results: string;
}

/**
 * 获取最新开奖数据并保存到本地
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageSize = searchParams.get('pageSize') || '300';
  const save = searchParams.get('save') === 'true';

  try {
    // 获取最新一页数据
    const response = await fetch(
      `https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry?gameNo=350133&provinceId=0&pageSize=${pageSize}&isVerify=1&pageNo=1`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from API');
    }

    const text = await response.text();
    const data = JSON.parse(text);

    if (data.value?.list) {
      const list = data.value.list;
      const transformedList: LotteryDraw[] = list.map((item: any) => ({
        id: item.lotteryDrawNum,
        draw_date: item.lotteryDrawTime,
        results: item.lotteryDrawResult.replace(/\s+/g, '').substring(0, 4),
      }));

      if (save) {
        // 按年份分组并保存
        const yearGroups = new Map<string, LotteryDraw[]>();
        for (const item of transformedList) {
          const year = item.draw_date.split('-')[0];
          if (!yearGroups.has(year)) {
            yearGroups.set(year, []);
          }
          yearGroups.get(year)!.push(item);
        }

        const dataDir = path.join(process.cwd(), 'public', 'data');
        await fs.mkdir(dataDir, { recursive: true });

        const results = {
          success: true,
          total: transformedList.length,
          years: [] as string[],
          saved: [] as string[],
        };

        for (const [year, newData] of yearGroups) {
          const filePath = path.join(dataDir, `${year}.json`);

          let existingData: LotteryDraw[] = [];
          try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            existingData = JSON.parse(fileContent);
          } catch {
            // 文件不存在
          }

          const dataMap = new Map<string, LotteryDraw>();
          existingData.forEach(d => dataMap.set(d.id, d));
          newData.forEach(d => dataMap.set(d.id, d));

          const mergedData = Array.from(dataMap.values())
            .sort((a, b) => Number(a.id) - Number(b.id));

          await fs.writeFile(filePath, JSON.stringify(mergedData, null, 2), 'utf-8');

          results.years.push(year);
          const newCount = newData.filter(d => !existingData.find(e => e.id === d.id)).length;
          results.saved.push(`${year}:+${newCount}`);
        }

        return NextResponse.json(results);
      }

      return NextResponse.json({
        success: true,
        total: transformedList.length,
        data: transformedList,
      });
    }

    return NextResponse.json({ success: false, error: 'No data found' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
