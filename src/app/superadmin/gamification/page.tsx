'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { superadminService } from '@/services/superadminService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Alert } from '@/components/ui';
import { Trophy, Loader2, Flame, Star, Zap, Users } from 'lucide-react';

export default function SuperadminGamificationPage() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await superadminService.getGamificationStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const sourceLabel: Record<string, string> = {
    transaction: 'Catat Transaksi', todo: 'Selesai Todo', qna: 'Jawab Q&A',
    quiz: 'Kuis', streak: 'Streak Bonus', scan: 'Scan Struk',
  };

  return (
    <AuthGuard requiredRole="SUPERADMIN">
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Monitor Gamifikasi" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

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
                  <Trophy size={22} style={{ color: '#F59E0B' }} />
                  Monitor Gamifikasi
                </h2>
                <p style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)', marginTop: '0.25rem' }}>XP, level, streak, dan achievement pengguna.</p>
              </div>

              {error && <Alert type="error" message={error} />}

              {stats && (
                <>
                  {/* Summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-primary) / 0.1)', color: 'rgb(var(--color-primary))' }}><Users size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Pengguna Aktif</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.totalUsers}</h3>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(139,92,246,.1)', color: '#8B5CF6' }}><Star size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Total XP</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.totalXp.toLocaleString()}</h3>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245,158,11,.1)', color: '#F59E0B' }}><Flame size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Streak Aktif</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.streaks.active}</h3>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>avg {stats.streaks.avgStreak} hari</span>
                      </div>
                    </Card>
                    <Card style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--color-secondary) / 0.1)', color: 'rgb(var(--color-secondary))' }}><Zap size={20} /></div>
                      <div>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Streak Terpanjang</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>{stats.streaks.longestEver} hari</h3>
                      </div>
                    </Card>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {/* Level Distribution */}
                    <Card>
                      <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.75rem' }}>📊 Distribusi Level</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {(stats.levelDistribution || []).map((l: any) => {
                          const pct = stats.totalUsers > 0 ? (l.count / stats.totalUsers) * 100 : 0;
                          return (
                            <div key={l.level} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, width: 50 }}>Lv {l.level}</span>
                              <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--input-bg)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', width: `${Math.max(pct, 2)}%`, transition: 'width .5s' }} />
                              </div>
                              <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', width: 32, textAlign: 'right' }}>{l.count}</span>
                            </div>
                          );
                        })}
                        {(!stats.levelDistribution || stats.levelDistribution.length === 0) && <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>Belum ada data.</p>}
                      </div>
                    </Card>

                    {/* XP by Source */}
                    <Card>
                      <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.75rem' }}>⚡ XP per Sumber</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(stats.xpBySource || []).map((x: any) => (
                          <div key={x.source} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: 'var(--font-sm)' }}>{sourceLabel[x.source] || x.source}</span>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'rgb(var(--color-primary))' }}>{x.totalXp.toLocaleString()} XP</span>
                              <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginLeft: '0.5rem' }}>({x.count}x)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Top Users */}
                    <Card style={{ gridColumn: '1 / -1' }}>
                      <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '0.75rem' }}>🏆 Top 10 Pengguna</h4>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-sm)' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <th style={{ textAlign: 'left', padding: '0.5rem', color: 'rgb(var(--text-muted))', fontWeight: 600 }}>#</th>
                              <th style={{ textAlign: 'left', padding: '0.5rem', color: 'rgb(var(--text-muted))', fontWeight: 600 }}>Nama</th>
                              <th style={{ textAlign: 'right', padding: '0.5rem', color: 'rgb(var(--text-muted))', fontWeight: 600 }}>Level</th>
                              <th style={{ textAlign: 'right', padding: '0.5rem', color: 'rgb(var(--text-muted))', fontWeight: 600 }}>XP</th>
                              <th style={{ textAlign: 'right', padding: '0.5rem', color: 'rgb(var(--text-muted))', fontWeight: 600 }}>Streak</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(stats.topUsers || []).map((u: any, i: number) => (
                              <tr key={u.email} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '0.5rem', fontWeight: 700 }}>{i + 1}</td>
                                <td style={{ padding: '0.5rem' }}>
                                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                                  <div style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{u.email}</div>
                                </td>
                                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>{u.level}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: 'rgb(var(--color-primary))' }}>{u.xp.toLocaleString()}</td>
                                <td style={{ padding: '0.5rem', textAlign: 'right' }}>🔥 {u.streak}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
