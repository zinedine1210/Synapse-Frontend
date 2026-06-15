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

export interface ScannedItem {
  label: string;
  amount: number;
  category: string;
  type: string;
  checked: boolean;
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
  onBulkCreate?: (items: ScannedItem[]) => Promise<void>;
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
  onBulkCreate,
  expenseCategories,
  incomeCategories,
}: TransactionSheetProps) {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [quickText, setQuickText] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [savingBulk, setSavingBulk] = useState(false);

  const categories = form.type === 'income' ? incomeCategories : expenseCategories;
  const isIncome = form.type === 'income';
  const accent = isIncome ? 'var(--dt-income)' : 'var(--dt-expense)';
  const checkedCount = useMemo(() => scannedItems.filter(i => i.checked).length, [scannedItems]);
  const allChecked = useMemo(() => scannedItems.length > 0 && scannedItems.every(i => i.checked), [scannedItems]);

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

  const handleReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Format berkas harus berupa gambar.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran gambar maksimal 5MB.', 'error');
      return;
    }
    setScanning(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const clean = base64.split(',')[1];
      const res: any = await duitTrackerService.scanReceipt(clean, file.type);
      const items: any[] = Array.isArray(res) ? res : res?.items ? res.items : res?.error ? [] : [res];
      if (items.length > 0 && (items[0].amount || items[0].total)) {
        const mapped: ScannedItem[] = items.map((it: any) => ({
          label: it.label || it.merchant || 'Item',
          amount: it.amount || it.total || 0,
          category: it.category || 'lainnya',
          type: it.type || 'expense',
          checked: true,
        }));
        setScannedItems(mapped);
        showToast(`${mapped.length} item terdeteksi dari struk! 📸`, 'success');
      } else {
        showToast('Tidak bisa membaca struk. Coba foto lebih jelas.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memindai struk.', 'error');
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  const handleSaveBulk = async () => {
    const selected = scannedItems.filter(it => it.checked);
    if (selected.length === 0) {
      showToast('Pilih minimal 1 item untuk disimpan.', 'error');
      return;
    }
    if (onBulkCreate) {
      setSavingBulk(true);
      try {
        await onBulkCreate(selected);
        setScannedItems([]);
        showToast(`${selected.length} transaksi berhasil disimpan! ✅`, 'success');
      } catch (err: any) {
        showToast(err.message || 'Gagal menyimpan transaksi.', 'error');
      } finally {
        setSavingBulk(false);
      }
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingTx ? '✏️ Edit Transaksi' : '💰 Tambah Transaksi'}
    >
      {/* ── Scanned Items Checklist ── */}
      {scannedItems.length > 0 && (
        <div style={{ marginBottom: 16, padding: 16, borderRadius: 14, background: 'rgba(var(--color-primary), 0.05)', border: '1px solid rgba(var(--color-primary), 0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>📋 Item Terdeteksi ({checkedCount}/{scannedItems.length})</span>
            <button type="button" onClick={() => setScannedItems([])} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgb(var(--text-muted))' }}>Batal</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
            {scannedItems.map((item, idx) => (
              <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: item.checked ? 'rgba(var(--color-secondary), 0.08)' : 'rgba(var(--text-muted), 0.04)', border: item.checked ? '1px solid rgba(var(--color-secondary), 0.2)' : '1px solid transparent', cursor: 'pointer', transition: 'all 0.15s' }}>
                <input type="checkbox" checked={item.checked} onChange={() => setScannedItems(prev => prev.map((it, i) => i === idx ? { ...it, checked: !it.checked } : it))} style={{ accentColor: 'rgb(var(--color-primary))', width: 18, height: 18, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: 'rgb(var(--text-muted))' }}>{item.category}</div>
                </div>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--dt-expense)', flexShrink: 0 }}>Rp {item.amount.toLocaleString('id-ID')}</span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button type="button" variant="secondary" onClick={() => setScannedItems(items => items.map(i => ({ ...i, checked: !allChecked })))} style={{ flex: 1, borderRadius: 10, fontSize: 12, padding: '8px 0' }}>
              {allChecked ? 'Hapus Centang Semua' : 'Pilih Semua'}
            </Button>
            <Button type="button" onClick={handleSaveBulk} disabled={savingBulk || checkedCount === 0} style={{ flex: 2, borderRadius: 10, fontSize: 12, padding: '8px 0' }}>
              {savingBulk ? <Loader2 className="spin" size={14} /> : `💾 Simpan ${checkedCount} Transaksi`}
            </Button>
          </div>
        </div>
      )}

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
          {!editingTx && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleReceipt}
                style={{ display: 'none' }}
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleReceipt}
                style={{ display: 'none' }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => cameraRef.current?.click()}
                disabled={scanning}
                style={{ borderRadius: 12, padding: '12px 16px', flexShrink: 0 }}
                title="Ambil Foto Struk"
              >
                {scanning ? <Loader2 className="spin" size={16} /> : <Camera size={16} />}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileRef.current?.click()}
                disabled={scanning}
                style={{ borderRadius: 12, padding: '12px 16px', flexShrink: 0 }}
                title="Pilih File Struk"
              >
                {scanning ? <Loader2 className="spin" size={16} /> : <Image size={16} />}
              </Button>
            </>
          )}
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
