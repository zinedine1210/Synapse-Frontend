'use client';

import React, { useRef, useState, useMemo } from 'react';
import { BottomSheet, Button, CurrencyInput, TextInput, DateTimePicker, useToast } from '@/components/ui';
import { duitTrackerService, Transaction } from '@/services/duitTrackerService';
import { Loader2, Sparkles, Camera, Send, Image } from 'lucide-react';

export interface TxForm {
  amount: string;
  type: string;
  category: string;
  label: string;
  note: string;
  date: string;
}


interface CategoryDef {
  id: string;
  emoji: string;
  label: string;
}

interface TransactionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  form: TxForm;
  setForm: (f: TxForm) => void;
  editingTx: Transaction | null;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  expenseCategories: CategoryDef[];
  incomeCategories: CategoryDef[];
}

/**
 * TransactionSheet — attractive, low-friction add/edit transaction experience.
 * Uses BottomSheet (slides up on mobile <640px, centered modal on desktop).
 * Features: inline AI natural-language quick fill, receipt scan, large amount
 * input, income/expense toggle, emoji category chips, optional note + date.
 */
export function TransactionSheet({
  isOpen,
  onClose,
  form,
  setForm,
  editingTx,
  submitting,
  onSubmit,
  expenseCategories,
  incomeCategories,
}: TransactionSheetProps) {
  const { showToast } = useToast();
  const [quickText, setQuickText] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);

  const categories = form.type === 'income' ? incomeCategories : expenseCategories;
  const isIncome = form.type === 'income';
  const accent = isIncome ? 'var(--dt-income)' : 'var(--dt-expense)';

  const handleQuickParse = async () => {
    if (!quickText.trim() || quickLoading) return;
    setQuickLoading(true);
    try {
      const p = await duitTrackerService.parseNaturalInput(quickText.trim());
      if (p.amount) {
        setForm({
          amount: String(p.amount),
          type: p.type || 'expense',
          category: p.category || 'lainnya',
          label: p.label || quickText.trim(),
          note: p.note || '',
          date: '',
        });
        setQuickText('');
        showToast('Terisi otomatis dari AI! ✨', 'success');
      } else {
        showToast('Gagal memparse input.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Gagal memparse input.', 'error');
    } finally {
      setQuickLoading(false);
    }
  };


  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingTx ? '✏️ Edit Transaksi' : '💰 Tambah Transaksi'}
    >

      {/* Inline AI quick fill (front & center) */}
      {!editingTx && (
        <div className="tx-sheet__ai">
          <Sparkles size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
          <input
            className="tx-sheet__ai-input"
            placeholder="Ketik cepat: kopi 25rb, grab 12k..."
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickParse();
              }
            }}
            aria-label="Input cepat bahasa natural"
          />
          <button
            type="button"
            onClick={handleQuickParse}
            disabled={!quickText.trim() || quickLoading}
            className="tx-sheet__ai-btn"
            aria-label="Isi otomatis dengan AI"
          >
            {quickLoading ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Type toggle */}
        <div className="tx-sheet__toggle">
          <button
            type="button"
            onClick={() => setForm({ ...form, type: 'expense', category: expenseCategories[0].id })}
            className="tx-sheet__toggle-btn"
            style={{
              background: !isIncome ? 'var(--card-bg)' : 'transparent',
              color: !isIncome ? 'var(--dt-expense)' : 'inherit',
              boxShadow: !isIncome ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            ↓ Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, type: 'income', category: incomeCategories[0].id })}
            className="tx-sheet__toggle-btn"
            style={{
              background: isIncome ? 'var(--card-bg)' : 'transparent',
              color: isIncome ? 'var(--dt-income)' : 'inherit',
              boxShadow: isIncome ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            ↑ Pemasukan
          </button>
        </div>

        {/* Large amount input */}
        <div className="tx-sheet__amount" style={{ borderColor: accent }}>
          <span className="tx-sheet__amount-label" style={{ color: accent }}>
            {isIncome ? 'Jumlah masuk' : 'Jumlah keluar'}
          </span>
          <CurrencyInput
            value={form.amount}
            onChange={(val) => setForm({ ...form, amount: val })}
            placeholder="0"
            className="tx-sheet__currency"
          />
        </div>

        {/* Label */}
        <TextInput
          label="Keterangan"
          placeholder="Kopi, makan siang, gajian..."
          value={form.label}
          onChange={(v) => setForm({ ...form, label: v })}
          required
        />

        {/* Category chips */}
        <div>
          <label className="tx-sheet__label">Kategori</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {categories.map((c) => {
              const active = form.category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setForm({ ...form, category: c.id })}
                  className="tx-sheet__chip"
                  style={{
                    fontWeight: active ? 700 : 500,
                    background: active ? 'rgba(var(--color-primary), 0.12)' : 'var(--input-bg)',
                    color: active ? 'rgb(var(--color-primary))' : 'inherit',
                    outline: active ? '2px solid rgb(var(--color-primary))' : 'none',
                    outlineOffset: -1,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{c.emoji}</span> {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Note + date row */}
        <div className="tx-sheet__row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <TextInput
              label="Catatan (opsional)"
              placeholder="Detail tambahan..."
              value={form.note}
              onChange={(v) => setForm({ ...form, note: v })}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label className="tx-sheet__label">Tanggal</label>
            <DateTimePicker
              mode="date"
              value={form.date}
              onChange={(v) => setForm({ ...form, date: v })}
              placeholder="Hari ini"
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>

          <Button
            type="submit"
            disabled={submitting}
            style={{ borderRadius: 12, padding: '12px 0', flex: 1 }}
          >
            {submitting ? (
              <Loader2 className="spin" size={16} />
            ) : editingTx ? (
              'Simpan Perubahan'
            ) : (
              '💾 Simpan Transaksi'
            )}
          </Button>
        </div>
      </form>

      <style jsx>{`
        .tx-sheet__ai {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 14px;
          margin-bottom: 18px;
          background: linear-gradient(135deg, rgba(var(--color-primary), 0.1), rgba(var(--color-primary), 0.03));
          border: 1px solid rgba(var(--color-primary), 0.2);
        }
        .tx-sheet__ai-input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
          font-weight: 500;
          color: inherit;
          font-family: inherit;
          min-width: 0;
        }
        .tx-sheet__ai-btn {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: none;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #fff;
          background: rgb(var(--color-primary));
          transition: opacity 0.2s, transform 0.15s;
        }
        .tx-sheet__ai-btn:disabled {
          opacity: 0.4;
          cursor: default;
        }
        .tx-sheet__ai-btn:not(:disabled):active {
          transform: scale(0.92);
        }
        .tx-sheet__toggle {
          display: flex;
          gap: 6px;
          padding: 4px;
          border-radius: 12px;
          background: var(--input-bg);
        }
        .tx-sheet__toggle-btn {
          flex: 1;
          padding: 11px 0;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
          transition: all 0.2s;
          color: inherit;
        }
        .tx-sheet__amount {
          border: 2px solid;
          border-radius: 16px;
          padding: 12px 16px 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          transition: border-color 0.25s;
        }
        .tx-sheet__amount-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .tx-sheet__amount :global(.currency-input-field) {
          font-size: 28px;
          font-weight: 800;
          text-align: center;
        }
        .tx-sheet__amount :global(.currency-input-prefix) {
          font-size: 18px;
          font-weight: 700;
          opacity: 0.5;
        }
        .tx-sheet__label {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 6px;
          display: block;
          opacity: 0.6;
        }
        .tx-sheet__chip {
          padding: 8px 13px;
          border-radius: 11px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.18s;
          min-height: 38px;
        }
        .tx-sheet__chip:active {
          transform: scale(0.95);
        }
        .tx-sheet__row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        @media (prefers-reduced-motion: reduce) {
          .tx-sheet__chip,
          .tx-sheet__ai-btn,
          .tx-sheet__toggle-btn,
          .tx-sheet__amount {
            transition: none;
          }
          .tx-sheet__chip:active,
          .tx-sheet__ai-btn:not(:disabled):active {
            transform: none;
          }
        }
        @media (max-width: 640px) {
          .tx-sheet__row {
            flex-direction: column;
          }
        }
      `}</style>
    </BottomSheet>
  );
}
