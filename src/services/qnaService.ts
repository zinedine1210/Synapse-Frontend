import { apiFetch } from '@/lib/api';

export interface QnaQuestion {
  id: string;
  userId: string;
  title: string;
  body?: string;
  category: string[];
  tags: string[];
  slug: string;
  status: 'open' | 'answered' | 'closed';
  isPublic: boolean;
  viewCount: number;
  upvotes: number;
  aiAnswer?: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; fullName: string; avatarUrl?: string };
  answers?: QnaAnswer[];
  _count?: { answers: number };
  isBookmarked?: boolean;
  hasVoted?: boolean;
}

export interface QnaAnswer {
  id: string;
  questionId: string;
  userId: string;
  body: string;
  isApprovedByAsker: boolean;
  upvotes: number;
  createdAt: string;
  updatedAt?: string;
  user: { id: string; fullName: string; avatarUrl?: string };
  hasUpvoted?: boolean;
}

export interface QnaPaginated {
  questions: QnaQuestion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserReputation {
  userId: string;
  score: number;
  answersApproved: number;
  questionsAsked: number;
  reportCount: number;
}

export interface SimilarQuestion {
  id: string;
  title: string;
  slug: string;
  status: string;
  _count?: { answers: number };
}

export interface LeaderboardEntry {
  user: { id: string; fullName: string; avatarUrl?: string };
  answersCount: number;
  approvedCount: number;
}

export const qnaService = {
  createQuestion: (data: { title: string; body?: string; category?: string[]; tags?: string[]; isPublic?: boolean }) =>
    apiFetch<QnaQuestion>('/qna/questions', { method: 'POST', body: JSON.stringify(data) }),

  getQuestions: (params?: { category?: string; status?: string; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<QnaPaginated>(`/qna/questions?${q.toString()}`);
  },

  getMyQuestions: () => apiFetch<QnaQuestion[]>('/qna/questions/my'),

  getBySlug: (slug: string) => apiFetch<QnaQuestion>(`/qna/questions/${slug}`),

  createAnswer: (questionId: string, body: string) =>
    apiFetch<QnaAnswer>(`/qna/questions/${questionId}/answers`, { method: 'POST', body: JSON.stringify({ body }) }),

  approveAnswer: (answerId: string) =>
    apiFetch(`/qna/answers/${answerId}/approve`, { method: 'PATCH' }),

  upvoteAnswer: (answerId: string) =>
    apiFetch(`/qna/answers/${answerId}/upvote`, { method: 'POST' }),

  removeUpvote: (answerId: string) =>
    apiFetch(`/qna/answers/${answerId}/upvote`, { method: 'DELETE' }),

  deleteQuestion: (id: string) =>
    apiFetch(`/qna/questions/${id}`, { method: 'DELETE' }),

  editQuestion: (id: string, data: { title?: string; body?: string; category?: string[]; tags?: string[] }) =>
    apiFetch<QnaQuestion>(`/qna/questions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  editAnswer: (answerId: string, body: string) =>
    apiFetch<QnaAnswer>(`/qna/answers/${answerId}`, { method: 'PATCH', body: JSON.stringify({ body }) }),

  reportAnswer: (answerId: string) =>
    apiFetch(`/qna/answers/${answerId}/report`, { method: 'POST' }),

  getReputation: () => apiFetch<UserReputation>('/qna/reputation'),

  getTrendingQuestions: (params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<QnaPaginated>(`/qna/questions/trending?${q.toString()}`);
  },

  // Bookmarks
  bookmarkQuestion: (questionId: string) =>
    apiFetch(`/qna/questions/${questionId}/bookmark`, { method: 'POST' }),

  removeBookmark: (questionId: string) =>
    apiFetch(`/qna/questions/${questionId}/bookmark`, { method: 'DELETE' }),

  getBookmarks: () => apiFetch<QnaQuestion[]>('/qna/bookmarks'),

  // Question votes
  upvoteQuestion: (questionId: string) =>
    apiFetch(`/qna/questions/${questionId}/vote`, { method: 'POST' }),

  removeQuestionVote: (questionId: string) =>
    apiFetch(`/qna/questions/${questionId}/vote`, { method: 'DELETE' }),

  // Duplicate detection
  findSimilarQuestions: (title: string) =>
    apiFetch<SimilarQuestion[]>(`/qna/questions/similar?title=${encodeURIComponent(title)}`),

  // Increment view
  incrementView: (questionId: string) =>
    apiFetch(`/qna/questions/${questionId}/view`, { method: 'POST' }),

  // Weekly leaderboard
  getWeeklyLeaderboard: (limit = 10) =>
    apiFetch<LeaderboardEntry[]>(`/qna/leaderboard/weekly?limit=${limit}`),
};
