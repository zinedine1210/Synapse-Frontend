'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classService } from '@/services/classService';
import { Class, Session } from '@/models/Class';

// ─── Query Keys ─────────────────────────────────────────────
export const classKeys = {
  all: ['class'] as const,
  detail: (classId: string) => ['class', 'detail', classId] as const,
  sessions: (classId: string) => ['class', 'sessions', classId] as const,
  sessionDetail: (sessionId: string) => ['class', 'session-detail', sessionId] as const,
  members: (classId: string) => ['class', 'members', classId] as const,
  roles: (classId: string) => ['class', 'roles', classId] as const,
  tasks: (classId: string) => ['class', 'tasks', classId] as const,
  myClasses: () => ['class', 'my-classes'] as const,
  customTabs: (classId: string, discId?: string | null) => ['class', 'custom-tabs', classId, discId] as const,
  pendingMembers: (classId: string) => ['class', 'pending-members', classId] as const,
  // Forum
  forumDiscussions: (classId: string) => ['class', 'forum-discussions', classId] as const,
  forumPosts: (classId: string, discussionId?: string | null) => ['class', 'forum-posts', classId, discussionId] as const,
  forumUnread: (classId: string) => ['class', 'forum-unread', classId] as const,
  // Tugas
  classTasks_full: (classId: string, sessionId?: string) => ['class', 'tasks-full', classId, sessionId] as const,
  taskSubmissions: (taskId: string) => ['class', 'task-submissions', taskId] as const,
  // Kolektif
  kolektifFunds: (classId: string) => ['class', 'kolektif', classId] as const,
  kolektifSummary: (fundId: string) => ['class', 'kolektif-summary', fundId] as const,
  // Kelompok
  groups: (classId: string) => ['class', 'groups', classId] as const,
  // Prediksi
  predictions: (classId: string) => ['class', 'predictions', classId] as const,
};

// ─── Queries ────────────────────────────────────────────────

export function useClassDetailQuery(classId: string) {
  return useQuery({
    queryKey: classKeys.detail(classId),
    queryFn: () => classService.getClassById(classId),
    staleTime: 60_000,
    enabled: !!classId,
  });
}

export function useClassSessions(classId: string) {
  return useQuery({
    queryKey: classKeys.sessions(classId),
    queryFn: async () => (await classService.getClassSessions(classId)) ?? [],
    staleTime: 60_000,
    enabled: !!classId,
  });
}

export function useSessionDetail(sessionId: string | null) {
  return useQuery({
    queryKey: classKeys.sessionDetail(sessionId!),
    queryFn: () => classService.getSessionById(sessionId!),
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

export function useClassMembers(classId: string | undefined) {
  return useQuery({
    queryKey: classKeys.members(classId!),
    queryFn: () => classService.getClassMembers(classId!),
    enabled: !!classId,
    staleTime: 60_000,
  });
}

export function useClassRoles(classId: string | undefined) {
  return useQuery({
    queryKey: classKeys.roles(classId!),
    queryFn: () => classService.getClassRoles(classId!),
    enabled: !!classId,
    staleTime: 60_000,
  });
}

export function useClassTasks(classId: string | undefined) {
  return useQuery({
    queryKey: classKeys.tasks(classId!),
    queryFn: async () => {
      const { taskService } = await import('@/services/taskService');
      const tasks = await taskService.getClassTasks(classId!);
      return (tasks || []).map((x: any) => ({ id: x.id, title: x.title }));
    },
    enabled: !!classId,
    staleTime: 60_000,
  });
}

export function useMyClasses() {
  return useQuery({
    queryKey: classKeys.myClasses(),
    queryFn: () => classService.getMyClasses(),
    staleTime: 60_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────

export function useCreateSession(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => classService.createSession(classId, title),
    onSuccess: (newSession) => {
      qc.setQueryData<Session[]>(classKeys.sessions(classId), (prev) => [...(prev ?? []), newSession]);
    },
  });
}

export function useUpdateSession(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      classService.updateSession(sessionId, title),
    onSuccess: (updated, { sessionId }) => {
      qc.setQueryData<Session[]>(classKeys.sessions(classId), (prev) =>
        (prev ?? []).map(s => s.id === sessionId ? { ...s, title: updated.title } : s)
      );
    },
  });
}

export function useDeleteSession(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => classService.deleteSession(sessionId),
    onSuccess: (_, sessionId) => {
      qc.setQueryData<Session[]>(classKeys.sessions(classId), (prev) =>
        (prev ?? []).filter(s => s.id !== sessionId)
      );
    },
  });
}

export function useReorderSession(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, newSequence }: { sessionId: string; newSequence: number }) =>
      classService.reorderSession(sessionId, newSequence),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classKeys.sessions(classId) });
    },
  });
}

export function useUpdateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, data }: { classId: string; data: any }) =>
      classService.updateClass(classId, data),
    onSuccess: (updated, { classId }) => {
      qc.setQueryData(classKeys.detail(classId), updated);
    },
  });
}

export function useKickMember(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => classService.kickMember(classId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classKeys.members(classId) });
    },
  });
}

export function useUpdateMemberRole(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      classService.updateMemberRole(classId, userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classKeys.members(classId) });
    },
  });
}

// ─── Tab-Level Queries ──────────────────────────────────────

export function useForumDiscussions(classId: string) {
  return useQuery({
    queryKey: classKeys.forumDiscussions(classId),
    queryFn: async () => {
      const { forumService } = await import('@/services/forumService');
      return (await forumService.getClassDiscussions(classId)) ?? [];
    },
    enabled: !!classId,
    staleTime: 30_000,
  });
}

export function useForumUnread(classId: string, enabled: boolean) {
  return useQuery({
    queryKey: classKeys.forumUnread(classId),
    queryFn: async () => {
      const { forumService } = await import('@/services/forumService');
      return forumService.getUnreadCounts(classId);
    },
    enabled: !!classId && enabled,
    staleTime: 30_000,
  });
}

export function useCustomTabs(classId: string, discussionId?: string | null) {
  return useQuery({
    queryKey: classKeys.customTabs(classId, discussionId),
    queryFn: () => classService.getCustomTabs(classId, discussionId ?? undefined),
    enabled: !!classId,
    staleTime: 60_000,
  });
}

export function useClassTasksFull(classId: string, sessionId?: string) {
  return useQuery({
    queryKey: classKeys.classTasks_full(classId, sessionId),
    queryFn: async () => {
      const { taskService } = await import('@/services/taskService');
      return sessionId
        ? (await taskService.getSessionTasks(sessionId)) ?? []
        : (await taskService.getClassTasks(classId)) ?? [];
    },
    enabled: !!classId,
    staleTime: 30_000,
  });
}

export function useTaskSubmissions(taskId: string | null) {
  return useQuery({
    queryKey: classKeys.taskSubmissions(taskId!),
    queryFn: async () => {
      const { taskService } = await import('@/services/taskService');
      return (await taskService.getSubmissions(taskId!)) ?? [];
    },
    enabled: !!taskId,
    staleTime: 15_000,
  });
}

export function useKolektifFunds(classId: string) {
  return useQuery({
    queryKey: classKeys.kolektifFunds(classId),
    queryFn: async () => {
      const { kolektifService } = await import('@/services/kolektifService');
      return (await kolektifService.getAll(classId)) ?? [];
    },
    enabled: !!classId,
    staleTime: 30_000,
  });
}

export function useKolektifSummary(fundId: string | null) {
  return useQuery({
    queryKey: classKeys.kolektifSummary(fundId!),
    queryFn: async () => {
      const { kolektifService } = await import('@/services/kolektifService');
      return kolektifService.getSummaryByUser(fundId!);
    },
    enabled: !!fundId,
    staleTime: 30_000,
  });
}

export function useClassGroups(classId: string) {
  return useQuery({
    queryKey: classKeys.groups(classId),
    queryFn: async () => {
      const { groupService } = await import('@/services/groupService');
      return (await groupService.getClassGroups(classId)) ?? [];
    },
    enabled: !!classId,
    staleTime: 30_000,
  });
}

export function useExamPredictions(classId: string) {
  return useQuery({
    queryKey: classKeys.predictions(classId),
    queryFn: async () => {
      const { examPredictionService } = await import('@/services/examPredictionService');
      return (await examPredictionService.getClassPredictions(classId)) ?? [];
    },
    enabled: !!classId,
    staleTime: 30_000,
  });
}
