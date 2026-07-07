import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getDataSource, DEFAULT_DATA_SOURCE_ID } from '@/lib/core/data-sources';

/**
 * 获取指定数据源的可用年份列表（合并本地缓存 + 注册中心声明）
 *
 * 数据源策略：
 * 1. 扫描本地 caches/{source.cacheDir}/ 下的 *.json 文件名
 * 2. 合并 DataSource 注册中心声明的 years
 * 3. 去重 + 按降序排序
 *
 * 用于前端发现缓存中实际存在但注册中心未声明的年份（例如 fetch 新抓到的 2026）
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const source = getDataSource(url.searchParams.get('source') ?? DEFAULT_DATA_SOURCE_ID);

  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  try {
    const cacheDir = path.join(process.cwd(), source.cacheDir);
    let cacheYears: string[] = [];
    try {
      const files = await fs.readdir(cacheDir);
      cacheYears = files
        .filter((f) => /^\d{4}\.json$/.test(f))
        .map((f) => f.replace('.json', ''));
    } catch {
      // 缓存目录不存在（首次访问）
    }

    // 合并注册中心声明 + 本地缓存
    const merged = new Set<string>([...source.years, ...cacheYears]);
    const years = Array.from(merged).sort((a, b) => Number(b) - Number(a));

    return NextResponse.json(
      { source: source.id, years, registeredYears: source.years, cacheYears },
      { headers: noCacheHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to list years',
        source: source.id,
        years: [...source.years],
      },
      { status: 500, headers: noCacheHeaders }
    );
  }
}