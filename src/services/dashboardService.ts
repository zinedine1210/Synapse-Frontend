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

export interface TodaysBriefingResponse {
  schedule: { className: string; time: string; room?: string }[];
  deadlines: { title: string; className: string; dueLabel: string }[];
  spendingSummary: { total: number; topCategory: string } | null;
  todos: { total: number; done: number };
  contextualTip: string | null;
}

export interface ClassComparison {
  classId: string;
  className: string;
  averageSpending: number;
  minSpending: number;
  maxSpending: number;
  memberCount: number;
  userSpending: number;
}

export interface ClassComparisonResponse {
  comparisons: ClassComparison[];
}

export interface TrendingQuestion {
  id: string;
  title: string;
  slug: string;
  category: string;
  viewCount: number;
  createdAt: string;
  _count: { answers: number };
  trendingScore?: number;
}

export interface WeeklyChallengeData {
  id: string;
  title: string;
  description: string | null;
  targetType: string;
  targetValue: number;
  rewardXp: number;
  current: number;
  completed: boolean;
  daysLeft: number;
  startDate: string;
  endDate: string;
}

export interface AiBriefingSection {
  icon: '📅' | '💰' | '✅' | '🔥' | '💡' | string;
  title: string;
  items: string[];
}

export interface AiBriefingResponse {
  greeting: string;
  headline: string;
  sections: AiBriefingSection[];
  suggestions: string[];
  reminders: string[];
  motivation: string;
  source: 'ai' | 'fallback';
  data: {
    schedule?: unknown;
    deadlines?: unknown;
    finance?: unknown;
    todos?: unknown;
    gamification?: unknown;
    savingTrees?: unknown;
    [key: string]: unknown;
  };
}

export interface SummaryV2Response {
  weeklyChallenge: WeeklyChallengeData | null;
  classSummary: { classId: string; className: string; memberCount: number; role: string }[];
  financeSummary: { income: number; expense: number; balance: number };
  gamification: { totalXp: number; level: number; currentStreak: number } | null;
  comparisonAvailable: boolean;
}

export const dashboardService = {
  getSummary: () => apiFetch<DashboardSummary>('/dashboard/summary'),
  getSummaryV2: () => apiFetch<SummaryV2Response>('/dashboard/summary-v2'),
  getTodaysBriefing: () => apiFetch<TodaysBriefingResponse>('/dashboard/todays-briefing'),
  getAiBriefing: () => apiFetch<AiBriefingResponse | { exists: false }>('/dashboard/ai-briefing'),
  generateAiBriefing: () => apiFetch<AiBriefingResponse>('/dashboard/ai-briefing', { method: 'POST' }),
  getClassComparison: () => apiFetch<ClassComparisonResponse>('/dashboard/class-comparison'),
  getTrendingQna: () => apiFetch<TrendingQuestion[]>('/dashboard/trending-qna'),
};
