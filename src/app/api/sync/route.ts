import { NextResponse } from 'next/server';

/**
 * 定时同步端点
 * 由外部 cron 服务（如 cron-job.org）每 6 小时调用一次
 *
 * 流程：
 * 1. 接收 cron 触发
 * 2. 调用官方 API 拉取 gbb + qxc 最新数据
 * 3. 通过 Gitee Open API 提交到 Gitee 数据仓库
 *
 * 鉴权：检查 ?key= 参数匹配 CRON_SECRET（环境变量）
 */

interface LotteryDraw {
  id: string;
  draw_date: string;
  results: string;
}

interface DataSource {
  id: string;
  gameNo: string;
  pickDigits: number;
  cacheDir: string;
}

const DATA_SOURCES: DataSource[] = [
  { id: 'gbb', gameNo: '350133', pickDigits: 4, cacheDir: 'caches' },
  { id: 'qxc', gameNo: '04', pickDigits: 7, cacheDir: 'caches/qxc' },
];

const HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Referer': 'https://www.sporttery.cn/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

const GITEE_API = 'https://gitee.com/api/v5';

/**
 * 拉取一个数据源的所有年份数据
 */
async function fetchSource(source: DataSource): Promise<Record<string, LotteryDraw[]>> {
  const yearData: Record<string, LotteryDraw[]> = {};
  let allItems: LotteryDraw[] = [];

  // 拉多页
  for (let page = 1; page <= 3; page++) {
    const url = `https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry?gameNo=${source.gameNo}&provinceId=0&pageSize=300&isVerify=1&pageNo=${page}`;
    try {
      const res = await fetch(url, { headers: HEADERS, cache: 'no-store' });
      if (!res.ok) break;
      const text = await res.text();
      if (text.startsWith('<!DOCTYPE')) break;
      const data = JSON.parse(text);
      const list = data?.value?.list || [];
      if (list.length === 0) break;

      const transformed: LotteryDraw[] = list.map((item: any) => ({
        id: item.lotteryDrawNum,
        draw_date: item.lotteryDrawTime,
        results: item.lotteryDrawResult.replace(/\s+/g, '').substring(0, source.pickDigits),
      }));
      allItems = allItems.concat(transformed);
      if (list.length < 300) break;
    } catch {
      break;
    }
  }

  // 按年份分组
  for (const item of allItems) {
    const year = item.draw_date.split('-')[0];
    if (!yearData[year]) yearData[year] = [];
    if (!yearData[year].find((d) => d.id === item.id)) {
      yearData[year].push(item);
    }
  }

  // 排序
  for (const year of Object.keys(yearData)) {
    yearData[year].sort((a, b) => Number(a.id) - Number(b.id));
  }

  return yearData;
}

/**
 * 通过 Gitee Open API 获取文件当前内容
 */
async function getGiteeFile(path: string, token: string): Promise<{ sha: string; content: string } | null> {
  const url = `${GITEE_API}/repos/liar7254/gbb/contents/${path}?access_token=${token}&ref=master`;
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Gitee GET ${res.status}`);
  const json = await res.json();
  return {
    sha: json.sha,
    content: Buffer.from(json.content, 'base64').toString('utf-8'),
  };
}

/**
 * 通过 Gitee Open API 提交文件
 */
async function commitGiteeFile(
  path: string,
  content: string,
  message: string,
  sha: string | null,
  token: string
): Promise<boolean> {
  const url = `${GITEE_API}/repos/liar7254/gbb/contents/${path}?access_token=${token}`;
  const body: any = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch: 'master',
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Gitee commit ${path} 失败: ${res.status} ${err}`);
    return false;
  }
  return true;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  // 鉴权
  const expectedKey = process.env.CRON_SECRET;
  if (expectedKey && key !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.GITEE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'GITEE_TOKEN not configured' }, { status: 500 });
  }

  const results: { source: string; years: string[]; commits: number; errors: string[] }[] = [];

  for (const source of DATA_SOURCES) {
    const yearData = await fetchSource(source);
    const errors: string[] = [];
    let commits = 0;
    const years = Object.keys(yearData).sort();

    for (const year of years) {
      const filePath = `${source.cacheDir}/${year}.json`;
      const fileContent = JSON.stringify(yearData[year], null, 2);

      try {
        // 获取当前 sha（用于更新）
        const existing = await getGiteeFile(filePath, token);
        const ok = await commitGiteeFile(
          filePath,
          fileContent,
          `chore: 同步 ${source.id}/${year}`,
          existing?.sha ?? null,
          token
        );
        if (ok) commits++;
      } catch (err: any) {
        errors.push(`${year}: ${err.message}`);
      }
    }

    results.push({ source: source.id, years, commits, errors });
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
}

export async function POST(request: Request) {
  return GET(request);
}