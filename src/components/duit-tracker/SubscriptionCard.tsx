'use client';

import React, { useState, useMemo } from 'react';
import { Card, useToast } from '@/components/ui';
import { Transaction } from '@/services/duitTrackerService';
import {
  detectRecurringSubscriptions,
  dismissPattern,
  hasEnoughHistory,
  DetectedSubscription,
  SubscriptionSummary,
} from '@/services/subscriptionDetector';
import { apiFetch } from '@/lib/api';
import { X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface SubscriptionCardProps {
  /** All transactions (across multiple months) for detection */
  transactions: Transaction[];
  /** Callback when a subscription is dismissed (to refresh state) */
  onDismiss?: () => void;
  /** Category emoji lookup */
  getCategoryEmoji?: (categoryId: string) => string;
}

const EXPENSE_CATEGORIES: Record<string, string> = {
  makanan: '🍛',
  minuman: '☕',
  transportasi: '🚗',
  belanja: '🛒',
  hiburan: '🎮',
  tagihan: '💡',
  kesehatan: '💊',
  pendidikan: '📚',
  kos: '🏠',
  lainnya: '📦',
};

function defaultCategoryEmoji(category: string): string {
  return EXPENSE_CATEGORIES[category] || '📦';
}

function formatCurrency(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

/**
 * SubscriptionCard — "Bocor Halus" recurring subscription summary
 *
 * Displays detected recurring subscriptions with total monthly/yearly cost.
 * Allows dismissing false positives (persisted to backend + localStorage).
 * Hidden when user has < 10 transactions or < 2 months of history.
 */
export function SubscriptionCard({
  transactions,
  onDismiss,
  getCategoryEmoji,
}: SubscriptionCardProps) {
  const { showToast } = useToast();
  const [dismissedLocal, setDismissedLocal] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [dismissingKey, setDismissingKey] = useState<string | null>(null);

  const getEmoji = getCategoryEmoji || defaultCategoryEmoji;

  // Check eligibility: >= 10 transactions AND >= 2 months history
  const eligible = useMemo(() => hasEnoughHistory(transactions), [transactions]);

  // Detect subscriptions
  const summary: SubscriptionSummary = useMemo(() => {
    if (!eligible) return { totalMonthly: 0, totalYearly: 0, items: [] };
    return detectRecurringSubscriptions(transactions);
  }, [transactions, eligible]);

  // Filter out locally dismissed (for instant UI feedback before refresh)
  const visibleItems = useMemo(
    () => summary.items.filter((item) => !dismissedLocal.includes(item.patternKey)),
    [summary.items, dismissedLocal],
  );

  // Don't render if not eligible or no subscriptions detected
  if (!eligible || visibleItems.length === 0) {
    return null;
  }

  const totalMonthly = visibleItems.reduce((s, d) => s + d.averageAmount, 0);
  const totalYearly = totalMonthly * 12;

  const handleDismiss = async (item: DetectedSubscription) => {
    setDismissingKey(item.patternKey);
    try {
      // Persist to backend
      await apiFetch('/duit-tracker/dismiss-subscription', {
        method: 'POST',
        body: JSON.stringify({ pattern: item.patternKey }),
      });

      // Persist to localStorage
      dismissPattern(item.patternKey);

      // Update local state for instant UI
      setDismissedLocal((prev) => [...prev, item.patternKey]);

      showToast(`"${item.label}" dihapus dari deteksi langganan`, 'success');
      onDismiss?.();
    } catch {
      showToast('Gagal menghapus. Coba lagi.', 'error');
    } finally {
      setDismissingKey(null);
    }
  };

  const displayedItems = expanded ? visibleItems : visibleItems.slice(0, 3);
  const hasMore = visibleItems.length > 3;

  return (
    <Card
      style={{
        padding: '20px 22px',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        background:
          'linear-gradient(135deg, rgba(245, 158, 11, 0.03) 0%, rgba(239, 68, 68, 0.02) 100%)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 20 }}>🔄</span>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
            Bocor Halus Terdeteksi
          </h3>
          <p
            style={{
              fontSize: 12,
              opacity: 0.5,
              margin: '2px 0 0',
            }}
          >
            Pengeluaran rutin yang mungkin kamu tidak sadar
          </p>
        </div>
        <AlertTriangle size={16} style={{ color: 'var(--color-warning)', opacity: 0.7 }} />
      </div>

      {/* Subscription items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {displayedItems.map((item) => (
          <div
            key={item.patternKey}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'var(--card-bg)',
              border: '1px solid var(--dt-card-border)',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>
              {getEmoji(item.category)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.label}
              </div>
              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 1 }}>
                {item.occurrences}x terdeteksi
                {item.isKeywordMatch && ' • Keyword match'}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dt-expense)' }}>
                {formatCurrency(item.averageAmount)}
              </div>
              <div style={{ fontSize: 10, opacity: 0.4 }}>/bulan</div>
            </div>
            <button
              onClick={() => handleDismiss(item)}
              disabled={dismissingKey === item.patternKey}
              title="Bukan langganan — hapus dari deteksi"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 6,
                opacity: dismissingKey === item.patternKey ? 0.3 : 0.4,
                transition: 'opacity 0.2s',
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Show more/less toggle */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            width: '100%',
            padding: '6px 0',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            opacity: 0.6,
            color: 'inherit',
            marginBottom: 12,
          }}
        >
          {expanded ? (
            <>
              Tampilkan lebih sedikit <ChevronUp size={14} />
            </>
          ) : (
            <>
              Lihat semua ({visibleItems.length}) <ChevronDown size={14} />
            </>
          )}
        </button>
      )}

      {/* Summary */}
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 12,
          background: 'rgba(245, 158, 11, 0.06)',
          border: '1px solid rgba(245, 158, 11, 0.1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            Total &ldquo;bocor halus&rdquo;
          </span>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--dt-expense)' }}>
            {formatCurrency(totalMonthly)}/bulan
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 12, opacity: 0.5 }}>Proyeksi setahun</span>
          <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.8 }}>
            = {formatCurrency(totalYearly)}/tahun 😱
          </span>
        </div>
        <p
          style={{
            marginTop: 8,
            fontSize: 12,
            opacity: 0.55,
            lineHeight: 1.4,
            margin: '8px 0 0',
          }}
        >
          Kamu sadar gak kalau setahun kamu bayar segitu buat ini? Klik ✕ kalau bukan langganan.
        </p>
      </div>
    </Card>
  );
}
