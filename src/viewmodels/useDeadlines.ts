'use client';

import { useState, useEffect, useCallback } from 'react';
import { taskService, Task } from '@/services/taskService';

export function useDeadlines() {
  const [deadlines, setDeadlines] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeadlines = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await taskService.getMyDeadlines();
      setDeadlines(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat tenggat waktu tugas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeadlines();
  }, [fetchDeadlines]);

  return {
    deadlines,
    isLoading,
    error,
    refetch: fetchDeadlines,
  };
}
