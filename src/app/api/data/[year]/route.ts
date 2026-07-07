import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 获取指定年份的开奖数据
 *
 * 数据源策略：
 * 1. 本地开发（无 VERCEL 环境变量）：读取 caches/{year}.json
 * 2. Vercel 生产环境：实时从 Gitee 仓库拉取，无需重新部署
 *    - 仓库：gitee.com/liar7254/gbb
 *    - 路径：caches/{year}.json
 *    - 由 Gitee Actions 自动同步（国内 IP 不被风控）
 * 3. 同时尝试 raw 主分支（master）和 main 分支（兼容）
 */
const GITEE_RAW_BASES = [
  'https://gitee.com/liar7254/gbb/raw/master/caches',
  'https://gitee.com/liar7254/gbb/raw/main/caches',
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year } = await params;

  // 验证年份格式
  if (!/^\d{4}$/.test(year)) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
  }

  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  // 生产环境（Vercel）：实时从 Gitee 拉取
  if (process.env.VERCEL === '1') {
    for (const base of GITEE_RAW_BASES) {
      try {
        const url = `${base}/${year}.json`;
        const res = await fetch(url, {
          cache: 'no-store',
          headers: { 'User-Agent': 'GBB-Web/1.0' },
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data, { headers: noCacheHeaders });
        }
      } catch {
        // 尝试下一个 base
      }
    }
    return NextResponse.json(
      { error: `Year ${year} data not found in Gitee` },
      { status: 404 }
    );
  }

  // 本地开发：读取本地文件
  try {
    const filePath = path.join(process.cwd(), 'caches', `${year}.json`);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    return NextResponse.json(data, { headers: noCacheHeaders });
  } catch {
    // 本地也没有 → 尝试 Gitee 兜底
    for (const base of GITEE_RAW_BASES) {
      try {
        const res = await fetch(`${base}/${year}.json`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data, { headers: noCacheHeaders });
        }
      } catch {}
    }
    return NextResponse.json(
      { error: `Year ${year} data not found` },
      { status: 404 }
    );
  }
}