'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiUpload } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────
interface NotificationPreferences {
  deadlineReminder: boolean;
  budgetAlert: boolean;
  streakReminder: boolean;
  idleReminder: boolean;
  weeklyRecap: boolean;
  forumReply: boolean;
  qnaAnswer: boolean;
  achievementAlert: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  pushEnabled: boolean;
}

interface UserPreferences {
  theme: string;
  language: string;
  accountStatus: string;
  notifications: NotificationPreferences;
}

interface UserProfile {
  university: string | null;
  hobbies: string[];
  job: string | null;
  reason: string | null;
  dailyHabits: string | null;
  lifeGoals: string | null;
  studySchedule: string | null;
  personalNotes: string | null;
}

// ─── Query Keys ─────────────────────────────────────────────
export const settingsKeys = {
  all: ['settings'] as const,
  preferences: () => ['settings', 'preferences'] as const,
  profile: () => ['settings', 'profile'] as const,
};

// ─── Queries ────────────────────────────────────────────────

export function usePreferences(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.preferences(),
    queryFn: () => apiFetch<UserPreferences>('/settings/preferences'),
    staleTime: 60_000,
    enabled,
  });
}

export function useUserProfile(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: () => apiFetch<UserProfile>('/user/profile'),
    staleTime: 60_000,
    enabled,
  });
}

// ─── Mutations ──────────────────────────────────────────────

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { fullName: string }) =>
      apiFetch('/settings/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.profile() });
    },
  });
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiUpload<{ avatarUrl: string }>('/user/profile/avatar', formData);
    },
  });
}

export function useSaveOnboardingProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      university: string;
      hobbies: string[];
      job: string;
      reason: string;
      dailyHabits: string;
      lifeGoals: string;
      studySchedule: string;
      personalNotes: string;
    }) =>
      apiFetch('/user/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.profile() });
    },
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiFetch('/settings/preferences', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.preferences() });
    },
  });
}

export function useSaveQuietHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { quietHoursStart: string | null; quietHoursEnd: string | null }) =>
      apiFetch('/settings/quiet-hours', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.preferences() });
    },
  });
}

export function useExportData() {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ csv: string; filename: string }>('/settings/export-data', {
        method: 'POST',
      }),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (confirmationText: string) =>
      apiFetch('/settings/delete-account', {
        method: 'POST',
        body: JSON.stringify({ confirmationText }),
      }),
  });
}
