'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Alert, Modal, useToast, useConfirm, CurrencyInput, parseCurrency, DateTimePicker } from '@/components/ui';
import { duitTrackerService, Transaction, Summary, SavingTree, CategoryBudget } from '@/services/duitTrackerService';
import { siBawelService, BawelSetting, WeeklyRoast } from '@/services/siBawelService';
import { Plus, Trash2, Loader2, TrendingUp, TrendingDown, Wallet, TreePine, Sparkles, ArrowUpCircle, ArrowDownCircle, Edit2, Target, Settings, Camera, ChevronDown, ChevronUp } from 'lucide-react';

const EXPENSE_CATEGORIES = [
  { id: 'makanan', emoji: '🍛', label: 'Makanan' },
  { id: 'minuman', emoji: '☕', label: 'Minuman' },
  { id: 'transportasi', emoji: '🚗', label: 'Transport' },
  { id: 'belanja', emoji: '🛒', label: 'Belanja' },
  { id: 'hiburan', emoji: '🎮', label: 'Hiburan' },
  { id: 'tagihan', emoji: '💡', label: 'Tagihan' },
  { id: 'kesehatan', emoji: '💊', label: 'Kesehatan' },
  { id: 'pendidikan', emoji: '📚', label: 'Pendidikan' },
  { id: 'kos', emoji: '🏠', label: 'Kos' },
  { id: 'lainnya', emoji: '📦', label: 'Lainnya' },
];
const INCOME_CATEGORIES = [
  { id: 'gaji', emoji: '💼', label: 'Gaji' },
  { id: 'freelance', emoji: '💻', label: 'Freelance' },
  { id: 'kiriman', emoji: '💌', label: 'Kiriman' },
  { id: 'beasiswa', emoji: '🎓', label: 'Beasiswa' },
  { id: 'bonus', emoji: '🎁', label: 'Bonus' },
  { id: 'jualan', emoji: '🏪', label: 'Jualan' },
  { id: 'lainnya', emoji: '📦', label: 'Lainnya' },
];

const TREE_TEMPLATES = [
  { emoji: '🎧', name: 'AirPods Pro', target: 4200000 },
  { emoji: '📱', name: 'iPhone Baru', target: 16000000 },
  { emoji: '💻', name: 'Laptop Baru', target: 18000000 },
  { emoji: '✈️', name: 'Liburan', target: 3000000 },
  { emoji: '🎓', name: 'Biaya Wisuda', target: 2000000 },
  { emoji: '🏠', name: 'Dana Darurat', target: 5000000 },
];

function getTreeStage(pct: number) {
  if (pct <= 0) return { emoji: '🕳️', label: 'Tanah kosong', color: '#8B7355' };
  if (pct < 15) return { emoji: '🌱', label: 'Benih', color: '#90EE90' };
  if (pct < 30) return { emoji: '🌿', label: 'Tunas', color: '#3CB371' };
  if (pct < 50) return { emoji: '🌲', label: 'Pohon muda', color: '#228B22' };
  if (pct < 70) return { emoji: '🌳', label: 'Pohon dewasa', color: '#006400' };
  if (pct < 85) return { emoji: '🌳✨', label: 'Pohon rindang', color: '#006400' };
  if (pct < 100) return { emoji: '🍎', label: 'Hampir panen', color: '#FF6347' };
  return { emoji: '🏆🎊', label: 'Target tercapai!', color: '#FFD700' };
}

function getCatEmoji(id: string, type: string) {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find(c => c.id === id)?.emoji || '📦';
}

export default function DuitTrackerPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tab, setTab] = useState<'transactions' | 'summary' | 'trees' | 'budget'>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trees, setTrees] = useState<SavingTree[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [form, setForm] = useState({ amount: '', type: 'expense', category: 'lainnya', label: '', note: '', date: '' });
  const [treeForm, setTreeForm] = useState({ name: '', targetAmount: '', deadline: '' });
  const [budgetForm, setBudgetForm] = useState({ category: 'makanan', amount: '' });
  const [aiText, setAiText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [depositTreeId, setDepositTreeId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositType, setDepositType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [bawelSetting, setBawelSetting] = useState<BawelSetting | null>(null);
  const [weeklyRoast, setWeeklyRoast] = useState<WeeklyRoast | null>(null);
  const [showBawelSettings, setShowBawelSettings] = useState(false);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    siBawelService.getSetting().then(setBawelSetting).catch(() => {});
    siBawelService.getWeeklyRoast().then(setWeeklyRoast).catch(() => {});
  }, []);

  const handleBawelToggle = async (field: string, value: any) => {
    try {
      const updated = await siBawelService.updateSetting({ [field]: value } as any);
      setBawelSetting(updated);
      showToast('Pengaturan Si Bawel diperbarui!', 'success');
    } catch { showToast('Gagal update setting.', 'error'); }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [txs, sum, ts, b] = await Promise.all([
        duitTrackerService.getTransactions({ month, year, type: typeFilter || undefined }),
        duitTrackerService.getSummary(month, year),
        duitTrackerService.getTrees(),
        duitTrackerService.getBudgets(month, year),
      ]);
      setTransactions(txs);
      setSummary(sum);
      setTrees(ts);
      setBudgets(b);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [month, year, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseCurrency(form.amount);
    if (!amt || !form.label) return;
    setSubmitting(true);
    try {
      if (editingTx) {
        await duitTrackerService.updateTransaction(editingTx.id, { amount: amt, type: form.type as any, category: form.category, label: form.label, note: form.note || undefined, date: form.date || undefined });
        showToast('Transaksi berhasil diperbarui!', 'success');
      } else {
        await duitTrackerService.createTransaction({ amount: amt, type: form.type as any, category: form.category, label: form.label, note: form.note || undefined, date: form.date || undefined });
        showToast('Transaksi berhasil ditambahkan!', 'success');
      }
      setShowAddModal(false); setEditingTx(null);
      setForm({ amount: '', type: 'expense', category: 'lainnya', label: '', note: '', date: '' });
      fetchData();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const openEdit = (tx: Transaction) => {
    const h = (Date.now() - new Date(tx.createdAt).getTime()) / 3600000;
    if (h > 24) { showToast('Transaksi hanya bisa diedit dalam 24 jam.', 'error'); return; }
    setEditingTx(tx);
    setForm({ amount: String(tx.amount), type: tx.type, category: tx.category, label: tx.label, note: tx.note || '', date: tx.date ? new Date(tx.date).toISOString().split('T')[0] : '' });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ message: 'Hapus transaksi ini?', variant: 'danger' })) return;
    try { await duitTrackerService.deleteTransaction(id); showToast('Transaksi dihapus.', 'success'); fetchData(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleAiParse = async () => {
    if (!aiText.trim()) return;
    setSubmitting(true);
    try {
      const p = await duitTrackerService.parseNaturalInput(aiText);
      if (p.amount) {
        setForm({ amount: String(p.amount), type: p.type || 'expense', category: p.category || 'lainnya', label: p.label || aiText, note: p.note || '', date: '' });
        setShowAiInput(false); setShowAddModal(true);
        showToast(`Berhasil diparsing!`, 'success');
      } else { showToast('Gagal memparse input.', 'error'); }
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); setAiText(''); }
  };

  const handleAddTree = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseCurrency(treeForm.targetAmount);
    if (!treeForm.name || !target) return;
    setSubmitting(true);
    try {
      await duitTrackerService.createTree({ name: treeForm.name, targetAmount: target, deadline: treeForm.deadline || undefined });
      showToast('Pohon tabungan berhasil dibuat! 🌱', 'success');
      setShowTreeModal(false); setTreeForm({ name: '', targetAmount: '', deadline: '' }); fetchData();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleTreeTx = async () => {
    if (!depositTreeId || !depositAmount) return;
    const amt = parseCurrency(depositAmount);
    if (!amt) return;
    setSubmitting(true);
    try {
      await duitTrackerService.addTreeTransaction(depositTreeId, { amount: amt, type: depositType });
      showToast(depositType === 'deposit' ? 'Tabungan ditambah! 🌳' : 'Penarikan berhasil.', 'success');
      setDepositTreeId(null); setDepositAmount(''); fetchData();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteTree = async (id: string) => {
    if (!await confirm({ message: 'Hapus pohon tabungan ini?', variant: 'danger' })) return;
    try { await duitTrackerService.deleteTree(id); showToast('Dihapus.', 'success'); fetchData(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseCurrency(budgetForm.amount);
    if (!amt) return;
    setSubmitting(true);
    try {
      await duitTrackerService.setBudget({ category: budgetForm.category, amount: amt, month, year });
      showToast('Budget berhasil diatur!', 'success');
      setShowBudgetModal(false); setBudgetForm({ category: 'makanan', amount: '' }); fetchData();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  // Group transactions by date
  const txByDate = transactions.reduce((acc, tx) => {
    const key = new Date(tx.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content" style={{ animation: 'fadeSlideIn 0.4s ease-out' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>💰 Duit Tracker</h1>
                  <p style={{ fontSize: 13, opacity: 0.5, marginTop: 2 }}>Lacak keuanganmu dengan cerdas</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => setShowBawelSettings(true)} style={{ background: 'var(--input-bg)', border: '1px solid var(--border-default)', cursor: 'pointer', padding: '8px 10px', borderRadius: 10, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'inherit' }} className="hover-lift" title="Pengaturan Si Bawel">
                    <Settings size={14} /> 🗣️
                  </button>
                  <Button onClick={() => setShowAiInput(true)} variant="secondary" size="sm"><Sparkles size={14} /> AI Input</Button>
                  <Button onClick={() => { setEditingTx(null); setForm({ amount: '', type: 'expense', category: 'lainnya', label: '', note: '', date: '' }); setShowAddModal(true); }} size="sm"><Plus size={14} /> Tambah</Button>
                </div>
              </div>

              {error && <Alert type="error" message={error} />}

              {/* Summary Cards — glassmorphism style */}
              {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
                  {[
                    { icon: <TrendingUp size={20} />, label: 'Pemasukan', value: summary.income, color: 'var(--color-success)', gradient: 'rgba(16, 185, 129, 0.06)' },
                    { icon: <TrendingDown size={20} />, label: 'Pengeluaran', value: summary.expense, color: 'var(--color-error)', gradient: 'rgba(239, 68, 68, 0.06)' },
                    { icon: <Wallet size={20} />, label: 'Saldo', value: summary.balance, color: summary.balance >= 0 ? 'var(--color-success)' : 'var(--color-error)', gradient: 'rgba(var(--color-primary), 0.04)' },
                    { icon: <Target size={20} />, label: 'Transaksi', value: summary.transactionCount, color: 'rgb(var(--color-primary))', gradient: 'rgba(var(--color-primary), 0.04)', isCurrency: false },
                  ].map((s, i) => (
                    <div key={i} style={{ padding: '18px 20px', borderRadius: 16, background: s.gradient, border: '1px solid var(--border-default)', backdropFilter: 'blur(8px)', transition: 'all 0.2s' }} className="hover-lift">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ color: s.color, opacity: 0.8 }}>{s.icon}</div>
                        <span style={{ fontSize: 12, opacity: 0.6, fontWeight: 500 }}>{s.label}</span>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: s.color, letterSpacing: -0.5 }}>
                        {s.isCurrency === false ? s.value : fmt(s.value as number)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabs — pill style */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 24, padding: 4, borderRadius: 14, background: 'var(--input-bg)', width: 'fit-content' }}>
                {[
                  { key: 'transactions', label: '📝 Transaksi' },
                  { key: 'summary', label: '📊 Ringkasan' },
                  { key: 'budget', label: '🎯 Budget' },
                  { key: 'trees', label: '🌳 Tabungan' },
                ].map(t => (
                  <button key={t.key} onClick={() => setTab(t.key as any)} style={{
                    padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontWeight: tab === t.key ? 600 : 400, fontSize: 13,
                    background: tab === t.key ? 'var(--card-bg)' : 'transparent',
                    color: tab === t.key ? 'rgb(var(--color-primary))' : 'inherit',
                    boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                    whiteSpace: 'nowrap', transition: 'all 0.2s',
                  }}>{t.label}</button>
                ))}
              </div>

              {/* Date filters */}
              {tab !== 'trees' && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ width: 140, borderRadius: 10, fontSize: 13, padding: '9px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-default)', color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                    {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleDateString('id-ID', { month: 'long' })}</option>)}
                  </select>
                  <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ width: 100, borderRadius: 10, fontSize: 13, padding: '9px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-default)', color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  {tab === 'transactions' && (
                    <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                      {[{ v: '', l: 'Semua' }, { v: 'income', l: '↑ Masuk' }, { v: 'expense', l: '↓ Keluar' }].map(f => (
                        <button key={f.v} onClick={() => setTypeFilter(f.v)} style={{
                          padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                          background: typeFilter === f.v ? 'rgb(var(--color-primary))' : 'var(--input-bg)',
                          color: typeFilter === f.v ? '#fff' : 'inherit', transition: 'all 0.2s',
                        }}>{f.l}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3].map(n => <div key={n} className="skeleton" style={{ height: 80, borderRadius: 14 }} />)}
                </div>
              ) : <>

              {/* ─── Transactions Tab ─── */}
              {tab === 'transactions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {transactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                      <Wallet size={48} style={{ opacity: 0.15, marginBottom: 12 }} />
                      <p style={{ opacity: 0.6, fontSize: 15, fontWeight: 500 }}>Belum ada transaksi bulan ini</p>
                      <p style={{ opacity: 0.35, fontSize: 13, marginTop: 4 }}>Klik &ldquo;AI Input&rdquo; atau &ldquo;Tambah&rdquo; untuk mulai</p>
                    </div>
                  ) : Object.entries(txByDate).map(([dateLabel, txs]) => (
                    <div key={dateLabel}>
                      <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.4, marginBottom: 8 }}>{dateLabel}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {txs.map(tx => (
                          <div key={tx.id} style={{
                            padding: '14px 16px', borderRadius: 14, background: 'var(--card-bg)',
                            border: '1px solid var(--border-default)', transition: 'all 0.2s',
                          }} className="hover-lift">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {/* Category emoji bubble */}
                              <div style={{
                                width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                                background: tx.type === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.06)',
                                flexShrink: 0,
                              }}>
                                {getCatEmoji(tx.category, tx.type)}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontWeight: 600, fontSize: 14 }}>{tx.label}</span>
                                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'var(--input-bg)', textTransform: 'capitalize', opacity: 0.7 }}>{tx.category}</span>
                                </div>
                                {tx.note && <div style={{ fontSize: 12, opacity: 0.45, marginTop: 2 }}>{tx.note}</div>}
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 15, color: tx.type === 'income' ? 'var(--color-success)' : 'var(--color-error)' }}>
                                  {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 2, flexShrink: 0, marginLeft: 4 }}>
                                <button onClick={(e) => { e.stopPropagation(); openEdit(tx); }} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.25, padding: 4, borderRadius: 6, transition: 'opacity 0.2s' }}><Edit2 size={13} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.25, padding: 4, borderRadius: 6, transition: 'opacity 0.2s' }}><Trash2 size={13} /></button>
                              </div>
                            </div>
                            {/* Si Bawel comment */}
                            {tx.bawelComment && (
                              <div style={{
                                marginTop: 8, fontSize: 12, lineHeight: 1.5, padding: '8px 12px', borderRadius: 10,
                                background: tx.bawelLevel === 'warning' ? 'rgba(245, 158, 11, 0.06)' : tx.bawelLevel === 'praise' ? 'rgba(16, 185, 129, 0.06)' : 'var(--input-bg)',
                                border: '1px solid transparent',
                                display: 'flex', alignItems: 'flex-start', gap: 6,
                              }}>
                                <span style={{ flexShrink: 0 }}>🗣️</span>
                                <span style={{ opacity: 0.7 }}>{tx.bawelComment}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ─── Summary Tab ─── */}
              {tab === 'summary' && summary && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Weekly Roast */}
                  {weeklyRoast && (
                    <div style={{
                      padding: '20px 22px', borderRadius: 16,
                      background: 'linear-gradient(135deg, rgba(255, 100, 0, 0.04) 0%, rgba(255, 50, 0, 0.02) 100%)',
                      border: '1px solid rgba(255, 100, 0, 0.12)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <span style={{ fontSize: 22 }}>🔥</span>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Weekly Roast</h3>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{weeklyRoast.score}/10</span>
                          <div style={{ width: 60, height: 6, borderRadius: 3, background: 'rgba(255,100,0,0.1)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${weeklyRoast.score * 10}%`, borderRadius: 3, background: 'linear-gradient(90deg, #ff6b35, #f7c948)', transition: 'width 0.5s' }} />
                          </div>
                        </div>
                      </div>
                      <p style={{ fontSize: 14, lineHeight: 1.7, margin: '0 0 12px', fontStyle: 'italic', opacity: 0.85 }}>&ldquo;{weeklyRoast.roast}&rdquo;</p>
                      {weeklyRoast.tip && (
                        <div style={{ fontSize: 13, padding: '10px 14px', borderRadius: 10, background: 'rgba(var(--color-primary), 0.05)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span>💡</span> <span style={{ opacity: 0.7 }}>{weeklyRoast.tip}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Category Breakdown */}
                  <Card style={{ padding: '20px 22px' }}>
                    <h3 style={{ marginBottom: 18, fontSize: 16, fontWeight: 700 }}>Pengeluaran per Kategori</h3>
                    {summary.categoryReport.length === 0 ? <p style={{ opacity: 0.5, fontSize: 14 }}>Belum ada data.</p> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        {summary.categoryReport.sort((a, b) => b.spent - a.spent).map(cr => {
                          const catInfo = EXPENSE_CATEGORIES.find(c => c.id === cr.category);
                          return (
                            <div key={cr.category}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span>{catInfo?.emoji || '📦'}</span> {catInfo?.label || cr.category}
                                </span>
                                <span style={{ fontSize: 13 }}>
                                  <strong>{fmt(cr.spent)}</strong>
                                  {cr.budget ? <span style={{ opacity: 0.4 }}> / {fmt(cr.budget)}</span> : ''}
                                </span>
                              </div>
                              <div style={{ height: 8, borderRadius: 4, background: 'var(--input-bg)', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%', borderRadius: 4,
                                  width: cr.percentage != null ? `${Math.min(cr.percentage, 100)}%` : '0%',
                                  background: (cr.percentage ?? 0) > 90
                                    ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                                    : (cr.percentage ?? 0) > 70
                                    ? 'linear-gradient(90deg, #f59e0b, #eab308)'
                                    : 'linear-gradient(90deg, #10b981, #34d399)',
                                  transition: 'width 0.5s ease',
                                }} />
                              </div>
                              {cr.percentage != null && cr.percentage >= 80 && (
                                <div style={{ fontSize: 11, color: cr.percentage > 100 ? 'var(--color-error)' : 'var(--color-warning)', marginTop: 3 }}>
                                  ⚠️ {cr.percentage > 100 ? `Over budget ${cr.percentage - 100}%` : `${cr.percentage}% budget terpakai`}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>

                  {/* ─── Subscription Tracker (Bocor Halus) ─── */}
                  {(() => {
                    // Rule-based: detect recurring expenses (same category + similar amount ±10%)
                    if (transactions.length < 10) return null;
                    const SUBSCRIPTION_KEYWORDS = ['spotify', 'netflix', 'icloud', 'youtube premium', 'shopee', 'kredivo', 'akulaku', 'indosat', 'telkomsel', 'xl', 'tri', 'disney', 'hbo', 'apple', 'google one', 'canva'];
                    const expenseTxs = transactions.filter(t => t.type === 'expense');
                    // Group by label (lowercase) and detect keyword matches
                    const labelGroups: Record<string, { count: number; totalAmount: number; label: string; category: string }> = {};
                    for (const tx of expenseTxs) {
                      const key = tx.label.toLowerCase().trim();
                      if (!labelGroups[key]) labelGroups[key] = { count: 0, totalAmount: 0, label: tx.label, category: tx.category };
                      labelGroups[key].count++;
                      labelGroups[key].totalAmount += tx.amount;
                    }
                    const detected = Object.values(labelGroups).filter(g => {
                      const isKeyword = SUBSCRIPTION_KEYWORDS.some(kw => g.label.toLowerCase().includes(kw));
                      return isKeyword || g.count >= 2;
                    }).filter(g => g.count >= 2);
                    if (detected.length === 0) return null;
                    const totalMonthly = detected.reduce((s, d) => s + (d.totalAmount / d.count), 0);
                    const totalYearly = totalMonthly * 12;
                    return (
                      <Card style={{ padding: '20px 22px', border: '1px solid rgba(245, 158, 11, 0.15)', background: 'rgba(245, 158, 11, 0.03)' }}>
                        <h3 style={{ marginBottom: 14, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                          🔄 Pengeluaran Rutin Terdeteksi
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                          {detected.map((d, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                              <span style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{getCatEmoji(d.category, 'expense')}</span> {d.label}
                              </span>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(Math.round(d.totalAmount / d.count))}/bulan</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(245, 158, 11, 0.06)', fontSize: 13 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>Total &ldquo;bocor halus&rdquo;: {fmt(Math.round(totalMonthly))}/bulan</div>
                          <div style={{ opacity: 0.7 }}>= {fmt(Math.round(totalYearly))}/tahun 😱</div>
                          <div style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>Kamu sadar gak kalau setahun kamu bayar segitu buat ini?</div>
                        </div>
                      </Card>
                    );
                  })()}
                </div>
              )}

              {/* ─── Budget Tab ─── */}
              {tab === 'budget' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Button onClick={() => setShowBudgetModal(true)} size="sm"><Target size={14} /> Set Budget</Button>
                  </div>
                  {budgets.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                      <Target size={48} style={{ opacity: 0.15, marginBottom: 12 }} />
                      <p style={{ opacity: 0.6, fontSize: 15, fontWeight: 500 }}>Belum ada budget</p>
                      <p style={{ opacity: 0.35, fontSize: 13, marginTop: 4 }}>Atur budget per kategori agar pengeluaran terkontrol</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {budgets.map(b => {
                        const spent = summary?.categoryReport.find(c => c.category === b.category)?.spent ?? 0;
                        const pct = Math.round((spent / b.amount) * 100);
                        const catInfo = EXPENSE_CATEGORIES.find(c => c.id === b.category);
                        return (
                          <div key={b.id} style={{ padding: '16px 18px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--border-default)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{catInfo?.emoji || '📦'}</span> {catInfo?.label || b.category}
                              </span>
                              <span style={{ fontSize: 13 }}>{fmt(spent)} / {fmt(b.amount)}</span>
                            </div>
                            <div style={{ height: 10, borderRadius: 5, background: 'var(--input-bg)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 5, width: `${Math.min(pct, 100)}%`, background: pct > 100 ? 'linear-gradient(90deg, #ef4444, #dc2626)' : pct > 80 ? 'linear-gradient(90deg, #f59e0b, #eab308)' : 'linear-gradient(90deg, #10b981, #34d399)', transition: 'width 0.5s ease' }} />
                            </div>
                            <div style={{ fontSize: 12, marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ opacity: 0.4 }}>{pct}% terpakai</span>
                              <span style={{ color: pct > 100 ? 'var(--color-error)' : 'var(--color-success)', fontWeight: 600 }}>
                                {pct > 100 ? `Over ${fmt(spent - b.amount)}` : `Sisa ${fmt(b.amount - spent)}`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Trees Tab ─── */}
              {tab === 'trees' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Button onClick={() => setShowTreeModal(true)} size="sm"><TreePine size={14} /> Buat Pohon</Button>
                  </div>
                  {trees.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                      <span style={{ fontSize: 56, display: 'block', marginBottom: 12 }}>🌱</span>
                      <p style={{ opacity: 0.6, fontSize: 15, fontWeight: 500 }}>Belum ada pohon tabungan</p>
                      <p style={{ opacity: 0.35, fontSize: 13, marginTop: 4 }}>Buat pohon untuk menabung dengan cara menyenangkan!</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                      {trees.map(tree => {
                        const pct = tree.targetAmount > 0 ? Math.min(Math.round((tree.currentAmount / tree.targetAmount) * 100), 100) : 0;
                        const stage = getTreeStage(pct);
                        return (
                          <div key={tree.id} style={{
                            padding: '20px 22px', borderRadius: 18, background: 'var(--card-bg)',
                            border: pct >= 100 ? '2px solid #FFD700' : '1px solid var(--border-default)',
                            position: 'relative', overflow: 'hidden',
                          }} className="hover-lift">
                            {pct >= 100 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)' }} />}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                              <div>
                                <h3 style={{ fontSize: 16, fontWeight: 700 }}>{tree.name}</h3>
                                {tree.deadline && <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>🎯 {new Date(tree.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                              </div>
                              <button onClick={() => handleDeleteTree(tree.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: 4 }}><Trash2 size={14} /></button>
                            </div>
                            <div style={{ textAlign: 'center', padding: '20px 0', borderRadius: 14, background: 'var(--input-bg)', marginBottom: 14 }}>
                              <div style={{ fontSize: 52, marginBottom: 4, filter: pct >= 100 ? 'drop-shadow(0 0 8px rgba(255,215,0,0.5))' : 'none' }}>{stage.emoji}</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: stage.color }}>{stage.label}</div>
                              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{pct}%</div>
                            </div>
                            <div style={{ fontSize: 14, marginBottom: 10, textAlign: 'center' }}>
                              <span style={{ fontWeight: 700 }}>{fmt(tree.currentAmount)}</span>
                              <span style={{ opacity: 0.4 }}> / {fmt(tree.targetAmount)}</span>
                            </div>
                            <div style={{ height: 8, borderRadius: 4, background: 'var(--input-bg)', overflow: 'hidden', marginBottom: 14 }}>
                              <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: pct >= 100 ? 'linear-gradient(90deg, #FFD700, #FFA500)' : `linear-gradient(90deg, ${stage.color}, ${stage.color}dd)`, transition: 'width 0.5s ease' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <Button size="sm" style={{ flex: 1, borderRadius: 10 }} onClick={() => { setDepositTreeId(tree.id); setDepositType('deposit'); }}>+ Setor</Button>
                              <Button size="sm" variant="secondary" style={{ flex: 1, borderRadius: 10 }} onClick={() => { setDepositTreeId(tree.id); setDepositType('withdrawal'); }}>- Tarik</Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              </>}
            </div>

            {/* ─── MODALS ─── */}

            {/* Add/Edit Transaction */}
            <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditingTx(null); }} title={editingTx ? '✏️ Edit Transaksi' : '💰 Tambah Transaksi'}>
              <form onSubmit={handleAddTransaction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Type toggle */}
                <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 12, background: 'var(--input-bg)' }}>
                  <button type="button" onClick={() => setForm({ ...form, type: 'expense', category: EXPENSE_CATEGORIES[0].id })} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    background: form.type === 'expense' ? 'var(--card-bg)' : 'transparent',
                    color: form.type === 'expense' ? 'var(--color-error)' : 'inherit',
                    boxShadow: form.type === 'expense' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s',
                  }}>↓ Pengeluaran</button>
                  <button type="button" onClick={() => setForm({ ...form, type: 'income', category: INCOME_CATEGORIES[0].id })} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    background: form.type === 'income' ? 'var(--card-bg)' : 'transparent',
                    color: form.type === 'income' ? 'var(--color-success)' : 'inherit',
                    boxShadow: form.type === 'income' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s',
                  }}>↑ Pemasukan</button>
                </div>

                {/* Amount — CurrencyInput */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Jumlah</label>
                  <CurrencyInput value={form.amount} onChange={(val) => setForm({ ...form, amount: val })} placeholder="Rp 0" />
                </div>

                {/* Label */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Keterangan</label>
                  <input className="input" placeholder="Kopi, makan siang, gajian..." value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} required style={{ borderRadius: 10, padding: '10px 14px' }} />
                </div>

                {/* Category chips */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.6 }}>Kategori</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {categories.map(c => (
                      <button key={c.id} type="button" onClick={() => setForm({ ...form, category: c.id })} style={{
                        padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: form.category === c.id ? 600 : 400,
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: form.category === c.id ? 'rgba(var(--color-primary), 0.1)' : 'var(--input-bg)',
                        color: form.category === c.id ? 'rgb(var(--color-primary))' : 'inherit',
                        outline: form.category === c.id ? '2px solid rgb(var(--color-primary))' : 'none',
                        outlineOffset: -1, transition: 'all 0.2s',
                      }}><span>{c.emoji}</span> {c.label}</button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Catatan (opsional)</label>
                  <textarea className="input" placeholder="Detail tambahan..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} style={{ borderRadius: 10, padding: '10px 14px', resize: 'none' }} />
                </div>

                {/* Date */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Tanggal</label>
                  <DateTimePicker mode="date" value={form.date} onChange={v => setForm({ ...form, date: v })} placeholder="Pilih tanggal" />
                </div>

                <Button type="submit" disabled={submitting} style={{ borderRadius: 12, padding: '12px 0', marginTop: 4 }}>
                  {submitting ? <Loader2 className="spin" size={16} /> : (editingTx ? 'Simpan Perubahan' : '💾 Simpan Transaksi')}
                </Button>
              </form>
            </Modal>

            {/* AI Input */}
            <Modal isOpen={showAiInput} onClose={() => setShowAiInput(false)} title="✨ Input Cerdas">
              <p style={{ marginBottom: 12, fontSize: 13, opacity: 0.6 }}>Ketik transaksi dalam bahasa natural. AI akan otomatis parsing jumlah, kategori, dan tipe.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {['kopi 25rb', 'makan warteg 15rb', 'gaji 5.5 juta', 'grab 12k'].map(ex => (
                  <button key={ex} type="button" onClick={() => setAiText(ex)} style={{
                    padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 11, background: 'var(--input-bg)', opacity: 0.7, transition: 'opacity 0.2s',
                  }}>&ldquo;{ex}&rdquo;</button>
                ))}
              </div>
              <textarea className="input" placeholder="Ketik di sini..." value={aiText} onChange={e => setAiText(e.target.value)} rows={3} style={{ borderRadius: 10, padding: '12px 14px', resize: 'none' }} />
              <div style={{ marginTop: 14 }}>
                <Button onClick={handleAiParse} disabled={submitting || !aiText.trim()} style={{ width: '100%', borderRadius: 12, padding: '12px 0' }}>
                  {submitting ? <Loader2 className="spin" size={16} /> : <><Sparkles size={16} /> Parse & Tambahkan</>}
                </Button>
              </div>
            </Modal>

            {/* Tree Modal */}
            <Modal isOpen={showTreeModal} onClose={() => setShowTreeModal(false)} title="🌱 Buat Pohon Tabungan">
              <form onSubmit={handleAddTree} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Quick templates */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.6 }}>Pilih template atau isi sendiri</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {TREE_TEMPLATES.map(t => (
                      <button key={t.name} type="button" onClick={() => setTreeForm({ name: t.name, targetAmount: String(t.target), deadline: '' })} style={{
                        padding: '6px 12px', borderRadius: 10, border: '1px solid var(--border-default)', cursor: 'pointer',
                        fontSize: 12, background: treeForm.name === t.name ? 'rgba(var(--color-primary), 0.08)' : 'transparent',
                        display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s',
                      }}><span>{t.emoji}</span> {t.name}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Nama tujuan</label>
                  <input className="input" placeholder="Laptop Baru, Liburan Bali..." value={treeForm.name} onChange={e => setTreeForm({ ...treeForm, name: e.target.value })} required style={{ borderRadius: 10, padding: '10px 14px' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Target tabungan</label>
                  <CurrencyInput value={treeForm.targetAmount} onChange={(val) => setTreeForm({ ...treeForm, targetAmount: val })} placeholder="Rp 0" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Deadline (opsional)</label>
                  <DateTimePicker mode="date" value={treeForm.deadline} onChange={v => setTreeForm({ ...treeForm, deadline: v })} placeholder="Pilih deadline" />
                </div>
                <Button type="submit" disabled={submitting} style={{ borderRadius: 12, padding: '12px 0', marginTop: 4 }}>
                  {submitting ? <Loader2 className="spin" size={16} /> : '🌱 Buat Pohon'}
                </Button>
              </form>
            </Modal>

            {/* Deposit/Withdraw Modal */}
            <Modal isOpen={!!depositTreeId} onClose={() => setDepositTreeId(null)} title={depositType === 'deposit' ? '💰 Setor Tabungan' : '💸 Tarik Tabungan'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Jumlah</label>
                  <CurrencyInput value={depositAmount} onChange={setDepositAmount} placeholder="Rp 0" />
                </div>
                <Button onClick={handleTreeTx} disabled={submitting || !depositAmount} style={{ borderRadius: 12, padding: '12px 0' }}>
                  {submitting ? <Loader2 className="spin" size={16} /> : 'Konfirmasi'}
                </Button>
              </div>
            </Modal>

            {/* Budget Modal */}
            <Modal isOpen={showBudgetModal} onClose={() => setShowBudgetModal(false)} title="🎯 Atur Budget Kategori">
              <form onSubmit={handleSetBudget} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}>Set budget bulanan. Kamu akan dapat peringatan saat mendekati batas.</p>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.6 }}>Kategori</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {EXPENSE_CATEGORIES.map(c => (
                      <button key={c.id} type="button" onClick={() => setBudgetForm({ ...budgetForm, category: c.id })} style={{
                        padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12,
                        fontWeight: budgetForm.category === c.id ? 600 : 400,
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: budgetForm.category === c.id ? 'rgba(var(--color-primary), 0.1)' : 'var(--input-bg)',
                        color: budgetForm.category === c.id ? 'rgb(var(--color-primary))' : 'inherit',
                        outline: budgetForm.category === c.id ? '2px solid rgb(var(--color-primary))' : 'none',
                        outlineOffset: -1, transition: 'all 0.2s',
                      }}><span>{c.emoji}</span> {c.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Budget bulanan</label>
                  <CurrencyInput value={budgetForm.amount} onChange={(val) => setBudgetForm({ ...budgetForm, amount: val })} placeholder="Rp 0" />
                </div>
                <Button type="submit" disabled={submitting} style={{ borderRadius: 12, padding: '12px 0', marginTop: 4 }}>
                  {submitting ? <Loader2 className="spin" size={16} /> : '💾 Simpan Budget'}
                </Button>
              </form>
            </Modal>

            {/* Si Bawel Settings */}
            <Modal isOpen={showBawelSettings} onClose={() => setShowBawelSettings(false)} title="🗣️ Pengaturan Si Bawel">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}>Si Bawel adalah AI keuangan yang otomatis berkomentar pada setiap transaksimu.</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: 'var(--input-bg)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Aktifkan Si Bawel</span>
                  <button onClick={() => handleBawelToggle('isEnabled', !bawelSetting?.isEnabled)} style={{ width: 50, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer', background: bawelSetting?.isEnabled ? 'rgb(var(--color-primary))' : 'var(--border-default)', position: 'relative', transition: 'background 0.3s' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: bawelSetting?.isEnabled ? 25 : 3, transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                  </button>
                </div>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'block' }}>Level Kebawelan</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['SANTAI', 'NORMAL', 'CEREWET'] as const).map(level => (
                      <button key={level} onClick={() => handleBawelToggle('level', level)} style={{
                        flex: 1, padding: '14px 8px', borderRadius: 14,
                        border: bawelSetting?.level === level ? '2px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                        background: bawelSetting?.level === level ? 'rgba(var(--color-primary), 0.06)' : 'transparent',
                        cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                      }} className="hover-lift">
                        <div style={{ fontSize: 24, marginBottom: 6 }}>{level === 'SANTAI' ? '😌' : level === 'NORMAL' ? '🗣️' : '😤'}</div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{level}</div>
                        <div style={{ fontSize: 10, opacity: 0.45, marginTop: 3, lineHeight: 1.3 }}>{level === 'SANTAI' ? '>Rp100K saja' : level === 'NORMAL' ? 'Semua transaksi' : 'Detail + cross-ref'}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Modal>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
