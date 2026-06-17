'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Modal, Button, useToast, useConfirm, CurrencyInput, TextInput, NumberInput, parseCurrency } from '@/components/ui';
import {
  splitBillService,
  SplitBill,
  SplitParticipant,
  SplittableTransaction,
  HistorySummaryEntry,
} from '@/services/splitBillService';
import { useCache } from '@/lib/cache';
import { useAiJob } from '@/lib/useAiJob';
import {
  Receipt, Plus, Loader2, Camera, Check, X, Send, Trash2,
  ChevronLeft, Users, Percent, TrendingUp, Zap, History,
  Sparkles, Wallet, CheckCircle2, Clock, ArrowRight, Wand2, ScanLine, ImageIcon,
} from 'lucide-react';

/* ── Helpers ───────────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  '0 212 255', '0 245 160', '100 100 255', '234 179 8',
  '239 68 68', '168 85 247', '236 72 153', '34 197 94',
];
const initials = (name: string) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('') || '?';
const avatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

function Avatar({ name, size = 30 }: { name: string; size?: number }) {
  const c = avatarColor(name);
  return (
    <span
      aria-hidden
      style={{
        width: size, height: size, minWidth: size, borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.42, fontWeight: 800, letterSpacing: '-0.02em',
        color: `rgb(${c})`,
        background: `rgba(${c} / 0.16)`,
        border: `1.5px solid rgba(${c} / 0.4)`,
      }}
    >
      {initials(name)}
    </span>
  );
}

interface BillStats {
  paidCount: number;
  total: number;
  paidAmount: number;
  pct: number;
}
function billStats(bill: SplitBill): BillStats {
  const total = bill.participants?.length ?? 0;
  const paidCount = bill.participants?.filter(p => p.isPaid).length ?? 0;
  const paidAmount = bill.participants?.reduce((s, p) => s + (p.isPaid ? p.totalOwed : 0), 0) ?? 0;
  const pct = bill.totalAmount > 0 ? Math.min(100, Math.round((paidAmount / bill.totalAmount) * 100)) : (total > 0 && paidCount === total ? 100 : 0);
  return { paidCount, total, paidAmount, pct };
}

export default function SplitBillPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { data: bills = [], loading, revalidate: fetchBills, mutate: mutateBills } = useCache<SplitBill[]>('split-bill:list', async () => {
    const res = await splitBillService.getAll();
    return Array.isArray(res) ? res : [];
  });
  const [view, setView] = useState<'list' | 'detail' | 'create' | 'history'>('list');
  const [selectedBill, setSelectedBill] = useState<SplitBill | null>(null);
  const [socketLive, setSocketLive] = useState(false);

  // Create form
  const [eventName, setEventName] = useState('');
  const [splitMethod, setSplitMethod] = useState<'item' | 'percentage'>('item');
  const [items, setItems] = useState<{ name: string; price: string; quantity: string }[]>([{ name: '', price: '', quantity: '1' }]);
  const [participants, setParticipants] = useState<string[]>(['']);
  const [percentages, setPercentages] = useState<Record<number, string>>({});
  const [scanning, setScanning] = useState(false);
  const [showScanChoice, setShowScanChoice] = useState(false);
  const scanGalleryRef = useRef<HTMLInputElement>(null);
  const scanCameraRef = useRef<HTMLInputElement>(null);
  const [creating, setCreating] = useState(false);
  const [scannedItems, setScannedItems] = useState<{ name: string; price: number; quantity: number; checked: boolean }[]>([]);

  // AI Job tracking for receipt scan
  const scanReceiptJob = useAiJob<any>('split_bill_scan', {
    onComplete: (result) => {
      if (result?.error) {
        showToast(result.error, 'error');
      } else if (result?.items) {
        const parsed = result.items.map((i: any) => ({
          name: i.name || 'Item',
          price: Number(i.price) || 0,
          quantity: Number(i.quantity) || 1,
          checked: true,
        }));
        setScannedItems(parsed);
        if (result.storeName) setEventName(result.storeName);
        showToast(`${result.items.length} item ketauan di struk! 📸`, 'success');
      }
      setScanning(false);
    },
    onError: (err) => { showToast(err || 'Gagal scan struk.', 'error'); setScanning(false); },
  });

  // Auto-detect splittable
  const [splittableTransactions, setSplittableTransactions] = useState<SplittableTransaction[]>([]);
  const [loadingSplittable, setLoadingSplittable] = useState(false);

  // History summary
  const [historySummary, setHistorySummary] = useState<HistorySummaryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Socket.IO ref for real-time
  const socketRef = useRef<Socket | null>(null);

  // Socket.IO connection for real-time payment updates
  useEffect(() => {
    if (view !== 'detail' || !selectedBill) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    const wsBase = apiUrl.replace(/\/api\/v\d+\/?$/, '');
    const socket = io(`${wsBase}/split-bill`, { transports: ['polling'], withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketLive(true);
      socket.emit('joinBill', { billId: selectedBill.id });
    });
    socket.on('disconnect', () => setSocketLive(false));

    socket.on('split-bill:payment-updated', (data: { participantId: string; isPaid: boolean; bill: SplitBill }) => {
      // Update the bill in real-time when another viewer marks payment
      setSelectedBill(data.bill);
      showToast('Pembayaran udah diupdate! ✅', 'info');
    });

    return () => {
      if (socket.connected) {
        socket.emit('leaveBill', { billId: selectedBill.id });
      }
      socket.disconnect();
      socketRef.current = null;
      setSocketLive(false);
    };
  }, [view, selectedBill?.id]);

  // Detect splittable transactions
  const handleDetectSplittable = async () => {
    setLoadingSplittable(true);
    try {
      const results = await splitBillService.detectSplittable();
      setSplittableTransactions(results);
      if (results.length === 0) {
        showToast('Gak ada transaksi yang bisa dipatungin nih.', 'info');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoadingSplittable(false);
    }
  };

  // Fetch history summary
  const handleFetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const results = await splitBillService.getHistorySummary();
      setHistorySummary(results);
      setView('history');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleScanReceipt = async (file: File) => {
    setScanning(true);
    setScannedItems([]);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      await scanReceiptJob.trigger(() => splitBillService.scanReceipt(base64, file.type));
    } catch (e: any) {
      showToast(e.message || 'Gagal scan struk nih.', 'error');
      setScanning(false);
    }
  };

  const handleCreate = async () => {
    const validItems = items.filter(i => i.name && i.price);
    const validParticipants = participants.filter(p => p.trim());
    if (validItems.length === 0) { showToast('Tambah minimal 1 item dulu ya.', 'error'); return; }
    if (validParticipants.length === 0) { showToast('Tambah minimal 1 peserta ya.', 'error'); return; }

    // Validate percentages if percentage method
    if (splitMethod === 'percentage') {
      const total = validParticipants.reduce((sum, _, i) => sum + (parseFloat(percentages[i] || '0')), 0);
      if (Math.abs(total - 100) > 0.01) {
        showToast(`Total persentase harus pas 100% ya (sekarang: ${total.toFixed(1)}%)`, 'error');
        return;
      }
    }

    setCreating(true);
    try {
      const percentageMap: Record<string, number> = {};
      if (splitMethod === 'percentage') {
        validParticipants.forEach((name, i) => {
          percentageMap[name] = parseFloat(percentages[i] || '0');
        });
      }

      const bill = await splitBillService.create({
        eventName: eventName || undefined,
        splitMethod,
        items: validItems.map(i => ({ name: i.name, price: parseCurrency(i.price), quantity: parseInt(i.quantity) || 1 })),
        participants: validParticipants,
        ...(splitMethod === 'percentage' ? { percentages: percentageMap } : {}),
      });
      showToast('Split bill sukses dibikin! 🎉', 'success');
      setView('detail');
      setSelectedBill(bill);
      fetchBills();
      resetForm();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setEventName('');
    setSplitMethod('item');
    setItems([{ name: '', price: '', quantity: '1' }]);
    setParticipants(['']);
    setPercentages({});
    setScannedItems([]);
  };

  const openDetail = async (id: string) => {
    try {
      const bill = await splitBillService.getById(id);
      setSelectedBill(bill);
      setView('detail');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleAssign = async (itemId: string, participantId: string, currentlyAssigned: string[]) => {
    const newAssigned = currentlyAssigned.includes(participantId)
      ? currentlyAssigned.filter(id => id !== participantId)
      : [...currentlyAssigned, participantId];
    try {
      const updated = await splitBillService.assignItem(itemId, newAssigned);
      setSelectedBill(updated);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleMarkPaid = async (participantId: string) => {
    if (!selectedBill) return;
    try {
      const updated = await splitBillService.markPaid(selectedBill.id, participantId);
      setSelectedBill(updated);
      fetchBills();
      showToast('Udah lunas ditandai! ✅', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleSendWA = async (participantId: string) => {
    if (!selectedBill) return;
    try {
      const result = await splitBillService.getWhatsAppMessage(selectedBill.id, participantId);
      window.open(result.whatsappUrl, '_blank');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleDelete = async (billId: string) => {
    const ok = await confirm({ title: 'Yakin hapus split bill?', message: 'Kalo dihapus gak bisa balik lagi loh.', variant: 'danger' });
    if (!ok) return;
    try {
      await splitBillService.delete(billId);
      showToast('Bill udah dihapus.', 'success');
      setView('list');
      fetchBills();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // Use a splittable transaction to pre-fill the create form
  const handleUseSplittable = (tx: SplittableTransaction) => {
    setEventName(tx.label || '');
    setItems([{ name: tx.label || 'Item', price: String(tx.amount), quantity: '1' }]);
    setSplittableTransactions([]);
    setView('create');
    showToast('Transaksi dipilih! Tambah pesertanya ya.', 'info');
  };

  const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

  // Derived totals for the create form
  const createSubtotal = useMemo(
    () => items.reduce((s, i) => s + parseCurrency(i.price) * (parseInt(i.quantity) || 1), 0),
    [items]
  );
  const validParticipantCount = participants.filter(p => p.trim()).length;
  const percentTotal = participants.reduce((sum, _, i) => sum + (parseFloat(percentages[i] || '0')), 0);
  const percentOk = Math.abs(percentTotal - 100) < 0.01;

  const distributeEqually = () => {
    const idxs = participants.map((p, i) => (p.trim() ? i : -1)).filter(i => i >= 0);
    if (idxs.length === 0) return;
    const base = Math.floor((100 / idxs.length) * 10) / 10;
    const newPerc: Record<number, string> = {};
    idxs.forEach((idx, k) => {
      // Push the rounding remainder onto the last participant so the total hits 100%.
      newPerc[idx] = k === idxs.length - 1
        ? (100 - base * (idxs.length - 1)).toFixed(1)
        : base.toFixed(1);
    });
    setPercentages(newPerc);
  };

  const stats = selectedBill ? billStats(selectedBill) : null;

  return (
    <AuthGuard requiredFeature="split_bill">
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content page-transition">
            <div
              className="sb-root"
              style={{ maxWidth: 820, margin: '0 auto', paddingBottom: 'calc(var(--bottom-nav-height, 60px) + 16px)' }}
            >

              {/* ─────────────────────────  LIST VIEW  ───────────────────────── */}
              {view === 'list' && (
                <div className="animate-fade-in">
                  <div className="sb-header">
                    <div className="sb-header__title">
                      <span className="sb-header__icon"><Receipt size={22} /></span>
                      <div>
                        <h1>Split Bill</h1>
                        <p>Patungan anti ribet. Bagi, pantau, kelar! 💸</p>
                      </div>
                    </div>
                    <div className="sb-header__actions">
                      <Button onClick={handleFetchHistory} variant="outline" size="sm" disabled={loadingHistory}>
                        {loadingHistory ? <Loader2 size={14} className="sb-spin" /> : <History size={14} />} Cek Riwayat 📜
                      </Button>
                      <Button onClick={() => setView('create')} size="sm"><Plus size={15} /> Bikin Split ➕</Button>
                    </div>
                  </div>

                  {/* Auto-detect splittable — inviting hero card */}
                  <div className="sb-detect">
                    <div className="sb-detect__glow" aria-hidden />
                    <div className="sb-detect__head">
                      <span className="sb-detect__badge"><Wand2 size={15} /></span>
                      <div className="sb-detect__copy">
                        <strong>Deteksi Otomatis <Sparkles size={13} /></strong>
                        <span>Cari transaksi di Duit Tracker yang asik buat dipatungin bareng sobat.</span>
                      </div>
                      <button className="sb-detect__cta" onClick={handleDetectSplittable} disabled={loadingSplittable}>
                        {loadingSplittable ? <Loader2 size={15} className="sb-spin" /> : <TrendingUp size={15} />}
                        {loadingSplittable ? 'Mencari...' : 'Cari'}
                      </button>
                    </div>

                    {splittableTransactions.length > 0 && (
                      <div className="sb-detect__results">
                        <span className="sb-detect__results-label">{splittableTransactions.length} transaksi ditemukan</span>
                        {splittableTransactions.map(tx => (
                          <div key={tx.id} className="sb-detect__item">
                            <div className="sb-detect__item-info">
                              <span className="sb-detect__item-name">{tx.label}</span>
                              <span className="sb-detect__item-meta">{fmt(tx.amount)} · {tx.category} · {new Date(tx.date).toLocaleDateString('id-ID')}</span>
                              <span className="sb-detect__item-reason">{tx.suggestedReason}</span>
                            </div>
                            <button className="sb-detect__item-btn" onClick={() => handleUseSplittable(tx)}>
                              Split <ArrowRight size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 0' }}>
                      {[1, 2, 3].map(n => <div key={n} className="skeleton" style={{ height: 72, borderRadius: 14 }} />)}
                    </div>
                  ) : bills.length === 0 ? (
                    <div className="sb-empty">
                      <span className="sb-empty__icon">🧾</span>
                      <h3>Belum ada split bill nih</h3>
                      <p>Foto struk, tag temen, bagi rata. Yuk mulai patungan perdana lo! 🚀</p>
                      <Button onClick={() => setView('create')} style={{ marginTop: 14 }}><Plus size={15} /> Bikin Split Bill 💸</Button>
                    </div>
                  ) : (
                    <div className="sb-list">
                      {bills.map(bill => {
                        const s = billStats(bill);
                        const done = bill.status === 'done' || (s.total > 0 && s.paidCount === s.total);
                        return (
                          <button key={bill.id} className={`sb-bill ${done ? 'is-done' : ''}`} onClick={() => openDetail(bill.id)}>
                            <span className="sb-bill__accent" aria-hidden />
                            <div className="sb-bill__body">
                              <div className="sb-bill__top">
                                <span className="sb-bill__name">{bill.eventName || 'Split Bill'}</span>
                                <div className="sb-bill__tags">
                                  {bill.splitMethod === 'percentage' && (
                                    <span className="sb-chip sb-chip--primary"><Percent size={10} /> %</span>
                                  )}
                                  <span className={`sb-chip ${done ? 'sb-chip--success' : 'sb-chip--warning'}`}>
                                    {done ? <><CheckCircle2 size={11} /> Selesai</> : <><Clock size={11} /> Berlangsung</>}
                                  </span>
                                </div>
                              </div>

                              <div className="sb-bill__amount">{fmt(bill.totalAmount)}</div>

                              <div className="sb-bill__meta">
                                <span><Users size={12} /> {s.total} orang</span>
                                <span>{new Date(bill.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                <span className="sb-bill__paid">{s.paidCount}/{s.total} lunas</span>
                              </div>

                              <div className="sb-progress" aria-label={`${s.pct}% terbayar`}>
                                <span className={`sb-progress__fill ${done ? 'is-done' : ''}`} style={{ width: `${s.pct}%` }} />
                              </div>
                            </div>
                            <span className="sb-bill__pct">{s.pct}%</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─────────────────────────  HISTORY VIEW  ───────────────────────── */}
              {view === 'history' && (
                <div className="animate-fade-in">
                  <button className="sb-back" onClick={() => setView('list')}>
                    <ChevronLeft size={16} /> Kembali
                  </button>
                  <div className="sb-section-head">
                    <span className="sb-header__icon sb-header__icon--sm"><History size={18} /></span>
                    <div>
                      <h2>Riwayat Utang/Piutang</h2>
                      <p>Ringkasan kumulatif dari semua split bill kamu.</p>
                    </div>
                  </div>

                  {historySummary.length === 0 ? (
                    <div className="sb-empty">
                      <span className="sb-empty__icon">📊</span>
                      <h3>Belum ada riwayat</h3>
                      <p>Buat split bill pertamamu untuk melihat riwayat di sini.</p>
                    </div>
                  ) : (
                    <div className="sb-list">
                      {historySummary.map(entry => {
                        const settled = entry.outstanding <= 0;
                        return (
                          <div key={entry.name} className={`sb-history ${settled ? 'is-settled' : ''}`}>
                            <span className="sb-history__accent" aria-hidden />
                            <Avatar name={entry.name} size={38} />
                            <div className="sb-history__info">
                              <span className="sb-history__name">{entry.name}</span>
                              <span className="sb-history__meta">Total {fmt(entry.totalOwed)} · Dibayar {fmt(entry.totalPaid)}</span>
                            </div>
                            <div className="sb-history__amount">
                              <span className={settled ? 'is-settled' : 'is-owed'}>
                                {settled ? '✅ Lunas' : fmt(entry.outstanding)}
                              </span>
                              {!settled && <small>sisa hutang</small>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─────────────────────────  CREATE VIEW  ───────────────────────── */}
              {view === 'create' && (
                <div className="animate-fade-in">
                  <button className="sb-back" onClick={() => { setView('list'); resetForm(); }}>
                    <ChevronLeft size={16} /> Kembali
                  </button>
                  <div className="sb-section-head">
                    <span className="sb-header__icon sb-header__icon--sm"><Receipt size={18} /></span>
                    <div>
                      <h2>Buat Split Bill</h2>
                      <p>Scan struk atau isi manual, lalu bagi ke teman-temanmu.</p>
                    </div>
                  </div>

                  {/* Scan receipt */}
                  <input ref={scanGalleryRef} type="file" accept="image/*" hidden disabled={scanning}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleScanReceipt(f); e.target.value = ''; }} />
                  <input ref={scanCameraRef} type="file" accept="image/*" capture="environment" hidden disabled={scanning}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleScanReceipt(f); e.target.value = ''; }} />
                  <div
                    className={`sb-scan ${scanning ? 'is-scanning' : ''}`}
                    onClick={() => {
                      if (scanning) return;
                      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
                      if (isMobile) setShowScanChoice(true);
                      else scanGalleryRef.current?.click();
                    }}
                    style={{ cursor: scanning ? 'progress' : 'pointer' }}
                  >
                    <span className="sb-scan__icon">
                      {scanning ? <Loader2 size={22} className="sb-spin" /> : <ScanLine size={22} />}
                    </span>
                    <span className="sb-scan__text">
                      <strong>{scanning ? 'Membaca struk...' : 'Scan Struk'}</strong>
                      <small>{scanning ? 'Tunggu sebentar ya' : 'Foto struk atau pilih dari galeri'}</small>
                    </span>
                    <Camera size={18} className="sb-scan__cam" />
                  </div>
                  {showScanChoice && (
                    <div onClick={() => setShowScanChoice(false)} style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 24px' }}>
                      <div onClick={e => e.stopPropagation()} style={{ background: 'rgb(var(--bg-surface))', borderRadius: 'var(--radius-xl)', padding: 20, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <p style={{ fontSize: 'var(--font-md)', fontWeight: 700, textAlign: 'center', margin: 0 }}>📸 Pilih Sumber Foto</p>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => { setShowScanChoice(false); scanCameraRef.current?.click(); }} style={{ flex: 1, padding: '16px 10px', borderRadius: 'var(--radius-md)', border: '2px solid var(--border-default)', background: 'rgb(var(--bg-surface))', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
                            <Camera size={24} style={{ color: 'rgb(var(--color-primary))' }} />
                            <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>Kamera</span>
                          </button>
                          <button onClick={() => { setShowScanChoice(false); scanGalleryRef.current?.click(); }} style={{ flex: 1, padding: '16px 10px', borderRadius: 'var(--radius-md)', border: '2px solid var(--border-default)', background: 'rgb(var(--bg-surface))', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
                            <ImageIcon size={24} style={{ color: 'rgb(var(--color-secondary))' }} />
                            <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>Galeri</span>
                          </button>
                        </div>
                        <button onClick={() => setShowScanChoice(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', padding: 8 }}>Batal</button>
                      </div>
                    </div>
                  )}

                  {/* Scanned Items Checklist Modal */}
                  <Modal isOpen={scannedItems.length > 0 && !scanning} onClose={() => setScannedItems([])} title="📸 Hasil Scan Struk">
                    <div style={{ padding: 4 }}>
                      <p style={{ fontSize: 13, color: 'rgb(var(--text-secondary))', marginBottom: 16 }}>
                        Pilih item yang ingin kamu masukkan ke dalam split bill ini.
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                          📋 Item Terdeteksi ({scannedItems.filter(i => i.checked).length}/{scannedItems.length})
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '50vh', overflowY: 'auto', paddingBottom: 16, paddingRight: 4 }}>
                        {scannedItems.map((item, idx) => (
                          <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: item.checked ? 'rgba(var(--color-secondary), 0.08)' : 'var(--input-bg)', border: item.checked ? '1px solid rgba(var(--color-secondary), 0.3)' : '1px solid var(--border-default)', cursor: 'pointer', transition: 'all 0.15s' }}>
                            <input type="checkbox" checked={item.checked} onChange={() => setScannedItems(prev => prev.map((it, i) => i === idx ? { ...it, checked: !it.checked } : it))} style={{ accentColor: 'rgb(var(--color-primary))', width: 20, height: 20, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgb(var(--text-primary))' }}>{item.name}</div>
                              <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', marginTop: 2 }}>Jumlah: {item.quantity}</div>
                            </div>
                            <span style={{ fontWeight: 800, fontSize: 14, color: 'rgb(var(--color-primary))', flexShrink: 0 }}>
                              {fmt(item.price * item.quantity)}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <Button type="button" variant="outline" onClick={() => { const allChecked = scannedItems.every(i => i.checked); setScannedItems(prev => prev.map(i => ({ ...i, checked: !allChecked }))); }} style={{ flex: 1, borderRadius: 12, fontSize: 13 }}>
                          {scannedItems.every(i => i.checked) ? 'Batal Semua' : 'Pilih Semua'}
                        </Button>
                        <Button type="button" onClick={() => {
                          const selected = scannedItems.filter(i => i.checked);
                          if (selected.length === 0) { showToast('Pilih minimal 1 item untuk diimpor.', 'error'); return; }
                          setItems(selected.map(i => ({ name: i.name, price: String(i.price), quantity: String(i.quantity) })));
                          setScannedItems([]);
                          showToast(`${selected.length} item berhasil diimpor ke form! 💾`, 'success');
                        }} style={{ flex: 2, borderRadius: 12, fontSize: 13 }}>
                          💾 Impor {scannedItems.filter(i => i.checked).length} Item
                        </Button>
                      </div>
                    </div>
                  </Modal>

                  {/* Event name */}
                  <label className="sb-field">
                    <span className="sb-field__label">Nama acara</span>
                    <TextInput placeholder="cth. Makan malam Sabtu, Nobar, Kosan…"
                      value={eventName} onChange={v => setEventName(v)} />
                  </label>

                  {/* Split method toggle */}
                  <div className="sb-field">
                    <span className="sb-field__label">Metode pembagian</span>
                    <div className="sb-segment" role="tablist">
                      <button role="tab" aria-selected={splitMethod === 'item'}
                        className={`sb-segment__btn ${splitMethod === 'item' ? 'is-active' : ''}`}
                        onClick={() => setSplitMethod('item')}>
                        <Receipt size={16} />
                        <span>Per Item</span>
                        <small>Pilih siapa makan apa</small>
                      </button>
                      <button role="tab" aria-selected={splitMethod === 'percentage'}
                        className={`sb-segment__btn ${splitMethod === 'percentage' ? 'is-active' : ''}`}
                        onClick={() => setSplitMethod('percentage')}>
                        <Percent size={16} />
                        <span>Persentase</span>
                        <small>Bagi sesuai porsi %</small>
                      </button>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="sb-block">
                    <div className="sb-block__head">
                      <h4>Item</h4>
                      {createSubtotal > 0 && <span className="sb-block__total">{fmt(createSubtotal)}</span>}
                    </div>
                    <div className="sb-items">
                      {items.map((item, i) => (
                        <div key={i} className="sb-item-row">
                          <TextInput className="sb-item-row__name" placeholder="Nama item" value={item.name}
                            onChange={v => { const n = [...items]; n[i].name = v; setItems(n); }} />
                          <CurrencyInput placeholder="Harga" value={item.price}
                            onChange={v => { const n = [...items]; n[i].price = v; setItems(n); }} />
                          <NumberInput className="sb-item-row__qty" placeholder="Qty" min={1} value={item.quantity}
                            onChange={v => { const n = [...items]; n[i].quantity = v; setItems(n); }} />
                          <button className="sb-remove" aria-label="Hapus item" disabled={items.length === 1}
                            onClick={() => setItems(items.filter((_, j) => j !== i))}><X size={16} /></button>
                        </div>
                      ))}
                    </div>
                    <button className="sb-add" onClick={() => setItems([...items, { name: '', price: '', quantity: '1' }])}>
                      <Plus size={15} /> Tambah Item
                    </button>
                  </div>

                  {/* Participants */}
                  <div className="sb-block">
                    <div className="sb-block__head">
                      <h4>Peserta</h4>
                      <span className="sb-block__total sb-block__total--muted"><Users size={12} /> {validParticipantCount}</span>
                    </div>
                    <div className="sb-items">
                      {participants.map((p, i) => (
                        <div key={i} className="sb-party-row">
                          <Avatar name={p || '?'} size={32} />
                          <TextInput className="sb-party-row__name" placeholder="Nama peserta" value={p}
                            onChange={v => { const n = [...participants]; n[i] = v; setParticipants(n); }} />
                          {splitMethod === 'percentage' && (
                            <div className="sb-pct-input">
                              <NumberInput placeholder="0" min={0} max={100} value={percentages[i] || ''}
                                onChange={v => setPercentages({ ...percentages, [i]: v })} />
                              <span>%</span>
                            </div>
                          )}
                          <button className="sb-remove" aria-label="Hapus peserta" disabled={participants.length === 1}
                            onClick={() => {
                              setParticipants(participants.filter((_, j) => j !== i));
                              const newPerc = { ...percentages }; delete newPerc[i]; setPercentages(newPerc);
                            }}><X size={16} /></button>
                        </div>
                      ))}
                    </div>
                    <button className="sb-add" onClick={() => setParticipants([...participants, ''])}>
                      <Plus size={15} /> Tambah Peserta
                    </button>

                    {splitMethod === 'percentage' && (
                      <div className={`sb-pct-bar ${percentOk ? 'is-ok' : ''}`}>
                        <div className="sb-pct-bar__info">
                          <span>Total persentase</span>
                          <strong>{percentTotal.toFixed(1)}% / 100%</strong>
                        </div>
                        <div className="sb-pct-bar__track">
                          <span style={{ width: `${Math.min(100, percentTotal)}%` }} />
                        </div>
                        {validParticipantCount > 0 && (
                          <button className="sb-add sb-add--inline" onClick={distributeEqually}>
                            <Sparkles size={13} /> Bagi rata
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <Button onClick={handleCreate} disabled={creating} size="lg" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                    {creating ? <Loader2 size={16} className="sb-spin" /> : <><Check size={16} /> Buat Split Bill</>}
                  </Button>
                </div>
              )}

              {/* ─────────────────────────  DETAIL VIEW  ───────────────────────── */}
              {view === 'detail' && selectedBill && stats && (
                <div className="animate-fade-in">
                  <div className="sb-detail-top">
                    <button className="sb-back" onClick={() => { setView('list'); setSelectedBill(null); }}>
                      <ChevronLeft size={16} /> Kembali
                    </button>
                    <button className="sb-icon-danger" aria-label="Hapus" onClick={() => handleDelete(selectedBill.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Hero summary */}
                  <div className="sb-hero">
                    <div className="sb-hero__glow" aria-hidden />
                    <div className="sb-hero__row">
                      <div>
                        <h2 className="sb-hero__name">{selectedBill.eventName || 'Split Bill'}</h2>
                        <div className="sb-hero__tags">
                          <span className={`sb-chip ${selectedBill.status === 'done' ? 'sb-chip--success' : 'sb-chip--warning'}`}>
                            {selectedBill.status === 'done' ? <><CheckCircle2 size={11} /> Selesai</> : <><Clock size={11} /> Berlangsung</>}
                          </span>
                          <span className="sb-chip sb-chip--primary">
                            {selectedBill.splitMethod === 'percentage' ? <><Percent size={10} /> Persentase</> : <><Receipt size={10} /> Per Item</>}
                          </span>
                        </div>
                      </div>
                      <div className="sb-hero__total">
                        <small>Total tagihan</small>
                        <strong>{fmt(selectedBill.totalAmount)}</strong>
                      </div>
                    </div>

                    <div className="sb-hero__progress">
                      <div className="sb-hero__progress-info">
                        <span><Wallet size={13} /> {fmt(stats.paidAmount)} terkumpul</span>
                        <span>{stats.paidCount}/{stats.total} lunas · {stats.pct}%</span>
                      </div>
                      <div className="sb-progress sb-progress--lg">
                        <span className={`sb-progress__fill ${stats.pct >= 100 ? 'is-done' : ''}`} style={{ width: `${stats.pct}%` }} />
                      </div>
                    </div>

                    {/* Real-time indicator */}
                    <div className={`sb-live ${socketLive ? 'is-live' : ''}`}>
                      <span className="sb-live__dot" />
                      {socketLive ? 'Real-time aktif — update otomatis saat peserta bayar' : 'Menyambungkan real-time…'}
                    </div>
                  </div>

                  {/* Items with assignment (item-based split only) */}
                  {selectedBill.splitMethod !== 'percentage' && (
                    <div className="sb-block">
                      <div className="sb-block__head"><h4>Item & Pembagian</h4></div>
                      <div className="sb-list">
                        {selectedBill.items.map(item => (
                          <div key={item.id} className="sb-detail-item">
                            <div className="sb-detail-item__top">
                              <span className="sb-detail-item__name">{item.name} {item.quantity > 1 ? <em>×{item.quantity}</em> : ''}</span>
                              <span className="sb-detail-item__price">{fmt(item.price * item.quantity)}</span>
                            </div>
                            <div className="sb-assign">
                              {selectedBill.participants.map(p => {
                                const on = item.assignedTo.includes(p.id);
                                return (
                                  <button key={p.id} className={`sb-assign__chip ${on ? 'is-on' : ''}`}
                                    onClick={() => handleAssign(item.id, p.id, item.assignedTo)}>
                                    {on && <Check size={11} />} {p.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Per-person breakdown */}
                  <div className="sb-block">
                    <div className="sb-block__head"><h4>Ringkasan per Orang</h4></div>
                    <div className="sb-list">
                      {selectedBill.participants.map((p: SplitParticipant) => (
                        <div key={p.id} className={`sb-person ${p.isPaid ? 'is-paid' : ''}`}>
                          <span className="sb-person__accent" aria-hidden />
                          <Avatar name={p.name} size={40} />
                          <div className="sb-person__info">
                            <span className="sb-person__name">
                              {p.name}
                              {selectedBill.splitMethod === 'percentage' && p.percentage != null && (
                                <span className="sb-person__pct">{p.percentage}%</span>
                              )}
                            </span>
                            <span className="sb-person__amount">{fmt(p.totalOwed)}</span>
                          </div>
                          <div className="sb-person__actions">
                            {p.isPaid ? (
                              <span className="sb-paid-badge"><CheckCircle2 size={13} /> Lunas</span>
                            ) : (
                              <>
                                <button className="sb-act sb-act--wa" title="Kirim tagihan via WhatsApp" onClick={() => handleSendWA(p.id)}>
                                  <Send size={14} />
                                </button>
                                <button className="sb-act sb-act--paid" title="Tandai sudah bayar" onClick={() => handleMarkPaid(p.id)}>
                                  <Check size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Component-scoped styles (globals.css owned by another task) */}
      <style jsx>{`
        .sb-spin { animation: spin 1s linear infinite; }

        /* Header */
        .sb-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 16px; flex-wrap: wrap; margin-bottom: 18px;
        }
        .sb-header__title { display: flex; align-items: center; gap: 12px; }
        .sb-header__title h1 {
          font-size: var(--font-2xl); font-weight: 800; letter-spacing: -0.03em; margin: 0;
        }
        .sb-header__title p { font-size: var(--font-sm); color: rgb(var(--text-muted)); margin: 2px 0 0; }
        .sb-header__icon {
          width: 44px; height: 44px; min-width: 44px; border-radius: 14px;
          display: inline-flex; align-items: center; justify-content: center; color: #fff;
          background: linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)));
          box-shadow: var(--shadow-glow-primary);
        }
        .sb-header__icon--sm { width: 38px; height: 38px; min-width: 38px; border-radius: 12px; }
        .sb-header__actions { display: flex; gap: 8px; flex-wrap: wrap; }

        .sb-section-head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
        .sb-section-head h2 { font-size: var(--font-xl); font-weight: 800; margin: 0; letter-spacing: -0.02em; }
        .sb-section-head p { font-size: var(--font-sm); color: rgb(var(--text-muted)); margin: 2px 0 0; }

        /* Back button */
        .sb-back {
          display: inline-flex; align-items: center; gap: 4px; margin-bottom: 16px;
          background: none; border: none; cursor: pointer; font-family: inherit;
          color: rgb(var(--text-muted)); font-size: var(--font-sm); padding: 6px 4px;
          transition: color 0.15s ease;
        }
        .sb-back:hover { color: rgb(var(--color-primary)); }

        /* Detect card */
        .sb-detect {
          position: relative; overflow: hidden; margin-bottom: 18px;
          border-radius: var(--radius-lg); padding: 16px 18px;
          background: rgb(var(--bg-surface));
          border: 1px solid rgba(var(--color-primary) / 0.22);
        }
        .sb-detect__glow {
          position: absolute; top: -40%; right: -10%; width: 220px; height: 220px; border-radius: 50%;
          background: radial-gradient(circle, rgba(var(--color-primary) / 0.18), transparent 70%);
          pointer-events: none;
        }
        .sb-detect__head { display: flex; align-items: center; gap: 12px; position: relative; }
        .sb-detect__badge {
          width: 40px; height: 40px; min-width: 40px; border-radius: 12px;
          display: inline-flex; align-items: center; justify-content: center; color: #fff;
          background: linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-accent)));
        }
        .sb-detect__copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .sb-detect__copy strong { font-size: var(--font-base); display: inline-flex; align-items: center; gap: 5px; }
        .sb-detect__copy span { font-size: var(--font-xs); color: rgb(var(--text-muted)); line-height: 1.45; }
        .sb-detect__cta {
          display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-family: inherit;
          font-weight: 700; font-size: var(--font-sm); white-space: nowrap; color: #fff;
          padding: 9px 16px; border-radius: var(--radius-full); border: none;
          background: linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)));
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .sb-detect__cta:hover:not(:disabled) { transform: translateY(-1px); }
        .sb-detect__cta:disabled { opacity: 0.6; cursor: default; }
        .sb-detect__results { position: relative; margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
        .sb-detect__results-label { font-size: var(--font-xs); font-weight: 700; color: rgb(var(--text-muted)); }
        .sb-detect__item {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 10px 12px; border-radius: var(--radius-md);
          background: rgb(var(--bg-elevated)); border: 1px solid var(--border-default);
        }
        .sb-detect__item-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .sb-detect__item-name { font-weight: 700; font-size: var(--font-sm); }
        .sb-detect__item-meta { font-size: var(--font-xs); color: rgb(var(--text-muted)); }
        .sb-detect__item-reason { font-size: var(--font-xs); color: rgb(var(--color-warning)); font-style: italic; }
        .sb-detect__item-btn {
          display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; cursor: pointer;
          font-family: inherit; font-weight: 700; font-size: var(--font-xs);
          color: rgb(var(--color-primary)); padding: 7px 12px; border-radius: var(--radius-full);
          background: rgba(var(--color-primary) / 0.1); border: 1px solid rgba(var(--color-primary) / 0.25);
          transition: background 0.15s ease;
        }
        .sb-detect__item-btn:hover { background: rgba(var(--color-primary) / 0.18); }

        /* Empty state */
        .sb-empty {
          text-align: center; padding: 48px 24px; border-radius: var(--radius-lg);
          border: 1px dashed var(--border-strong); background: rgb(var(--bg-surface));
        }
        .sb-empty__icon { font-size: 44px; display: block; margin-bottom: 10px; }
        .sb-empty h3 { font-size: var(--font-lg); font-weight: 800; margin: 0 0 6px; }
        .sb-empty p { font-size: var(--font-sm); color: rgb(var(--text-muted)); margin: 0; }

        /* List + bill card */
        .sb-list { display: flex; flex-direction: column; gap: 10px; }
        .sb-bill {
          position: relative; display: flex; align-items: center; gap: 14px; width: 100%; text-align: left;
          padding: 14px 16px 14px 18px; cursor: pointer; font-family: inherit; overflow: hidden;
          border-radius: var(--radius-lg); border: 1px solid var(--border-default);
          background: rgb(var(--bg-surface)); transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .sb-bill:hover { transform: translateY(-2px); border-color: rgba(var(--color-primary) / 0.3); box-shadow: var(--shadow-md); }
        .sb-bill__accent { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: rgb(var(--color-warning)); }
        .sb-bill.is-done .sb-bill__accent { background: rgb(var(--color-success)); }
        .sb-bill__body { flex: 1; min-width: 0; }
        .sb-bill__top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
        .sb-bill__name { font-weight: 800; font-size: var(--font-base); letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sb-bill__tags { display: flex; gap: 5px; flex-shrink: 0; }
        .sb-bill__amount { font-size: var(--font-lg); font-weight: 800; color: rgb(var(--color-primary)); letter-spacing: -0.02em; }
        .sb-bill__meta { display: flex; gap: 12px; flex-wrap: wrap; margin: 4px 0 8px; font-size: var(--font-xs); color: rgb(var(--text-muted)); }
        .sb-bill__meta span { display: inline-flex; align-items: center; gap: 3px; }
        .sb-bill__paid { font-weight: 700; }
        .sb-bill__pct { font-size: var(--font-base); font-weight: 800; color: rgb(var(--text-muted)); min-width: 38px; text-align: right; }
        .sb-bill.is-done .sb-bill__pct { color: rgb(var(--color-success)); }

        /* Progress */
        .sb-progress { height: 6px; border-radius: var(--radius-full); background: rgb(var(--bg-elevated)); overflow: hidden; }
        .sb-progress--lg { height: 8px; }
        .sb-progress__fill {
          display: block; height: 100%; border-radius: inherit; min-width: 0;
          background: linear-gradient(90deg, rgb(var(--color-primary)), rgb(var(--color-secondary)));
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sb-progress__fill.is-done { background: rgb(var(--color-success)); }

        /* Chips */
        .sb-chip {
          display: inline-flex; align-items: center; gap: 3px; padding: 3px 8px;
          font-size: var(--font-xs); font-weight: 700; border-radius: var(--radius-full); white-space: nowrap;
        }
        .sb-chip--primary { background: rgba(var(--color-primary) / 0.12); color: rgb(var(--color-primary)); }
        .sb-chip--success { background: rgba(var(--color-success) / 0.14); color: rgb(var(--color-success)); }
        .sb-chip--warning { background: rgba(var(--color-warning) / 0.16); color: rgb(var(--color-warning)); }

        /* History */
        .sb-history {
          position: relative; display: flex; align-items: center; gap: 12px; overflow: hidden;
          padding: 14px 16px 14px 18px; border-radius: var(--radius-lg);
          border: 1px solid var(--border-default); background: rgb(var(--bg-surface));
        }
        .sb-history__accent { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: rgb(var(--color-warning)); }
        .sb-history.is-settled .sb-history__accent { background: rgb(var(--color-success)); }
        .sb-history__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .sb-history__name { font-weight: 700; }
        .sb-history__meta { font-size: var(--font-xs); color: rgb(var(--text-muted)); }
        .sb-history__amount { text-align: right; display: flex; flex-direction: column; }
        .sb-history__amount span { font-weight: 800; font-size: var(--font-base); }
        .sb-history__amount .is-owed { color: rgb(var(--color-warning)); }
        .sb-history__amount .is-settled { color: rgb(var(--color-success)); }
        .sb-history__amount small { font-size: var(--font-xs); color: rgb(var(--text-muted)); }

        /* Scan */
        .sb-scan {
          display: flex; align-items: center; gap: 14px; cursor: pointer; margin-bottom: 16px;
          padding: 16px 18px; border-radius: var(--radius-lg);
          border: 1.5px dashed rgba(var(--color-primary) / 0.4); background: rgba(var(--color-primary) / 0.04);
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .sb-scan:hover { background: rgba(var(--color-primary) / 0.08); border-color: rgba(var(--color-primary) / 0.6); }
        .sb-scan.is-scanning { cursor: default; }
        .sb-scan__icon {
          width: 46px; height: 46px; min-width: 46px; border-radius: 14px; color: rgb(var(--color-primary));
          display: inline-flex; align-items: center; justify-content: center; background: rgba(var(--color-primary) / 0.12);
        }
        .sb-scan__text { flex: 1; display: flex; flex-direction: column; gap: 1px; }
        .sb-scan__text strong { font-size: var(--font-base); }
        .sb-scan__text small { font-size: var(--font-xs); color: rgb(var(--text-muted)); }
        .sb-scan__cam { color: rgb(var(--text-muted)); }

        /* Fields */
        .sb-field { display: block; margin-bottom: 16px; }
        .sb-field__label { display: block; font-size: var(--font-sm); font-weight: 700; margin-bottom: 7px; color: rgb(var(--text-secondary)); }
        .sb-input {
          width: 100%; font-family: inherit; font-size: var(--font-base); color: rgb(var(--text-primary));
          padding: 11px 14px; border-radius: var(--radius-md); outline: none;
          background: var(--input-bg, rgba(127,127,127,0.06)); border: 1px solid var(--border-default);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .sb-input::placeholder { color: rgb(var(--text-muted)); }
        .sb-input:focus { border-color: rgba(var(--color-primary) / 0.6); box-shadow: 0 0 0 3px rgba(var(--color-primary) / 0.12); }

        /* Segmented control */
        .sb-segment { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .sb-segment__btn {
          display: flex; flex-direction: column; align-items: flex-start; gap: 2px; cursor: pointer; font-family: inherit;
          padding: 12px 14px; border-radius: var(--radius-md); text-align: left;
          background: rgb(var(--bg-surface)); border: 1.5px solid var(--border-default);
          color: rgb(var(--text-secondary)); transition: all 0.15s ease;
        }
        .sb-segment__btn span { font-weight: 700; font-size: var(--font-base); }
        .sb-segment__btn small { font-size: var(--font-xs); color: rgb(var(--text-muted)); }
        .sb-segment__btn.is-active {
          border-color: rgb(var(--color-primary)); color: rgb(var(--color-primary));
          background: rgba(var(--color-primary) / 0.08);
        }
        .sb-segment__btn.is-active small { color: rgb(var(--color-primary)); opacity: 0.8; }

        /* Blocks */
        .sb-block {
          margin-bottom: 16px; padding: 16px 18px; border-radius: var(--radius-lg);
          border: 1px solid var(--border-default); background: rgb(var(--bg-surface));
        }
        .sb-block__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .sb-block__head h4 { font-size: var(--font-md); font-weight: 800; margin: 0; }
        .sb-block__total { font-weight: 800; font-size: var(--font-base); color: rgb(var(--color-primary)); }
        .sb-block__total--muted { display: inline-flex; align-items: center; gap: 4px; color: rgb(var(--text-muted)); font-weight: 700; }
        .sb-items { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }

        .sb-item-row { display: grid; grid-template-columns: 1fr 120px 64px 36px; gap: 8px; align-items: center; }
        .sb-item-row__qty { text-align: center; }
        .sb-party-row { display: flex; align-items: center; gap: 8px; }
        .sb-party-row__name { flex: 1; min-width: 0; }
        .sb-pct-input { position: relative; display: flex; align-items: center; width: 78px; }
        .sb-pct-input :global(input), .sb-pct-input .sb-input { width: 78px; text-align: center; padding-right: 24px; }
        .sb-pct-input span { position: absolute; right: 10px; font-size: var(--font-sm); color: rgb(var(--text-muted)); pointer-events: none; }

        .sb-remove {
          display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; min-width: 36px;
          border-radius: var(--radius-md); cursor: pointer; color: rgb(var(--color-error));
          background: rgba(var(--color-error) / 0.08); border: 1px solid rgba(var(--color-error) / 0.18);
          transition: background 0.15s ease;
        }
        .sb-remove:hover:not(:disabled) { background: rgba(var(--color-error) / 0.16); }
        .sb-remove:disabled { opacity: 0.35; cursor: default; }

        .sb-add {
          display: inline-flex; align-items: center; gap: 5px; cursor: pointer; font-family: inherit;
          font-weight: 700; font-size: var(--font-sm); color: rgb(var(--color-primary));
          padding: 8px 12px; border-radius: var(--radius-md);
          background: rgba(var(--color-primary) / 0.08); border: 1px dashed rgba(var(--color-primary) / 0.35);
          transition: background 0.15s ease;
        }
        .sb-add:hover { background: rgba(var(--color-primary) / 0.15); }
        .sb-add--inline { background: rgb(var(--bg-surface)); border-style: solid; }

        /* Percentage validation bar */
        .sb-pct-bar { margin-top: 12px; padding: 12px 14px; border-radius: var(--radius-md); background: rgb(var(--bg-elevated)); border: 1px solid rgba(var(--color-warning) / 0.3); }
        .sb-pct-bar.is-ok { border-color: rgba(var(--color-success) / 0.4); }
        .sb-pct-bar__info { display: flex; align-items: center; justify-content: space-between; font-size: var(--font-sm); margin-bottom: 8px; }
        .sb-pct-bar__info span { color: rgb(var(--text-muted)); }
        .sb-pct-bar__info strong { font-weight: 800; color: rgb(var(--color-warning)); }
        .sb-pct-bar.is-ok .sb-pct-bar__info strong { color: rgb(var(--color-success)); }
        .sb-pct-bar__track { height: 6px; border-radius: var(--radius-full); background: rgb(var(--bg-surface)); overflow: hidden; margin-bottom: 8px; }
        .sb-pct-bar__track span { display: block; height: 100%; background: rgb(var(--color-warning)); transition: width 0.3s ease; }
        .sb-pct-bar.is-ok .sb-pct-bar__track span { background: rgb(var(--color-success)); }

        /* Detail */
        .sb-detail-top { display: flex; align-items: center; justify-content: space-between; }
        .sb-icon-danger {
          display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px;
          border-radius: var(--radius-md); cursor: pointer; color: rgb(var(--color-error));
          background: rgba(var(--color-error) / 0.08); border: 1px solid rgba(var(--color-error) / 0.18);
          transition: background 0.15s ease;
        }
        .sb-icon-danger:hover { background: rgba(var(--color-error) / 0.16); }

        .sb-hero {
          position: relative; overflow: hidden; margin-bottom: 18px; padding: 20px;
          border-radius: var(--radius-xl); border: 1px solid rgba(var(--color-primary) / 0.22);
          background: linear-gradient(135deg, rgba(var(--color-primary) / 0.08), rgb(var(--bg-surface)) 60%);
        }
        .sb-hero__glow {
          position: absolute; top: -50%; right: -8%; width: 240px; height: 240px; border-radius: 50%;
          background: radial-gradient(circle, rgba(var(--color-secondary) / 0.16), transparent 70%); pointer-events: none;
        }
        .sb-hero__row { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .sb-hero__name { font-size: var(--font-xl); font-weight: 800; margin: 0 0 8px; letter-spacing: -0.02em; }
        .sb-hero__tags { display: flex; gap: 6px; flex-wrap: wrap; }
        .sb-hero__total { text-align: right; flex-shrink: 0; }
        .sb-hero__total small { display: block; font-size: var(--font-xs); color: rgb(var(--text-muted)); margin-bottom: 2px; }
        .sb-hero__total strong { font-size: var(--font-xl); font-weight: 800; color: rgb(var(--color-primary)); letter-spacing: -0.02em; }
        .sb-hero__progress { position: relative; margin-top: 16px; }
        .sb-hero__progress-info { display: flex; align-items: center; justify-content: space-between; font-size: var(--font-xs); color: rgb(var(--text-muted)); margin-bottom: 6px; }
        .sb-hero__progress-info span { display: inline-flex; align-items: center; gap: 4px; }

        .sb-live { position: relative; display: flex; align-items: center; gap: 6px; margin-top: 12px; font-size: var(--font-xs); color: rgb(var(--text-muted)); }
        .sb-live.is-live { color: rgb(var(--color-success)); }
        .sb-live__dot { width: 7px; height: 7px; border-radius: 50%; background: rgb(var(--text-muted)); }
        .sb-live.is-live .sb-live__dot { background: rgb(var(--color-success)); box-shadow: 0 0 0 rgba(var(--color-success) / 0.5); animation: sbPulse 1.6s ease-in-out infinite; }

        /* Detail items */
        .sb-detail-item { padding: 14px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: rgb(var(--bg-elevated)); }
        .sb-detail-item__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .sb-detail-item__name { font-weight: 700; }
        .sb-detail-item__name em { font-style: normal; color: rgb(var(--text-muted)); font-weight: 600; }
        .sb-detail-item__price { font-weight: 800; }
        .sb-assign { display: flex; gap: 6px; flex-wrap: wrap; }
        .sb-assign__chip {
          display: inline-flex; align-items: center; gap: 4px; cursor: pointer; font-family: inherit;
          padding: 6px 12px; border-radius: var(--radius-full); font-size: var(--font-xs); font-weight: 600;
          background: rgb(var(--bg-surface)); border: 1.5px solid var(--border-default); color: rgb(var(--text-secondary));
          transition: all 0.15s ease;
        }
        .sb-assign__chip.is-on { border-color: rgb(var(--color-primary)); background: rgba(var(--color-primary) / 0.12); color: rgb(var(--color-primary)); font-weight: 700; }

        /* Person row */
        .sb-person {
          position: relative; display: flex; align-items: center; gap: 12px; overflow: hidden;
          padding: 12px 14px 12px 16px; border-radius: var(--radius-lg);
          border: 1px solid var(--border-default); background: rgb(var(--bg-surface));
        }
        .sb-person__accent { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: rgb(var(--color-warning)); }
        .sb-person.is-paid .sb-person__accent { background: rgb(var(--color-success)); }
        .sb-person.is-paid { background: rgba(var(--color-success) / 0.05); }
        .sb-person__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
        .sb-person__name { font-weight: 700; display: inline-flex; align-items: center; gap: 7px; }
        .sb-person__pct { font-size: var(--font-xs); font-weight: 700; color: rgb(var(--color-primary)); background: rgba(var(--color-primary) / 0.12); padding: 1px 7px; border-radius: var(--radius-full); }
        .sb-person__amount { font-weight: 800; font-size: var(--font-base); color: rgb(var(--color-primary)); }
        .sb-person__actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .sb-paid-badge { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-xs); font-weight: 700; color: rgb(var(--color-success)); }
        .sb-act {
          display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px;
          border-radius: var(--radius-md); cursor: pointer; transition: transform 0.15s ease, background 0.15s ease;
        }
        .sb-act:active { transform: scale(0.92); }
        .sb-act--wa { color: #25D366; background: rgba(37, 211, 102, 0.12); border: 1px solid rgba(37, 211, 102, 0.25); }
        .sb-act--wa:hover { background: rgba(37, 211, 102, 0.2); }
        .sb-act--paid { color: rgb(var(--color-success)); background: rgba(var(--color-success) / 0.12); border: 1px solid rgba(var(--color-success) / 0.25); }
        .sb-act--paid:hover { background: rgba(var(--color-success) / 0.2); }

        @keyframes sbPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(var(--color-success) / 0.5); }
          50% { box-shadow: 0 0 0 5px rgba(var(--color-success) / 0); }
        }

        /* Mobile */
        @media (max-width: 640px) {
          .sb-root { padding: 0 4px; }
          .sb-header { flex-direction: column; gap: 10px; }
          .sb-header__actions { width: 100%; }
          .sb-header__actions :global(button) { flex: 1; justify-content: center; font-size: var(--font-xs); padding: 8px 6px; }

          .sb-item-row {
            grid-template-columns: 1fr 36px;
            grid-template-areas:
              'name remove'
              'price qty';
            gap: 6px;
          }
          .sb-item-row__name { grid-area: name; }
          .sb-item-row :global(.currency-input-container),
          .sb-item-row :global(input[type="text"]):not(.sb-item-row__name) { grid-area: price; min-width: 0; }
          .sb-item-row__qty { grid-area: qty; min-width: 50px; }
          .sb-item-row .sb-remove { grid-area: remove; justify-self: end; }

          .sb-party-row { flex-wrap: wrap; }
          .sb-pct-input { width: 64px; }
          .sb-pct-input :global(input) { width: 64px; font-size: var(--font-sm); }

          .sb-block { padding: 12px 12px; }
          .sb-hero { padding: 14px; }
          .sb-hero__row { flex-direction: column; gap: 8px; }
          .sb-hero__total { text-align: left; }
          .sb-hero__name { font-size: var(--font-lg); }
          .sb-hero__total strong { font-size: var(--font-lg); }

          .sb-detect { padding: 12px 14px; }
          .sb-detect__head { flex-wrap: wrap; gap: 10px; }
          .sb-detect__cta { width: 100%; justify-content: center; padding: 10px; margin-top: 4px; }
          .sb-detect__copy span { font-size: 11px; }

          .sb-scan { padding: 12px 14px; gap: 10px; }
          .sb-scan__icon { width: 38px; height: 38px; min-width: 38px; }

          .sb-bill { padding: 12px 14px 12px 16px; gap: 10px; }
          .sb-bill__amount { font-size: var(--font-base); }
          .sb-bill__meta { gap: 8px; font-size: 11px; }

          .sb-person { padding: 10px 12px 10px 14px; gap: 8px; }
          .sb-person__actions { gap: 4px; }
          .sb-act { width: 34px; height: 34px; }

          .sb-segment { gap: 6px; }
          .sb-segment__btn { padding: 10px 10px; }
          .sb-segment__btn span { font-size: var(--font-sm); }

          .sb-assign__chip { padding: 5px 8px; font-size: 11px; }
          .sb-detail-item { padding: 10px 12px; }

          .sb-history { padding: 10px 12px 10px 14px; gap: 8px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .sb-spin { animation-duration: 0.01ms; }
          .sb-bill, .sb-progress__fill, .sb-act, .sb-detect__cta { transition: none; }
          .sb-bill:hover { transform: none; }
          .sb-live.is-live .sb-live__dot { animation: none; }
        }
      `}</style>
    </AuthGuard>
  );
}
