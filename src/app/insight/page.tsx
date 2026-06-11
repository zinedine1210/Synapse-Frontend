'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, useToast } from '@/components/ui';
import { insightService, WeeklySummary } from '@/services/insightService';
import { Brain, Loader2, TrendingDown, TrendingUp, Minus, Flame, Trophy, TreePine, AlertTriangle, Sparkles } from 'lucide-react';

export default function InsightPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [data, setData] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    insightService.getWeekly()
      .then(setData)
      .catch((e: any) => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const loadAiInsight = async () => {
    setAiLoading(true);
    try {
      const result = await insightService.getAiInsight();
      setData(result);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  const TrendIcon = data?.finance.changeDirection === 'less' ? TrendingDown : data?.finance.changeDirection === 'more' ? TrendingUp : Minus;
  const trendColor = data?.finance.changeDirection === 'less' ? 'rgb(var(--color-success))' : data?.finance.changeDirection === 'more' ? 'rgb(var(--color-error))' : 'rgb(var(--text-muted))';

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content page-transition">
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <div className="feature-header">
                <h1><Brain size={26} style={{ color: 'rgb(var(--color-primary))' }} /> Insight Mingguan</h1>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'rgb(var(--color-primary))' }} /></div>
              ) : !data ? (
                <div className="empty-state"><span className="empty-icon">📊</span><h3>Belum cukup data</h3><p>Mulai catat aktivitasmu dan kembali lagi nanti.</p></div>
              ) : (
                <div className="animate-fade-in">
                  {/* AI Insight */}
                  {data.aiInsight ? (
                    <Card style={{ borderTop: '4px solid rgb(var(--color-primary))', marginBottom: 20, background: 'rgb(var(--bg-elevated))' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Sparkles size={18} style={{ color: 'rgb(var(--color-primary))' }} />
                        <h3 style={{ fontWeight: 800 }}>{data.aiInsight.headline}</h3>
                      </div>
                      <p style={{ fontSize: 'var(--font-sm)', lineHeight: 1.7, marginBottom: 10 }}>{data.aiInsight.body}</p>
                      {data.aiInsight.tip && (
                        <div style={{ padding: '10px 14px', background: 'rgba(var(--color-success) / 0.1)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-sm)' }}>
                          💡 {data.aiInsight.tip}
                        </div>
                      )}
                    </Card>
                  ) : (
                    <Card style={{ textAlign: 'center', padding: '24px 16px', marginBottom: 20 }}>
                      <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: 12 }}>
                        Mau lihat analisis AI dari datamu minggu ini?
                      </p>
                      <Button onClick={loadAiInsight} disabled={aiLoading}>
                        {aiLoading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Menganalisis...</> : <><Sparkles size={15} /> Generate AI Insight</>}
                      </Button>
                    </Card>
                  )}

                  {/* Finance Overview */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                    <div className="stat-card">
                      <div>
                        <div className="stat-value" style={{ color: 'rgb(var(--color-success))' }}>{fmt(data.finance.income)}</div>
                        <div className="stat-label">Pemasukan</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div>
                        <div className="stat-value" style={{ color: 'rgb(var(--color-error))' }}>{fmt(data.finance.expense)}</div>
                        <div className="stat-label">Pengeluaran</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div>
                        <div className="stat-value" style={{ color: trendColor, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          <TrendIcon size={16} />
                          {Math.abs(data.finance.changePercent)}%
                        </div>
                        <div className="stat-label">vs Minggu Lalu</div>
                      </div>
                    </div>
                  </div>

                  {/* Top Categories */}
                  {data.finance.topCategories.length > 0 && (
                    <Card style={{ marginBottom: 20 }}>
                      <h3 style={{ fontWeight: 700, marginBottom: 14 }}>📊 Top Kategori Pengeluaran</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {data.finance.topCategories.map((cat, i) => {
                          const maxAmount = data.finance.topCategories[0]?.amount || 1;
                          return (
                            <div key={cat.category}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>{cat.category}</span>
                                <span style={{ fontSize: 'var(--font-sm)' }}>{fmt(cat.amount)}</span>
                              </div>
                              <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${(cat.amount / maxAmount) * 100}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}

                  {/* Productivity + Gamification */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <Card>
                      <h4 style={{ fontWeight: 700, marginBottom: 10 }}>✅ Produktivitas</h4>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'rgb(var(--color-primary))' }}>
                          {data.productivity.completionRate}%
                        </div>
                        <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                          {data.productivity.todosCompleted}/{data.productivity.todosTotal} todo selesai
                        </p>
                      </div>
                    </Card>
                    <Card>
                      <h4 style={{ fontWeight: 700, marginBottom: 10 }}>🏆 Gamifikasi</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 'var(--font-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Trophy size={14} style={{ color: 'rgb(var(--color-primary))' }} />
                          <span>Level {data.gamification.level} • {data.gamification.totalXp} XP</span>
                        </div>
                        {data.gamification.streak > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Flame size={14} style={{ color: 'rgb(var(--color-warning))' }} />
                            <span>{data.gamification.streak} hari streak</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Trees */}
                  {data.trees.length > 0 && (
                    <Card style={{ marginBottom: 20 }}>
                      <h3 style={{ fontWeight: 700, marginBottom: 14 }}><TreePine size={16} style={{ display: 'inline', marginRight: 6 }} />Pohon Tabungan</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {data.trees.map(tree => (
                          <div key={tree.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>{tree.name}</span>
                              <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>sisa {fmt(tree.remaining)}</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${tree.progress}%` }} />
                            </div>
                            <span style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>{tree.progress}%</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Alerts */}
                  {data.alerts.length > 0 && (
                    <Card style={{ borderLeft: '4px solid rgb(var(--color-warning))' }}>
                      <h3 style={{ fontWeight: 700, marginBottom: 10 }}><AlertTriangle size={16} style={{ display: 'inline', marginRight: 6 }} />Peringatan</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {data.alerts.map((alert, i) => (
                          <div key={i} style={{ padding: '8px 12px', background: 'rgba(var(--color-warning) / 0.06)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-sm)' }}>
                            ⚠️ {alert.message}
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
