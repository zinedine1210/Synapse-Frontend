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
  productivity: {
    todosCompleted: number;
    todosTotal: number;
    completionRate: number;
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
  getWeekly: () => apiFetch<WeeklySummary>('/insight/weekly'),
  getAiInsight: () => apiFetch<WeeklySummary>('/insight/ai', { method: 'POST' }),
};
