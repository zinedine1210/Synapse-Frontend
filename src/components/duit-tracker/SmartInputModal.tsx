'use client';

import React, { useRef, useState, useMemo } from 'react';
import { Modal, Button, useToast, TextArea } from '@/components/ui';
import { duitTrackerService } from '@/services/duitTrackerService';
import { useAiJob } from '@/lib/useAiJob';
import { Loader2, Camera, Image as ImageIcon, Sparkles, Send, MessageSquareText, ScanLine, ArrowLeft, Check } from 'lucide-react';

export interface ScannedItem {
  label: string;
  amount: number;
  category: string;
  type: string;
  checked: boolean;
}

export interface AiParseResult {
  amount?: number;
  type?: string;
  category?: string;
  label?: string;
  note?: string;
  date?: string;
  isDebt?: boolean;
  debtType?: string;
  personName?: string;
  isBill?: boolean;
  dueDay?: number;
  isWishlist?: boolean;
  priority?: string;
  parsedBy?: string;
}

interface SmartInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onParsed: (result: AiParseResult, rawText: string) => void;
  onBulkCreate: (items: ScannedItem[]) => Promise<void>;
}

type InputMode = 'menu' | 'text' | 'scan';

const EXAMPLE_CHIPS = [
  'kopi 25rb',
  'makan warteg 15rb',
  'gaji 5.5 juta',
  'grab 12k',
  'hutang ke budi 50k',
  'wifi 350rb tiap bulan',
  'pengen beli airpods 4.2jt',
];

export function SmartInputModal({ isOpen, onClose, onParsed, onBulkCreate }: SmartInputModalProps) {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<InputMode>('menu');
  const [aiText, setAiText] = useState('');
  const [parsing, setParsing] = useState(false);

  // Receipt scan state
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [savingBulk, setSavingBulk] = useState(false);

  const scanReceiptJob = useAiJob<any>('scan_receipt', {
    enabled: isOpen && mode === 'scan',
    onComplete: (result) => {
      const items: any[] = Array.isArray(result) ? result : result?.items ? result.items : result?.error ? [] : [result];
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
        showToast('Duh gak kebaca nih, coba foto ulang yang lebih jelas ya! 🔍', 'error');
      }
    },
    onError: (err) => showToast(err || 'Yah gagal scan nih, coba lagi ya~', 'error'),
  });
  const scanning = scanReceiptJob.isProcessing;

  const checkedCount = useMemo(() => scannedItems.filter(i => i.checked).length, [scannedItems]);
  const allChecked = useMemo(() => scannedItems.length > 0 && scannedItems.every(i => i.checked), [scannedItems]);

  // ── AI Text Parse ──
  const handleAiParse = async () => {
    if (!aiText.trim() || parsing) return;
    setParsing(true);
    try {
      const p = await duitTrackerService.parseNaturalInput(aiText.trim());
      if (p.amount) {
        onParsed(p, aiText.trim());
        resetAndClose();
      } else {
        showToast('Hmm, gak bisa di-parse nih. Coba tulis ulang!', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Gagal memparse input.', 'error');
    } finally {
      setParsing(false);
    }
  };

  // ── Receipt Scan ──
  const handleReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Eh itu bukan gambar bestie, upload foto ya! 📷', 'error');
      return;
    }
    // No size limit — AI processing only (not stored)
    setMode('scan');
    setScannedItems([]);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const clean = base64.split(',')[1];
      await scanReceiptJob.trigger(() => duitTrackerService.scanReceipt(clean, file.type));
    } catch (err: any) {
      showToast(err.message || 'Yah gagal scan nih, coba lagi ya~', 'error');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  const handleSaveBulk = async () => {
    const selected = scannedItems.filter(it => it.checked);
    if (selected.length === 0) {
      showToast('Pilih dulu minimal 1 item dong! ☝️', 'error');
      return;
    }
    setSavingBulk(true);
    try {
      await onBulkCreate(selected);
      setScannedItems([]);
      showToast(`${selected.length} transaksi berhasil disimpan! ✅`, 'success');
      resetAndClose();
    } catch (err: any) {
      showToast(err.message || 'Duh gagal nyimpen nih, coba lagi ya~', 'error');
    } finally {
      setSavingBulk(false);
    }
  };

  const resetAndClose = () => {
    setMode('menu');
    setAiText('');
    setScannedItems([]);
    onClose();
  };

  const handleClose = () => {
    if (scanning || savingBulk || parsing) return;
    if (scannedItems.length > 0) {
      if (!window.confirm('Yakin nih mau nutup? Hasil scan-nya bakal ilang loh~')) return;
    }
    resetAndClose();
  };

  const goBack = () => {
    if (scanning || parsing) return;
    if (scannedItems.length > 0) {
      if (!window.confirm('Yakin mau balik? Hasil scan-nya bakal ilang loh~')) return;
    }
    setScannedItems([]);
    setAiText('');
    setMode('menu');
  };

  const detectedType = (result: AiParseResult) => {
    if (result.isDebt) return '🤝 Hutang';
    if (result.isBill) return '💳 Tagihan Rutin';
    if (result.isWishlist) return '🛒 Wishlist';
    return result.type === 'income' ? '💰 Pemasukan' : '💸 Pengeluaran';
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="✨ Input Cerdas">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Hidden file inputs (always mounted) */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleReceipt} style={{ display: 'none' }} />
        <input ref={fileRef} type="file" accept="image/*" onChange={handleReceipt} style={{ display: 'none' }} />

        {/* ── MODE: Menu ── */}
        {mode === 'menu' && (
          <>
            <p style={{ fontSize: 13, color: 'rgb(var(--text-muted))', textAlign: 'center', margin: '-4px 0 4px' }}>
              Pilih cara input, AI langsung ngerti mau catat apa! 🧠
            </p>

            {/* Option: Ketik */}
            <button
              type="button"
              onClick={() => setMode('text')}
              className="smart-input__option"
            >
              <div className="smart-input__option-icon" style={{ background: 'rgba(var(--color-primary) / 0.12)', color: 'rgb(var(--color-primary))' }}>
                <MessageSquareText size={20} />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <span style={{ fontWeight: 700, fontSize: 14, display: 'block' }}>✍️ Ketik Bahasa Bebas</span>
                <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))' }}>Tulis kayak ngobrol: &ldquo;kopi 25rb&rdquo;, &ldquo;hutang ke budi 50k&rdquo;</span>
              </div>
            </button>

            {/* Option: Kamera */}
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="smart-input__option"
            >
              <div className="smart-input__option-icon" style={{ background: 'rgba(var(--color-warning) / 0.12)', color: 'rgb(var(--color-warning))' }}>
                <Camera size={20} />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <span style={{ fontWeight: 700, fontSize: 14, display: 'block' }}>📸 Foto Struk</span>
                <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))' }}>Buka kamera, foto struk belanja langsung di-scan AI</span>
              </div>
            </button>

            {/* Option: Gallery */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="smart-input__option"
            >
              <div className="smart-input__option-icon" style={{ background: 'rgba(var(--color-secondary) / 0.12)', color: 'rgb(var(--color-secondary))' }}>
                <ImageIcon size={20} />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <span style={{ fontWeight: 700, fontSize: 14, display: 'block' }}>🖼️ Upload dari Galeri</span>
                <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))' }}>Pilih foto struk dari galeri HP atau file explorer</span>
              </div>
            </button>

            {/* Smart detection info */}
            <div style={{
              padding: '12px 14px', borderRadius: 12,
              background: 'rgba(var(--color-primary) / 0.04)',
              border: '1px solid rgba(var(--color-primary) / 0.1)',
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'rgb(var(--color-primary))' }}>🧠 AI Otomatis Deteksi:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {['💸 Pengeluaran', '💰 Pemasukan', '🤝 Hutang', '💳 Tagihan', '🛒 Wishlist'].map(tag => (
                  <span key={tag} style={{
                    padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: 'rgba(var(--color-primary) / 0.08)',
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── MODE: Text input ── */}
        {mode === 'text' && (
          <>
            <button type="button" onClick={goBack} className="smart-input__back">
              <ArrowLeft size={14} /> Kembali
            </button>

            <p style={{ fontSize: 13, color: 'rgb(var(--text-muted))' }}>
              Ketik aja kayak ngobrol biasa, AI langsung ngerti! Bisa deteksi transaksi, hutang, tagihan, atau wishlist.
            </p>

            {/* Example chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EXAMPLE_CHIPS.map(ex => (
                <button key={ex} type="button" onClick={() => setAiText(ex)} style={{
                  padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 11, background: 'var(--input-bg)', opacity: 0.7, transition: 'opacity 0.2s',
                }}>&ldquo;{ex}&rdquo;</button>
              ))}
            </div>

            <TextArea
              placeholder="Contoh: kopi 25rb, hutang ke budi 50k, wifi 350rb tiap bulan..."
              value={aiText}
              onChange={setAiText}
              rows={3}
              resize="none"
            />

            <Button onClick={handleAiParse} disabled={parsing || !aiText.trim()} style={{ width: '100%', borderRadius: 12, padding: '12px 0' }}>
              {parsing ? <Loader2 className="spin" size={16} /> : <><Sparkles size={16} /> Parse & Tambahkan</>}
            </Button>
          </>
        )}

        {/* ── MODE: Scan (loading) ── */}
        {mode === 'scan' && scanning && (
          <>
            <button type="button" onClick={goBack} className="smart-input__back" disabled>
              <ArrowLeft size={14} /> Kembali
            </button>
            <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <Loader2 className="spin" size={40} style={{ color: 'rgb(var(--color-primary))' }} />
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Lagi Dibaca AI nih... 🧠</h3>
                <p style={{ fontSize: 13, color: 'rgb(var(--text-secondary))' }}>Bentar ya, AI lagi ngitung belanjaanmu~</p>
              </div>
            </div>
          </>
        )}

        {/* ── MODE: Scan (no items yet, not scanning) ── */}
        {mode === 'scan' && !scanning && scannedItems.length === 0 && (
          <>
            <button type="button" onClick={goBack} className="smart-input__back">
              <ArrowLeft size={14} /> Kembali
            </button>
            <div style={{ textAlign: 'center', padding: '20px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(var(--color-primary), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgb(var(--color-primary))' }}>
                <ScanLine size={32} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Scan Struk Belanjaanmu 📸</h3>
                <p style={{ fontSize: 13, color: 'rgb(var(--text-secondary))', maxWidth: 280, margin: '0 auto' }}>
                  Tinggal foto struk, AI langsung breakdown jadi transaksi satu-satu.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 8 }}>
                <Button onClick={() => cameraRef.current?.click()} style={{ flex: 1, padding: '14px 0', borderRadius: 12 }} variant="outline">
                  <Camera size={18} style={{ marginRight: 8 }} /> Kamera
                </Button>
                <Button onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: '14px 0', borderRadius: 12 }}>
                  <ImageIcon size={18} style={{ marginRight: 8 }} /> Galeri
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── MODE: Scan (review items) ── */}
        {mode === 'scan' && !scanning && scannedItems.length > 0 && (
          <>
            <button type="button" onClick={goBack} className="smart-input__back">
              <ArrowLeft size={14} /> Kembali
            </button>
            <div style={{ background: 'var(--card-bg)', borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'rgb(var(--text-primary))' }}>
                  📋 Pilih Item ({checkedCount}/{scannedItems.length})
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '50vh', overflowY: 'auto', paddingBottom: 16, paddingRight: 4 }}>
                {scannedItems.map((item, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: item.checked ? 'rgba(var(--color-secondary), 0.08)' : 'var(--input-bg)', border: item.checked ? '1px solid rgba(var(--color-secondary), 0.3)' : '1px solid var(--border-default)', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <input type="checkbox" checked={item.checked} onChange={() => setScannedItems(prev => prev.map((it, i) => i === idx ? { ...it, checked: !it.checked } : it))} style={{ accentColor: 'rgb(var(--color-primary))', width: 20, height: 20, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgb(var(--text-primary))' }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', marginTop: 2 }}>Kategori: {item.category}</div>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--dt-expense)', flexShrink: 0 }}>
                      Rp {item.amount.toLocaleString('id-ID')}
                    </span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <Button type="button" variant="outline" onClick={() => setScannedItems(items => items.map(i => ({ ...i, checked: !allChecked })))} style={{ flex: 1, borderRadius: 12, fontSize: 13 }}>
                  {allChecked ? 'Batal Semua' : 'Pilih Semua'}
                </Button>
                <Button type="button" onClick={handleSaveBulk} disabled={savingBulk || checkedCount === 0} style={{ flex: 2, borderRadius: 12, fontSize: 13 }}>
                  {savingBulk ? <Loader2 className="spin" size={16} /> : `💾 Simpan ${checkedCount} Transaksi`}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .smart-input__option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 14px;
          cursor: pointer;
          background: var(--card-bg);
          border: 1.5px solid var(--border-default);
          transition: all 0.15s ease;
          color: inherit;
          width: 100%;
        }
        .smart-input__option:hover {
          border-color: rgba(var(--color-primary) / 0.4);
          background: rgba(var(--color-primary) / 0.03);
        }
        .smart-input__option:active {
          transform: scale(0.98);
        }
        .smart-input__option-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .smart-input__back {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 0;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: rgb(var(--color-primary));
          width: fit-content;
          transition: opacity 0.2s;
        }
        .smart-input__back:disabled {
          opacity: 0.4;
          cursor: default;
        }
        .smart-input__back:not(:disabled):hover {
          opacity: 0.7;
        }
        @media (prefers-reduced-motion: reduce) {
          .smart-input__option,
          .smart-input__back {
            transition: none;
          }
          .smart-input__option:active {
            transform: none;
          }
        }
      `}</style>
    </Modal>
  );
}
