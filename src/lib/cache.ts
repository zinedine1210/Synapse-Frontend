'use client';

/**
 * Simple in-memory cache with stale-while-revalidate pattern.
 * Data persists across page navigations (SPA) but not across full page reloads.
 *
 * Usage:
 *   const { data, loading, mutate, optimisticAdd, optimisticRemove, optimisticUpdate } = useCache<T[]>(key, fetcher);
 */

import { useState, useEffect, useCallback, useRef } from 'react';

type Listener = () => void;

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

// Global in-memory store — survives SPA navigations
const store = new Map<string, CacheEntry>();
const listeners = new Map<string, Set<Listener>>();

function notify(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

/** Set cache data for a key and notify all subscribers */
export function setCache<T>(key: string, data: T) {
  store.set(key, { data, timestamp: Date.now() });
  notify(key);
}

/** Get cached data (or undefined if not cached) */
export function getCache<T>(key: string): T | undefined {
  return store.get(key)?.data as T | undefined;
}

/** Clear a specific cache key */
export function clearCache(key: string) {
  store.delete(key);
  notify(key);
}

/** Clear all cache */
export function clearAllCache() {
  const keys = Array.from(store.keys());
  store.clear();
  keys.forEach((k) => notify(k));
}

/**
 * React hook for cached data fetching with stale-while-revalidate.
 *
 * - On mount: returns stale data immediately (if cached), then revalidates in background.
 * - On navigation back: shows cached data instantly, no loading spinner.
 * - Supports optimistic add/remove/update for instant UI feedback.
 */
export function useCache<T>(
  key: string | null,
  fetcher: (() => Promise<T>) | null,
  options?: { revalidateOnMount?: boolean; dedupingInterval?: number }
) {
  const { revalidateOnMount = true, dedupingInterval = 2000 } = options || {};
  const cached = key ? getCache<T>(key) : undefined;
  const [data, setData] = useState<T | undefined>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<any>(null);
  const lastFetchRef = useRef(0);
  const mountedRef = useRef(true);

  // Subscribe to cache changes
  useEffect(() => {
    if (!key) return;
    const handler = () => {
      const entry = store.get(key);
      if (entry && mountedRef.current) {
        setData(entry.data as T);
        setLoading(false);
      }
    };
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(handler);
    return () => {
      listeners.get(key)?.delete(handler);
      if (listeners.get(key)?.size === 0) listeners.delete(key);
    };
  }, [key]);

  // Fetch / revalidate
  const revalidate = useCallback(async () => {
    if (!key || !fetcher) return;
    const now = Date.now();
    if (now - lastFetchRef.current < dedupingInterval) return;
    lastFetchRef.current = now;

    // If no cached data, show loading
    if (!store.has(key)) setLoading(true);

    try {
      const fresh = await fetcher();
      if (mountedRef.current) {
        setCache(key, fresh);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        // Keep stale data on error
        if (!store.has(key)) setLoading(false);
      }
    }
  }, [key, fetcher, dedupingInterval]);

  useEffect(() => {
    mountedRef.current = true;
    if (revalidateOnMount && key && fetcher) {
      revalidate();
    }
    return () => { mountedRef.current = false; };
  }, [key, revalidateOnMount]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Force set data + cache */
  const mutate = useCallback((newData: T | ((prev: T | undefined) => T)) => {
    if (!key) return;
    const resolved = typeof newData === 'function'
      ? (newData as (prev: T | undefined) => T)(store.get(key)?.data as T | undefined)
      : newData;
    setCache(key, resolved);
  }, [key]);

  /** Optimistic add — prepend item to array, revert on error */
  const optimisticAdd = useCallback(async <Item>(
    item: Item,
    apiCall: () => Promise<Item>,
    getId?: (i: Item) => string,
  ) => {
    if (!key) return;
    const prev = (store.get(key)?.data as any[]) || [];
    // Optimistic: add to front
    setCache(key, [item, ...prev]);
    try {
      const created = await apiCall();
      // Replace temp item with real one
      if (getId) {
        setCache(key, [created, ...prev.filter((i: any) => getId(i) !== getId(item))]);
      } else {
        setCache(key, [created, ...prev]);
      }
      return created;
    } catch (err) {
      setCache(key, prev); // rollback
      throw err;
    }
  }, [key]);

  /** Optimistic remove — remove from array by predicate, revert on error */
  const optimisticRemove = useCallback(async (
    predicate: (item: any) => boolean,
    apiCall: () => Promise<void>,
  ) => {
    if (!key) return;
    const prev = (store.get(key)?.data as any[]) || [];
    setCache(key, prev.filter((i: any) => !predicate(i)));
    try {
      await apiCall();
    } catch (err) {
      setCache(key, prev); // rollback
      throw err;
    }
  }, [key]);

  /** Optimistic update — update item in array, revert on error */
  const optimisticUpdate = useCallback(async <Item>(
    predicate: (item: Item) => boolean,
    updater: (item: Item) => Item,
    apiCall: () => Promise<Item>,
  ) => {
    if (!key) return;
    const prev = (store.get(key)?.data as any[]) || [];
    setCache(key, prev.map((i: any) => predicate(i) ? updater(i) : i));
    try {
      const updated = await apiCall();
      setCache(key, prev.map((i: any) => predicate(i) ? updated : i));
      return updated;
    } catch (err) {
      setCache(key, prev); // rollback
      throw err;
    }
  }, [key]);

  return {
    data,
    loading,
    error,
    revalidate,
    mutate,
    optimisticAdd,
    optimisticRemove,
    optimisticUpdate,
  };
}
