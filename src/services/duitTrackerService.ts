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
  receiptBatchId?: string;
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

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  category: string;
  dueDay: number;
  isActive: boolean;
  lastPaidAt?: string;
  lastPaidFor?: string;
  notes?: string;
  isPaidThisMonth?: boolean;
  isDueSoon?: boolean;
}

export interface FinancialOverview {
  unpaidBills: { id: string; name: string; amount: number; dueDay: number }[];
  totalUnpaidBills: number;
  debtsOwed: { id: string; description: string; amount: number; personName: string }[];
  totalDebtOwed: number;
  debtsLent: { id: string; description: string; amount: number; personName: string }[];
  totalDebtLent: number;
}

export interface WishlistItem {
  id: string;
  name: string;
  estimatedPrice: number;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  targetDate?: string;
  notes?: string;
  url?: string;
  isPurchased: boolean;
  purchasedAt?: string;
  linkedTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetChallenge {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: string; // daily_limit, weekly_limit, no_spend_day, category_limit
  targetAmount?: number;
  targetDays: number;
  category?: string;
  startDate: string;
  endDate: string;
  currentStreak: number;
  bestStreak: number;
  isActive: boolean;
  completedDays: number;
  failedDays: number;
  createdAt: string;
}

export interface CustomCategory {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  type: string;
  color?: string;
  sortOrder: number;
}

export interface SpendingComparison {
  userTotal: number;
  avgTotal: number;
  percentile: number;
  totalUsers: number;
  categoryComparison: { category: string; userAmount: number; avgAmount: number; diff: number }[];
}

export interface FinancialForecast {
  hasEnoughData: boolean;
  avgIncome?: number;
  avgExpense?: number;
  avgSaving?: number;
  thisMonthExpense?: number;
  thisMonthIncome?: number;
  projectedMonthExpense?: number;
  dailyBurnRate?: number;
  survivalDays?: number;
  daysRemaining?: number;
  wishlistForecast?: { name: string; price: number; monthsNeeded: number | null; targetDate: string | null }[];
}

export interface SmartReminders {
  dueBills: { id: string; name: string; amount: number; dueDay: number; daysUntilDue: number; isOverdue: boolean }[];
  dueDebts: { id: string; description: string; amount: number; personName: string; debtType: string; dueDate?: string; daysUntilDue: number | null; isOverdue: boolean }[];
  dailySpending: { today: number; average: number; isAboveAverage: boolean };
}

export const duitTrackerService = {
  // Transactions
  createTransaction: (data: Partial<Transaction>) =>
    apiFetch<Transaction>('/duit-tracker/transactions', { method: 'POST', body: JSON.stringify(data) }),

  getTransactions: async (params?: { month?: number; year?: number; category?: string; type?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.month) q.set('month', String(params.month));
    if (params?.year) q.set('year', String(params.year));
    if (params?.category) q.set('category', params.category);
    if (params?.type) q.set('type', params.type);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const res = await apiFetch<any>(`/duit-tracker/transactions?${q.toString()}`);
    if (Array.isArray(res)) {
      return {
        data: res,
        total: res.length,
        page: params?.page || 1,
        limit: params?.limit || 30,
        totalPages: 1,
      };
    }
    return res || { data: [], total: 0, page: 1, limit: 30, totalPages: 1 };
  },

  deleteTransaction: (id: string) =>
    apiFetch(`/duit-tracker/transactions/${id}`, { method: 'DELETE' }),

  updateTransaction: (id: string, data: Partial<Transaction>) =>
    apiFetch<Transaction>(`/duit-tracker/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  generateComment: (id: string) =>
    apiFetch<Transaction>(`/duit-tracker/transactions/${id}/comment`, { method: 'POST' }),

  getSummary: (month: number, year: number) =>
    apiFetch<Summary>(`/duit-tracker/summary?month=${month}&year=${year}`),

  // Budgets
  setBudget: (data: { category: string; amount: number; month: number; year: number }) =>
    apiFetch<CategoryBudget>('/duit-tracker/budgets', { method: 'POST', body: JSON.stringify(data) }),

  getBudgets: (month: number, year: number) =>
    apiFetch<CategoryBudget[]>(`/duit-tracker/budgets?month=${month}&year=${year}`),

  deleteBudget: (id: string) =>
    apiFetch(`/duit-tracker/budgets/${id}`, { method: 'DELETE' }),

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

  // Receipt Scan
  scanReceipt: (base64: string, mimeType: string) =>
    apiFetch<any>('/duit-tracker/scan-receipt', { method: 'POST', body: JSON.stringify({ base64, mimeType }) }),

  // Debt/Hutang
  getDebts: (isPaid?: boolean) =>
    apiFetch<any[]>(`/duit-tracker/debts${isPaid !== undefined ? `?isPaid=${isPaid}` : ''}`),

  createDebt: (data: { description: string; amount: number; debtType: string; personName: string; dueDate?: string }) =>
    apiFetch<any>('/duit-tracker/debts', { method: 'POST', body: JSON.stringify(data) }),

  updateDebt: (id: string, data: { description?: string; amount?: number; debtType?: string; personName?: string; dueDate?: string }) =>
    apiFetch<any>(`/duit-tracker/debts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteDebt: (id: string) =>
    apiFetch(`/duit-tracker/debts/${id}`, { method: 'DELETE' }),

  markDebtPaid: (id: string) =>
    apiFetch<any>(`/duit-tracker/debts/${id}/pay`, { method: 'POST' }),

  // Recurring Bills / Tagihan
  getBills: () => apiFetch<RecurringBill[]>('/duit-tracker/bills'),

  createBill: (data: { name: string; amount: number; dueDay: number; category?: string; notes?: string }) =>
    apiFetch<RecurringBill>('/duit-tracker/bills', { method: 'POST', body: JSON.stringify(data) }),

  updateBill: (id: string, data: { name?: string; amount?: number; dueDay?: number; isActive?: boolean; notes?: string }) =>
    apiFetch<RecurringBill>(`/duit-tracker/bills/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteBill: (id: string) =>
    apiFetch(`/duit-tracker/bills/${id}`, { method: 'DELETE' }),

  markBillPaid: (id: string) =>
    apiFetch<any>(`/duit-tracker/bills/${id}/pay`, { method: 'POST' }),

  // Financial Overview
  getFinancialOverview: () => apiFetch<FinancialOverview>('/duit-tracker/financial-overview'),

  // Wishlist / Rencana Belanja
  getWishlist: () => apiFetch<WishlistItem[]>('/duit-tracker/wishlist'),

  createWishlistItem: (data: { name: string; estimatedPrice: number; priority?: string; category?: string; targetDate?: string; notes?: string; url?: string }) =>
    apiFetch<WishlistItem>('/duit-tracker/wishlist', { method: 'POST', body: JSON.stringify(data) }),

  updateWishlistItem: (id: string, data: { name?: string; estimatedPrice?: number; priority?: string; category?: string; targetDate?: string; notes?: string; url?: string }) =>
    apiFetch<WishlistItem>(`/duit-tracker/wishlist/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteWishlistItem: (id: string) =>
    apiFetch(`/duit-tracker/wishlist/${id}`, { method: 'DELETE' }),

  markWishlistPurchased: (id: string, linkedTransactionId?: string) =>
    apiFetch<WishlistItem>(`/duit-tracker/wishlist/${id}/purchase`, { method: 'POST', body: JSON.stringify({ linkedTransactionId }) }),

  // Budget Challenges
  getChallenges: () => apiFetch<BudgetChallenge[]>('/duit-tracker/challenges'),

  createChallenge: (data: { title: string; description?: string; type: string; targetAmount?: number; targetDays?: number; category?: string }) =>
    apiFetch<BudgetChallenge>('/duit-tracker/challenges', { method: 'POST', body: JSON.stringify(data) }),

  updateChallengeProgress: (id: string) =>
    apiFetch<BudgetChallenge>(`/duit-tracker/challenges/${id}/progress`, { method: 'POST' }),

  deleteChallenge: (id: string) =>
    apiFetch(`/duit-tracker/challenges/${id}`, { method: 'DELETE' }),

  // Custom Categories
  getCustomCategories: () => apiFetch<CustomCategory[]>('/duit-tracker/categories'),

  createCustomCategory: (data: { name: string; emoji?: string; type?: string; color?: string }) =>
    apiFetch<CustomCategory>('/duit-tracker/categories', { method: 'POST', body: JSON.stringify(data) }),

  updateCustomCategory: (id: string, data: { name?: string; emoji?: string; color?: string; sortOrder?: number }) =>
    apiFetch<CustomCategory>(`/duit-tracker/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteCustomCategory: (id: string) =>
    apiFetch(`/duit-tracker/categories/${id}`, { method: 'DELETE' }),

  // Spending Comparison (Peer)
  getSpendingComparison: () => apiFetch<SpendingComparison>('/duit-tracker/comparison'),

  // Financial Forecast
  getFinancialForecast: () => apiFetch<FinancialForecast>('/duit-tracker/forecast'),

  // CSV Bulk Import
  bulkImport: (transactions: { amount: number; type: string; category: string; label: string; note?: string; date?: string }[]) =>
    apiFetch<{ count: number }>('/duit-tracker/bulk-import', { method: 'POST', body: JSON.stringify({ transactions }) }),

  // Smart Reminders
  getReminders: () => apiFetch<SmartReminders>('/duit-tracker/reminders'),
};
