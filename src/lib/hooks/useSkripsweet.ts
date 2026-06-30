'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  skripsweetService,
  ThesisProject, ThesisChapter, ThesisProgress,
  ThesisChatMessage, ExploreResult, ThesisBibliography,
  ChapterRevision,
} from '@/services/skripsweetService';

// ─── Query Keys ─────────────────────────────────────────────
export const skripsweetKeys = {
  all: ['skripsweet'] as const,
  list: () => ['skripsweet', 'list'] as const,
  detail: (id: string) => ['skripsweet', 'detail', id] as const,
  progress: (id: string) => ['skripsweet', 'progress', id] as const,
  chat: (id: string) => ['skripsweet', 'chat', id] as const,
  explore: (q?: string, tag?: string) => ['skripsweet', 'explore', q, tag] as const,
  trendingTags: () => ['skripsweet', 'trending-tags'] as const,
  publicDetail: (id: string) => ['skripsweet', 'public', id] as const,
};

// ─── Queries ────────────────────────────────────────────────

export function useTheses() {
  return useQuery({
    queryKey: skripsweetKeys.list(),
    queryFn: () => skripsweetService.getAll(),
    staleTime: 30_000,
  });
}

export function useThesisDetail(id: string | null, enabled = true) {
  return useQuery({
    queryKey: skripsweetKeys.detail(id!),
    queryFn: () => skripsweetService.getDetail(id!),
    enabled: !!id && enabled,
    staleTime: 20_000,
  });
}

export function useThesisProgress(id: string | null, enabled = true) {
  return useQuery({
    queryKey: skripsweetKeys.progress(id!),
    queryFn: () => skripsweetService.getProgress(id!),
    enabled: !!id && enabled,
    staleTime: 30_000,
  });
}

export function useChatHistory(id: string | null, enabled = true) {
  return useQuery({
    queryKey: skripsweetKeys.chat(id!),
    queryFn: () => skripsweetService.getChatHistory(id!),
    enabled: !!id && enabled,
    staleTime: 60_000,
  });
}

export function useExplore(q?: string, tag?: string, enabled = true) {
  return useQuery({
    queryKey: skripsweetKeys.explore(q, tag),
    queryFn: () => skripsweetService.explore({ q: q || undefined, tag: tag || undefined }),
    enabled,
    staleTime: 30_000,
  });
}

export function useTrendingTags(enabled = true) {
  return useQuery({
    queryKey: skripsweetKeys.trendingTags(),
    queryFn: () => skripsweetService.getTrendingTags(),
    enabled,
    staleTime: 120_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────

export function useCreateThesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ThesisProject>) => skripsweetService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.list() });
    },
  });
}

export function useDeleteThesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => skripsweetService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.list() });
    },
  });
}

export function useExplainFormat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, explanation }: { thesisId: string; explanation: string }) =>
      skripsweetService.explainFormat(thesisId, explanation),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
      qc.invalidateQueries({ queryKey: skripsweetKeys.progress(vars.thesisId) });
    },
  });
}

export function useUploadFormatFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, file }: { thesisId: string; file: File }) =>
      skripsweetService.uploadFormatFile(thesisId, file),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
      qc.invalidateQueries({ queryKey: skripsweetKeys.progress(vars.thesisId) });
    },
  });
}

export function useCreateChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, data }: { thesisId: string; data: Partial<ThesisChapter> }) =>
      skripsweetService.createChapter(thesisId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
      qc.invalidateQueries({ queryKey: skripsweetKeys.progress(vars.thesisId) });
    },
  });
}

export function useUpdateChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, chapterId, data }: { thesisId: string; chapterId: string; data: Partial<ThesisChapter> }) =>
      skripsweetService.updateChapter(thesisId, chapterId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
      qc.invalidateQueries({ queryKey: skripsweetKeys.progress(vars.thesisId) });
    },
  });
}

export function useDeleteChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, chapterId }: { thesisId: string; chapterId: string }) =>
      skripsweetService.deleteChapter(thesisId, chapterId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
      qc.invalidateQueries({ queryKey: skripsweetKeys.progress(vars.thesisId) });
    },
  });
}

export function useReorderChapters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, chapterIds }: { thesisId: string; chapterIds: string[] }) =>
      skripsweetService.reorderChapters(thesisId, chapterIds),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
    },
  });
}

export function useGetChapterFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, chapterId }: { thesisId: string; chapterId: string }) =>
      skripsweetService.getChapterFeedback(thesisId, chapterId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
    },
  });
}

export function useAddJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, data }: { thesisId: string; data: any }) =>
      skripsweetService.addJournal(thesisId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
    },
  });
}

export function useUpdateJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, journalId, data }: { thesisId: string; journalId: string; data: any }) =>
      skripsweetService.updateJournal(thesisId, journalId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
    },
  });
}

export function useRemoveJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, journalId }: { thesisId: string; journalId: string }) =>
      skripsweetService.removeJournal(thesisId, journalId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
    },
  });
}

export function useCreateBimbingan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, data }: { thesisId: string; data: any }) =>
      skripsweetService.createBimbingan(thesisId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
      qc.invalidateQueries({ queryKey: skripsweetKeys.progress(vars.thesisId) });
    },
  });
}

export function useUpdateBimbingan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, bimbinganId, data }: { thesisId: string; bimbinganId: string; data: any }) =>
      skripsweetService.updateBimbingan(thesisId, bimbinganId, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
      qc.invalidateQueries({ queryKey: skripsweetKeys.progress(vars.thesisId) });
    },
  });
}

export function useDeleteBimbingan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, bimbinganId }: { thesisId: string; bimbinganId: string }) =>
      skripsweetService.deleteBimbingan(thesisId, bimbinganId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
      qc.invalidateQueries({ queryKey: skripsweetKeys.progress(vars.thesisId) });
    },
  });
}

export function useSendChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, message, context }: { thesisId: string; message: string; context?: string }) =>
      skripsweetService.chat(thesisId, message, context),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.chat(vars.thesisId) });
    },
  });
}

export function useGenerateBibliography() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, style }: { thesisId: string; style: string }) =>
      skripsweetService.generateBibliography(thesisId, style),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
    },
  });
}

export function usePublishThesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, tags }: { thesisId: string; tags: string[] }) =>
      skripsweetService.publish(thesisId, tags),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
    },
  });
}

export function useUnpublishThesis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (thesisId: string) => skripsweetService.unpublish(thesisId),
    onSuccess: (_, thesisId) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(thesisId) });
    },
  });
}

export function useAddRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, chapterId, note }: { thesisId: string; chapterId: string; note: string }) =>
      skripsweetService.addRevision(thesisId, chapterId, note),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
    },
  });
}

export function useResolveRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, chapterId, revisionId }: { thesisId: string; chapterId: string; revisionId: string }) =>
      skripsweetService.resolveRevision(thesisId, chapterId, revisionId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
    },
  });
}

export function useUnresolveRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, chapterId, revisionId }: { thesisId: string; chapterId: string; revisionId: string }) =>
      skripsweetService.unresolveRevision(thesisId, chapterId, revisionId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
    },
  });
}

export function useDeleteRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, chapterId, revisionId }: { thesisId: string; chapterId: string; revisionId: string }) =>
      skripsweetService.deleteRevision(thesisId, chapterId, revisionId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
    },
  });
}

export function useToggleLike() {
  return useMutation({
    mutationFn: (thesisId: string) => skripsweetService.toggleLike(thesisId),
  });
}

export function useToggleBookmark() {
  return useMutation({
    mutationFn: (thesisId: string) => skripsweetService.toggleBookmark(thesisId),
  });
}

export function useAddComment() {
  return useMutation({
    mutationFn: ({ thesisId, content }: { thesisId: string; content: string }) =>
      skripsweetService.addComment(thesisId, content),
  });
}

export function useSearchJournals() {
  return useMutation({
    mutationFn: ({ thesisId, query }: { thesisId: string; query: string }) =>
      skripsweetService.searchJournals(thesisId, query),
  });
}

export function useUploadBimbinganAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ thesisId, bimbinganId, file }: { thesisId: string; bimbinganId: string; file: File }) =>
      skripsweetService.uploadBimbinganAttachment(thesisId, bimbinganId, file),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: skripsweetKeys.detail(vars.thesisId) });
    },
  });
}
