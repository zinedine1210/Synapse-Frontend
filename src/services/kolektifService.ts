import { apiFetch } from '@/lib/api';

export interface KolektifTransaction {
  id: string;
  kolektifId: string;
  userId: string;
  amount: number;
  type: 'IN' | 'OUT';
  description?: string;
  createdAt: string;
  user: { id: string; fullName: string; avatarUrl?: string };
}

export interface Kolektif {
  id: string;
  classId: string;
  name: string;
  description?: string;
  targetAmount?: number;
  targetPerPerson?: number;
  balance: number;
  totalIn: number;
  totalOut: number;
  createdAt: string;
  transactions: KolektifTransaction[];
}

export const kolektifService = {
  getAll: (classId: string) =>
    apiFetch<Kolektif[]>(`/kolektif/class/${classId}`),

  create: (classId: string, data: { name: string; description?: string; targetAmount?: number; targetPerPerson?: number }) =>
    apiFetch<Kolektif>(`/kolektif/class/${classId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSummaryByUser: (kolektifId: string) =>
    apiFetch<{
      kolektif: Kolektif;
      summary: Array<{
        user: { id: string; fullName: string; avatarUrl?: string; email: string };
        role: string;
        totalIn: number;
        totalOut: number;
        balance: number;
        status: 'LUNAS' | 'KURANG' | 'BELUM_SETOR' | 'PARTISIPASI';
        diff: number;
      }>;
      targetPerPerson: number;
    }>(`/kolektif/${kolektifId}/summary-by-user`),

  setTargetPerPerson: (kolektifId: string, targetPerPerson: number) =>
    apiFetch<Kolektif>(`/kolektif/${kolektifId}/target`, {
      method: 'PATCH',
      body: JSON.stringify({ targetPerPerson }),
    }),

  addTransaction: (kolektifId: string, data: { amount: number; type: 'IN' | 'OUT'; description?: string; targetUserId?: string }) =>
    apiFetch<KolektifTransaction>(`/kolektif/${kolektifId}/transaction`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteTransaction: (txId: string) =>
    apiFetch<{ message: string }>(`/kolektif/transaction/${txId}`, { method: 'DELETE' }),

  deleteFund: (kolektifId: string) =>
    apiFetch<{ message: string }>(`/kolektif/${kolektifId}`, { method: 'DELETE' }),
};
