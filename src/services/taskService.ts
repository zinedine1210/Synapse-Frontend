import { apiFetch } from '@/lib/api';

export interface TaskGroup {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  classId: string;
  sessionId?: string;
  title: string;
  description?: string;
  descriptionImageUrl?: string;
  taskType: 'ESSAY' | 'MULTIPLE_CHOICE' | 'MIXED';
  deadline?: string;
  visibility: 'SHARED' | 'PRIVATE';
  assignType: 'ALL' | 'INDIVIDUAL' | 'GROUP';
  assignedUserIds: string[];
  createdById: string;
  createdAt: string;
  session?: { id: string; title: string; sequence: number };
  _count?: { submissions: number };
  taskGroup?: TaskGroup;
  class?: { id: string; name: string };
  submissions?: TaskSubmission[];
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  userId: string;
  content?: string;
  imageUrl?: string;
  aiAnswer?: string;
  visibility?: string;
  user?: { id: string; fullName: string; avatarUrl?: string };
  createdAt: string;
}

export const taskService = {
  getClassTasks: (classId: string) =>
    apiFetch<Task[]>(`/task/class/${classId}`),

  getSessionTasks: (sessionId: string) =>
    apiFetch<Task[]>(`/task/session/${sessionId}`),

  createTask: (classId: string, data: {
    title: string; description?: string; sessionId?: string;
    taskType?: string; deadline?: string; taskGroupId?: string; visibility?: string;
    assignType?: string; assignedUserIds?: string[];
    imageBase64?: string; imageMimeType?: string;
  }) =>
    apiFetch<Task>(`/task/class/${classId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyDeadlines: () =>
    apiFetch<Task[]>('/task/my-deadlines'),

  deleteTask: (taskId: string) =>
    apiFetch<{ message: string }>(`/task/${taskId}`, { method: 'DELETE' }),

  updateTask: (taskId: string, data: {
    title?: string; description?: string; sessionId?: string;
    taskType?: string; deadline?: string; taskGroupId?: string; visibility?: string;
    assignType?: string; assignedUserIds?: string[];
  }) =>
    apiFetch<Task>(`/task/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  submitTask: (taskId: string, data: { content?: string; imageUrl?: string; imageBase64?: string; imageMimeType?: string; visibility?: string; skipAi?: boolean }) =>
    apiFetch<TaskSubmission>(`/task/${taskId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  toggleSubmissionVisibility: (submissionId: string) =>
    apiFetch<TaskSubmission>(`/task/submission/${submissionId}/visibility`, {
      method: 'PATCH',
    }),

  getSubmissions: (taskId: string) =>
    apiFetch<TaskSubmission[]>(`/task/${taskId}/submissions`),

  deleteSubmission: (submissionId: string) =>
    apiFetch<{ message: string }>(`/task/submission/${submissionId}`, { method: 'DELETE' }),
};
