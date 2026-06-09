import { apiFetch } from '@/lib/api';

export const superadminService = {
  /** GET /api/v1/superadmin/analytics – Ambil data analitik server */
  getAnalytics: () => apiFetch<any>('/superadmin/analytics'),

  /** GET /api/v1/superadmin/users – Ambil daftar semua pengguna */
  getUsers: () => apiFetch<any[]>('/superadmin/users'),

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

  /** GET /api/v1/superadmin/classes – Semua kelas di sistem */
  getAllClasses: () => apiFetch<any[]>('/superadmin/classes'),

  /** DELETE /api/v1/superadmin/classes/:id – Hapus kelas */
  deleteClass: (id: string) =>
    apiFetch<{ message: string }>(`/superadmin/classes/${id}`, { method: 'DELETE' }),

  /** GET /api/v1/superadmin/forum-stats – Statistik forum */
  getForumStats: () => apiFetch<any>('/superadmin/forum-stats'),
};
