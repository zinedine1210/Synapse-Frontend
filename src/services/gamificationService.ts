import { apiFetch } from '@/lib/api';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

export interface GamificationProfile {
  id: string;
  userId: string;
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  achievements: string[];
  levelName: string;
  nextLevelXp: number | null;
  nextLevelName: string | null;
  xpProgress: number;
  achievementDetails: { id: string; name: string; description: string; icon: string }[];
  allAchievements: Achievement[];
}

export interface XpHistoryItem {
  id: string;
  amount: number;
  source: string;
  description: string | null;
  createdAt: string;
}

export interface XpHistory {
  items: XpHistoryItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalXp: number;
  level: number;
  levelName: string;
  currentStreak: number;
}

export interface StreakResult {
  streak: number;
  longestStreak?: number;
  streakBroken?: boolean;
  previousStreak?: number;
  xpEarned: number;
  newAchievements: { id: string; name: string; description: string; icon: string }[];
  alreadyChecked?: boolean;
  totalXp?: number;
  level?: number;
  levelName?: string;
}

export const gamificationService = {
  getProfile: () => apiFetch<GamificationProfile>('/gamification/profile'),
  getHistory: (page = 1, limit = 20) =>
    apiFetch<XpHistory>(`/gamification/history?page=${page}&limit=${limit}`),
  getLeaderboard: (classId: string) =>
    apiFetch<LeaderboardEntry[]>(`/gamification/leaderboard/${classId}`),
  checkStreak: () =>
    apiFetch<StreakResult>('/gamification/check-streak', { method: 'POST' }),
};
