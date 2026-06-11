'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { superadminService } from '@/services/superadminService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Alert } from '@/components/ui';
import { GraduationCap, Loader2, FileText, ClipboardCheck, BarChart3, BookOpen } from 'lucide-react';

export default function SuperadminAcademicPage() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await superadminService.getAcademicStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <AuthGuard requiredRole="SUPERADMIN">
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Monitor Akademik" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          {loading ? (
            <div style={{ minHeight: 'calc(100vh - var(--appbar-height))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="animate-spin" size={36} style={{ color: 'rgb(var(--color-primary))' }} />
            </div>
          ) : (
            <div className="page-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <GraduationCap size={22} style={{ color: 'rgb(var(--color-primary))' }} />
                  Monitor Akademik
                </h2>
                <p style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)', marginTop: '0.25rem' }}>Tugas, kuis, prediksi ujian, dan materi pembelajaran.</p>
              </div>

              {error && <Alert type="error" message={error} />}

              {stats && (
                <>
                  {/* Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-primary) / 0.1)', color: 'rgb(var(--color-primary))' }}><FileText size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Total Tugas</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.tasks.total}</h3>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{stats.tasks.submissions} submissions</span>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-secondary) / 0.1)', color: 'rgb(var(--color-secondary))' }}><ClipboardCheck size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Kuis Dibuat</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.quizzes.total}</h3>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{stats.quizzes.attempts} percobaan</span>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245,158,11,.1)', color: '#F59E0B' }}><BarChart3 size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Prediksi Ujian</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.examPredictions}</h3>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-success) / 0.1)', color: 'rgb(var(--color-success))' }}><BookOpen size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Materi</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.materials.total}</h3>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{stats.materials.active} aktif</span>
                      </div>
                    </Card>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {/* Tasks Detail */}
                    <Card>
                      <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.75rem' }}>📝 Detail Tugas</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: 'var(--font-sm)' }}>Total Tugas</span>
                          <span style={{ fontWeight: 700 }}>{stats.tasks.total}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: 'var(--font-sm)' }}>Submission Diterima</span>
                          <span style={{ fontWeight: 700 }}>{stats.tasks.submissions}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: 'var(--font-sm)' }}>Submission Rate</span>
                          <span style={{ fontWeight: 700, color: 'rgb(var(--color-primary))' }}>{stats.tasks.submissionRate}%</span>
                        </div>
                      </div>
                    </Card>

                    {/* Quiz Detail */}
                    <Card>
                      <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.75rem' }}>📊 Detail Kuis</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: 'var(--font-sm)' }}>Total Kuis</span>
                          <span style={{ fontWeight: 700 }}>{stats.quizzes.total}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: 'var(--font-sm)' }}>Percobaan</span>
                          <span style={{ fontWeight: 700 }}>{stats.quizzes.attempts}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: 'var(--font-sm)' }}>Rata-rata Skor</span>
                          <span style={{ fontWeight: 700, color: 'rgb(var(--color-secondary))' }}>{stats.quizzes.avgScore}%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
                          <span style={{ fontSize: 'var(--font-sm)' }}>Pass Rate</span>
                          <span style={{ fontWeight: 700, color: 'rgb(var(--color-success))' }}>{stats.quizzes.passRate}%</span>
                        </div>
                      </div>
                    </Card>

                    {/* Materials Breakdown */}
                    <Card style={{ gridColumn: '1 / -1' }}>
                      <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.75rem' }}>📚 Materi per Status</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                        {(stats.materials.byStatus || []).map((m: any) => (
                          <div key={m.status} style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--input-bg)', textAlign: 'center' }}>
                            <div style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{m.count}</div>
                            <div style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', textTransform: 'capitalize' }}>{m.status}</div>
                          </div>
                        ))}
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
