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

  getAll: (params?: { status?: string; priority?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.priority) q.set('priority', params.priority);
    if (params?.category) q.set('category', params.category);
    return apiFetch<PersonalTodo[]>(`/todos?${q.toString()}`);
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

  // ─── Recurrence ────────────────────────────────────────────────────
  setRecurrence: (todoId: string, recurrence: 'daily' | 'weekly' | 'monthly' | null) =>
    apiFetch<PersonalTodo>(`/todos/${todoId}/recurrence`, { method: 'POST', body: JSON.stringify({ recurrence }) }),

  // ─── Unified Timeline ──────────────────────────────────────────────
  getUnifiedTimeline: () =>
    apiFetch<UnifiedTimelineItem[]>('/todos/unified-timeline'),
};
