import { apiFetch } from '@/lib/api';

export interface DashboardSummary {
  greeting: string;
  aiOneLiner: string;
  deadlines: { id: string; title: string; className: string; classId?: string; deadline: string }[];
  financeSummary: { income: number; expense: number; balance: number };
  topBudgetAlert: { category: string; percentage: number } | null;
  bawelBubble: string | null;
  todosToday: { id: string; title: string; dueDate: string | null; dueTime: string | null; priority: string; status: string }[];
  todoStats: { total: number; done: number };
  classes: { id: string; name: string; lecturer: string | null; day: string | null; time?: string | null; room: string | null; role: string }[];
  trees: { id: string; name: string; currentAmount: number; targetAmount: number; progress: number }[];
  streakDays: number;
  academicSummary?: {
    activeClasses: number;
    pendingTasks: number;
    unreadForumMessages: number;
    unansweredQna: number;
    todaySchedule: { className: string; day: string; time: string; room: string }[];
  };
  gamification?: {
    level: number;
    levelTitle: string;
    currentXp: number;
    nextLevelXp: number | null;
    totalAchievements: number;
    recentAchievement: { name: string; description: string } | null;
    currentStreak: number;
    longestStreak: number;
    weeklyChallenge?: { title: string; category: string; current: number; target: number; daysLeft: number } | null;
  } | null;
}

export const dashboardService = {
  getSummary: () => apiFetch<DashboardSummary>('/dashboard/summary'),
};
