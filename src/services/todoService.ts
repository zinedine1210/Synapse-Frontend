import { apiFetch } from '@/lib/api';

export interface TodoSubtask {
  id: string;
  todoId: string;
  title: string;
  isDone: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface PersonalTodo {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'done' | 'overdue';
  category?: string;
  tags: string[];
  inputMethod: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  sortOrder?: number;
  recurrence?: 'daily' | 'weekly' | 'monthly' | null;
  parentTodoId?: string | null;
  subtasks?: TodoSubtask[];
  reminders: { id: string; remindAt: string; sent: boolean }[];
  // Event/Jadwal fields
  type: 'todo' | 'event';
  startTime?: string;
  endTime?: string;
  location?: string;
  eventType?: 'meeting' | 'kuliah' | 'ujian' | 'penting' | 'lainnya' | null;
  reminderMinutes: number[];
  sourceType?: string;
  sourceId?: string;
  // Shared users (from getAll include)
  sharedWith?: { user: { id: string; fullName?: string; avatarUrl?: string } }[];
  _sharedBy?: { id: string; fullName?: string; avatarUrl?: string };
  _shareRole?: string;
}

export interface TodoStats {
  total: number;
  done: number;
  pending: number;
  overdue: number;
}

export interface UnifiedTimelineItem {
  id: string;
  title: string;
  dueDate?: string;
  dueTime?: string;
  type: 'personal' | 'class';
  status?: string;
  priority?: string;
  category?: string;
  className?: string;
  courseName?: string;
}

export const todoService = {
  create: (data: Partial<PersonalTodo>) =>
    apiFetch<PersonalTodo>('/todos', { method: 'POST', body: JSON.stringify(data) }),

  getAll: (params?: { status?: string; priority?: string; category?: string; type?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.priority) q.set('priority', params.priority);
    if (params?.category) q.set('category', params.category);
    if (params?.type) q.set('type', params.type);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<{ data: PersonalTodo[]; total: number; page: number; limit: number; totalPages: number }>(`/todos?${q.toString()}`);
  },

  getById: (id: string) => apiFetch<PersonalTodo>(`/todos/${id}`),

  update: (id: string, data: Partial<PersonalTodo>) =>
    apiFetch<PersonalTodo>(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  toggleDone: (id: string) =>
    apiFetch<PersonalTodo>(`/todos/${id}/toggle`, { method: 'PATCH' }),

  delete: (id: string) =>
    apiFetch(`/todos/${id}`, { method: 'DELETE' }),

  getStats: () => apiFetch<TodoStats>('/todos/stats'),

  parseNaturalInput: (text: string) =>
    apiFetch<any>('/todos/parse', { method: 'POST', body: JSON.stringify({ text }) }),

  // ─── Reorder (drag-and-drop) ───────────────────────────────────────
  reorder: (items: { id: string; sortOrder: number }[]) =>
    apiFetch<void>('/todos/reorder', { method: 'PATCH', body: JSON.stringify({ items }) }),

  // ─── Subtasks ──────────────────────────────────────────────────────
  createSubtask: (todoId: string, title: string) =>
    apiFetch<TodoSubtask>(`/todos/${todoId}/subtasks`, { method: 'POST', body: JSON.stringify({ title }) }),

  updateSubtask: (todoId: string, subId: string, data: { title?: string; isDone?: boolean }) =>
    apiFetch<TodoSubtask>(`/todos/${todoId}/subtasks/${subId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteSubtask: (todoId: string, subId: string) =>
    apiFetch<void>(`/todos/${todoId}/subtasks/${subId}`, { method: 'DELETE' }),

  // ─── Recurrence ────────────────────────────────────────────────────
  setRecurrence: (todoId: string, recurrence: 'daily' | 'weekly' | 'monthly' | null) =>
    apiFetch<PersonalTodo>(`/todos/${todoId}/recurrence`, { method: 'POST', body: JSON.stringify({ recurrence }) }),

  // ─── Unified Timeline ──────────────────────────────────────────────
  getUnifiedTimeline: () =>
    apiFetch<UnifiedTimelineItem[]>('/todos/unified-timeline'),

  // ─── Bulk operations ──────────────────────────────────────────────
  bulkDelete: (ids: string[]) =>
    apiFetch<{ deleted: number }>('/todos/bulk/delete', { method: 'POST', body: JSON.stringify({ ids }) }),

  bulkToggleDone: (ids: string[], done: boolean) =>
    apiFetch<{ updated: number }>('/todos/bulk/toggle', { method: 'POST', body: JSON.stringify({ ids, done }) }),

  bulkUpdateCategory: (ids: string[], category: string) =>
    apiFetch<{ updated: number }>('/todos/bulk/category', { method: 'POST', body: JSON.stringify({ ids, category }) }),

  bulkUpdatePriority: (ids: string[], priority: string) =>
    apiFetch<{ updated: number }>('/todos/bulk/priority', { method: 'POST', body: JSON.stringify({ ids, priority }) }),

  // ─── Reminders ────────────────────────────────────────────────────
  setReminder: (todoId: string, remindAt: string) =>
    apiFetch<any>(`/todos/${todoId}/reminder`, { method: 'POST', body: JSON.stringify({ remindAt }) }),

  deleteReminder: (todoId: string) =>
    apiFetch<any>(`/todos/${todoId}/reminder`, { method: 'DELETE' }),

  // ─── Agenda ───────────────────────────────────────────────────────
  getAgenda: (days?: number) =>
    apiFetch<{ items: PersonalTodo[]; grouped: Record<string, PersonalTodo[]> }>(`/todos/agenda${days ? `?days=${days}` : ''}`),

  // ─── Conflict detection ───────────────────────────────────────────
  checkConflicts: (date: string, startTime: string, endTime: string, excludeId?: string) =>
    apiFetch<{ hasConflict: boolean; conflicts: { id: string; title: string; startTime: string; endTime: string }[] }>('/todos/check-conflicts', {
      method: 'POST',
      body: JSON.stringify({ date, startTime, endTime, excludeId }),
    }),

  // ─── Sync class tasks ─────────────────────────────────────────────
  syncClassTasks: () =>
    apiFetch<{ synced: number; total: number }>('/todos/sync-class-tasks', { method: 'POST' }),

  // ─── AI Image Parse (bulk) ────────────────────────────────────────
  parseImage: (imageBase64: string, mimeType: string) =>
    apiFetch<any[]>('/todos/parse-image', { method: 'POST', body: JSON.stringify({ imageBase64, mimeType }) }),

  // ─── Bulk create ──────────────────────────────────────────────────
  bulkCreate: (items: Partial<PersonalTodo>[]) =>
    apiFetch<{ created: number }>('/todos/bulk/create', { method: 'POST', body: JSON.stringify({ items }) }),

  // ─── Sharing ──────────────────────────────────────────────────────
  shareTodo: (todoId: string, email: string, role: string = 'viewer') =>
    apiFetch<{ shared: any; targetUser: { id: string; email: string; fullName: string } }>(`/todos/${todoId}/share`, {
      method: 'POST', body: JSON.stringify({ email, role }),
    }),

  getSharedWithMe: () =>
    apiFetch<any[]>('/todos/shared/with-me'),

  getSharedUsers: (todoId: string) =>
    apiFetch<any[]>(`/todos/${todoId}/shared-users`),

  respondToShare: (shareId: string, accept: boolean) =>
    apiFetch<{ message: string }>(`/todos/shared/${shareId}/respond`, {
      method: 'POST', body: JSON.stringify({ accept }),
    }),

  unshareTodo: (todoId: string, targetUserId: string) =>
    apiFetch<{ message: string }>(`/todos/${todoId}/share/${targetUserId}`, { method: 'DELETE' }),
};
