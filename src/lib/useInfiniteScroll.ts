'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getCache, setCache as setCacheStore } from '@/lib/cache';

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
  /** Optional cache key — if set, first-page data is cached and shown instantly on re-mount */
  cacheKey?: string;
}

export function useInfiniteScroll<T>({ fetcher, enabled = true, cacheKey }: UseInfiniteScrollOptions<T>) {
  // Hydrate from cache if available
  const cached = cacheKey ? getCache<{ items: T[]; total: number; totalPages: number }>(cacheKey) : undefined;

  const [items, setItems] = useState<T[]>(cached?.items ?? []);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(cached?.totalPages ?? 1);
  const [total, setTotal] = useState(cached?.total ?? 0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = page < totalPages;

  const fetchPage = useCallback(async (p: number, reset = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher(p);
      const newItems = reset ? res.data : [...items, ...res.data];
      setItems(reset ? res.data : prev => [...prev, ...res.data]);
      setPage(res.page);
      setTotalPages(res.totalPages);
      setTotal(res.total);
      // Cache first page for instant back-navigation
      if (cacheKey && (reset || p === 1)) {
        setCacheStore(cacheKey, { items: reset ? res.data : newItems, total: res.total, totalPages: res.totalPages });
      }
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [fetcher, loading, cacheKey, items]);

  // Initial load
  useEffect(() => {
    if (!enabled) return;
    // If we have cached data, show it instantly then revalidate in background
    if (cached) {
      setItems(cached.items);
      setTotal(cached.total);
      setTotalPages(cached.totalPages);
      setInitialLoading(false);
      // Background revalidate page 1
      fetchPage(1, true);
    } else {
      setItems([]);
      setPage(1);
      setTotalPages(1);
      setInitialLoading(true);
      fetchPage(1, true);
    }
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
