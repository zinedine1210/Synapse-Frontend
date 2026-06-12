import { apiFetch } from '@/lib/api';

export const superadminService = {
  /** GET /api/v1/superadmin/analytics – Ambil data analitik server */
  getAnalytics: () => apiFetch<any>('/superadmin/analytics'),

  /** GET /api/v1/superadmin/users – Ambil daftar pengguna (paginated) */
  getUsers: (page = 1, limit = 50) =>
    apiFetch<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(
      `/superadmin/users?page=${page}&limit=${limit}`
    ),

  /** GET /api/v1/superadmin/plan-config – Ambil semua config plan */
  getPlanConfigs: () => apiFetch<any[]>('/superadmin/plan-config'),

  /** PATCH /api/v1/superadmin/plan-config/:plan – Update kuota batasan paket */
  updatePlanConfig: (
    plan: string,
    data: { maxUploadPerMonth: number; maxFileSizeMb: number; aiRequestLimit: number }
  ) =>
    apiFetch<any>(`/superadmin/plan-config/${plan}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** POST /api/v1/superadmin/plans – Buat plan baru */
  createPricingPlan: (data: {
    name: string;
    description?: string;
    maxUploadPerMonth: number;
    maxFileSizeMb: number;
    aiRequestLimit: number;
    features: string[];
    price: number;
    durationDays?: number;
  }) =>
    apiFetch<any>('/superadmin/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** PATCH /api/v1/superadmin/plans/:id – Update plan */
  updatePricingPlan: (
    id: string,
    data: {
      name?: string;
      description?: string;
      maxUploadPerMonth?: number;
      maxFileSizeMb?: number;
      aiRequestLimit?: number;
      features?: string[];
      price?: number;
      durationDays?: number;
    }
  ) =>
    apiFetch<any>(`/superadmin/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** DELETE /api/v1/superadmin/plans/:id – Hapus plan */
  deletePricingPlan: (id: string) =>
    apiFetch<any>(`/superadmin/plans/${id}`, {
      method: 'DELETE',
    }),

  /** PATCH /api/v1/superadmin/users/:userId/plan – Assign plan ke user */
  assignUserPlan: (userId: string, planName: string) =>
    apiFetch<any>(`/superadmin/users/${userId}/plan`, {
      method: 'PATCH',
      body: JSON.stringify({ planName }),
    }),

  /** POST /api/v1/superadmin/users – Buat user baru */
  createUser: (data: { email: string; fullName: string; password: string; role?: 'USER' | 'SUPERADMIN' }) =>
    apiFetch<{ message: string; user: any }>('/superadmin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** DELETE /api/v1/superadmin/users/:userId – Hapus user */
  deleteUser: (userId: string) =>
    apiFetch<{ message: string }>(`/superadmin/users/${userId}`, { method: 'DELETE' }),

  /** GET /api/v1/superadmin/classes – Semua kelas di sistem */
  getAllClasses: (page = 1, limit = 50) =>
    apiFetch<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(
      `/superadmin/classes?page=${page}&limit=${limit}`
    ),

  /** DELETE /api/v1/superadmin/classes/:id – Hapus kelas */
  deleteClass: (id: string) =>
    apiFetch<{ message: string }>(`/superadmin/classes/${id}`, { method: 'DELETE' }),

  /** GET /api/v1/superadmin/forum-stats – Statistik forum */
  getForumStats: () => apiFetch<any>('/superadmin/forum-stats'),

  /** GET /api/v1/superadmin/academic-stats – Statistik akademik */
  getAcademicStats: () => apiFetch<any>('/superadmin/academic-stats'),

  /** GET /api/v1/superadmin/duit-tracker-stats – Statistik duit tracker */
  getDuitTrackerStats: () => apiFetch<any>('/superadmin/duit-tracker-stats'),

  /** GET /api/v1/superadmin/gamification-stats – Statistik gamifikasi */
  getGamificationStats: () => apiFetch<any>('/superadmin/gamification-stats'),

  /** GET /api/v1/superadmin/qna-stats – Statistik Q&A */
  getQnaStats: () => apiFetch<any>('/superadmin/qna-stats'),

  /** GET /api/v1/superadmin/system-stats – Statistik sistem */
  getSystemStats: () => apiFetch<any>('/superadmin/system-stats'),
};
