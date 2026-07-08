'use client';

import { useEffect, useState, useRef } from 'react';
import type { LotteryDraw } from './core';
import {
  DEFAULT_DATA_SOURCE_ID,
  getDataSource,
  type DataSource,
} from './core/data-sources';

/**
 * 获取指定数据源的可用年份列表（按降序）
 */
export function getAvailableYears(sourceId: string = DEFAULT_DATA_SOURCE_ID): string[] {
  return [...getDataSource(sourceId).years];
}

/**
 * 向后兼容：常量 AVAILABLE_YEARS 指向默认数据源（gbb）的年份列表
 * 旧调用方未迁移前可继续使用
 * @deprecated 请改用 getAvailableYears(sourceId)
 */
export const AVAILABLE_YEARS: string[] = getAvailableYears(DEFAULT_DATA_SOURCE_ID);

/**
 * 从官方 API 获取最新数据
 */
export async function fetchLatestData(
  pageNo: number = 1,
  pageSize: number = 300,
  sourceId: string = DEFAULT_DATA_SOURCE_ID
): Promise<{
  list: LotteryDraw[];
  pages: number;
  total: number;
}> {
  const response = await fetch(`/api/fetch?pageNo=${pageNo}&pageSize=${pageSize}&source=${sourceId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch data');
  }
  return response.json();
}

/**
 * 彩票数据 Hook
 * @param year 年份
 * @param refreshKey 强制刷新的 key，变化时会重新获取数据
 * @param dataSource 数据源（默认 gbb）
 */
export function useLotteryData(
  year: string,
  refreshKey?: number,
  dataSource: DataSource = getDataSource(DEFAULT_DATA_SOURCE_ID)
) {
  const [data, setData] = useState<LotteryDraw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 用 effect 局部变量 ignore 标记当前 effect 是否仍然有效；
    // 旧 effect 的 ignore 会被 cleanup 设为 true，且不会被新 effect 重置，
    // 因此旧请求完成时检查 ignore 一定是 true，可以安全丢弃。
    let ignore = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        console.log(`Fetching data for year: ${year}, refreshKey: ${refreshKey}`);
        // 添加时间戳参数避免缓存 - year 和 refreshKey 都会触发重新获取
        const timestamp = Date.now();
        const cacheBuster = `?_t=${timestamp}`;
        const response = await fetch(`/api/data/${year}${cacheBuster}&source=${dataSource.id}`);

        if (ignore) return;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();

        if (ignore) return;

        if (json.error) {
          throw new Error(json.error);
        }

        const dataArray = Array.isArray(json) ? json : [];

        // 确保按期号排序
        dataArray.sort((a, b) => Number(a.id) - Number(b.id));

        if (ignore) return;

        setData(dataArray);
        setLoading(false);
      } catch (err) {
        if (ignore) return;
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : '未知错误');
        setData([]);
        setLoading(false);
      }
    }

    fetchData();

    return () => {
      ignore = true;
    };
  }, [year, refreshKey, dataSource.id]);

  return { data, loading, error };
}

/**
 * 跨年全量数据 Hook — 一次性并发拉取所有年份的开奖数据
 *
 * 用途：让 gbb-3 的"当前间隔/最大间隔"与 gbb-2 一致，按 22 年累计。
 * 与 useLotteryData 的区别：
 *  - useLotteryData 只返回单年数据 → maxGapCount 仅当年最大
 *  - useAllYearsData 合并 22 年 → maxGapCount 是 22 年历史最大
 *
 * 容错策略：单年 404 不阻塞其他年，返回 perYearStatus 让 UI 可视化
 *
 * @param refreshKey 强制刷新的 key，变化时重新拉全部 22 年
 * @param years 要拉取的年份列表，默认 AVAILABLE_YEARS
 */
export function useAllYearsData(
  refreshKey?: number,
  years?: string[],
  dataSource: DataSource = getDataSource(DEFAULT_DATA_SOURCE_ID)
) {
  const [data, setData] = useState<LotteryDraw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [perYearStatus, setPerYearStatus] = useState<Record<string, 'ok' | 'missing' | 'error'>>({});
  const [statsOk, setStatsOk] = useState(false);

  useEffect(() => {
    // 用 effect 局部 ignore 标记当前 effect 是否仍然有效：
    // 旧 effect 的 ignore 在 cleanup 后保持 true，且不会被新 effect 重置，
    // 因此旧请求完成后检查 ignore 一定是 true，可以安全丢弃。
    let ignore = false;

    const finalYears: readonly string[] = years && years.length > 0 ? years : dataSource.years;

    async function fetchAll() {
      setLoading(true);
      setError(null);
      setStatsOk(false);

      try {
        const timestamp = Date.now();
        const cacheBuster = `?_t=${timestamp}`;

        // 并发拉所有年份，单年失败不影响整体
        const results = await Promise.allSettled(
          finalYears.map(async (year) => {
            const res = await fetch(`/api/data/${year}${cacheBuster}&source=${dataSource.id}`);
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }
            const arr = await res.json();
            return { year, data: Array.isArray(arr) ? arr : [] };
          })
        );

        if (ignore) return;

        // 合并去重（按 id），保证多次刷新覆盖时不会重复
        const merged = new Map<string, LotteryDraw>();
        const status: Record<string, 'ok' | 'missing' | 'error'> = {};
        const failedYears: string[] = [];

        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          const year = finalYears[i];
          if (r.status === 'fulfilled') {
            const { data: arr } = r.value;
            status[year] = arr.length > 0 ? 'ok' : 'missing';
            if (arr.length === 0) failedYears.push(year);
            for (const d of arr) {
              merged.set(d.id, d);
            }
          } else {
            status[year] = 'error';
            failedYears.push(year);
          }
        }

        // 统计可用年份：要求至少 dataSource.minStatsYears 年成功（容许少量断层），否则标记 statsOk=false
        const okCount = Object.values(status).filter(s => s === 'ok').length;
        const okEnough = okCount >= dataSource.minStatsYears;

        if (!okEnough) {
          console.warn(
            `useAllYearsData: 仅 ${okCount}/${finalYears.length} 年成功，stats 不参与解析`,
            failedYears
          );
        } else if (failedYears.length > 0) {
          console.info(`useAllYearsData: ${okCount} 年成功，${failedYears.length} 年缺失:`, failedYears);
        }

        // 按 id 升序排列，与 gbb-2 的 _all 数组顺序一致
        const all = Array.from(merged.values()).sort(
          (a, b) => Number(a.id) - Number(b.id)
        );

        if (ignore) return;

        setData(all);
        setPerYearStatus(status);
        setStatsOk(okEnough);
        setLoading(false);
      } catch (err) {
        if (ignore) return;
        console.error('useAllYearsData error:', err);
        setError(err instanceof Error ? err.message : '未知错误');
        setLoading(false);
      }
    }

    fetchAll();

    return () => {
      ignore = true;
    };
  }, [refreshKey, years?.join(','), dataSource.id]);

  return { data, loading, error, perYearStatus, statsOk };
}

/**
 * 菜单配置 Hook
 */
export function useMenuConfig() {
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    async function fetchMenu() {
      try {
        const response = await fetch('/api/menu');
        const data = await response.json();
        if (mountedRef.current) {
          setMenu(data);
        }
      } catch (err) {
        console.error('Failed to load menu:', err);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }

    fetchMenu();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { menu, loading };
}
