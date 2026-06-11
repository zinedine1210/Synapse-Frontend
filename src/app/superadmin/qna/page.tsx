'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { superadminService } from '@/services/superadminService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Alert } from '@/components/ui';
import { HelpCircle, Loader2, MessageSquare, AlertTriangle, Award, Tag } from 'lucide-react';

export default function SuperadminQnaPage() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await superadminService.getQnaStats();
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
          <Appbar title="Monitor Q&A" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          {loading ? (
            <div style={{ minHeight: 'calc(100vh - var(--appbar-height))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="animate-spin" size={36} style={{ color: 'rgb(var(--color-primary))' }} />
            </div>
          ) : (
            <div className="page-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <HelpCircle size={22} style={{ color: 'rgb(var(--color-primary))' }} />
                  Monitor Q&A Publik
                </h2>
                <p style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)', marginTop: '0.25rem' }}>Statistik tanya-jawab dan reputasi pengguna.</p>
              </div>

              {error && <Alert type="error" message={error} />}

              {stats && (
                <>
                  {/* Summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-primary) / 0.1)', color: 'rgb(var(--color-primary))' }}><HelpCircle size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Total Pertanyaan</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.questions.total}</h3>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-secondary) / 0.1)', color: 'rgb(var(--color-secondary))' }}><MessageSquare size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Total Jawaban</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.answers.total}</h3>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245,158,11,.1)', color: '#F59E0B' }}><AlertTriangle size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Belum Dijawab</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.questions.unanswered}</h3>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-success) / 0.1)', color: 'rgb(var(--color-success))' }}><Award size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Answer Rate</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.answerRate}%</h3>
                      </div>
                    </Card>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {/* Top Contributors */}
                    <Card>
                      <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.75rem' }}>🏆 Top Kontributor</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(stats.topContributors || []).map((c: any, i: number) => (
                          <div key={c.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <div>
                              <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, marginRight: '0.4rem', color: 'rgb(var(--text-muted))' }}>#{i + 1}</span>
                              <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>{c.name}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'rgb(var(--color-primary))' }}>{c.score} pts</span>
                              <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginLeft: '0.4rem' }}>({c.approved} approved)</span>
                            </div>
                          </div>
                        ))}
                        {(!stats.topContributors || stats.topContributors.length === 0) && <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>Belum ada kontributor.</p>}
                      </div>
                    </Card>

                    {/* Categories & Reports */}
                    <Card>
                      <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Tag size={16} style={{ color: 'rgb(var(--color-secondary))' }} /> Kategori Populer
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(stats.categories || []).slice(0, 8).map((c: any) => (
                          <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: 'var(--font-sm)' }}>{c.name}</span>
                            <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>{c.count} pertanyaan</span>
                          </div>
                        ))}
                        {(!stats.categories || stats.categories.length === 0) && <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>Belum ada kategori.</p>}
                      </div>

                      {stats.answers.reported > 0 && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.15)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--font-sm)', fontWeight: 600, color: 'rgb(248,113,113)' }}>
                            <AlertTriangle size={14} /> {stats.answers.reported} jawaban dilaporkan
                          </div>
                        </div>
                      )}
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
