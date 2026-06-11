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

/**
 * Contextual Intelligence — Time-aware suggestions
 * Frontend-only, rule-based based on current time and day
 */
export function useContextualSuggestion() {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isEndOfMonth = dayOfMonth >= 25;

  let suggestion: string | null = null;
  let suggestAction: { label: string; href: string } | null = null;

  if (isEndOfMonth) {
    suggestion = 'Akhir bulan — review budget sebelum bulan baru!';
    suggestAction = { label: 'Buka Duit Tracker', href: '/duit-tracker' };
  } else if (isWeekend) {
    suggestion = 'Weekend santai — jangan lupa sisihkan tabungan!';
    suggestAction = { label: 'Lihat Tabungan', href: '/duit-tracker' };
  } else if (hour >= 6 && hour < 11) {
    suggestion = 'Mau review todo hari ini?';
    suggestAction = { label: 'Buka Todo', href: '/todos' };
  } else if (hour >= 11 && hour < 15) {
    suggestion = 'Sudah makan siang? Catat pengeluarannya!';
    suggestAction = { label: 'Catat', href: '/duit-tracker' };
  } else if (hour >= 15 && hour < 18) {
    suggestion = 'Ada deadline besok? Cek todo-mu';
    suggestAction = { label: 'Cek Todo', href: '/todos' };
  } else if (hour >= 18) {
    suggestion = 'Waktunya wrap-up — cek spending hari ini';
    suggestAction = { label: 'Lihat Ringkasan', href: '/duit-tracker' };
  }

  return { suggestion, suggestAction };
}
