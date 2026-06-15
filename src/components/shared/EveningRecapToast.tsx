'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useSWR from 'swr';
import { X, TrendingUp } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Transaction } from '@/services/duitTrackerService';
import { PersonalTodo } from '@/services/todoService';
import { useAuth } from '@/lib/AuthContext';

// --- Helpers ---

function getLocalStorageKey(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `recap_shown_${yyyy}-${mm}-${dd}`;
}

function isEveningTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 18 && hour <= 23;
}

function isSameDay(dateStr: string): boolean {
  const txDate = new Date(dateStr);
  const now = new Date();
  return (
    txDate.getFullYear() === now.getFullYear() &&
    txDate.getMonth() === now.getMonth() &&
    txDate.getDate() === now.getDate()
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount);
}

// --- SWR Fetchers ---

const fetchTransactions = async (): Promise<Transaction[]> => {
  const now = new Date();
  const res = await apiFetch<{ data: Transaction[] }>(
    `/duit-tracker/transactions?month=${now.getMonth() + 1}&year=${now.getFullYear()}&limit=100`
  );
  return Array.isArray(res) ? res : (res?.data ?? []);
};

const fetchTodos = async (): Promise<PersonalTodo[]> => {
  const res = await apiFetch<{ data: PersonalTodo[] }>('/todos?limit=100');
  return Array.isArray(res) ? res : (res?.data ?? []);
};

// --- Component ---

export function EveningRecapToast() {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useAuth();
  const [visible, setVisible] = useState(false);
  const [recapMessage, setRecapMessage] = useState('');

  // Skip fetching on public pages (auth, landing)
  const isPublicPage = pathname === '/' || pathname === '/auth' || pathname.startsWith('/auth/');
  const shouldFetch = session && !isPublicPage;

  // Only fetch when user is logged in and on app pages
  const { data: transactions } = useSWR<Transaction[]>(
    shouldFetch ? '/duit-tracker/transactions' : null,
    fetchTransactions,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );

  const { data: todos } = useSWR<PersonalTodo[]>(
    shouldFetch ? '/todos' : null,
    fetchTodos,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(getLocalStorageKey(), 'true');
  }, []);

  const goToInsight = useCallback(() => {
    dismiss();
    router.push('/insight');
  }, [dismiss, router]);

  useEffect(() => {
    // Check conditions
    if (!isEveningTime()) return;
    if (localStorage.getItem(getLocalStorageKey()) === 'true') return;
    if (!transactions || !todos) return;

    // Compute today's totals
    const todayExpenses = transactions.filter(
      (t) => t.type === 'expense' && isSameDay(t.date || t.createdAt)
    );
    const totalExpense = todayExpenses.reduce((sum, t) => sum + t.amount, 0);

    const todayTodos = todos.filter((t) => isSameDay(t.createdAt) || (t.dueDate && isSameDay(t.dueDate)));
    const doneTodos = todayTodos.filter((t) => t.status === 'done');
    const doneCount = doneTodos.length;
    const totalCount = todayTodos.length;

    // Req 7.5: Skip if no activity
    if (totalExpense === 0 && doneCount === 0 && totalCount === 0) return;

    // Format message (Req 7.2)
    const message = `Hari ini: Rp ${formatCurrency(totalExpense)} keluar, ${doneCount}/${totalCount} todo selesai`;
    setRecapMessage(message);
    setVisible(true);

    // Mark as shown (Req 7.3)
    localStorage.setItem(getLocalStorageKey(), 'true');
  }, [transactions, todos]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9998,
        maxWidth: '400px',
        width: 'calc(100% - 2rem)',
        padding: '1rem 1.25rem',
        borderRadius: '16px',
        background: 'var(--modal-bg, rgba(30, 30, 40, 0.95))',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(var(--color-info, 100, 200, 255) / 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        color: 'rgb(var(--text-primary, 255, 255, 255))',
        animation: 'recap-toast-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div
          style={{
            flexShrink: 0,
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(139, 92, 246, 0.2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TrendingUp size={16} style={{ color: 'rgb(0, 212, 255)' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'rgb(var(--text-muted, 160, 160, 180))',
              marginBottom: '0.25rem',
            }}
          >
            Rekap Harian
          </div>
          <div
            style={{
              fontSize: 'var(--font-sm, 0.875rem)',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {recapMessage}
          </div>

          <button
            onClick={goToInsight}
            style={{
              marginTop: '0.75rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(139, 92, 246, 0.15))',
              color: 'rgb(0, 212, 255)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Lihat Insight →
          </button>
        </div>

        <button
          onClick={dismiss}
          aria-label="Tutup rekap"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgb(var(--text-muted, 160, 160, 180))',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgb(var(--text-primary, 255, 255, 255))')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgb(var(--text-muted, 160, 160, 180))')}
        >
          <X size={16} />
        </button>
      </div>

      <style jsx global>{`
        @keyframes recap-toast-enter {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes recap-toast-enter {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        }
      `}</style>
    </div>
  );
}
