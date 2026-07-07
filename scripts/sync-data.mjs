#!/usr/bin/env node
/**
 * 同步彩票数据脚本
 * - 调用官方 API 获取最新数据
 * - 与本地缓存合并去重
 * - 输出到 data-repo/caches/{year}.json
 */
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data-repo', 'caches');
const API_BASE = 'https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry';
const GAME_NO = '350133';
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

/**
 * 休眠
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 从官方 API 获取一页数据（带重试）
 */
async function fetchPage(pageNo, pageSize = 300, maxRetries = 5) {
  const url = `${API_BASE}?gameNo=${GAME_NO}&provinceId=0&pageSize=${pageSize}&isVerify=1&pageNo=${pageNo}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const text = await res.text();
      if (text.startsWith('<!DOCTYPE')) throw new Error('API 返回 HTML');
      const data = JSON.parse(text);

      // 检查 API 业务错误码（如 567 风控）
      if (data?.errorCode && data.errorCode !== '0') {
        throw new Error(`API ${data.errorCode}: ${data.errorMessage || '业务错误'}`);
      }

      return data?.value?.list || [];
    } catch (err) {
      console.error(`第 ${pageNo} 页第 ${attempt}/${maxRetries} 次失败: ${err.message}`);
      if (attempt < maxRetries) {
        // 指数退避：2s, 4s, 8s, 16s
        await sleep(2000 * Math.pow(2, attempt - 1));
      } else {
        throw err;
      }
    }
  }
}

/**
 * 转换原始数据
 */
function transform(list) {
  return list.map((item) => ({
    id: item.lotteryDrawNum,
    draw_date: item.lotteryDrawTime,
    results: item.lotteryDrawResult.replace(/\s+/g, '').substring(0, 4),
  }));
}

/**
 * 主流程
 */
async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  // 加载现有数据，按年份索引
  const yearData = new Map();
  const existingYears = await fs.readdir(DATA_DIR).catch(() => []);
  for (const file of existingYears.filter((f) => /^\d{4}\.json$/.test(f))) {
    const year = file.replace('.json', '');
    try {
      const data = JSON.parse(await fs.readFile(path.join(DATA_DIR, file), 'utf-8'));
      yearData.set(year, new Map(data.map((d) => [d.id, d])));
    } catch {}
  }

  // 拉取多页新数据
  const allNew = [];
  for (let page = 1; page <= 5; page++) {
    try {
      const list = await fetchPage(page, 300);
      if (list.length === 0) break;
      const transformed = transform(list);
      allNew.push(...transformed);
      // 找出最新年份
      const latestYear = transformed[0]?.draw_date?.split('-')[0];
      const yearMap = yearData.get(latestYear);
      const latestLocalId = yearMap ? Array.from(yearMap.keys()).pop() : null;
      const latestNewId = transformed[transformed.length - 1]?.id;
      // 如果最新一页已经全部是本地有的，停止
      if (latestLocalId && Number(latestNewId) <= Number(latestLocalId)) {
        break;
      }
      if (list.length < 300) break;
      // 每页之间加一个短暂延迟，避免触发风控
      await sleep(500);
    } catch (err) {
      console.error(`第 ${page} 页最终失败: ${err.message}`);
      break;
    }
  }

  if (allNew.length === 0) {
    console.log('无新数据');
    return;
  }

  // 合并到年份 Map
  for (const item of allNew) {
    const year = item.draw_date.split('-')[0];
    if (!yearData.has(year)) yearData.set(year, new Map());
    yearData.get(year).set(item.id, item);
  }

  // 写回文件
  let totalNew = 0;
  for (const [year, map] of yearData) {
    const sorted = Array.from(map.values()).sort((a, b) => Number(a.id) - Number(b.id));
    const filePath = path.join(DATA_DIR, `${year}.json`);
    const oldSize = existingYears.includes(`${year}.json`)
      ? JSON.parse(await fs.readFile(filePath, 'utf-8').catch(() => '[]')).length
      : 0;
    await fs.writeFile(filePath, JSON.stringify(sorted, null, 2), 'utf-8');
    const newCount = sorted.length - oldSize;
    if (newCount > 0) {
      console.log(`✅ ${year}: +${newCount} 条 (总数 ${sorted.length})`);
      totalNew += newCount;
    }
  }

  console.log(`总计新增: ${totalNew} 条`);
}

main().catch((err) => {
  console.error('同步失败:', err);
  process.exit(1);
});