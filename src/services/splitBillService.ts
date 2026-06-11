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
}

export interface SplitBill {
  id: string;
  userId: string;
  eventName: string | null;
  totalAmount: number;
  receiptImageUrl: string | null;
  status: 'settling' | 'done';
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

export const splitBillService = {
  scanReceipt: (imageBase64: string, mimeType: string) =>
    apiFetch<ReceiptScanResult>('/split-bill/scan-receipt', { method: 'POST', body: JSON.stringify({ imageBase64, mimeType }) }),

  create: (data: { eventName?: string; items: { name: string; price: number; quantity?: number }[]; participants: string[] }) =>
    apiFetch<SplitBill>('/split-bill', { method: 'POST', body: JSON.stringify(data) }),

  getAll: () => apiFetch<SplitBill[]>('/split-bill'),

  getById: (id: string) => apiFetch<SplitBill>(`/split-bill/${id}`),

  assignItem: (itemId: string, participantIds: string[]) =>
    apiFetch<SplitBill>(`/split-bill/items/${itemId}/assign`, { method: 'PATCH', body: JSON.stringify({ participantIds }) }),

  markPaid: (participantId: string) =>
    apiFetch<SplitBill>(`/split-bill/participants/${participantId}/paid`, { method: 'PATCH' }),

  getWhatsAppMessage: (billId: string, participantId: string) =>
    apiFetch<{ message: string; whatsappUrl: string }>(`/split-bill/${billId}/wa-message/${participantId}`),

  delete: (id: string) =>
    apiFetch(`/split-bill/${id}`, { method: 'DELETE' }),
};
