'use client';

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qnaService, QnaQuestion, QnaPaginated, UserReputation, LeaderboardEntry, SimilarQuestion } from '@/services/qnaService';

// ─── Query Keys ─────────────────────────────────────────────
export const qnaKeys = {
  all: ['qna'] as const,
  questions: (params: { tab: string; category: string; search: string; sort?: string }) =>
    ['qna', 'questions', params] as const,
  myQuestions: () => ['qna', 'my-questions'] as const,
  bookmarks: () => ['qna', 'bookmarks'] as const,
  reputation: () => ['qna', 'reputation'] as const,
  leaderboard: () => ['qna', 'leaderboard'] as const,
  similar: (title: string) => ['qna', 'similar', title] as const,
  detail: (slug: string) => ['qna', 'detail', slug] as const,
};

// ─── Queries ────────────────────────────────────────────────

export function useQnaReputation() {
  return useQuery({
    queryKey: qnaKeys.reputation(),
    queryFn: () => qnaService.getReputation(),
    staleTime: 60_000,
  });
}

export function useQnaLeaderboard() {
  return useQuery({
    queryKey: qnaKeys.leaderboard(),
    queryFn: () => qnaService.getWeeklyLeaderboard(),
    staleTime: 60_000,
  });
}

export function useQnaQuestions(params: { tab: string; category: string; search: string; sort?: string }) {
  const { tab, category, search, sort } = params;

  return useInfiniteQuery({
    queryKey: qnaKeys.questions(params),
    queryFn: async ({ pageParam = 1 }) => {
      if (tab === 'bookmarks') {
        const bookmarked = await qnaService.getBookmarks();
        const list = Array.isArray(bookmarked) ? bookmarked : [];
        return { questions: list, total: list.length, totalPages: 1, page: 1, limit: list.length } as QnaPaginated;
      }

      if (tab === 'mine') {
        const all = await qnaService.getMyQuestions();
        const list = Array.isArray(all) ? all : (all as any).data ?? [];
        let filtered = list;
        if (category !== 'semua') filtered = filtered.filter((q: any) => q.category?.includes(category));
        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter((q: any) =>
            q.title.toLowerCase().includes(s) ||
            (q.body || '').toLowerCase().includes(s) ||
            q.tags?.some((t: string) => t.toLowerCase().includes(s))
          );
        }
        return { questions: filtered, total: filtered.length, totalPages: 1, page: 1, limit: filtered.length } as QnaPaginated;
      }

      if (tab === 'trending') {
        return qnaService.getTrendingQuestions({ page: pageParam, limit: 15 });
      }

      const fetchParams: any = { search: search || undefined, page: pageParam, limit: 15 };
      if (category !== 'semua') fetchParams.category = category;
      if (sort && sort !== 'newest') fetchParams.sort = sort;
      return qnaService.getQuestions(fetchParams);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) return lastPage.page + 1;
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 30_000,
  });
}

export function useQnaSimilar(title: string) {
  return useQuery({
    queryKey: qnaKeys.similar(title),
    queryFn: () => qnaService.findSimilarQuestions(title),
    enabled: title.length >= 10,
    staleTime: 10_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; body?: string; category?: string[]; tags?: string[]; requestAiAnswer?: boolean }) =>
      qnaService.createQuestion(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qna', 'questions'] });
      qc.invalidateQueries({ queryKey: qnaKeys.reputation() });
    },
  });
}

export function useBookmarkQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, bookmarked }: { questionId: string; bookmarked: boolean }) =>
      bookmarked ? qnaService.removeBookmark(questionId) : qnaService.bookmarkQuestion(questionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qna', 'questions'] });
      qc.invalidateQueries({ queryKey: qnaKeys.bookmarks() });
    },
  });
}

export function useUpvoteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, hasVoted }: { questionId: string; hasVoted: boolean }) =>
      hasVoted ? qnaService.removeQuestionVote(questionId) : qnaService.upvoteQuestion(questionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qna', 'questions'] });
    },
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => qnaService.deleteQuestion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qna', 'questions'] });
      qc.invalidateQueries({ queryKey: qnaKeys.reputation() });
    },
  });
}

export function useDeleteAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answerId: string) => qnaService.deleteAnswer(answerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qna'] });
    },
  });
}

// ─── Invalidation helper ────────────────────────────────────
export function useInvalidateQna() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: qnaKeys.all });
}
