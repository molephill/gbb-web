import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 执行 Git 命令
 */
async function gitCommand(command: string, cwd: string): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execAsync(command, { cwd });
  } catch (error: any) {
    return { stdout: '', stderr: error.message || '' };
  }
}

/**
 * 代理获取最新彩票数据并保存到文件
 * 从官方网站 API 获取，避免 CORS 限制
 * 增量更新：只获取新数据，智能补全
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageSize = searchParams.get('pageSize') || '300';
    const saveToFile = searchParams.get('save') !== 'false';
    const pushToGitee = searchParams.get('push') !== 'false';

    // 首先获取最新的一页数据来检查是否有新数据
    const latestApiResponse = await fetch(`https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry?gameNo=350133&provinceId=0&pageSize=1&isVerify=1&pageNo=1`, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.sporttery.cn/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!latestApiResponse.ok) {
      throw new Error(`API returned ${latestApiResponse.status}`);
    }

    const latestText = await latestApiResponse.text();
    if (latestText.startsWith('<!DOCTYPE')) {
      throw new Error('API returned HTML');
    }

    const latestData = JSON.parse(latestText);
    const latestList = latestData?.value?.list || [];
    if (latestList.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        message: '暂无新数据',
      });
    }

    const latestRecord = {
      id: latestList[0].lotteryDrawNum,
      draw_date: latestList[0].lotteryDrawTime,
      results: latestList[0].lotteryDrawResult.replace(/\s+/g, '').substring(0, 4),
    };

    // 检查各年份的最新数据，判断是否需要更新
    const dataDir = path.join(process.cwd(), 'public', 'data');
    await fs.mkdir(dataDir, { recursive: true });

    // 获取当前所有年份文件及其最新期号
    const yearFiles = await fs.readdir(dataDir).then(files =>
      files.filter(f => f.match(/^\d{4}\.json$/))
    );

    const yearLatestIds: Record<string, string> = {};
    for (const file of yearFiles) {
      try {
        const content = await fs.readFile(path.join(dataDir, file), 'utf-8');
        const data = JSON.parse(content);
        if (data.length > 0) {
          const year = file.replace('.json', '');
          yearLatestIds[year] = data[data.length - 1].id;
        }
      } catch (e) {
        // 跳过损坏的文件
      }
    }

    const latestYear = latestRecord.draw_date.split('-')[0];
    const latestIdInFile = yearLatestIds[latestYear];

    // 如果本地已有最新数据，不需要更新
    if (latestIdInFile && Number(latestRecord.id) <= Number(latestIdInFile)) {
      return NextResponse.json({
        success: true,
        total: 0,
        message: '已是最新数据，无需更新',
      });
    }

    // 有新数据，开始获取
    const startId = latestIdInFile || '0';
    const allFetchedData: any[] = [];
    let currentPage = 1;
    let hasMoreData = true;
    let lastId: string | null = null;

    // 只获取新数据（直到遇到本地已有的数据）
    while (hasMoreData) {
      const apiUrl = `https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry?gameNo=350133&provinceId=0&pageSize=${pageSize}&isVerify=1&pageNo=${currentPage}`;

      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.sporttery.cn/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) break;

      const text = await response.text();
      if (text.startsWith('<!DOCTYPE')) break;

      const data = JSON.parse(text);
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

      // 如果遇到本地已有的数据，停止获取
      const hasExistingData = transformedList.some(item => yearLatestIds[item.draw_date.split('-')[0]] && Number(item.id) <= Number(yearLatestIds[item.draw_date.split('-')[0]]));
      if (hasExistingData && currentPage === 1) {
        // 第一页就有已存在的数据，检查是否有新的
        const newItems = transformedList.filter(item => !yearLatestIds[item.draw_date.split('-')[0]] || Number(item.id) > Number(yearLatestIds[item.draw_date.split('-')[0]] || '0'));
        if (newItems.length > 0) {
          allFetchedData.push(...newItems);
        }
        hasMoreData = false;
      } else if (lastId && transformedList[transformedList.length - 1]?.id && yearLatestIds[latestYear] && Number(transformedList[transformedList.length - 1].id) <= Number(yearLatestIds[latestYear])) {
        // 已到达本地数据范围
        hasMoreData = false;
      } else {
        allFetchedData.push(...transformedList);
        lastId = transformedList[transformedList.length - 1]?.id || null;

        if (list.length < Number(pageSize) || currentPage >= 5) {
          // 最多获取5页新数据，避免过度请求
          hasMoreData = false;
        } else {
          currentPage++;
        }
      }
    }

    // 按年份分组
    const yearGroups = new Map<string, any[]>();
    for (const item of allFetchedData) {
      const year = item.draw_date.split('-')[0];
      if (!yearGroups.has(year)) {
        yearGroups.set(year, []);
      }
      yearGroups.get(year)!.push(item);
    }

    // 保存结果统计
    const saveResults: { year: string; newCount: number; totalCount: number; gaps?: string[] }[] = [];
    const warnings: string[] = [];

    // 对每个年份进行处理
    if (saveToFile && yearGroups.size > 0) {
      const yearEntries = Array.from(yearGroups.entries());
      for (const [year, newData] of yearEntries) {
        const filePath = path.join(dataDir, `${year}.json`);

        let existingData: any[] = [];
        try {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          existingData = JSON.parse(fileContent);
        } catch {
          // 文件不存在
        }

        const dataMap = new Map<string, any>();
        existingData.forEach(d => dataMap.set(d.id, d));
        const existingCount = dataMap.size;
        newData.forEach(d => dataMap.set(d.id, d));

        // 先保存新数据
        const mergedData = Array.from(dataMap.values())
          .sort((a, b) => Number(a.id) - Number(b.id));

        await fs.writeFile(filePath, JSON.stringify(mergedData, null, 2), 'utf-8');

        // 只对新更新的年份检测断层
        const gaps: string[] = [];
        if (mergedData.length > 1) {
          let prevId = Number(mergedData[0].id);
          for (let i = 1; i < mergedData.length; i++) {
            const currId = Number(mergedData[i].id);
            if (currId - prevId > 1) {
              gaps.push(`${prevId + 1}-${currId - 1}`);
            }
            prevId = currId;
          }
        }

        // 只补全新数据附近的断层（最近30期内的）
        let filledCount = 0;
        if (gaps.length > 0) {
          const latestId = Number(mergedData[mergedData.length - 1].id);
          const recentGaps = gaps.filter(gap => {
            const [start, end] = gap.split('-').map(Number);
            return start >= latestId - 30; // 只补全最近30期内的断层
          });

          for (const gapRange of recentGaps) {
            const [start, end] = gapRange.split('-').map(Number);
            for (let id = start; id <= end; id++) {
              const idStr = String(id).padStart(5, '0');
              if (dataMap.has(idStr)) continue;

              try {
                const apiUrl = `https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry?gameNo=350133&provinceId=0&pageSize=1&isVerify=1&lotteryDrawNum=${idStr}`;
                const response = await fetch(apiUrl, {
                  headers: {
                    'Accept': 'application/json',
                    'Referer': 'https://www.sporttery.cn/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  },
                });

                if (response.ok) {
                  const text = await response.text();
                  if (!text.startsWith('<!DOCTYPE')) {
                    const data = JSON.parse(text);
                    const list = data?.value?.list || [];
                    if (list.length > 0) {
                      const item = list[0];
                      const record = {
                        id: item.lotteryDrawNum,
                        draw_date: item.lotteryDrawTime,
                        results: item.lotteryDrawResult.replace(/\s+/g, '').substring(0, 4),
                      };
                      dataMap.set(idStr, record);
                      filledCount++;
                    }
                  }
                }
              } catch (e) {
                // 忽略单条失败
              }

              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }

          // 重新保存补全后的数据
          const finalData = Array.from(dataMap.values())
            .sort((a, b) => Number(a.id) - Number(b.id));
          await fs.writeFile(filePath, JSON.stringify(finalData, null, 2), 'utf-8');

          // 重新检测断层
          const newGaps: string[] = [];
          if (finalData.length > 1) {
            let prevId = Number(finalData[0].id);
            for (let i = 1; i < finalData.length; i++) {
              const currId = Number(finalData[i].id);
              if (currId - prevId > 1) {
                newGaps.push(`${prevId + 1}-${currId - 1}`);
              }
              prevId = currId;
            }
          }

          if (filledCount > 0) {
            warnings.push(`${year}年补全 ${filledCount} 条${newGaps.length > 0 ? `，仍缺失: ${newGaps.join(', ')}` : ''}`);
          } else if (newGaps.length > 0 && recentGaps.length < gaps.length) {
            warnings.push(`${year}年数据断层: ${newGaps.join(', ')}`);
          }
        }

        saveResults.push({ year, newCount: mergedData.length - existingCount, totalCount: dataMap.size });
      }
    }

    // Git 提交和推送
    let gitResult = { committed: false, pushed: false, message: '' };
    if (saveToFile && pushToGitee && saveResults.length > 0) {
      try {
        let rootDir = process.cwd();
        while (rootDir !== path.parse(rootDir).root) {
          const gitDir = path.join(rootDir, '.git');
          try {
            await fs.access(gitDir);
            break;
          } catch {
            rootDir = path.dirname(rootDir);
          }
        }

        const dataDir = 'packages/web/public/data';
        for (const result of saveResults) {
          await gitCommand(`git add ${dataDir}/${result.year}.json`, rootDir);
        }

        const totalNew = saveResults.reduce((sum, r) => sum + r.newCount, 0);
        const years = saveResults.map(r => r.year).join(', ');
        const commitMessage = `chore: update lottery data (${years}, +${totalNew} records)`;
        await gitCommand(`git commit -m "${commitMessage}"`, rootDir);
        gitResult.committed = true;

        await gitCommand('git push', rootDir);
        gitResult.pushed = true;
        gitResult.message = '已提交并推送到 Gitee';
      } catch (error: any) {
        gitResult.message = `Git 操作失败: ${error.message}`;
      }
    }

    const yearsAffected = Array.from(yearGroups.keys()).sort().reverse();

    return NextResponse.json({
      success: true,
      list: allFetchedData,
      total: allFetchedData.length,
      pages: currentPage - 1,
      saveResults,
      yearsAffected,
      warnings,
      gitResult,
      message: allFetchedData.length > 0
        ? `获取 ${allFetchedData.length} 条新数据 (${yearsAffected.join(', ')})${warnings.length > 0 ? '，' + warnings.join('; ') : ''}${gitResult.pushed ? '，已推送Gitee' : ''}`
        : '已是最新数据',
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
