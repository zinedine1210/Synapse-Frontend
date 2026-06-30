'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { todoService, PersonalTodo, TodoStats } from '@/services/todoService';

// ─── Query Keys ─────────────────────────────────────────────
export const todoKeys = {
  all: ['todos'] as const,
  list: (params: Record<string, any>) => ['todos', 'list', params] as const,
  stats: () => ['todos', 'stats'] as const,
  counts: (status: string) => ['todos', 'counts', status] as const,
  shared: () => ['todos', 'shared'] as const,
  sharedUsers: (todoId: string) => ['todos', 'shared-users', todoId] as const,
  agenda: (days?: number) => ['todos', 'agenda', days] as const,
  timeline: () => ['todos', 'timeline'] as const,
};

// ─── Queries ────────────────────────────────────────────────

export function useTodos(params: { status?: string; category?: string }) {
  const queryParams = { limit: 200, ...params };
  return useQuery({
    queryKey: todoKeys.list(queryParams),
    queryFn: async () => {
      const res = await todoService.getAll(queryParams);
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useTodoStats() {
  return useQuery({
    queryKey: todoKeys.stats(),
    queryFn: () => todoService.getStats(),
    staleTime: 30_000,
  });
}

export function useTodoCounts(status: string) {
  return useQuery({
    queryKey: todoKeys.counts(status),
    queryFn: async () => {
      const params: any = { limit: 200 };
      if (status) params.status = status;
      const res = await todoService.getAll(params);
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useSharedWithMe() {
  return useQuery({
    queryKey: todoKeys.shared(),
    queryFn: () => todoService.getSharedWithMe(),
    staleTime: 60_000,
  });
}

export function useSharedUsers(todoId: string | null) {
  return useQuery({
    queryKey: todoKeys.sharedUsers(todoId!),
    queryFn: () => todoService.getSharedUsers(todoId!),
    enabled: !!todoId,
    staleTime: 30_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────

export function useCreateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => todoService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos', 'list'] });
      qc.invalidateQueries({ queryKey: todoKeys.stats() });
      qc.invalidateQueries({ queryKey: ['todos', 'counts'] });
    },
  });
}

export function useUpdateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => todoService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos', 'list'] });
      qc.invalidateQueries({ queryKey: todoKeys.stats() });
      qc.invalidateQueries({ queryKey: ['todos', 'counts'] });
    },
  });
}

export function useToggleTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => todoService.toggleDone(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos', 'list'] });
      qc.invalidateQueries({ queryKey: todoKeys.stats() });
      qc.invalidateQueries({ queryKey: ['todos', 'counts'] });
    },
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => todoService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos', 'list'] });
      qc.invalidateQueries({ queryKey: todoKeys.stats() });
      qc.invalidateQueries({ queryKey: ['todos', 'counts'] });
    },
  });
}

export function useReorderTodos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) => todoService.reorder(items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos', 'list'] });
    },
  });
}

export function useBulkDeleteTodos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => todoService.bulkDelete(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos', 'list'] });
      qc.invalidateQueries({ queryKey: todoKeys.stats() });
      qc.invalidateQueries({ queryKey: ['todos', 'counts'] });
    },
  });
}

export function useBulkToggleTodos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, done }: { ids: string[]; done: boolean }) => todoService.bulkToggleDone(ids, done),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos', 'list'] });
      qc.invalidateQueries({ queryKey: todoKeys.stats() });
      qc.invalidateQueries({ queryKey: ['todos', 'counts'] });
    },
  });
}

export function useShareTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ todoId, email, role }: { todoId: string; email: string; role: string }) =>
      todoService.shareTodo(todoId, email, role),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: todoKeys.sharedUsers(vars.todoId) });
    },
  });
}

export function useUnshareTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ todoId, targetUserId }: { todoId: string; targetUserId: string }) =>
      todoService.unshareTodo(todoId, targetUserId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: todoKeys.sharedUsers(vars.todoId) });
    },
  });
}

export function useRespondToShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shareId, accept }: { shareId: string; accept: boolean }) =>
      todoService.respondToShare(shareId, accept),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: todoKeys.shared() });
      qc.invalidateQueries({ queryKey: ['todos', 'list'] });
    },
  });
}

export function useCreateSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ todoId, title }: { todoId: string; title: string }) =>
      todoService.createSubtask(todoId, title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos', 'list'] });
    },
  });
}

export function useUpdateSubtask() {
  return useMutation({
    mutationFn: ({ todoId, subId, data }: { todoId: string; subId: string; data: any }) =>
      todoService.updateSubtask(todoId, subId, data),
  });
}

export function useDeleteSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ todoId, subId }: { todoId: string; subId: string }) =>
      todoService.deleteSubtask(todoId, subId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos', 'list'] });
    },
  });
}

export function useBulkCreateTodos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: any[]) => todoService.bulkCreate(items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todos', 'list'] });
      qc.invalidateQueries({ queryKey: todoKeys.stats() });
      qc.invalidateQueries({ queryKey: ['todos', 'counts'] });
    },
  });
}

// ─── Invalidation helper ────────────────────────────────────
export function useInvalidateTodos() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: todoKeys.all });
}
