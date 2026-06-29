'use client';

import { useState } from 'react';
import { Class } from '@/models/Class';
import { classService } from '@/services/classService';
import { useCache } from '@/lib/cache';

/**
 * useDashboard – ViewModel untuk halaman Dashboard.
 * Uses useCache for stale-while-revalidate: instant data on navigation back.
 */
export function useDashboard() {
  const {
    data: classes = [],
    loading: isLoading,
    error: cacheError,
    revalidate: refetch,
    mutate: mutateClasses,
  } = useCache<Class[]>('classes:list', () => classService.getMyClasses());

  const error = cacheError ? (cacheError instanceof Error ? cacheError.message : 'Gagal memuat daftar kelas.') : null;

  const [isCreating, setIsCreating] = useState(false);

  const createClass = async (name: string, description?: string, extra?: { lecturer?: string; day?: string; time?: string; room?: string }) => {
    try {
      setIsCreating(true);
      const newClass = await classService.createClass({ name, description, ...extra });
      mutateClasses((prev) => [newClass, ...(prev || [])]);
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
      mutateClasses((prev) => (prev || []).filter((c) => c.id !== classId));
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
    refetch,
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
  } else if (hour >= 18 && hour < 23) {
    suggestion = 'Waktunya wrap-up — cek spending hari ini';
    suggestAction = { label: 'Lihat Ringkasan', href: '/duit-tracker' };
  } else {
    suggestion = 'Masih melek? Istirahat ya, besok masih panjang 💤';
    suggestAction = { label: 'Lihat Todo Besok', href: '/todos' };
  }

  return { suggestion, suggestAction };
}
