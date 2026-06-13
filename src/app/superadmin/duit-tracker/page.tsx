'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { superadminService } from '@/services/superadminService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Alert } from '@/components/ui';
import { Wallet, Loader2, Receipt, TreePine, Flame, Users, TrendingDown, TrendingUp } from 'lucide-react';

export default function SuperadminDuitTrackerPage() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await superadminService.getDuitTrackerStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const fmt = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <AuthGuard requiredRole="SUPERADMIN">
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Monitor Duit Tracker" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          {loading ? (
            <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="skeleton" style={{ height: 22, width: '45%', borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 120, borderRadius: 14 }} />
              <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
            </div>
          ) : (
            <div className="page-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Wallet size={22} style={{ color: 'rgb(var(--color-secondary))' }} />
                  Monitor Duit Tracker
                </h2>
                <p style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)', marginTop: '0.25rem' }}>Statistik keuangan pengguna di seluruh platform.</p>
              </div>

              {error && <Alert type="error" message={error} />}

              {stats && (
                <>
                  {/* Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-primary) / 0.1)', color: 'rgb(var(--color-primary))' }}><Receipt size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Total Transaksi</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.transactions.total.toLocaleString()}</h3>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{stats.transactions.today} hari ini</span>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-secondary) / 0.1)', color: 'rgb(var(--color-secondary))' }}><Users size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Pengguna Aktif</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.transactions.uniqueUsers}</h3>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>pernah catat transaksi</span>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(248,113,113,.1)', color: 'rgb(248,113,113)' }}><TrendingDown size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Total Pengeluaran</span>
                        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{fmt(stats.money.totalExpense)}</h3>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-success) / 0.1)', color: 'rgb(var(--color-success))' }}><TrendingUp size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Total Pemasukan</span>
                        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{fmt(stats.money.totalIncome)}</h3>
                      </div>
                    </Card>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {/* Category Breakdown */}
                    <Card>
                      <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Receipt size={16} style={{ color: 'rgb(var(--color-primary))' }} /> Top Kategori
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(stats.categories || []).slice(0, 8).map((c: any) => (
                          <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: 'var(--font-sm)' }}>{c.category || 'Lainnya'}</span>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>{c.count}x</span>
                              <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginLeft: '0.5rem' }}>{fmt(c.amount)}</span>
                            </div>
                          </div>
                        ))}
                        {(!stats.categories || stats.categories.length === 0) && (
                          <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>Belum ada data kategori.</p>
                        )}
                      </div>
                    </Card>

                    {/* Saving Trees & Bawel */}
                    <Card>
                      <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <TreePine size={16} style={{ color: 'rgb(var(--color-secondary))' }} /> Pohon Tabungan & Si Bawel
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>🌳 Pohon Aktif</span>
                          <span style={{ fontWeight: 700 }}>{stats.savingTrees.total}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>💰 Total Ditabung</span>
                          <span style={{ fontWeight: 700, color: 'rgb(var(--color-secondary))' }}>{fmt(stats.savingTrees.totalSaved)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>
                            <Flame size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4, color: '#F59E0B' }} />Si Bawel Aktif
                          </span>
                          <span style={{ fontWeight: 700 }}>{stats.bawel.enabled} user</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                          <span style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>📸 Receipt Scans</span>
                          <span style={{ fontWeight: 700 }}>{stats.receiptScans.total}</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
