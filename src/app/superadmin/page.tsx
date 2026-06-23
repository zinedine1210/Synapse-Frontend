'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { superadminService } from '@/services/superadminService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Alert } from '@/components/ui';
import { useCache } from '@/lib/cache';
import {
  Users,
  BookOpen,
  FileText,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

interface AnalyticsData {
  users: { total: number; pro: number; free: number };
  classes: { total: number };
  materials: { total: number; processing: number };
  payments: { total: number; success: number; totalRevenue: number };
}

export default function SuperadminPage() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { data: analytics, loading, error: cacheError } = useCache<AnalyticsData>('superadmin:analytics', () => superadminService.getAnalytics());
  const error = cacheError ? (cacheError instanceof Error ? cacheError.message : 'Gagal memuat data analitik.') : null;

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <AuthGuard requiredRole="SUPERADMIN">
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Analitik Sistem" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          {loading ? (
            <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="skeleton" style={{ height: 24, width: '50%', borderRadius: 8 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {[1,2,3,4].map(n => <div key={n} className="skeleton" style={{ height: 100, borderRadius: 14 }} />)}
              </div>
              <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
            </div>
          ) : (
            <div className="page-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={20} style={{ color: 'rgb(var(--color-primary))' }} />
                  Panel Analitik
                </h2>
                <p style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)', marginTop: '0.25rem' }}>
                  Pantau kinerja platform secara real-time.
                </p>
              </div>

              {error && <Alert type="error" message={error} />}

              {analytics && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-primary) / 0.1)', color: 'rgb(var(--color-primary))' }}><Users size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', fontWeight: 500 }}>Total Pengguna</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginTop: '0.1rem' }}>{analytics.users.total}</h3>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{analytics.users.pro} Pro • {analytics.users.free} Free</span>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-secondary) / 0.1)', color: 'rgb(var(--color-secondary))' }}><BookOpen size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', fontWeight: 500 }}>Total Kelas</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginTop: '0.1rem' }}>{analytics.classes.total}</h3>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Tercatat di sistem</span>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-info) / 0.1)', color: 'rgb(var(--color-info))' }}><FileText size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', fontWeight: 500 }}>Berkas Kuliah</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginTop: '0.1rem' }}>{analytics.materials.total}</h3>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{analytics.materials.processing} sedang diproses</span>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-success) / 0.12)', color: 'rgb(var(--color-success))' }}><DollarSign size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', fontWeight: 500 }}>Pendapatan</span>
                        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginTop: '0.1rem' }}>{formatRupiah(analytics.payments.totalRevenue)}</h3>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{analytics.payments.success} transaksi sukses</span>
                      </div>
                    </Card>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    <Card>
                      <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Users size={16} style={{ color: 'rgb(var(--color-primary))' }} /> Distribusi Pengguna
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>PRO</span>
                          <span style={{ fontSize: 'var(--font-base)', fontWeight: 600, color: 'rgb(var(--color-secondary))' }}>{analytics.users.pro}</span>
                        </div>
                        <div style={{ height: '4px', borderRadius: '2px', background: 'var(--input-bg)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', width: analytics.users.total > 0 ? `${(analytics.users.pro / analytics.users.total) * 100}%` : '0%', transition: 'width 0.5s' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>FREE</span>
                          <span style={{ fontSize: 'var(--font-base)', fontWeight: 600, color: 'rgb(var(--text-secondary))' }}>{analytics.users.free}</span>
                        </div>
                        <div style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginTop: '0.15rem' }}>
                          Konversi PRO: {analytics.users.total > 0 ? ((analytics.users.pro / analytics.users.total) * 100).toFixed(1) : '0'}%
                        </div>
                      </div>
                    </Card>

                    <Card>
                      <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <DollarSign size={16} style={{ color: 'rgb(var(--color-secondary))' }} /> Ringkasan Transaksi
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>Total Transaksi</span>
                          <span style={{ fontWeight: 600 }}>{analytics.payments.total}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>Transaksi Sukses</span>
                          <span style={{ fontWeight: 600, color: 'rgb(var(--color-secondary))' }}>{analytics.payments.success}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-default)', paddingTop: '0.4rem' }}>
                          <span style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>Pendapatan</span>
                          <span style={{ fontWeight: 700, color: 'rgb(var(--color-secondary))' }}>{formatRupiah(analytics.payments.totalRevenue)}</span>
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
