'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_DATA_SOURCES,
  DEFAULT_DATA_SOURCE_ID,
  getDataSource,
  type DataSource,
  type DataSourceId,
} from './data-sources';

const LS_KEY_SOURCE = 'gbb:dataSource';
const LS_KEY_YEARS = 'gbb:yearsBySource'; // { [sourceId]: string[] }

type YearsBySource = Record<string, string[]>;

type DataSourceContextValue = {
  source: DataSource;
  /** 当前 source 的实际可用年份（含 fetch 发现的扩展年份） */
  availableYears: string[];
  setSourceId: (id: DataSourceId) => void;
  /** 把新发现的年份合并进当前 source 的列表（去重、按降序、持久化） */
  addYears: (newYears: string[]) => void;
};

const DataSourceCtx = createContext<DataSourceContextValue>({
  source: getDataSource(DEFAULT_DATA_SOURCE_ID),
  availableYears: [...getDataSource(DEFAULT_DATA_SOURCE_ID).years],
  setSourceId: () => {},
  addYears: () => {},
});

/** 读取 localStorage 中的 YearsBySource，无效或缺失则返回空对象 */
function loadYearsBySource(): YearsBySource {
  try {
    const raw = localStorage.getItem(LS_KEY_YEARS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as YearsBySource;
  } catch {
    // ignore
  }
  return {};
}

function saveYearsBySource(map: YearsBySource): void {
  try {
    localStorage.setItem(LS_KEY_YEARS, JSON.stringify(map));
  } catch {
    // 写入失败静默
  }
}

/** 合并两个年份列表，去重，按降序 */
function mergeYears(existing: readonly string[], additions: string[]): string[] {
  const set = new Set<string>([...existing, ...additions]);
  return Array.from(set).sort((a, b) => Number(b) - Number(a));
}

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [sourceId, setSourceIdState] = useState<DataSourceId>(DEFAULT_DATA_SOURCE_ID);
  const [yearsBySource, setYearsBySource] = useState<YearsBySource>({});

  // 首次 mount 时从 localStorage 恢复用户偏好 + 已发现年份
  useEffect(() => {
    try {
      const savedSource = localStorage.getItem(LS_KEY_SOURCE);
      if (savedSource && DEFAULT_DATA_SOURCES.some((s) => s.id === savedSource)) {
        setSourceIdState(savedSource as DataSourceId);
      }
      setYearsBySource(loadYearsBySource());
    } catch {
      // localStorage 不可用，忽略
    }
  }, []);

  const source = getDataSource(sourceId);

  /** 当前 source 的最终年份列表：注册中心 ∪ 本地缓存扫描 ∪ 已发现扩展 */
  const availableYears = useMemo<string[]>(() => {
    const discovered = yearsBySource[sourceId] ?? [];
    return mergeYears(source.years, discovered);
  }, [source.years, sourceId, yearsBySource]);

  // 切换 source 或首次 mount 时，主动调 /api/years 扫描服务器缓存，
  // 合并本地未声明但缓存中已存在的年份（例如 fetch 新抓到的 2026）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/years?source=${sourceId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        const serverYears: string[] = Array.isArray(json?.years) ? json.years : [];
        if (cancelled || serverYears.length === 0) return;
        // 把服务端发现的年份注册到 yearsBySource
        setYearsBySource((prev) => {
          const existing = prev[sourceId] ?? [];
          const merged = mergeYears(source.years, [...existing, ...serverYears]);
          // 若没有新内容，避免不必要的状态更新
          if (
            merged.length === existing.length &&
            merged.every((y, i) => existing[i] === y)
          ) {
            return prev;
          }
          const next = { ...prev, [sourceId]: merged };
          saveYearsBySource(next);
          return next;
        });
      } catch {
        // 忽略网络错误
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceId, source.years]);

  const setSourceId = useCallback((id: DataSourceId) => {
    setSourceIdState(id);
    try {
      localStorage.setItem(LS_KEY_SOURCE, id);
    } catch {
      // 写入失败静默
    }
  }, []);

  const addYears = useCallback(
    (newYears: string[]) => {
      if (!newYears || newYears.length === 0) return;
      setYearsBySource((prev) => {
        const existing = prev[sourceId] ?? [];
        const merged = mergeYears(source.years, [...existing, ...newYears]);
        const next = { ...prev, [sourceId]: merged };
        saveYearsBySource(next);
        return next;
      });
    },
    [sourceId, source.years]
  );

  const value = useMemo<DataSourceContextValue>(
    () => ({ source, availableYears, setSourceId, addYears }),
    [source, availableYears, setSourceId, addYears]
  );

  return <DataSourceCtx.Provider value={value}>{children}</DataSourceCtx.Provider>;
}

export function useDataSource(): DataSourceContextValue {
  return useContext(DataSourceCtx);
}