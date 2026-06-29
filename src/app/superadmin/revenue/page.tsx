'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card } from '@/components/ui';
import { TrendingUp, TrendingDown, DollarSign, Users, Cpu, PieChart, BarChart3, Activity } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface RevenueData {
  summary: {
    totalRevenue: number;
    thisMonthRevenue: number;
    lastMonthRevenue: number;
    revenueGrowth: number;
    estimatedMRR: number;
    estimatedAiCost: number;
    estimatedProfit: number;
    profitMargin: number;
  };
  users: {
    total: number;
    paid: number;
    free: number;
    conversionRate: number;
  };
  subscribersByPlan: { plan: string; count: number }[];
  revenueByPlan: Record<string, number>;
  aiUsage: {
    totalRequests: number;
    estimatedCost: number;
    avgCostPerRequest: number;
  };
  dailyRevenue: { date: string; amount: number }[];
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

export default function RevenueAnalyticsPage() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<RevenueData>('/superadmin/revenue-analytics')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const maxDailyRevenue = data ? Math.max(...data.dailyRevenue.map(d => d.amount), 1) : 1;

  return (
    <AuthGuard requiredRole="SUPERADMIN">
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Revenue & Cost Analytics" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          <div className="page-content animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {[1, 2, 3, 4].map(n => <div key={n} className="skeleton" style={{ height: 120, borderRadius: 12 }} />)}
              </div>
            ) : !data ? (
              <Card style={{ padding: '2rem', textAlign: 'center' }}>Gagal memuat data analytics.</Card>
            ) : (
              <>
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <SummaryCard
                    icon={<DollarSign size={20} />}
                    label="Revenue Bulan Ini"
                    value={formatRupiah(data.summary.thisMonthRevenue)}
                    sub={`${data.summary.revenueGrowth >= 0 ? '+' : ''}${data.summary.revenueGrowth}% dari bulan lalu`}
                    trend={data.summary.revenueGrowth >= 0 ? 'up' : 'down'}
                    color="#22c55e"
                  />
                  <SummaryCard
                    icon={<Activity size={20} />}
                    label="Estimated MRR"
                    value={formatRupiah(data.summary.estimatedMRR)}
                    sub="Monthly Recurring Revenue"
                    color="#3b82f6"
                  />
                  <SummaryCard
                    icon={<Cpu size={20} />}
                    label="AI Cost Bulan Ini"
                    value={formatRupiah(data.summary.estimatedAiCost)}
                    sub={`${data.aiUsage.totalRequests.toLocaleString()} requests × Rp ${data.aiUsage.avgCostPerRequest}`}
                    color="#f59e0b"
                  />
                  <SummaryCard
                    icon={<TrendingUp size={20} />}
                    label="Profit Bulan Ini"
                    value={formatRupiah(data.summary.estimatedProfit)}
                    sub={`Margin: ${data.summary.profitMargin}%`}
                    trend={data.summary.estimatedProfit >= 0 ? 'up' : 'down'}
                    color={data.summary.estimatedProfit >= 0 ? '#22c55e' : '#ef4444'}
                  />
                </div>

                {/* Second row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <SummaryCard
                    icon={<DollarSign size={20} />}
                    label="Total Revenue (All-time)"
                    value={formatRupiah(data.summary.totalRevenue)}
                    color="#8b5cf6"
                  />
                  <SummaryCard
                    icon={<Users size={20} />}
                    label="Total Users"
                    value={data.users.total.toLocaleString()}
                    sub={`${data.users.paid} berbayar, ${data.users.free} gratis`}
                    color="#06b6d4"
                  />
                  <SummaryCard
                    icon={<PieChart size={20} />}
                    label="Conversion Rate"
                    value={`${data.users.conversionRate}%`}
                    sub="Free → Paid"
                    color="#ec4899"
                  />
                  <SummaryCard
                    icon={<BarChart3 size={20} />}
                    label="Bulan Lalu"
                    value={formatRupiah(data.summary.lastMonthRevenue)}
                    color="#6b7280"
                  />
                </div>

                {/* Revenue Chart (last 30 days) */}
                <Card style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, marginBottom: '1rem' }}>
                    Revenue Harian (30 Hari Terakhir)
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 160 }}>
                    {data.dailyRevenue.map((day, i) => {
                      const height = maxDailyRevenue > 0 ? (day.amount / maxDailyRevenue) * 140 : 0;
                      return (
                        <div
                          key={i}
                          title={`${day.date}: ${formatRupiah(day.amount)}`}
                          style={{
                            flex: 1,
                            height: Math.max(height, 2),
                            background: day.amount > 0
                              ? 'linear-gradient(to top, rgb(var(--color-primary)), rgb(var(--color-secondary)))'
                              : 'var(--border-default)',
                            borderRadius: '3px 3px 0 0',
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                          }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                    <span>{data.dailyRevenue[0]?.date}</span>
                    <span>{data.dailyRevenue[data.dailyRevenue.length - 1]?.date}</span>
                  </div>
                </Card>

                {/* Subscribers & Revenue by Plan */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <Card style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, marginBottom: '1rem' }}>
                      Subscribers per Plan
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {data.subscribersByPlan.map(s => (
                        <div key={s.plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-default)' }}>
                          <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>{s.plan}</span>
                          <span style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>{s.count} user</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, marginBottom: '1rem' }}>
                      Revenue per Plan (Bulan Ini)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {Object.entries(data.revenueByPlan).length === 0 ? (
                        <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>Belum ada revenue bulan ini.</p>
                      ) : (
                        Object.entries(data.revenueByPlan).map(([plan, amount]) => (
                          <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-default)' }}>
                            <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>{plan}</span>
                            <span style={{ fontSize: 'var(--font-sm)', color: '#22c55e', fontWeight: 600 }}>{formatRupiah(amount)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>

                {/* Cost breakdown */}
                <Card style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, marginBottom: '1rem' }}>
                    Estimasi Struktur Biaya
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <CostItem label="AI API (Gemini + OpenAI)" value={formatRupiah(data.summary.estimatedAiCost)} percent={data.summary.thisMonthRevenue > 0 ? Math.round((data.summary.estimatedAiCost / data.summary.thisMonthRevenue) * 100) : 0} />
                    <CostItem label="Midtrans Fee (~2.9%)" value={formatRupiah(Math.round(data.summary.thisMonthRevenue * 0.029))} percent={3} />
                    <CostItem label="Infrastructure (est.)" value={formatRupiah(150000)} percent={data.summary.thisMonthRevenue > 0 ? Math.round((150000 / data.summary.thisMonthRevenue) * 100) : 0} />
                    <CostItem label="Net Profit" value={formatRupiah(data.summary.estimatedProfit - Math.round(data.summary.thisMonthRevenue * 0.029) - 150000)} percent={data.summary.profitMargin} isProfit />
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

function SummaryCard({ icon, label, value, sub, trend, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; trend?: 'up' | 'down'; color: string;
}) {
  return (
    <Card style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ color, opacity: 0.8 }}>{icon}</div>
        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{value}</span>
        {trend && (
          trend === 'up'
            ? <TrendingUp size={16} style={{ color: '#22c55e' }} />
            : <TrendingDown size={16} style={{ color: '#ef4444' }} />
        )}
      </div>
      {sub && <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{sub}</span>}
    </Card>
  );
}

function CostItem({ label, value, percent, isProfit }: { label: string; value: string; percent: number; isProfit?: boolean }) {
  return (
    <div style={{ padding: '0.75rem', background: 'var(--input-bg)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
      <div style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: isProfit ? '#22c55e' : undefined }}>{value}</div>
      <div style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginTop: 2 }}>{percent}% dari revenue</div>
    </div>
  );
}
