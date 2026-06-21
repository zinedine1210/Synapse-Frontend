import { apiFetch } from '@/lib/api';

export interface WeeklySummary {
  period: { from: string; to: string };
  finance: {
    income: number;
    expense: number;
    changePercent: number;
    changeDirection: 'more' | 'less' | 'same';
    topCategories: { category: string; amount: number }[];
  };
  engagement?: {
    qnaAnswers: number;
    qnaApproved: number;
    forumPosts: number;
    forumReplies: number;
    loginStreak: number;
    longestStreak: number;
    totalTransactions: number;
  };
  gamification: {
    totalXp: number;
    level: number;
    streak: number;
  };
  trees: { name: string; progress: number; remaining: number }[];
  alerts: { type: string; message: string }[];
  aiInsight?: { headline: string; body: string; tip: string };
}

export const insightService = {
  getWeekly: (range?: string) => apiFetch<WeeklySummary>(`/insight/weekly${range ? `?range=${range}` : ''}`),
  getAiInsight: () => apiFetch<WeeklySummary>('/insight/ai', { method: 'POST' }),
};
