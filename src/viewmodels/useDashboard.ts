'use client';

import { useState, useEffect, useCallback } from 'react';
import { Class } from '@/models/Class';
import { classService } from '@/services/classService';

/**
 * useDashboard – ViewModel untuk halaman Dashboard.
 * View tidak boleh memanggil API langsung; semua logika ada di sini.
 */
export function useDashboard() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await classService.getMyClasses();
      setClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar kelas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const createClass = async (name: string, description?: string, extra?: { lecturer?: string; day?: string; time?: string; room?: string }) => {
    try {
      setIsCreating(true);
      const newClass = await classService.createClass({ name, description, ...extra });
      setClasses((prev) => [newClass, ...prev]);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal membuat kelas.',
      };
    } finally {
      setIsCreating(false);
    }
  };

  const deleteClass = async (classId: string) => {
    try {
      await classService.deleteClass(classId);
      setClasses((prev) => prev.filter((c) => c.id !== classId));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal menghapus kelas.',
      };
    }
  };

  return {
    classes,
    isLoading,
    error,
    isCreating,
    createClass,
    deleteClass,
    refetch: fetchClasses,
  };
}
