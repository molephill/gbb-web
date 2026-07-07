#!/usr/bin/env node
/**
 * 同步彩票数据脚本（多数据源）
 * - 支持 gbb（体彩 350133）和 qxc（七星彩 04）
 * - 调用官方 API 获取最新数据
 * - 与本地缓存合并去重
 * - 输出到 caches/{source.cacheDir}/{year}.json
 *
 * 用法: node scripts/sync-data.mjs [sourceId]
 *   不传 sourceId 则同步所有数据源
 */
import { promises as fs } from 'fs';
import path from 'path';

const REPO_ROOT = process.cwd();
const API_BASE = 'https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry';

const DATA_SOURCES = [
  {
    id: 'gbb',
    gameNo: '350133',
    cacheDir: 'caches',
    // results 取前 4 位（体彩 350133 主玩法）
    pickResults: (s) => s.replace(/\s+/g, '').substring(0, 4),
  },
  {
    id: 'qxc',
    gameNo: '04',
    cacheDir: 'caches/qxc',
    // 七星彩 7 位
    pickResults: (s) => s.replace(/\s+/g, '').substring(0, 7),
  },
];

const HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'Pragma': 'no-cache',
  'Referer': 'https://www.sporttery.cn/',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'X-Requested-With': 'XMLHttpRequest',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 从官方 API 获取一页数据（带重试）
 */
async function fetchPage(gameNo, pageNo, pageSize = 300, maxRetries = 5) {
  const url = `${API_BASE}?gameNo=${gameNo}&provinceId=0&pageSize=${pageSize}&isVerify=1&pageNo=${pageNo}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const text = await res.text();
      if (text.startsWith('<!DOCTYPE')) throw new Error('API 返回 HTML');
      const data = JSON.parse(text);
      if (data?.errorCode && data.errorCode !== '0') {
        throw new Error(`API ${data.errorCode}: ${data.errorMessage || '业务错误'}`);
      }
      return data?.value?.list || [];
    } catch (err) {
      console.error(`  第 ${pageNo} 页第 ${attempt}/${maxRetries} 次失败: ${err.message}`);
      if (attempt < maxRetries) {
        await sleep(2000 * Math.pow(2, attempt - 1));
      } else {
        throw err;
      }
    }
  }
}

/**
 * 同步单个数据源
 */
async function syncSource(source) {
  console.log(`\n📦 同步数据源: ${source.id} (gameNo=${source.gameNo})`);
  const dataDir = path.join(REPO_ROOT, source.cacheDir);
  await fs.mkdir(dataDir, { recursive: true });

  // 加载现有数据
  const yearData = new Map();
  const existingYears = await fs.readdir(dataDir).catch(() => []);
  for (const file of existingYears.filter((f) => /^\d{4}\.json$/.test(f))) {
    const year = file.replace('.json', '');
    try {
      const data = JSON.parse(await fs.readFile(path.join(dataDir, file), 'utf-8'));
      yearData.set(year, new Map(data.map((d) => [d.id, d])));
    } catch {}
  }

  // 拉取新数据
  const allNew = [];
  for (let page = 1; page <= 5; page++) {
    try {
      const list = await fetchPage(source.gameNo, page, 300);
      if (list.length === 0) break;
      const transformed = list.map((item) => ({
        id: item.lotteryDrawNum,
        draw_date: item.lotteryDrawTime,
        results: source.pickResults(item.lotteryDrawResult),
      }));
      allNew.push(...transformed);

      const latestYear = transformed[0]?.draw_date?.split('-')[0];
      const yearMap = yearData.get(latestYear);
      const latestLocalId = yearMap ? Array.from(yearMap.keys()).pop() : null;
      const latestNewId = transformed[transformed.length - 1]?.id;
      if (latestLocalId && Number(latestNewId) <= Number(latestLocalId)) break;
      if (list.length < 300) break;
      await sleep(500);
    } catch (err) {
      console.error(`  ${source.id} 第 ${page} 页最终失败: ${err.message}`);
      break;
    }
  }

  if (allNew.length === 0) {
    console.log(`  ${source.id}: 无新数据`);
    return 0;
  }

  // 合并
  for (const item of allNew) {
    const year = item.draw_date.split('-')[0];
    if (!yearData.has(year)) yearData.set(year, new Map());
    yearData.get(year).set(item.id, item);
  }

  // 写回
  let totalNew = 0;
  for (const [year, map] of yearData) {
    const sorted = Array.from(map.values()).sort((a, b) => Number(a.id) - Number(b.id));
    const filePath = path.join(dataDir, `${year}.json`);
    const oldSize = existingYears.includes(`${year}.json`)
      ? JSON.parse(await fs.readFile(filePath, 'utf-8').catch(() => '[]')).length
      : 0;
    await fs.writeFile(filePath, JSON.stringify(sorted, null, 2), 'utf-8');
    const newCount = sorted.length - oldSize;
    if (newCount > 0) {
      console.log(`  ✅ ${source.id}/${year}: +${newCount} 条 (总数 ${sorted.length})`);
      totalNew += newCount;
    }
  }
  return totalNew;
}

async function main() {
  const targetId = process.argv[2];
  const sources = targetId
    ? DATA_SOURCES.filter((s) => s.id === targetId)
    : DATA_SOURCES;

  if (sources.length === 0) {
    console.error(`未知数据源: ${targetId}`);
    console.error(`可用: ${DATA_SOURCES.map((s) => s.id).join(', ')}`);
    process.exit(1);
  }

  let totalAll = 0;
  for (const source of sources) {
    totalAll += await syncSource(source);
  }
  console.log(`\n总计新增: ${totalAll} 条`);
}

main().catch((err) => {
  console.error('同步失败:', err);
  process.exit(1);
});