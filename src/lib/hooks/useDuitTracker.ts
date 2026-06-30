'use client';

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  duitTrackerService, Transaction, Summary, SavingTree, CategoryBudget,
  FinancialOverview, RecurringBill, WishlistItem, BudgetChallenge,
  CustomCategory, FinancialForecast, SpendingComparison, SmartReminders,
} from '@/services/duitTrackerService';
import { siBawelService, BawelSetting } from '@/services/siBawelService';

// ─── Query Keys ─────────────────────────────────────────────
export const dtKeys = {
  all: ['duit-tracker'] as const,
  transactions: (params: Record<string, any>) => ['duit-tracker', 'transactions', params] as const,
  summary: (month: number, year: number) => ['duit-tracker', 'summary', month, year] as const,
  trees: () => ['duit-tracker', 'trees'] as const,
  budgets: (month: number, year: number) => ['duit-tracker', 'budgets', month, year] as const,
  overview: () => ['duit-tracker', 'overview'] as const,
  bills: () => ['duit-tracker', 'bills'] as const,
  billHistory: (id: string) => ['duit-tracker', 'bill-history', id] as const,
  debts: (filter?: string) => ['duit-tracker', 'debts', filter] as const,
  wishlist: () => ['duit-tracker', 'wishlist'] as const,
  challenges: () => ['duit-tracker', 'challenges'] as const,
  customCategories: () => ['duit-tracker', 'custom-categories'] as const,
  forecast: () => ['duit-tracker', 'forecast'] as const,
  comparison: () => ['duit-tracker', 'comparison'] as const,
  reminders: () => ['duit-tracker', 'reminders'] as const,
  bawelSetting: () => ['duit-tracker', 'bawel-setting'] as const,
};

// ─── Transactions (Infinite Query) ──────────────────────────
export function useTransactions(params: Record<string, any>) {
  return useInfiniteQuery({
    queryKey: dtKeys.transactions(params),
    queryFn: async ({ pageParam = 1 }) => {
      return duitTrackerService.getTransactions({ ...params, page: pageParam, limit: 30 });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) return lastPage.page + 1;
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 30_000,
  });
}

// ─── Summary ────────────────────────────────────────────────
export function useSummary(month: number, year: number) {
  return useQuery({
    queryKey: dtKeys.summary(month, year),
    queryFn: () => duitTrackerService.getSummary(month, year),
    staleTime: 60_000,
  });
}

// ─── Trees ──────────────────────────────────────────────────
export function useTrees(enabled = true) {
  return useQuery({
    queryKey: dtKeys.trees(),
    queryFn: () => duitTrackerService.getTrees(),
    staleTime: 60_000,
    enabled,
  });
}

// ─── Budgets ────────────────────────────────────────────────
export function useBudgets(month: number, year: number, enabled = true) {
  return useQuery({
    queryKey: dtKeys.budgets(month, year),
    queryFn: () => duitTrackerService.getBudgets(month, year),
    staleTime: 60_000,
    enabled,
  });
}

// ─── Financial Overview ─────────────────────────────────────
export function useOverview() {
  return useQuery({
    queryKey: dtKeys.overview(),
    queryFn: () => duitTrackerService.getFinancialOverview(),
    staleTime: 60_000,
  });
}

// ─── Bills ──────────────────────────────────────────────────
export function useBills(enabled: boolean) {
  return useQuery({
    queryKey: dtKeys.bills(),
    queryFn: () => duitTrackerService.getBills(),
    enabled,
    staleTime: 60_000,
  });
}

export function useBillHistory(id: string | null) {
  return useQuery({
    queryKey: dtKeys.billHistory(id!),
    queryFn: () => duitTrackerService.getBillHistory(id!),
    enabled: !!id,
  });
}

// ─── Debts ──────────────────────────────────────────────────
export function useDebts(filter: string, enabled: boolean) {
  const isPaid = filter === 'all' ? undefined : filter === 'paid';
  return useQuery({
    queryKey: dtKeys.debts(filter),
    queryFn: () => duitTrackerService.getDebts(isPaid),
    enabled,
    staleTime: 60_000,
  });
}

// ─── Wishlist ───────────────────────────────────────────────
export function useWishlist(enabled: boolean) {
  return useQuery({
    queryKey: dtKeys.wishlist(),
    queryFn: () => duitTrackerService.getWishlist(),
    enabled,
    staleTime: 60_000,
  });
}

// ─── Challenges ─────────────────────────────────────────────
export function useChallenges(enabled = true) {
  return useQuery({
    queryKey: dtKeys.challenges(),
    queryFn: () => duitTrackerService.getChallenges(),
    staleTime: 60_000,
    enabled,
  });
}

// ─── Custom Categories ─────────────────────────────────────
export function useCustomCategories() {
  return useQuery({
    queryKey: dtKeys.customCategories(),
    queryFn: () => duitTrackerService.getCustomCategories(),
    staleTime: 5 * 60_000,
  });
}

// ─── Forecast ───────────────────────────────────────────────
export function useForecast(enabled = true) {
  return useQuery({
    queryKey: dtKeys.forecast(),
    queryFn: () => duitTrackerService.getFinancialForecast(),
    staleTime: 5 * 60_000,
    enabled,
  });
}

// ─── Comparison ─────────────────────────────────────────────
export function useComparison(enabled = true) {
  return useQuery({
    queryKey: dtKeys.comparison(),
    queryFn: () => duitTrackerService.getSpendingComparison(),
    staleTime: 5 * 60_000,
    enabled,
  });
}

// ─── Reminders ──────────────────────────────────────────────
export function useReminders() {
  return useQuery({
    queryKey: dtKeys.reminders(),
    queryFn: () => duitTrackerService.getReminders(),
    staleTime: 60_000,
  });
}

// ─── Bawel Setting ──────────────────────────────────────────
export function useBawelSetting() {
  return useQuery({
    queryKey: dtKeys.bawelSetting(),
    queryFn: () => siBawelService.getSetting(),
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Transaction>) => duitTrackerService.createTransaction(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['duit-tracker', 'transactions'] });
      qc.invalidateQueries({ queryKey: dtKeys.summary(new Date().getMonth() + 1, new Date().getFullYear()) });
      qc.invalidateQueries({ queryKey: dtKeys.overview() });
      qc.invalidateQueries({ queryKey: dtKeys.reminders() });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Transaction> }) => duitTrackerService.updateTransaction(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['duit-tracker', 'transactions'] });
      qc.invalidateQueries({ queryKey: dtKeys.summary(new Date().getMonth() + 1, new Date().getFullYear()) });
      qc.invalidateQueries({ queryKey: dtKeys.overview() });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duitTrackerService.deleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['duit-tracker', 'transactions'] });
      qc.invalidateQueries({ queryKey: dtKeys.summary(new Date().getMonth() + 1, new Date().getFullYear()) });
      qc.invalidateQueries({ queryKey: dtKeys.overview() });
      qc.invalidateQueries({ queryKey: dtKeys.reminders() });
    },
  });
}

export function useCreateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof duitTrackerService.createBill>[0]) => duitTrackerService.createBill(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dtKeys.bills() });
      qc.invalidateQueries({ queryKey: dtKeys.overview() });
      qc.invalidateQueries({ queryKey: dtKeys.reminders() });
    },
  });
}

export function useMarkBillPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duitTrackerService.markBillPaid(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dtKeys.bills() });
      qc.invalidateQueries({ queryKey: dtKeys.overview() });
      qc.invalidateQueries({ queryKey: ['duit-tracker', 'transactions'] });
      qc.invalidateQueries({ queryKey: dtKeys.reminders() });
    },
  });
}

export function useUpdateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof duitTrackerService.updateBill>[1] }) => duitTrackerService.updateBill(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dtKeys.bills() });
      qc.invalidateQueries({ queryKey: dtKeys.overview() });
    },
  });
}

export function useDeleteBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duitTrackerService.deleteBill(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dtKeys.bills() });
      qc.invalidateQueries({ queryKey: dtKeys.overview() });
      qc.invalidateQueries({ queryKey: dtKeys.reminders() });
    },
  });
}

export function useCreateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof duitTrackerService.createDebt>[0]) => duitTrackerService.createDebt(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['duit-tracker', 'debts'] });
      qc.invalidateQueries({ queryKey: dtKeys.overview() });
      qc.invalidateQueries({ queryKey: ['duit-tracker', 'transactions'] });
      qc.invalidateQueries({ queryKey: dtKeys.reminders() });
    },
  });
}

export function useMarkDebtPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duitTrackerService.markDebtPaid(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['duit-tracker', 'debts'] });
      qc.invalidateQueries({ queryKey: dtKeys.overview() });
      qc.invalidateQueries({ queryKey: ['duit-tracker', 'transactions'] });
      qc.invalidateQueries({ queryKey: dtKeys.summary(new Date().getMonth() + 1, new Date().getFullYear()) });
      qc.invalidateQueries({ queryKey: dtKeys.reminders() });
    },
  });
}

export function useDeleteDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duitTrackerService.deleteDebt(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['duit-tracker', 'debts'] });
      qc.invalidateQueries({ queryKey: dtKeys.overview() });
      qc.invalidateQueries({ queryKey: dtKeys.reminders() });
    },
  });
}

export function useCreateWishlistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof duitTrackerService.createWishlistItem>[0]) => duitTrackerService.createWishlistItem(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dtKeys.wishlist() });
    },
  });
}

export function useMarkWishlistPurchased() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duitTrackerService.markWishlistPurchased(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dtKeys.wishlist() });
      qc.invalidateQueries({ queryKey: ['duit-tracker', 'transactions'] });
      qc.invalidateQueries({ queryKey: dtKeys.summary(new Date().getMonth() + 1, new Date().getFullYear()) });
    },
  });
}

export function useDeleteWishlistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duitTrackerService.deleteWishlistItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dtKeys.wishlist() });
    },
  });
}

export function useSetBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof duitTrackerService.setBudget>[0]) => duitTrackerService.setBudget(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: dtKeys.budgets(variables.month, variables.year) });
      qc.invalidateQueries({ queryKey: dtKeys.summary(variables.month, variables.year) });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duitTrackerService.deleteBudget(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['duit-tracker', 'budgets'] });
    },
  });
}

export function useCreateTree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof duitTrackerService.createTree>[0]) => duitTrackerService.createTree(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dtKeys.trees() });
    },
  });
}

export function useAddTreeTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ treeId, data }: { treeId: string; data: Parameters<typeof duitTrackerService.addTreeTransaction>[1] }) =>
      duitTrackerService.addTreeTransaction(treeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dtKeys.trees() });
    },
  });
}

export function useDeleteTree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duitTrackerService.deleteTree(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dtKeys.trees() });
    },
  });
}

export function useUpdateBawelSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BawelSetting>) => siBawelService.updateSetting(data as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dtKeys.bawelSetting() });
    },
  });
}

// ─── Invalidation helper ────────────────────────────────────
export function useInvalidateDuitTracker() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: dtKeys.all });
}
