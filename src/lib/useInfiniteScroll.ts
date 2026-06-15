'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UseInfiniteScrollOptions<T> {
  /** Function that fetches a page. Must return the paginated response. */
  fetcher: (page: number) => Promise<PaginatedResponse<T>>;
  /** Number of items per page (default 30) */
  limit?: number;
  /** Enable/disable (default true) */
  enabled?: boolean;
}

export function useInfiniteScroll<T>({ fetcher, limit = 30, enabled = true }: UseInfiniteScrollOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = page < totalPages;

  const fetchPage = useCallback(async (p: number, reset = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher(p);
      setItems(prev => reset ? res.data : [...prev, ...res.data]);
      setPage(res.page);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [fetcher, loading]);

  // Initial load
  useEffect(() => {
    if (!enabled) return;
    setItems([]);
    setPage(1);
    setTotalPages(1);
    setInitialLoading(true);
    fetchPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, enabled]);

  // Load next page
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPage(page + 1);
    }
  }, [loading, hasMore, page, fetchPage]);

  // Refresh (reset to page 1)
  const refresh = useCallback(() => {
    setItems([]);
    setPage(1);
    setTotalPages(1);
    setInitialLoading(true);
    fetchPage(1, true);
  }, [fetchPage]);

  // Optimistic remove
  const removeItem = useCallback((predicate: (item: T) => boolean) => {
    setItems(prev => prev.filter(item => !predicate(item)));
    setTotal(prev => Math.max(0, prev - 1));
  }, []);

  // Optimistic update
  const updateItem = useCallback((predicate: (item: T) => boolean, updater: (item: T) => T) => {
    setItems(prev => prev.map(item => predicate(item) ? updater(item) : item));
  }, []);

  // Prepend item (e.g. after creating)
  const prependItem = useCallback((item: T) => {
    setItems(prev => [item, ...prev]);
    setTotal(prev => prev + 1);
  }, []);

  // IntersectionObserver for auto-loading
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  return {
    items,
    loading,
    initialLoading,
    error,
    hasMore,
    total,
    page,
    totalPages,
    loadMore,
    refresh,
    sentinelRef,
    removeItem,
    updateItem,
    prependItem,
    setItems,
  };
}
