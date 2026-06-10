import { apiFetch } from '@/lib/api';

export interface BawelSetting {
  userId: string;
  level: 'SANTAI' | 'NORMAL' | 'CEREWET';
  isEnabled: boolean;
}

export interface WeeklyRoast {
  score: number;
  roast: string;
  tip: string;
  biggestSpend: string;
}

export interface BawelComment {
  id: string;
  amount: number;
  type: string;
  category: string;
  label: string;
  bawelComment: string;
  bawelLevel: string;
  date: string;
  createdAt: string;
}

export interface BawelCommentsPaginated {
  comments: BawelComment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const siBawelService = {
  getSetting: () => apiFetch<BawelSetting>('/si-bawel/setting'),

  updateSetting: (data: Partial<BawelSetting>) =>
    apiFetch<BawelSetting>('/si-bawel/setting', { method: 'PATCH', body: JSON.stringify(data) }),

  chat: (message: string) =>
    apiFetch<{ reply: string }>('/si-bawel/chat', { method: 'POST', body: JSON.stringify({ message }) }),

  getWeeklyRoast: () => apiFetch<WeeklyRoast>('/si-bawel/weekly-roast'),

  getComments: (page?: number, limit?: number) => {
    const q = new URLSearchParams();
    if (page) q.set('page', String(page));
    if (limit) q.set('limit', String(limit));
    return apiFetch<BawelCommentsPaginated>(`/si-bawel/comments?${q.toString()}`);
  },
};
