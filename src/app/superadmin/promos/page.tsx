'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Alert, useToast, DatePicker, SelectOption } from '@/components/ui';
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag, Zap } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Promo {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountPercent: number;
  discountAmount: number;
  maxUses: number;
  usedCount: number;
  applicablePlans: string[];
  autoApply: boolean;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

interface PricingPlan {
  name: string;
  price: number;
}

export default function PromoManagementPage() {
  const { user, session } = useAuth();
  const { showToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percent' as 'percent' | 'fixed',
    discountPercent: 10,
    discountAmount: 5000,
    maxUses: 0,
    applicablePlans: [] as string[],
    autoApply: false,
    validUntil: '',
  });

  const fetchPromos = () => {
    apiFetch<Promo[]>('/superadmin/promos')
      .then(setPromos)
      .catch(() => setPromos([]))
      .finally(() => setLoading(false));
  };

  const fetchPlans = () => {
    apiFetch<PricingPlan[]>('/payments/plans')
      .then(data => setPlans(Array.isArray(data) ? data.filter(p => p.name !== 'FREE') : []))
      .catch(() => setPlans([]));
  };

  useEffect(() => { fetchPromos(); fetchPlans(); }, []);

  const apiCall = async (url: string, method: string, body?: any) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}${url}`, {
      method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Request failed'); }
    return res.json();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiCall('/superadmin/promos', 'POST', {
        code: formData.code,
        description: formData.description || undefined,
        discountType: formData.discountType,
        discountPercent: formData.discountType === 'percent' ? formData.discountPercent : 0,
        discountAmount: formData.discountType === 'fixed' ? formData.discountAmount : 0,
        maxUses: formData.maxUses,
        applicablePlans: formData.applicablePlans,
        autoApply: formData.autoApply,
        validUntil: formData.validUntil,
      });
      showToast('Promo berhasil dibuat!', 'success');
      setShowForm(false);
      setFormData({ code: '', description: '', discountType: 'percent', discountPercent: 10, discountAmount: 5000, maxUses: 0, applicablePlans: [], autoApply: false, validUntil: '' });
      fetchPromos();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal membuat promo.', 'error');
    }
  };

  const handleToggle = async (promo: Promo) => {
    try {
      await apiCall(`/superadmin/promos/${promo.id}`, 'PATCH', { isActive: !promo.isActive });
      fetchPromos();
      showToast(`Promo ${promo.code} ${!promo.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`, 'success');
    } catch { showToast('Gagal update promo.', 'error'); }
  };

  const handleDelete = async (promo: Promo) => {
    if (!confirm(`Hapus promo ${promo.code}?`)) return;
    try {
      await apiCall(`/superadmin/promos/${promo.id}`, 'DELETE');
      fetchPromos();
      showToast('Promo dihapus.', 'success');
    } catch { showToast('Gagal menghapus promo.', 'error'); }
  };

  const togglePlanSelection = (planName: string) => {
    setFormData(prev => ({
      ...prev,
      applicablePlans: prev.applicablePlans.includes(planName)
        ? prev.applicablePlans.filter(p => p !== planName)
        : [...prev.applicablePlans, planName],
    }));
  };

  const formatDiscount = (promo: Promo) => {
    if (promo.discountType === 'fixed') return `Rp ${promo.discountAmount.toLocaleString('id-ID')} off`;
    return `${promo.discountPercent}% off`;
  };

  return (
    <AuthGuard requiredRole="SUPERADMIN">
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Promo & Diskon" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          <div className="page-content animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>Manajemen Kode Promo</h2>
              <Button leftIcon={<Plus size={14} />} onClick={() => setShowForm(!showForm)}>
                {showForm ? 'Batal' : 'Buat Promo'}
              </Button>
            </div>

            {/* Create Form */}
            {showForm && (
              <Card style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Kode Promo */}
                  <div>
                    <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Kode Promo *</label>
                    <input
                      type="text" required value={formData.code} placeholder="e.g. MABA2026"
                      onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--input-bg)', fontSize: 'var(--font-sm)' }}
                    />
                  </div>

                  {/* Tipe Diskon */}
                  <div>
                    <SelectOption
                      label="Tipe Diskon"
                      required
                      value={formData.discountType}
                      onChange={(val) => setFormData({ ...formData, discountType: val as 'percent' | 'fixed' })}
                      options={[
                        { value: 'percent', label: 'Persentase (%)' },
                        { value: 'fixed', label: 'Potongan Tetap (Rp)' },
                      ]}
                    />
                  </div>

                  {/* Nilai Diskon */}
                  <div>
                    <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      {formData.discountType === 'percent' ? 'Diskon (%) *' : 'Potongan (Rp) *'}
                    </label>
                    {formData.discountType === 'percent' ? (
                      <input
                        type="number" required min={1} max={100} value={formData.discountPercent}
                        onChange={e => setFormData({ ...formData, discountPercent: +e.target.value })}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--input-bg)', fontSize: 'var(--font-sm)' }}
                      />
                    ) : (
                      <input
                        type="number" required min={1000} step={1000} value={formData.discountAmount}
                        onChange={e => setFormData({ ...formData, discountAmount: +e.target.value })}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--input-bg)', fontSize: 'var(--font-sm)' }}
                      />
                    )}
                  </div>

                  {/* Max Penggunaan */}
                  <div>
                    <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Max Penggunaan (0 = unlimited)</label>
                    <input
                      type="number" min={0} value={formData.maxUses}
                      onChange={e => setFormData({ ...formData, maxUses: +e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--input-bg)', fontSize: 'var(--font-sm)' }}
                    />
                  </div>

                  {/* Berlaku Hingga - DatePicker */}
                  <div>
                    <DatePicker
                      label="Berlaku Hingga"
                      required
                      value={formData.validUntil}
                      onChange={(val) => setFormData({ ...formData, validUntil: val })}
                      minDate={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  {/* Auto Apply Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '1.5rem' }}>
                    <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="checkbox" checked={formData.autoApply}
                        onChange={e => setFormData({ ...formData, autoApply: e.target.checked })}
                        style={{ width: 16, height: 16, accentColor: 'rgb(var(--color-primary))' }}
                      />
                      <Zap size={14} /> Auto-apply (otomatis diterapkan di billing)
                    </label>
                  </div>

                  {/* Berlaku untuk Plan - Multi checkbox */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Berlaku untuk Plan (kosong = semua plan)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {plans.map(plan => (
                        <label
                          key={plan.name}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '0.4rem 0.75rem', borderRadius: 6, cursor: 'pointer',
                            border: `1px solid ${formData.applicablePlans.includes(plan.name) ? 'rgb(var(--color-primary))' : 'var(--border-default)'}`,
                            background: formData.applicablePlans.includes(plan.name) ? 'rgba(var(--color-primary), 0.08)' : 'var(--input-bg)',
                            fontSize: 'var(--font-xs)', fontWeight: 500, transition: 'all 0.15s',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formData.applicablePlans.includes(plan.name)}
                            onChange={() => togglePlanSelection(plan.name)}
                            style={{ width: 14, height: 14, accentColor: 'rgb(var(--color-primary))' }}
                          />
                          {plan.name} <span style={{ color: 'rgb(var(--text-muted))', fontSize: '0.65rem' }}>(Rp {plan.price.toLocaleString('id-ID')})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Deskripsi */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Deskripsi</label>
                    <input
                      type="text" value={formData.description} placeholder="Deskripsi promo (opsional)"
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--input-bg)', fontSize: 'var(--font-sm)' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <Button type="submit" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', color: 'rgb(var(--bg-base))', border: 'none' }}>
                      Buat Promo
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Promo List */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1, 2, 3].map(n => <div key={n} className="skeleton" style={{ height: 80, borderRadius: 8 }} />)}
              </div>
            ) : promos.length === 0 ? (
              <Card style={{ padding: '2rem', textAlign: 'center', color: 'rgb(var(--text-muted))' }}>
                Belum ada kode promo. Klik &ldquo;Buat Promo&rdquo; untuk membuat.
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {promos.map(promo => {
                  const isExpired = new Date(promo.validUntil) < new Date();
                  const isExhausted = promo.maxUses > 0 && promo.usedCount >= promo.maxUses;
                  return (
                    <Card key={promo.id} style={{
                      padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      opacity: (!promo.isActive || isExpired || isExhausted) ? 0.6 : 1,
                      flexWrap: 'wrap', gap: '0.75rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Tag size={18} style={{ color: 'rgb(var(--color-primary))' }} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, fontFamily: 'monospace' }}>{promo.code}</span>
                            {promo.autoApply && (
                              <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '0.1rem 0.35rem', borderRadius: 4, background: 'rgba(var(--color-primary), 0.1)', color: 'rgb(var(--color-primary))' }}>
                                <Zap size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> AUTO
                              </span>
                            )}
                            <span style={{
                              fontSize: 'var(--font-xs)', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: 4,
                              background: promo.isActive && !isExpired && !isExhausted ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                              color: promo.isActive && !isExpired && !isExhausted ? '#22c55e' : '#ef4444',
                            }}>
                              {isExpired ? 'Expired' : isExhausted ? 'Habis' : promo.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </div>
                          <div style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginTop: 2 }}>
                            {formatDiscount(promo)} • {promo.usedCount}/{promo.maxUses || '∞'} used •
                            Berlaku: {promo.applicablePlans.length > 0 ? promo.applicablePlans.join(', ') : 'Semua plan'} •
                            Hingga {new Date(promo.validUntil).toLocaleDateString('id-ID')}
                          </div>
                          {promo.description && <div style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', fontStyle: 'italic' }}>{promo.description}</div>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button size="sm" variant="secondary" onClick={() => handleToggle(promo)} title={promo.isActive ? 'Nonaktifkan' : 'Aktifkan'}>
                          {promo.isActive ? <ToggleRight size={16} style={{ color: '#22c55e' }} /> : <ToggleLeft size={16} />}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => handleDelete(promo)} title="Hapus">
                          <Trash2 size={14} style={{ color: '#ef4444' }} />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
