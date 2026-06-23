'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { kolektifService, Kolektif } from '@/services/kolektifService';
import { classService } from '@/services/classService';
import { Card, Button, Modal, useToast, useConfirm, TextInput, SelectOption, CurrencyInput, TextArea } from '@/components/ui';
import {
  Wallet, Plus, ArrowDownLeft, ArrowUpRight, Trash2, Loader2, Target, Users, ChevronRight
} from 'lucide-react';

interface KolektifTabProps {
  classId: string;
  memberRole?: string;
  permissions?: string[];
}

export function KolektifTab({ classId, memberRole, permissions }: KolektifTabProps) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const hasPerm = (perm: string) => memberRole === 'OWNER' || (permissions || []).includes(perm);
  const canCreateKas = hasPerm('KAS_CREATE');
  const canTransaction = hasPerm('KAS_TRANSACTION');

  const [funds, setFunds] = useState<Kolektif[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFund, setSelectedFund] = useState<Kolektif | null>(null);

  // Sub-tab: 'ringkasan' | 'riwayat' | 'anggota'
  const [subTab, setSubTab] = useState<'ringkasan' | 'riwayat' | 'anggota'>('ringkasan');
  const [perUserSummary, setPerUserSummary] = useState<any[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Class members for dropdown
  const [members, setMembers] = useState<any[]>([]);

  // Create fund form
  const [showCreateFund, setShowCreateFund] = useState(false);
  const [newFundName, setNewFundName] = useState('');
  const [newFundDesc, setNewFundDesc] = useState('');
  const [newFundTarget, setNewFundTarget] = useState('');
  const [newFundTargetPerPerson, setNewFundTargetPerPerson] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Add transaction form
  const [showAddTx, setShowAddTx] = useState(false);
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'IN' | 'OUT'>('IN');
  const [txDesc, setTxDesc] = useState('');
  const [txTargetUserId, setTxTargetUserId] = useState('');
  const [isAddingTx, setIsAddingTx] = useState(false);

  // Target per person update modal
  const [showUpdateTarget, setShowUpdateTarget] = useState(false);
  const [updateTargetAmount, setUpdateTargetAmount] = useState('');
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);

  const fetchFunds = useCallback(async () => {
    setLoading(true);
    try {
      const data = await kolektifService.getAll(classId);
      setFunds(data || []);
    } catch { } finally { setLoading(false); }
  }, [classId]);

  useEffect(() => {
    fetchFunds();
  }, [fetchFunds]);

  useEffect(() => {
    if (selectedFund) {
      // Fetch user summary
      setSummaryLoading(true);
      kolektifService.getSummaryByUser(selectedFund.id)
        .then(res => {
          setPerUserSummary(res.summary || []);
        })
        .catch(() => {
          showToast('Gagal memuat rekap kas anggota.', 'error');
        })
        .finally(() => setSummaryLoading(false));

      // Fetch class members for uploader dropdown
      classService.getClassMembers(classId).then(setMembers).catch(() => {});
    }
  }, [selectedFund, classId]);

  const cleanAmount = (val: string) => {
    return val ? parseFloat(val.replace(/\D/g, '')) : 0;
  };

  const handleCreateFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFundName.trim()) return;
    setIsCreating(true);
    try {
      await kolektifService.create(classId, {
        name: newFundName.trim(),
        description: newFundDesc.trim() || undefined,
        targetAmount: newFundTarget ? cleanAmount(newFundTarget) : undefined,
        targetPerPerson: newFundTargetPerPerson ? cleanAmount(newFundTargetPerPerson) : undefined,
      });
      setShowCreateFund(false);
      setNewFundName('');
      setNewFundDesc('');
      setNewFundTarget('');
      setNewFundTargetPerPerson('');
      fetchFunds();
      showToast('Kas berhasil dibuat!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal membuat kas.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFund || !txAmount) return;
    setIsAddingTx(true);
    try {
      await kolektifService.addTransaction(selectedFund.id, {
        amount: cleanAmount(txAmount),
        type: txType,
        description: txDesc.trim() || undefined,
        targetUserId: txTargetUserId || undefined,
      });
      setShowAddTx(false);
      setTxAmount('');
      setTxDesc('');
      setTxType('IN');
      setTxTargetUserId('');
      fetchFunds();
      // Refresh summary
      const res = await kolektifService.getSummaryByUser(selectedFund.id);
      setPerUserSummary(res.summary || []);
      showToast('Transaksi kas ditambahkan!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menambahkan transaksi.', 'error');
    } finally {
      setIsAddingTx(false);
    }
  };

  const handleUpdateTargetAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFund || !updateTargetAmount) return;
    setIsUpdatingTarget(true);
    try {
      await kolektifService.setTargetPerPerson(selectedFund.id, cleanAmount(updateTargetAmount));
      setShowUpdateTarget(false);
      setUpdateTargetAmount('');
      fetchFunds();
      // Refresh summary
      const res = await kolektifService.getSummaryByUser(selectedFund.id);
      setPerUserSummary(res.summary || []);
      showToast('Target iuran kelas diperbarui!', 'success');
    } catch (err) {
      showToast('Gagal merubah target iuran.', 'error');
    } finally {
      setIsUpdatingTarget(false);
    }
  };

  const handleDeleteTx = async (txId: string) => {
    const ok = await confirm({ title: 'Konfirmasi', message: 'Hapus transaksi ini?', confirmText: 'Hapus', variant: 'danger' });
    if (!ok) return;
    try {
      await kolektifService.deleteTransaction(txId);
      fetchFunds();
      if (selectedFund) {
        const res = await kolektifService.getSummaryByUser(selectedFund.id);
        setPerUserSummary(res.summary || []);
      }
      showToast('Transaksi dihapus.', 'success');
    } catch {
      showToast('Gagal menghapus transaksi.', 'error');
    }
  };

  const handleDeleteFund = async (fundId: string) => {
    const ok = await confirm({ title: 'Konfirmasi', message: 'Hapus kas ini beserta semua transaksinya?', confirmText: 'Hapus', variant: 'danger' });
    if (!ok) return;
    try {
      await kolektifService.deleteFund(fundId);
      setSelectedFund(null);
      fetchFunds();
      showToast('Kas dihapus.', 'success');
    } catch {
      showToast('Gagal menghapus kas.', 'error');
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  const activeFund = selectedFund ? funds.find((f) => f.id === selectedFund.id) || null : null;

  if (activeFund) {
    return (
      <div className="flex flex-col gap-5 animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
          <button 
            onClick={() => setSelectedFund(null)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: 'var(--font-sm)', 
              fontWeight: 600, 
              color: 'rgb(var(--color-primary))', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.25rem',
              transition: 'var(--transition-fast)'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            ← Kembali ke Semua Kas
          </button>
          <div className="flex gap-2">
            {canTransaction && (
              <Button 
                size="sm" 
                onClick={() => setShowAddTx(true)} 
                style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', color: 'black', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: 'var(--radius-md)' }}
              >
                <Plus size={14} /> Catat Transaksi
              </Button>
            )}
            {canCreateKas && (
              <Button 
                size="sm" 
                variant="danger" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: 'var(--radius-md)' }} 
                onClick={() => handleDeleteFund(activeFund.id)}
              >
                <Trash2 size={13} /> Hapus
              </Button>
            )}
          </div>
        </div>

        <Card style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: 'rgb(var(--text-primary))', letterSpacing: '-0.01em' }}>{activeFund.name}</h3>
              {activeFund.description && <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', marginTop: '0.35rem' }}>{activeFund.description}</p>}
            </div>
            {activeFund.targetAmount && (
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.65rem', color: 'rgb(var(--text-muted))', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>TARGET KAS KELAS</span>
                <span style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: 'rgb(var(--color-primary))', marginTop: '0.15rem', display: 'block' }}>{formatCurrency(activeFund.targetAmount)}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', background: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.12)', boxShadow: '0 4px 12px rgba(0, 212, 255, 0.02)' }}>
              <span style={{ fontSize: '0.65rem', color: 'rgb(0, 212, 255)', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saldo Kas Saat Ini</span>
              <span style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'rgb(var(--text-primary))', marginTop: '0.35rem', display: 'block', textShadow: '0 0 10px rgba(0, 212, 255, 0.2)' }}>{formatCurrency(activeFund.balance)}</span>
            </div>
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.12)', boxShadow: '0 4px 12px rgba(52, 211, 153, 0.02)' }}>
              <span style={{ fontSize: '0.65rem', color: '#34d399', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Uang Masuk</span>
              <span style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'rgb(var(--text-primary))', marginTop: '0.35rem', display: 'block' }}>{formatCurrency(activeFund.totalIn)}</span>
            </div>
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', background: 'rgba(248, 113, 113, 0.05)', border: '1px solid rgba(248, 113, 113, 0.12)', boxShadow: '0 4px 12px rgba(248, 113, 113, 0.02)' }}>
              <span style={{ fontSize: '0.65rem', color: '#f87171', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Uang Keluar</span>
              <span style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'rgb(var(--text-primary))', marginTop: '0.35rem', display: 'block' }}>{formatCurrency(activeFund.totalOut)}</span>
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.02)', padding: '0.35rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', alignSelf: 'flex-start' }}>
          {[
            { id: 'ringkasan' as const, label: 'Laporan Ringkas' },
            { id: 'riwayat' as const, label: 'Riwayat Transaksi' },
            { id: 'anggota' as const, label: 'Status Per Anggota' },
          ].map((tab) => {
            const isActive = subTab === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => setSubTab(tab.id)} 
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: 'var(--font-sm)', 
                  fontWeight: 600, 
                  borderRadius: 'var(--radius-md)', 
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)',
                  background: isActive ? 'linear-gradient(135deg, rgba(var(--color-primary), 0.15), rgba(var(--color-secondary), 0.15))' : 'transparent',
                  color: isActive ? 'white' : 'rgb(var(--text-muted))',
                  boxShadow: isActive ? 'inset 0 0 12px rgba(var(--color-primary) / 0.1)' : 'none'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {subTab === 'ringkasan' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <Card style={{ padding: '1.25rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: 'var(--font-md)', color: 'rgb(var(--text-primary))', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Target size={16} style={{ color: 'rgb(var(--color-primary))' }} /> Target Iuran Anggota
                </h4>
                <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-secondary))', marginBottom: '1rem', lineHeight: 1.5 }}>Setiap anggota kelas diwajibkan untuk menyetorkan kas dengan nominal target yang ditentukan di bawah ini.</p>
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-strong)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'rgb(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase' }}>Target Per Orang</span>
                  <span style={{ fontSize: 'var(--font-xl)', fontWeight: 900, color: 'rgb(var(--text-primary))', marginTop: '0.25rem', display: 'block' }}>{activeFund.targetPerPerson ? formatCurrency(activeFund.targetPerPerson) : 'Belum diatur'}</span>
                </div>
              </div>
              {canTransaction && (
                <Button 
                  onClick={() => setShowUpdateTarget(true)} 
                  variant="outline" 
                  style={{ width: '100%', marginTop: '1rem', justifyContent: 'center', borderColor: 'rgba(var(--color-primary) / 0.3)', color: 'rgb(var(--color-primary))' }}
                >
                  Ubah Target Iuran
                </Button>
              )}
            </Card>

            <Card style={{ padding: '1.25rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
              <h4 style={{ fontWeight: 700, fontSize: 'var(--font-md)', color: 'rgb(var(--text-primary))', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={16} style={{ color: 'rgb(var(--color-secondary))' }} /> Top Penyumbang Kas
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                {perUserSummary
                  .filter((x) => x.totalIn > 0)
                  .sort((a, b) => b.totalIn - a.totalIn)
                  .slice(0, 5)
                  .map((item, idx) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <div key={item.user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: 'var(--font-sm)', width: '20px' }}>{medals[idx] || `${idx + 1}`}</span>
                          <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'rgb(var(--text-primary))' }}>{item.user.fullName}</span>
                        </div>
                        <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'rgb(var(--color-secondary))' }}>{formatCurrency(item.totalIn)}</span>
                      </div>
                    );
                  })}
                {perUserSummary.filter((x) => x.totalIn > 0).length === 0 && (
                  <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', textAlign: 'center', padding: '2rem 0' }}>Belum ada sumbangan kas.</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {subTab === 'riwayat' && (
          <Card style={{ padding: '1.25rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
            {activeFund.transactions.length === 0 ? (
              <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', textAlign: 'center', padding: '3rem 0' }}>Belum ada riwayat transaksi kas.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {activeFund.transactions.map((tx: any) => (
                  <div 
                    key={tx.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      background: 'rgba(255,255,255,0.01)', 
                      padding: '0.75rem 1rem', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--border-subtle)',
                      transition: 'var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        padding: '0.5rem', 
                        borderRadius: 'var(--radius-md)', 
                        background: tx.type === 'IN' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)', 
                        color: tx.type === 'IN' ? '#34d399' : '#f87171',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {tx.type === 'IN' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'rgb(var(--text-primary))', display: 'block' }}>{tx.description || (tx.type === 'IN' ? 'Setoran Kas' : 'Pengeluaran Kas')}</span>
                        <span style={{ fontSize: '0.7rem', color: 'rgb(var(--text-muted))', display: 'block', marginTop: '0.15rem' }}>Oleh: {tx.user.fullName} • {formatDate(tx.createdAt)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: 'var(--font-sm)', fontWeight: 800, color: tx.type === 'IN' ? '#34d399' : '#f87171' }}>
                        {tx.type === 'IN' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                      {(canTransaction || tx.userId === classId) && (
                        <button 
                          onClick={() => handleDeleteTx(tx.id)} 
                          style={{ border: 'none', background: 'none', color: '#f87171', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                          className="hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {subTab === 'anggota' && (
          <Card style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)' }}>
            {summaryLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-sm)' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', color: 'rgb(var(--text-muted))', borderBottom: '1px solid var(--border-default)', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em' }}>
                      <th style={{ padding: '1rem 1.25rem' }}>Nama Anggota</th>
                      <th style={{ padding: '1rem 1.25rem' }}>Setoran (IN)</th>
                      <th style={{ padding: '1rem 1.25rem' }}>Pengeluaran (OUT)</th>
                      <th style={{ padding: '1rem 1.25rem' }}>Saldo Kontribusi</th>
                      <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Status Pembayaran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perUserSummary.map((item: any) => (
                      <tr 
                        key={item.user.id} 
                        style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'var(--transition-fast)' }}
                        className="hover:bg-white/[0.01]"
                      >
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'rgb(var(--text-primary))' }}>{item.user.fullName}</td>
                        <td style={{ padding: '1rem 1.25rem', color: '#34d399', fontWeight: 600 }}>{formatCurrency(item.totalIn)}</td>
                        <td style={{ padding: '1rem 1.25rem', color: '#f87171', fontWeight: 600 }}>{formatCurrency(item.totalOut)}</td>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'rgb(var(--text-primary))' }}>{formatCurrency(item.balance)}</td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <span style={{ 
                            display: 'inline-flex',
                            padding: '0.2rem 0.6rem', 
                            borderRadius: '9999px', 
                            fontSize: '0.65rem', 
                            fontWeight: 800, 
                            letterSpacing: '0.03em', 
                            textTransform: 'uppercase',
                            background: item.status === 'LUNAS' ? 'rgba(52, 211, 153, 0.12)' :
                                        item.status === 'KURANG' ? 'rgba(251, 191, 36, 0.12)' : 'rgba(248, 113, 113, 0.12)',
                            color: item.status === 'LUNAS' ? '#34d399' :
                                   item.status === 'KURANG' ? '#fbbf24' : '#f87171',
                            border: item.status === 'LUNAS' ? '1px solid rgba(52, 211, 153, 0.25)' :
                                    item.status === 'KURANG' ? '1px solid rgba(251, 191, 36, 0.25)' : '1px solid rgba(248, 113, 113, 0.25)',
                          }}>
                            {item.status === 'LUNAS' ? 'Lunas' :
                             item.status === 'KURANG' ? `Kurang ${formatCurrency(item.diff)}` : 'Belum Bayar'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ADD TRANSACTION MODAL */}
        <Modal isOpen={showAddTx} onClose={() => setShowAddTx(false)} title="Catat Transaksi Baru" size="md">
          <form onSubmit={handleAddTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', background: 'var(--input-bg)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <button 
                type="button" 
                onClick={() => setTxType('IN')} 
                style={{ 
                  padding: '0.5rem', 
                  fontSize: 'var(--font-xs)', 
                  fontWeight: 700, 
                  borderRadius: 'var(--radius-sm)', 
                  border: 'none', 
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                  background: txType === 'IN' ? 'rgba(52, 211, 153, 0.15)' : 'transparent', 
                  color: txType === 'IN' ? '#34d399' : 'rgb(var(--text-muted))'
                }}
              >
                📥 Pemasukan / Setor
              </button>
              <button 
                type="button" 
                onClick={() => setTxType('OUT')} 
                style={{ 
                  padding: '0.5rem', 
                  fontSize: 'var(--font-xs)', 
                  fontWeight: 700, 
                  borderRadius: 'var(--radius-sm)', 
                  border: 'none', 
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                  background: txType === 'OUT' ? 'rgba(248, 113, 113, 0.15)' : 'transparent', 
                  color: txType === 'OUT' ? '#f87171' : 'rgb(var(--text-muted))'
                }}
              >
                📤 Pengeluaran
              </button>
            </div>

              <CurrencyInput label="Nominal Uang" value={txAmount.replace(/\D/g, '')} onChange={v => setTxAmount(v)} required />

            {canTransaction && txType === 'IN' && (
              <SelectOption label="Atas Nama Anggota (Opsional)" value={txTargetUserId} onChange={v => setTxTargetUserId(v)} options={[
                { value: '', label: 'Diri Sendiri' },
                ...members.map((m) => ({ value: m.userId, label: m.user.fullName })),
              ]} />
            )}

            <TextInput label="Keterangan Transaksi" value={txDesc} onChange={v => setTxDesc(v)} placeholder="e.g. Bayar Kas Minggu 1, Beli Spidol" />

            <div style={{ display: 'flex', justifyContent: 'end', gap: '0.5rem', borderTop: '1px solid var(--border-default)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <Button type="button" variant="outline" style={{ borderRadius: 'var(--radius-md)' }} onClick={() => setShowAddTx(false)}>Batal</Button>
              <Button type="submit" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', color: 'black', borderRadius: 'var(--radius-md)', fontWeight: 700 }} isLoading={isAddingTx}>Simpan Transaksi</Button>
            </div>
          </form>
        </Modal>

        {/* UPDATE TARGET PERSON MODAL */}
        <Modal isOpen={showUpdateTarget} onClose={() => setShowUpdateTarget(false)} title="Atur Target Iuran Per Anggota" size="sm">
          <form onSubmit={handleUpdateTargetAmount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <CurrencyInput label="Target Nominal" value={updateTargetAmount.replace(/\D/g, '')} onChange={v => setUpdateTargetAmount(v)} required />

            <div style={{ display: 'flex', justifyContent: 'end', gap: '0.5rem', borderTop: '1px solid var(--border-default)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <Button type="button" variant="outline" style={{ borderRadius: 'var(--radius-md)' }} onClick={() => setShowUpdateTarget(false)}>Batal</Button>
              <Button type="submit" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', color: 'black', borderRadius: 'var(--radius-md)', fontWeight: 700 }} isLoading={isUpdatingTarget}>Simpan Target</Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)' }}>
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: 'rgb(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <Wallet size={18} style={{ color: 'rgb(var(--color-primary))' }} /> Kas & Iuran Kelas
        </h3>
        {canCreateKas && (
          <Button 
            onClick={() => setShowCreateFund(true)} 
            style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', color: 'black', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: 'var(--radius-md)' }}
          >
            <Plus size={14} /> Buat Kas Baru
          </Button>
        )}
      </div>

      {funds.length === 0 ? (
        <Card style={{ padding: '3rem 2rem', textAlign: 'center', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-xl)', background: 'rgba(255,255,255,0.01)' }}>
          <Wallet size={48} style={{ color: 'rgb(var(--text-muted))', margin: '0 auto 1rem', opacity: 0.3 }} />
          <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', margin: 0 }}>Belum ada kas kelas yang aktif.</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {funds.map((fund) => (
            <Card 
              key={fund.id} 
              hoverable 
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', cursor: 'pointer', padding: '1.25rem' }} 
              onClick={() => setSelectedFund(fund)}
            >
              <div>
                <h4 style={{ fontWeight: 800, color: 'rgb(var(--text-primary))', fontSize: 'var(--font-md)' }}>{fund.name}</h4>
                {fund.description && <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-secondary))', marginTop: '0.35rem' }} className="line-clamp-2">{fund.description}</p>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'rgb(var(--text-muted))', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>Saldo Kas</span>
                  <span style={{ fontSize: 'var(--font-md)', fontWeight: 800, color: 'rgb(var(--color-primary))', marginTop: '0.15rem', display: 'block' }}>{formatCurrency(fund.balance)}</span>
                </div>
                <ChevronRight size={14} style={{ color: 'rgb(var(--text-muted))' }} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE FUND MODAL */}
      <Modal isOpen={showCreateFund} onClose={() => setShowCreateFund(false)} title="Buat Kas Kelas Baru" size="md">
        <form onSubmit={handleCreateFund} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <TextInput label="Nama Kas / Iuran" value={newFundName} onChange={v => setNewFundName(v)} placeholder="e.g. Uang Kas Semester 5, Patungan Modul" required />

            <TextArea label="Keterangan / Tujuan" value={newFundDesc} onChange={setNewFundDesc} placeholder="Tulis rincian penggunaan kas..." rows={3} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <CurrencyInput label="Target Kas (Opsional)" value={newFundTarget.replace(/\D/g, '')} onChange={v => setNewFundTarget(v)} placeholder="5000000" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <CurrencyInput label="Target Iuran Per Orang (Opsional)" value={newFundTargetPerPerson.replace(/\D/g, '')} onChange={v => setNewFundTargetPerPerson(v)} placeholder="150000" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'end', gap: '0.5rem', borderTop: '1px solid var(--border-default)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="outline" style={{ borderRadius: 'var(--radius-md)' }} onClick={() => setShowCreateFund(false)}>Batal</Button>
            <Button type="submit" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', color: 'black', borderRadius: 'var(--radius-md)', fontWeight: 700 }} isLoading={isCreating}>Buat Kas</Button>
          </div>
        </form>
      </Modal>

      {/* ADD TRANSACTION MODAL */}
      <Modal isOpen={showAddTx} onClose={() => setShowAddTx(false)} title="Catat Transaksi Baru" size="md">
        <form onSubmit={handleAddTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', background: 'var(--input-bg)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
            <button 
              type="button" 
              onClick={() => setTxType('IN')} 
              style={{ 
                padding: '0.5rem', 
                fontSize: 'var(--font-xs)', 
                fontWeight: 700, 
                borderRadius: 'var(--radius-sm)', 
                border: 'none', 
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                background: txType === 'IN' ? 'rgba(52, 211, 153, 0.15)' : 'transparent', 
                color: txType === 'IN' ? '#34d399' : 'rgb(var(--text-muted))'
              }}
            >
              📥 Pemasukan / Setor
            </button>
            <button 
              type="button" 
              onClick={() => setTxType('OUT')} 
              style={{ 
                padding: '0.5rem', 
                fontSize: 'var(--font-xs)', 
                fontWeight: 700, 
                borderRadius: 'var(--radius-sm)', 
                border: 'none', 
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                background: txType === 'OUT' ? 'rgba(248, 113, 113, 0.15)' : 'transparent', 
                color: txType === 'OUT' ? '#f87171' : 'rgb(var(--text-muted))'
              }}
            >
              📤 Pengeluaran
            </button>
          </div>

          <CurrencyInput label="Nominal Uang" value={txAmount.replace(/\D/g, '')} onChange={v => setTxAmount(v)} required />

          {canTransaction && txType === 'IN' && (
            <SelectOption label="Atas Nama Anggota (Opsional)" value={txTargetUserId} onChange={v => setTxTargetUserId(v)} options={[
              { value: '', label: 'Diri Sendiri' },
              ...members.map((m) => ({ value: m.userId, label: m.user.fullName })),
            ]} />
          )}

          <TextInput label="Keterangan Transaksi" value={txDesc} onChange={v => setTxDesc(v)} placeholder="e.g. Bayar Kas Minggu 1, Beli Spidol" />

          <div style={{ display: 'flex', justifyContent: 'end', gap: '0.5rem', borderTop: '1px solid var(--border-default)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="outline" style={{ borderRadius: 'var(--radius-md)' }} onClick={() => setShowAddTx(false)}>Batal</Button>
            <Button type="submit" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', color: 'black', borderRadius: 'var(--radius-md)', fontWeight: 700 }} isLoading={isAddingTx}>Simpan Transaksi</Button>
          </div>
        </form>
      </Modal>

      {/* UPDATE TARGET PERSON MODAL */}
      <Modal isOpen={showUpdateTarget} onClose={() => setShowUpdateTarget(false)} title="Atur Target Iuran Per Anggota" size="sm">
        <form onSubmit={handleUpdateTargetAmount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <CurrencyInput label="Target Nominal" value={updateTargetAmount.replace(/\D/g, '')} onChange={v => setUpdateTargetAmount(v)} required />

          <div style={{ display: 'flex', justifyContent: 'end', gap: '0.5rem', borderTop: '1px solid var(--border-default)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="outline" style={{ borderRadius: 'var(--radius-md)' }} onClick={() => setShowUpdateTarget(false)}>Batal</Button>
            <Button type="submit" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', color: 'black', borderRadius: 'var(--radius-md)', fontWeight: 700 }} isLoading={isUpdatingTarget}>Simpan Target</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
