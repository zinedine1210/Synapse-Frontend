'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollProps {
  children: React.ReactNode;
  /** Called when sentinel enters viewport — should load the next page */
  onLoadMore: () => void;
  /** Whether a load is currently in progress */
  loading?: boolean;
  /** Whether there are more items to load */
  hasMore?: boolean;
  /** Distance from bottom (in px) to trigger loading (default 200) */
  threshold?: number;
  /** Custom loading indicator */
  loader?: React.ReactNode;
  /** Custom end-of-list message */
  endMessage?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * InfiniteScroll — uses Intersection Observer to trigger loading
 * when the user scrolls within `threshold` px of the bottom sentinel.
 * Automatically stops observing when `hasMore` is false.
 */
export function InfiniteScroll({
  children,
  onLoadMore,
  loading = false,
  hasMore = true,
  threshold = 200,
  loader,
  endMessage,
  className,
  style,
}: InfiniteScrollProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef(onLoadMore);

  // Keep callback ref current
  loadMoreRef.current = onLoadMore;

  const setupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          loadMoreRef.current();
        }
      },
      {
        rootMargin: `0px 0px ${threshold}px 0px`,
      }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }
  }, [threshold]);

  useEffect(() => {
    if (!hasMore || loading) {
      observerRef.current?.disconnect();
      return;
    }

    setupObserver();

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, loading, setupObserver]);

  return (
    <div className={className} style={style}>
      {children}

      {/* Sentinel element for Intersection Observer */}
      {hasMore && (
        <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />
      )}

      {/* Loading indicator */}
      {loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem 0',
          }}
        >
          {loader ?? (
            <Loader2
              className="animate-spin"
              size={20}
              style={{ color: 'rgb(var(--text-muted))' }}
            />
          )}
        </div>
      )}

      {/* End of list message */}
      {!hasMore && !loading && endMessage && (
        <div
          style={{
            textAlign: 'center',
            padding: '1.5rem 0',
            color: 'rgb(var(--text-muted))',
            fontSize: 'var(--font-sm)',
          }}
        >
          {endMessage}
        </div>
      )}
    </div>
  );
}
