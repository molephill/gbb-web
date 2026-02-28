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
 * 支持自动获取所有页数据、按年分组、合并现有数据、保存到文件、自动提交到 Gitee
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageSize = searchParams.get('pageSize') || '300';
    const saveToFile = searchParams.get('save') !== 'false'; // 默认保存
    const pushToGitee = searchParams.get('push') !== 'false'; // 默认推送

    // 存储所有获取的数据
    const allFetchedData: any[] = [];
    let currentPage = 1;
    let hasMoreData = true;
    let lastId: string | null = null;

    // 循环获取所有页数据，直到没有新数据
    while (hasMoreData) {
      const apiUrl = `https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry?gameNo=350133&provinceId=0&pageSize=${pageSize}&isVerify=1&pageNo=${currentPage}`;

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

      // 检查是否重复
      if (lastId && transformedList[0]?.id === lastId) {
        hasMoreData = false;
        break;
      }

      allFetchedData.push(...transformedList);
      lastId = transformedList[0]?.id;

      if (list.length < Number(pageSize)) {
        hasMoreData = false;
      } else {
        currentPage++;
      }

      if (currentPage > 20) {
        hasMoreData = false;
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
    if (saveToFile) {
      const dataDir = path.join(process.cwd(), 'public', 'data');
      await fs.mkdir(dataDir, { recursive: true });

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

        const mergedData = Array.from(dataMap.values())
          .sort((a, b) => Number(a.id) - Number(b.id));

        // 检测数据断层
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

        if (gaps.length > 0) {
          warnings.push(`${year}年数据断层: 缺失期号 ${gaps.join(', ')}`);
        }

        await fs.writeFile(filePath, JSON.stringify(mergedData, null, 2), 'utf-8');

        const newCount = mergedData.length - existingCount;
        saveResults.push({ year, newCount, totalCount: mergedData.length, gaps });
      }
    }

    // Git 提交和推送
    let gitResult = { committed: false, pushed: false, message: '' };
    if (saveToFile && pushToGitee && saveResults.length > 0) {
      try {
        // 找到项目根目录（包含 .git 的目录）
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

        // 添加数据文件
        const dataDir = 'packages/web/public/data';
        for (const result of saveResults) {
          await gitCommand(`git add ${dataDir}/${result.year}.json`, rootDir);
        }

        // 提交
        const totalNew = saveResults.reduce((sum, r) => sum + r.newCount, 0);
        const years = saveResults.map(r => r.year).join(', ');
        const commitMessage = `chore: update lottery data (${years}, +${totalNew} records)`;
        await gitCommand(`git commit -m "${commitMessage}"`, rootDir);
        gitResult.committed = true;

        // 推送
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
      message: `成功获取 ${allFetchedData.length} 条数据，已更新 ${saveResults.length} 个年份文件${gitResult.pushed ? '，' + gitResult.message : ''}${warnings.length > 0 ? '，' + warnings.join('; ') : ''}`,
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
