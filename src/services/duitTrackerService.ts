import { apiFetch } from '@/lib/api';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  subcategory?: string;
  label: string;
  note?: string;
  inputMethod: string;
  receiptImageUrl?: string;
  bawelComment?: string;
  bawelLevel?: string;
  linkedTreeId?: string;
  date: string;
  createdAt: string;
}

export interface CategoryBudget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  month: number;
  year: number;
}

export interface SavingTree {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  treeType: string;
  transactions: TreeTransaction[];
}

export interface TreeTransaction {
  id: string;
  treeId: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  note?: string;
  date: string;
}

export interface Summary {
  month: number;
  year: number;
  income: number;
  expense: number;
  balance: number;
  transactionCount: number;
  categoryReport: { category: string; spent: number; budget: number | null; percentage: number | null }[];
}

export const duitTrackerService = {
  // Transactions
  createTransaction: (data: Partial<Transaction>) =>
    apiFetch<Transaction>('/duit-tracker/transactions', { method: 'POST', body: JSON.stringify(data) }),

  getTransactions: (params?: { month?: number; year?: number; category?: string; type?: string }) => {
    const q = new URLSearchParams();
    if (params?.month) q.set('month', String(params.month));
    if (params?.year) q.set('year', String(params.year));
    if (params?.category) q.set('category', params.category);
    if (params?.type) q.set('type', params.type);
    return apiFetch<Transaction[]>(`/duit-tracker/transactions?${q.toString()}`);
  },

  deleteTransaction: (id: string) =>
    apiFetch(`/duit-tracker/transactions/${id}`, { method: 'DELETE' }),

  updateTransaction: (id: string, data: Partial<Transaction>) =>
    apiFetch<Transaction>(`/duit-tracker/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getSummary: (month: number, year: number) =>
    apiFetch<Summary>(`/duit-tracker/summary?month=${month}&year=${year}`),

  // Budgets
  setBudget: (data: { category: string; amount: number; month: number; year: number }) =>
    apiFetch<CategoryBudget>('/duit-tracker/budgets', { method: 'POST', body: JSON.stringify(data) }),

  getBudgets: (month: number, year: number) =>
    apiFetch<CategoryBudget[]>(`/duit-tracker/budgets?month=${month}&year=${year}`),

  // Trees
  createTree: (data: { name: string; targetAmount: number; deadline?: string; treeType?: string }) =>
    apiFetch<SavingTree>('/duit-tracker/trees', { method: 'POST', body: JSON.stringify(data) }),

  getTrees: () => apiFetch<SavingTree[]>('/duit-tracker/trees'),

  addTreeTransaction: (treeId: string, data: { amount: number; type: string; note?: string }) =>
    apiFetch<TreeTransaction>(`/duit-tracker/trees/${treeId}/transactions`, { method: 'POST', body: JSON.stringify(data) }),

  deleteTree: (treeId: string) =>
    apiFetch(`/duit-tracker/trees/${treeId}`, { method: 'DELETE' }),

  updateTree: (treeId: string, data: { name?: string; targetAmount?: number; deadline?: string; treeType?: string }) =>
    apiFetch<SavingTree>(`/duit-tracker/trees/${treeId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // AI Parse
  parseNaturalInput: (text: string) =>
    apiFetch<any>('/duit-tracker/parse', { method: 'POST', body: JSON.stringify({ text }) }),
};
