import { useState, useCallback, useRef } from 'react';
import { PaginatedResponse } from '../services/api';

type FetchFn<T> = (skip: number, limit: number) => Promise<PaginatedResponse<T>>;

type PaginatedListState<T> = {
  items: T[];
  total: number;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  refresh: () => void;
  loadMore: () => void;
};

const PAGE_SIZE = 30;

export function usePaginatedList<T>(fetchFn: FetchFn<T>, pageSize = PAGE_SIZE): PaginatedListState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const skipRef = useRef(0);
  const busyRef = useRef(false);

  const fetchPage = useCallback(async (skip: number, isRefresh: boolean) => {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      const result = await fetchFn(skip, pageSize);
      const newItems = result.items ?? [];
      setTotal(result.total ?? 0);
      setError(null);

      if (isRefresh) {
        setItems(newItems);
      } else {
        setItems(prev => [...prev, ...newItems]);
      }

      skipRef.current = skip + newItems.length;
      setHasMore(skip + newItems.length < (result.total ?? 0));
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      busyRef.current = false;
    }
  }, [fetchFn, pageSize]);

  const refresh = useCallback(() => {
    skipRef.current = 0;
    setRefreshing(true);
    setHasMore(true);
    fetchPage(0, true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || busyRef.current) return;
    setLoadingMore(true);
    fetchPage(skipRef.current, false);
  }, [hasMore, fetchPage]);

  return { items, total, loading, refreshing, loadingMore, hasMore, error, refresh, loadMore };
}
