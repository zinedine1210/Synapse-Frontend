'use client';

import { taskService, Task } from '@/services/taskService';
import { useCache } from '@/lib/cache';

export function useDeadlines() {
  const {
    data: deadlines = [],
    loading: isLoading,
    error: cacheError,
    revalidate: refetch,
  } = useCache<Task[]>('deadlines:list', () => taskService.getMyDeadlines());

  const error = cacheError ? (cacheError instanceof Error ? cacheError.message : 'Gagal memuat tenggat waktu tugas.') : null;

  return {
    deadlines,
    isLoading,
    error,
    refetch,
  };
}
