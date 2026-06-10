'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Alert, Modal, useToast, useConfirm } from '@/components/ui';
import { duitTrackerService, Transaction, Summary, SavingTree, CategoryBudget } from '@/services/duitTrackerService';
import { Plus, Trash2, Loader2, TrendingUp, TrendingDown, Wallet, TreePine, Sparkles, ArrowUpCircle, ArrowDownCircle, Edit2, Target } from 'lucide-react';

const EXPENSE_CATEGORIES = ['makanan', 'minuman', 'transportasi', 'belanja', 'hiburan', 'tagihan', 'kesehatan', 'pendidikan', 'kos', 'lainnya'];
const INCOME_CATEGORIES = ['gaji', 'freelance', 'kiriman', 'beasiswa', 'bonus', 'jualan', 'lainnya'];

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
  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

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
    if (!form.amount || !form.label) return;
    setSubmitting(true);
    try {
      if (editingTx) {
        await duitTrackerService.updateTransaction(editingTx.id, { amount: parseFloat(form.amount), type: form.type as any, category: form.category, label: form.label, note: form.note || undefined, date: form.date || undefined });
        showToast('Transaksi berhasil diperbarui!', 'success');
      } else {
        await duitTrackerService.createTransaction({ amount: parseFloat(form.amount), type: form.type as any, category: form.category, label: form.label, note: form.note || undefined, date: form.date || undefined });
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
        showToast(`Input berhasil diparsing${p.parsedBy === 'rule' ? ' (instan)' : ' oleh AI'}!`, 'success');
      } else { showToast('Gagal memparse input. Coba format lain.', 'error'); }
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); setAiText(''); }
  };

  const handleAddTree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treeForm.name || !treeForm.targetAmount) return;
    setSubmitting(true);
    try {
      await duitTrackerService.createTree({ name: treeForm.name, targetAmount: parseFloat(treeForm.targetAmount), deadline: treeForm.deadline || undefined });
      showToast('Pohon tabungan berhasil dibuat!', 'success');
      setShowTreeModal(false); setTreeForm({ name: '', targetAmount: '', deadline: '' }); fetchData();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleTreeTx = async () => {
    if (!depositTreeId || !depositAmount) return;
    setSubmitting(true);
    try {
      await duitTrackerService.addTreeTransaction(depositTreeId, { amount: parseFloat(depositAmount), type: depositType });
      showToast(depositType === 'deposit' ? 'Tabungan ditambah!' : 'Penarikan berhasil!', 'success');
      setDepositTreeId(null); setDepositAmount(''); fetchData();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteTree = async (id: string) => {
    if (!await confirm({ message: 'Hapus pohon tabungan ini? Semua riwayat setoran akan hilang.', variant: 'danger' })) return;
    try { await duitTrackerService.deleteTree(id); showToast('Dihapus.', 'success'); fetchData(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetForm.amount) return;
    setSubmitting(true);
    try {
      await duitTrackerService.setBudget({ category: budgetForm.category, amount: parseFloat(budgetForm.amount), month, year });
      showToast('Budget berhasil diatur!', 'success');
      setShowBudgetModal(false); setBudgetForm({ category: 'makanan', amount: '' }); fetchData();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const fmt = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content">
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700 }}>💰 Duit Tracker</h1>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button onClick={() => setShowAiInput(true)} variant="secondary" size="sm"><Sparkles size={16} /> AI Input</Button>
                  <Button onClick={() => { setEditingTx(null); setForm({ amount: '', type: 'expense', category: 'lainnya', label: '', note: '', date: '' }); setShowAddModal(true); }} size="sm"><Plus size={16} /> Tambah</Button>
                </div>
              </div>
              {error && <Alert type="error" message={error} />}

              {/* Summary Cards */}
              {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
                  <Card><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><TrendingUp size={22} style={{ color: 'var(--color-success)' }} /><div><div style={{ fontSize: 11, opacity: 0.6 }}>Pemasukan</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-success)' }}>{fmt(summary.income)}</div></div></div></Card>
                  <Card><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><TrendingDown size={22} style={{ color: 'var(--color-error)' }} /><div><div style={{ fontSize: 11, opacity: 0.6 }}>Pengeluaran</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-error)' }}>{fmt(summary.expense)}</div></div></div></Card>
                  <Card><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Wallet size={22} style={{ color: 'var(--color-primary)' }} /><div><div style={{ fontSize: 11, opacity: 0.6 }}>Saldo</div><div style={{ fontSize: 18, fontWeight: 700, color: summary.balance >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>{fmt(summary.balance)}</div></div></div></Card>
                  <Card><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Target size={22} style={{ color: 'var(--color-warning)' }} /><div><div style={{ fontSize: 11, opacity: 0.6 }}>Transaksi</div><div style={{ fontSize: 18, fontWeight: 700 }}>{summary.transactionCount}</div></div></div></Card>
                </div>
              )}

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 8, overflowX: 'auto' }}>
                {[{ key: 'transactions', label: '📝 Transaksi' }, { key: 'summary', label: '📊 Ringkasan' }, { key: 'budget', label: '🎯 Budget' }, { key: 'trees', label: '🌳 Tabungan' }].map(t => (
                  <button key={t.key} onClick={() => setTab(t.key as any)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: tab === t.key ? 600 : 400, background: tab === t.key ? 'var(--color-primary)' : 'transparent', color: tab === t.key ? '#fff' : 'inherit', whiteSpace: 'nowrap', fontSize: 14 }}>{t.label}</button>
                ))}
              </div>

              {/* Filters */}
              {tab !== 'trees' && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input" style={{ width: 130 }}>
                    {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleDateString('id-ID', { month: 'long' })}</option>)}
                  </select>
                  <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input" style={{ width: 100 }}>
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  {tab === 'transactions' && (
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input" style={{ width: 140 }}>
                      <option value="">Semua Tipe</option>
                      <option value="income">Pemasukan</option>
                      <option value="expense">Pengeluaran</option>
                    </select>
                  )}
                </div>
              )}

              {loading ? <div style={{ textAlign: 'center', padding: 40 }}><Loader2 className="spin" size={32} /></div> : <>

              {/* Transactions */}
              {tab === 'transactions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {transactions.length === 0 ? (
                    <Card><div style={{ textAlign: 'center', padding: 24 }}><Wallet size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} /><p style={{ opacity: 0.6 }}>Belum ada transaksi bulan ini.</p><p style={{ fontSize: 13, opacity: 0.4 }}>Klik Tambah atau AI Input untuk mulai mencatat.</p></div></Card>
                  ) : transactions.map(tx => (
                    <Card key={tx.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {tx.type === 'income' ? <ArrowUpCircle size={18} style={{ color: 'var(--color-success)' }} /> : <ArrowDownCircle size={18} style={{ color: 'var(--color-error)' }} />}
                            <strong>{tx.label}</strong>
                            <span style={{ fontSize: 11, opacity: 0.6, background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 12, textTransform: 'capitalize' }}>{tx.category}</span>
                          </div>
                          {tx.bawelComment && (
                            <div style={{ marginTop: 6, fontSize: 13, fontStyle: 'italic', paddingLeft: 26, padding: '6px 10px 6px 26px', borderRadius: 8, background: tx.bawelLevel === 'warning' ? 'rgba(255,165,0,0.08)' : tx.bawelLevel === 'praise' ? 'rgba(0,200,0,0.08)' : 'var(--bg-secondary)' }}>
                              🗣️ {tx.bawelComment}
                            </div>
                          )}
                          <div style={{ fontSize: 12, opacity: 0.5, paddingLeft: 26, marginTop: 4 }}>
                            {new Date(tx.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {tx.note && ` · ${tx.note}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: tx.type === 'income' ? 'var(--color-success)' : 'var(--color-error)' }}>{tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}</span>
                          <button onClick={() => openEdit(tx)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.35 }}><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(tx.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.35 }}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Summary */}
              {tab === 'summary' && summary && (
                <Card>
                  <h3 style={{ marginBottom: 16 }}>Pengeluaran per Kategori</h3>
                  {summary.categoryReport.length === 0 ? <p style={{ opacity: 0.6 }}>Belum ada data.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {summary.categoryReport.sort((a, b) => b.spent - a.spent).map(cr => (
                        <div key={cr.category}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{cr.category}</span>
                            <span style={{ fontSize: 14 }}>{fmt(cr.spent)}{cr.budget ? <span style={{ opacity: 0.5 }}> / {fmt(cr.budget)}</span> : ''}</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 4, width: cr.percentage != null ? `${Math.min(cr.percentage, 100)}%` : '0%', background: (cr.percentage ?? 0) > 90 ? 'var(--color-error)' : (cr.percentage ?? 0) > 70 ? 'var(--color-warning)' : 'var(--color-success)', transition: 'width 0.3s' }} />
                          </div>
                          {cr.percentage != null && cr.percentage >= 80 && <div style={{ fontSize: 12, color: cr.percentage > 100 ? 'var(--color-error)' : 'var(--color-warning)', marginTop: 2 }}>⚠️ {cr.percentage > 100 ? `Over budget ${cr.percentage - 100}%!` : `${cr.percentage}% budget terpakai`}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* Budget */}
              {tab === 'budget' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><Button onClick={() => setShowBudgetModal(true)} size="sm"><Target size={16} /> Set Budget</Button></div>
                  {budgets.length === 0 ? (
                    <Card><div style={{ textAlign: 'center', padding: 24 }}><Target size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} /><p style={{ opacity: 0.6 }}>Belum ada budget.</p><p style={{ fontSize: 13, opacity: 0.4 }}>Atur budget per kategori agar pengeluaran terkontrol.</p></div></Card>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {budgets.map(b => {
                        const spent = summary?.categoryReport.find(c => c.category === b.category)?.spent ?? 0;
                        const pct = Math.round((spent / b.amount) * 100);
                        return (
                          <Card key={b.id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{b.category}</span><span style={{ fontSize: 14 }}>{fmt(spent)} / {fmt(b.amount)}</span></div>
                            <div style={{ height: 10, borderRadius: 5, background: 'var(--bg-secondary)', overflow: 'hidden' }}><div style={{ height: '100%', borderRadius: 5, width: `${Math.min(pct, 100)}%`, background: pct > 100 ? 'var(--color-error)' : pct > 80 ? 'var(--color-warning)' : 'var(--color-success)', transition: 'width 0.3s' }} /></div>
                            <div style={{ fontSize: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}><span style={{ opacity: 0.5 }}>{pct}% terpakai</span><span style={{ color: pct > 100 ? 'var(--color-error)' : 'var(--color-success)' }}>{pct > 100 ? `Over ${fmt(spent - b.amount)}` : `Sisa ${fmt(b.amount - spent)}`}</span></div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Trees */}
              {tab === 'trees' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><Button onClick={() => setShowTreeModal(true)} size="sm"><TreePine size={16} /> Buat Pohon</Button></div>
                  {trees.length === 0 ? (
                    <Card><div style={{ textAlign: 'center', padding: 24 }}><span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🌱</span><p style={{ opacity: 0.6 }}>Belum ada pohon tabungan.</p><p style={{ fontSize: 13, opacity: 0.4 }}>Buat pohon untuk menabung dengan cara menyenangkan!</p></div></Card>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                      {trees.map(tree => {
                        const pct = tree.targetAmount > 0 ? Math.min(Math.round((tree.currentAmount / tree.targetAmount) * 100), 100) : 0;
                        const stage = getTreeStage(pct);
                        return (
                          <Card key={tree.id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <div><h3 style={{ fontSize: 16, fontWeight: 600 }}>{tree.name}</h3>{tree.deadline && <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>Target: {new Date(tree.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}</div>
                              <button onClick={() => handleDeleteTree(tree.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><Trash2 size={14} /></button>
                            </div>
                            <div style={{ textAlign: 'center', padding: '16px 0', marginBottom: 12, background: 'var(--bg-secondary)', borderRadius: 12 }}>
                              <div style={{ fontSize: 48, marginBottom: 4 }}>{stage.emoji}</div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: stage.color }}>{stage.label}</div>
                              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{pct}%</div>
                            </div>
                            <div style={{ fontSize: 14, marginBottom: 8, textAlign: 'center' }}><span style={{ fontWeight: 700 }}>{fmt(tree.currentAmount)}</span><span style={{ opacity: 0.5 }}> / {fmt(tree.targetAmount)}</span></div>
                            <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden', marginBottom: 12 }}><div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: pct >= 100 ? '#FFD700' : stage.color, transition: 'width 0.5s' }} /></div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <Button size="sm" style={{ flex: 1 }} onClick={() => { setDepositTreeId(tree.id); setDepositType('deposit'); }}>+ Setor</Button>
                              <Button size="sm" variant="secondary" style={{ flex: 1 }} onClick={() => { setDepositTreeId(tree.id); setDepositType('withdrawal'); }}>- Tarik</Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              </>}
            </div>

            {/* Add/Edit Transaction Modal */}
            <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditingTx(null); }} title={editingTx ? 'Edit Transaksi' : 'Tambah Transaksi'}>
              <form onSubmit={handleAddTransaction} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setForm({ ...form, type: 'expense', category: EXPENSE_CATEGORIES[0] })} className={`btn ${form.type === 'expense' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>Pengeluaran</button>
                  <button type="button" onClick={() => setForm({ ...form, type: 'income', category: INCOME_CATEGORIES[0] })} className={`btn ${form.type === 'income' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>Pemasukan</button>
                </div>
                <input className="input" type="number" placeholder="Jumlah (Rp)" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                <input className="input" placeholder="Label / Keterangan" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} required />
                <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <textarea className="input" placeholder="Catatan (opsional)" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} />
                <input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                <Button type="submit" disabled={submitting}>{submitting ? <Loader2 className="spin" size={16} /> : (editingTx ? 'Simpan Perubahan' : 'Simpan')}</Button>
              </form>
            </Modal>

            <Modal isOpen={showAiInput} onClose={() => setShowAiInput(false)} title="✨ Input via AI / Natural Language">
              <p style={{ marginBottom: 8, fontSize: 14, opacity: 0.7 }}>Ketik transaksi dalam bahasa natural:</p>
              <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 3, fontSize: 13, opacity: 0.5 }}>
                <span>• &quot;kopi 25rb&quot;</span><span>• &quot;makan warteg 15000&quot;</span><span>• &quot;gajian 5.5 juta&quot;</span><span>• &quot;grab ke kampus 12rb&quot;</span>
              </div>
              <textarea className="input" placeholder="Ketik di sini..." value={aiText} onChange={e => setAiText(e.target.value)} rows={3} />
              <div style={{ marginTop: 12 }}><Button onClick={handleAiParse} disabled={submitting || !aiText.trim()}>{submitting ? <Loader2 className="spin" size={16} /> : <><Sparkles size={16} /> Parse</>}</Button></div>
            </Modal>

            <Modal isOpen={showTreeModal} onClose={() => setShowTreeModal(false)} title="🌱 Buat Pohon Tabungan">
              <form onSubmit={handleAddTree} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input className="input" placeholder="Nama tujuan (misal: Laptop Baru)" value={treeForm.name} onChange={e => setTreeForm({ ...treeForm, name: e.target.value })} required />
                <input className="input" type="number" placeholder="Target tabungan (Rp)" value={treeForm.targetAmount} onChange={e => setTreeForm({ ...treeForm, targetAmount: e.target.value })} required />
                <input className="input" type="date" value={treeForm.deadline} onChange={e => setTreeForm({ ...treeForm, deadline: e.target.value })} />
                <Button type="submit" disabled={submitting}>{submitting ? <Loader2 className="spin" size={16} /> : '🌱 Buat Pohon'}</Button>
              </form>
            </Modal>

            <Modal isOpen={!!depositTreeId} onClose={() => setDepositTreeId(null)} title={depositType === 'deposit' ? '💰 Setor Tabungan' : '💸 Tarik Tabungan'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input className="input" type="number" placeholder="Jumlah (Rp)" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
                <Button onClick={handleTreeTx} disabled={submitting || !depositAmount}>{submitting ? <Loader2 className="spin" size={16} /> : 'Konfirmasi'}</Button>
              </div>
            </Modal>

            <Modal isOpen={showBudgetModal} onClose={() => setShowBudgetModal(false)} title="🎯 Atur Budget Kategori">
              <form onSubmit={handleSetBudget} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 13, opacity: 0.6 }}>Set budget bulanan. Kamu akan dapat peringatan saat mendekati batas.</p>
                <select className="input" value={budgetForm.category} onChange={e => setBudgetForm({ ...budgetForm, category: e.target.value })}>{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <input className="input" type="number" placeholder="Budget (Rp)" value={budgetForm.amount} onChange={e => setBudgetForm({ ...budgetForm, amount: e.target.value })} required />
                <Button type="submit" disabled={submitting}>{submitting ? <Loader2 className="spin" size={16} /> : 'Simpan Budget'}</Button>
              </form>
            </Modal>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
