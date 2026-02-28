'use client';

import { useEffect, useState, useRef } from 'react';
import type { LotteryDraw } from '@gbb/core';

/**
 * 彩票数据 Hook
 */
export function useLotteryData(year: string) {
  const [data, setData] = useState<LotteryDraw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        console.log('Fetching data for year:', year);
        const response = await fetch(`/api/data/${year}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        console.log('API response:', json);

        if (!mountedRef.current) return;

        if (json.error) {
          throw new Error(json.error);
        }

        const dataArray = Array.isArray(json) ? json : [];

        // 确保按期号排序
        dataArray.sort((a, b) => Number(a.id) - Number(b.id));

        if (mountedRef.current) {
          setData(dataArray);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : '未知错误');
          setData([]);
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      mountedRef.current = false;
    };
  }, [year]);

  return { data, loading, error };
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
