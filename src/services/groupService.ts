import { apiFetch } from '@/lib/api';

export interface GroupMember {
  id: string;
  userId: string;
  user: { id: string; fullName: string; avatarUrl?: string };
}

export interface TaskGroupFull {
  id: string;
  classId: string;
  name: string;
  createdAt: string;
  members: GroupMember[];
  tasks: { id: string; title: string }[];
}

export const groupService = {
  getClassGroups: (classId: string) =>
    apiFetch<TaskGroupFull[]>(`/group/class/${classId}`),

  createGroup: (classId: string, name: string) =>
    apiFetch<TaskGroupFull>(`/group/class/${classId}`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  autoGenerate: (classId: string, groupCount: number) =>
    apiFetch<TaskGroupFull[]>(`/group/class/${classId}/auto`, {
      method: 'POST',
      body: JSON.stringify({ groupCount }),
    }),

  deleteGroup: (groupId: string) =>
    apiFetch<{ message: string }>(`/group/${groupId}`, { method: 'DELETE' }),

  addMember: (groupId: string, userId: string) =>
    apiFetch<GroupMember>(`/group/${groupId}/member`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  removeMember: (groupId: string, userId: string) =>
    apiFetch<{ message: string }>(`/group/${groupId}/member/${userId}`, { method: 'DELETE' }),
};
