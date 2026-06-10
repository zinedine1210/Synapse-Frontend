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
  createdAt: string;
  updatedAt: string;
  user: { id: string; fullName: string; avatarUrl?: string };
  answers?: QnaAnswer[];
  _count?: { answers: number };
}

export interface QnaAnswer {
  id: string;
  questionId: string;
  userId: string;
  body: string;
  isApprovedByAsker: boolean;
  upvotes: number;
  createdAt: string;
  user: { id: string; fullName: string; avatarUrl?: string };
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
    apiFetch(`/qna/answers/${answerId}/upvote`, { method: 'PATCH' }),

  deleteQuestion: (id: string) =>
    apiFetch(`/qna/questions/${id}`, { method: 'DELETE' }),

  editQuestion: (id: string, data: { title?: string; body?: string; category?: string[]; tags?: string[] }) =>
    apiFetch<QnaQuestion>(`/qna/questions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  reportAnswer: (answerId: string) =>
    apiFetch(`/qna/answers/${answerId}/report`, { method: 'POST' }),

  getReputation: () => apiFetch<UserReputation>('/qna/reputation'),
};
