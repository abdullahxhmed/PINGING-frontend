import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../../lib/adminApi';
import type { AdminOverviewResponse, OverviewPeriod } from '../../../types/admin.overview.types';
import { formatRelativeTime } from './overviewFormatters';

const STALE_TIME_MS = 30_000;      // 30 seconds cache window for fast tab-switching

// In-memory cache to support fast tab/period switching without re-fetching stale data
const overviewCache = new Map<OverviewPeriod, { data: AdminOverviewResponse; timestamp: number }>();

export interface UseAdminOverviewResult {
  period: OverviewPeriod;
  setPeriod: (p: OverviewPeriod) => void;
  data: AdminOverviewResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updatedRelative: string;
}

export function useAdminOverview(): UseAdminOverviewResult {
  const [searchParams, setSearchParams] = useSearchParams();

  // Validate period from URL query param, default to '7d'
  const rawPeriod = searchParams.get('period');
  const period: OverviewPeriod =
    rawPeriod === 'today' || rawPeriod === '7d' || rawPeriod === '30d'
      ? rawPeriod
      : '7d';

  const [data, setData] = useState<AdminOverviewResponse | null>(() => {
    return overviewCache.get(period)?.data || null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => !overviewCache.has(period));
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedRelative, setUpdatedRelative] = useState<string>('just now');

  // Keep a ref to data to maintain keepPreviousData semantics
  const dataRef = useRef<AdminOverviewResponse | null>(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Update URL search params when period changes
  const setPeriod = useCallback(
    (newPeriod: OverviewPeriod) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (newPeriod === '7d') {
            next.delete('period'); // default
          } else {
            next.set('period', newPeriod);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Fetch function
  const fetchData = useCallback(
    async (isManualRefresh = false) => {
      // Check cache validity for non-manual requests
      const cached = overviewCache.get(period);
      const isStale = !cached || Date.now() - cached.timestamp > STALE_TIME_MS;

      if (!isManualRefresh && cached && !isStale) {
        setData(cached.data);
        setIsLoading(false);
        return;
      }

      if (isManualRefresh) {
        setIsRefreshing(true);
      } else if (!dataRef.current) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const res = await adminApi.getOverview(period);
        overviewCache.set(period, { data: res, timestamp: Date.now() });
        setData(res);
      } catch (err: any) {
        const msg = err?.message || 'Failed to fetch overview metrics';
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [period]
  );

  // Initial fetch and when period changes (purely on-demand)
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // NOTE: Background polling disabled in favor of purely on-demand fetching:
  // Data fetches strictly on mount, period switch, or manual refresh click.
  /*
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchData();
      }
    }, REFETCH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchData]);
  */

  // Refresh relative time label every 15s
  useEffect(() => {
    const updateTimeLabel = () => {
      if (data?.meta?.generatedAt) {
        setUpdatedRelative(formatRelativeTime(data.meta.generatedAt));
      } else {
        setUpdatedRelative('just now');
      }
    };

    updateTimeLabel();
    const interval = setInterval(updateTimeLabel, 15_000);
    return () => clearInterval(interval);
  }, [data?.meta?.generatedAt]);

  const manualRefetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return {
    period,
    setPeriod,
    data,
    isLoading: isLoading && !data,
    isRefreshing,
    error,
    refetch: manualRefetch,
    updatedRelative,
  };
}

