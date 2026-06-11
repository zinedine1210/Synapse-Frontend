import { apiFetch } from '@/lib/api';

export interface SplitBillItem {
  id: string;
  billId: string;
  name: string;
  price: number;
  quantity: number;
  assignedTo: string[];
}

export interface SplitParticipant {
  id: string;
  billId: string;
  name: string;
  totalOwed: number;
  isPaid: boolean;
  percentage?: number | null;
}

export interface SplitBill {
  id: string;
  userId: string;
  eventName: string | null;
  totalAmount: number;
  receiptImageUrl: string | null;
  status: 'settling' | 'done';
  splitMethod: 'item' | 'percentage';
  createdAt: string;
  items: SplitBillItem[];
  participants: SplitParticipant[];
}

export interface ReceiptScanResult {
  storeName?: string;
  date?: string;
  items: { name: string; price: number; quantity: number }[];
  subtotal?: number;
  tax?: number;
  total?: number;
  paymentMethod?: string;
  error?: string;
}

export interface SplittableTransaction {
  id: string;
  label: string;
  amount: number;
  category: string;
  date: string;
  suggestedReason: string;
}

export interface HistorySummaryEntry {
  name: string;
  totalOwed: number;
  totalPaid: number;
  outstanding: number;
}

export const splitBillService = {
  scanReceipt: (imageBase64: string, mimeType: string) =>
    apiFetch<ReceiptScanResult>('/split-bill/scan-receipt', { method: 'POST', body: JSON.stringify({ imageBase64, mimeType }) }),

  create: (data: {
    eventName?: string;
    splitMethod?: 'item' | 'percentage';
    items: { name: string; price: number; quantity?: number }[];
    participants: string[];
    percentages?: Record<string, number>;
  }) =>
    apiFetch<SplitBill>('/split-bill', { method: 'POST', body: JSON.stringify(data) }),

  getAll: () => apiFetch<SplitBill[]>('/split-bill'),

  getById: (id: string) => apiFetch<SplitBill>(`/split-bill/${id}`),

  assignItem: (itemId: string, participantIds: string[]) =>
    apiFetch<SplitBill>(`/split-bill/items/${itemId}/assign`, { method: 'PATCH', body: JSON.stringify({ participantIds }) }),

  markPaid: (billId: string, participantId: string) =>
    apiFetch<SplitBill>(`/split-bill/${billId}/participants/${participantId}/paid`, { method: 'PATCH' }),

  getWhatsAppMessage: (billId: string, participantId: string) =>
    apiFetch<{ message: string; whatsappUrl: string }>(`/split-bill/${billId}/wa-message/${participantId}`),

  delete: (id: string) =>
    apiFetch(`/split-bill/${id}`, { method: 'DELETE' }),

  /** Detect potential split-worthy transactions from recent Duit Tracker expenses */
  detectSplittable: () =>
    apiFetch<SplittableTransaction[]>('/split-bill/detect-splittable', { method: 'POST' }),

  /** Get historical debt/credit summary with friends */
  getHistorySummary: () =>
    apiFetch<HistorySummaryEntry[]>('/split-bill/history-summary'),
};
