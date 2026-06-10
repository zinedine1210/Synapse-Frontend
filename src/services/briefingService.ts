import { apiFetch } from '@/lib/api';

export interface DailyBriefing {
  id: string;
  userId: string;
  content: string;
  date: string;
  createdAt: string;
}

export const briefingService = {
  getTodayBriefing: () => apiFetch<DailyBriefing>('/briefing/today'),

  refreshBriefing: () =>
    apiFetch<DailyBriefing>('/briefing/refresh', { method: 'POST' }),

  getHistory: (limit?: number) =>
    apiFetch<DailyBriefing[]>(`/briefing/history${limit ? `?limit=${limit}` : ''}`),
};
