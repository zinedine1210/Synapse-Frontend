import { apiFetch, apiUpload } from '@/lib/api';
import { Class } from '@/models/Class';

export const classService = {
  /** Ambil semua kelas user */
  getMyClasses: () => apiFetch<Class[]>('/classes'),

  /** Buat kelas baru */
  createClass: (data: { name: string; description?: string }) =>
    apiFetch<Class>('/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Ambil detail kelas */
  getClassById: (classId: string) => apiFetch<Class>(`/classes/${classId}`),

  /** Update info kelas (dosen, jadwal, ruang, dll) */
  updateClass: (classId: string, data: { name?: string; description?: string; lecturer?: string; day?: string; time?: string; room?: string; password?: string }) =>
    apiFetch<Class>(`/classes/${classId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** Ambil daftar sesi kelas */
  getClassSessions: (classId: string) =>
    apiFetch<Class['sessions']>(`/classes/${classId}/sessions`),

  /** Ambil detail sesi (termasuk materials & quizzes) */
  getSessionById: (sessionId: string) =>
    apiFetch<any>(`/sessions/${sessionId}`),

  /** Hapus kelas */
  deleteClass: (classId: string) =>
    apiFetch<{ message: string }>(`/classes/${classId}`, { method: 'DELETE' }),

  /** Ambil info dasar kelas (untuk join) */
  getClassInfo: (classId: string) =>
    apiFetch<any>(`/classes/${classId}/info`),

  /** Resolve class code to UUID */
  resolveClassCode: (code: string) =>
    apiFetch<{ classId: string; name: string }>('/classes/resolve-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  /** Bergabung ke kelas by UUID */
  joinClass: (classId: string, password?: string) =>
    apiFetch<any>(`/classes/${classId}/join`, { 
      method: 'POST', 
      body: JSON.stringify({ password }),
    }),

  /** Bergabung ke kelas by code */
  joinByCode: (code: string, password?: string) =>
    apiFetch<any>('/classes/join-by-code', {
      method: 'POST',
      body: JSON.stringify({ code, password }),
    }),

  /** Tambah anggota kelas */
  addMember: (classId: string, email: string) =>
    apiFetch<any>(`/classes/${classId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  /** Kick anggota kelas */
  kickMember: (classId: string, userId: string) =>
    apiFetch<any>(`/classes/${classId}/members/${userId}`, {
      method: 'DELETE',
    }),

  /** Ambil semua materi dalam satu kelas */
  getAllClassMaterials: (classId: string) =>
    apiFetch<any[]>(`/classes/${classId}/materials`),

  /** Ambil daftar anggota kelas */
  getClassMembers: (classId: string) =>
    apiFetch<{ id: string; userId: string; role: string; user: { id: string; fullName: string; email: string; avatarUrl?: string } }[]>(`/classes/${classId}/members`),

  /** Buat sesi pertemuan baru */
  createSession: (classId: string, title?: string) =>
    apiFetch<any>(`/sessions/class/${classId}`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  /** Rename/Update judul sesi pertemuan */
  updateSession: (sessionId: string, title: string) =>
    apiFetch<any>(`/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),

  /** Hapus sesi pertemuan */
  deleteSession: (sessionId: string) =>
    apiFetch<{ success: boolean }>(`/sessions/${sessionId}`, {
      method: 'DELETE',
    }),

  /** Ubah urutan sesi pertemuan */
  reorderSession: (sessionId: string, newSequence: number) =>
    apiFetch<any>(`/sessions/${sessionId}/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ newSequence }),
    }),

  /** Update role anggota kelas */
  updateMemberRole: (classId: string, userId: string, role: string) =>
    apiFetch<any>(`/classes/${classId}/members/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  // ── CLASS ROLES ──

  /** Get all roles for a class */
  getClassRoles: (classId: string) =>
    apiFetch<any[]>(`/classes/${classId}/roles`),

  /** Create a new class role */
  createClassRole: (classId: string, name: string, permissions: string[]) =>
    apiFetch<any>(`/classes/${classId}/roles`, {
      method: 'POST',
      body: JSON.stringify({ name, permissions }),
    }),

  /** Update a class role */
  updateClassRole: (classId: string, roleId: string, data: { name?: string; permissions?: string[] }) =>
    apiFetch<any>(`/classes/${classId}/roles/${roleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** Delete a class role */
  deleteClassRole: (classId: string, roleId: string) =>
    apiFetch<any>(`/classes/${classId}/roles/${roleId}`, {
      method: 'DELETE',
    }),

  /** Assign class role to member */
  assignClassRole: (classId: string, userId: string, classRoleId: string | null) =>
    apiFetch<any>(`/classes/${classId}/members/${userId}/class-role`, {
      method: 'PATCH',
      body: JSON.stringify({ classRoleId }),
    }),

  /** Get all available permissions */
  getPermissions: () =>
    apiFetch<string[]>('/classes/permissions'),

  // ── JOIN APPROVAL ──

  /** Get pending members */
  getPendingMembers: (classId: string) =>
    apiFetch<any[]>(`/classes/${classId}/pending-members`),

  /** Approve pending member */
  approveMember: (classId: string, userId: string) =>
    apiFetch<any>(`/classes/${classId}/approve/${userId}`, { method: 'POST' }),

  /** Reject pending member */
  rejectMember: (classId: string, userId: string) =>
    apiFetch<any>(`/classes/${classId}/reject/${userId}`, { method: 'POST' }),

  /** Update class join settings */
  updateClassSettings: (classId: string, data: { joinMode?: string; autoRoleAssign?: boolean }) =>
    apiFetch<any>(`/classes/${classId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** Get class info by code (for join page) */
  getClassInfoByCode: (code: string) =>
    apiFetch<any>(`/classes/code-info/${code}`),

  // ── Custom Tabs ──

  /** Get custom tabs for a discussion */
  getCustomTabs: (classId: string, discussionId?: string | null) =>
    apiFetch<CustomTab[]>(`/classes/${classId}/custom-tabs${discussionId !== undefined ? `?discussionId=${discussionId === null ? 'null' : discussionId}` : ''}`),

  /** Create a new custom tab */
  createCustomTab: (classId: string, name: string, discussionId?: string | null) =>
    apiFetch<CustomTab>(`/classes/${classId}/custom-tabs`, {
      method: 'POST',
      body: JSON.stringify({ name, discussionId: discussionId ?? null }),
    }),

  /** Update a custom tab (name and/or content) */
  updateCustomTab: (tabId: string, data: { name?: string; content?: string }) =>
    apiFetch<CustomTab>(`/classes/custom-tabs/${tabId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** Delete a custom tab */
  deleteCustomTab: (tabId: string) =>
    apiFetch<{ success: boolean }>(`/classes/custom-tabs/${tabId}`, { method: 'DELETE' }),

  /** Upload a file to a custom tab */
  uploadCustomTabFile: (tabId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiUpload<CustomTabFile>(`/classes/custom-tabs/${tabId}/files`, formData);
  },

  /** Delete a file from a custom tab */
  deleteCustomTabFile: (fileId: string) =>
    apiFetch<{ success: boolean }>(`/classes/custom-tab-files/${fileId}`, { method: 'DELETE' }),
};

export interface CustomTabFile {
  id: string;
  tabId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSizeBytes: number | null;
  createdAt: string;
}

export interface CustomTab {
  id: string;
  classId: string;
  discussionId: string | null;
  name: string;
  content: string;
  files: CustomTabFile[];
  createdAt: string;
  updatedAt: string;
}
