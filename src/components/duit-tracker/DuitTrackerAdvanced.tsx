'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Transaction, duitTrackerService, BudgetChallenge, CustomCategory, FinancialForecast, SpendingComparison, SmartReminders } from '@/services/duitTrackerService';
import { Modal, Button, useToast, useConfirm, TextInput, CurrencyInput, parseCurrency } from '@/components/ui';
import {
  Download, Upload, Flame,
  Plus, Trash2, X, AlertTriangle,
  Zap, Users, Check, Loader2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ═══════════════════════════════════════════
// HELPER: Format currency
// ═══════════════════════════════════════════
const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

// ═══════════════════════════════════════════
// COMPONENT: Pie Chart (SVG)
// ═══════════════════════════════════════════
interface PieSlice { label: string; value: number; color: string; emoji?: string }

export function PieChartSvg({ data, size = 200 }: { data: PieSlice[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  let startAngle = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const angle = (d.value / total) * Math.PI * 2;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    startAngle = endAngle;
    return <path key={i} d={path} fill={d.color} stroke="var(--card-bg)" strokeWidth="2" />;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{slices}</svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
        {data.slice(0, 8).map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
            <span>{d.emoji || ''} {d.label}</span>
            <span style={{ opacity: 0.5, marginLeft: 'auto' }}>{Math.round(d.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// COMPONENT: Line Chart (SVG)
// ═══════════════════════════════════════════
export function LineChartSvg({ data, width = 320, height = 140, color = '#10b981' }: { data: { label: string; value: number }[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const padding = { top: 10, right: 10, bottom: 24, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - (d.value / maxVal) * chartH,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
      {data.map((d, i) => (
        <text key={i} x={points[i].x} y={height - 4} textAnchor="middle" fontSize="9" fill="var(--dt-text-secondary)">
          {d.label}
        </text>
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════
// COMPONENT: Heatmap Calendar
// ═══════════════════════════════════════════
export function SpendingHeatmap({ transactions, month: initialMonth, year: initialYear }: { transactions: Transaction[]; month: number; year: number }) {
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [viewYear, setViewYear] = useState(initialYear);

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const expenses = transactions.filter(t => t.type === 'expense');

  const dailyTotals = useMemo(() => {
    const totals = new Array(daysInMonth).fill(0);
    expenses.forEach(t => {
      const d = new Date(t.date);
      if (d.getMonth() + 1 === viewMonth && d.getFullYear() === viewYear) {
        totals[d.getDate() - 1] += t.amount;
      }
    });
    return totals;
  }, [expenses, viewMonth, viewYear, daysInMonth]);

  const maxVal = Math.max(...dailyTotals, 1);

  const getColor = (val: number) => {
    if (val === 0) return 'var(--input-bg)';
    const intensity = val / maxVal;
    if (intensity > 0.75) return '#dc2626';
    if (intensity > 0.5) return '#f59e0b';
    if (intensity > 0.25) return '#fb923c';
    return '#86efac';
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const handlePrevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const handleNextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  return (
    <div>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
        <button onClick={handlePrevMonth} style={{ background: 'none', border: '1px solid var(--dt-card-border)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 14, color: 'var(--dt-text-secondary)', fontFamily: 'inherit' }}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 700, minWidth: 100, textAlign: 'center' }}>{monthNames[viewMonth - 1]} {viewYear}</span>
        <button onClick={handleNextMonth} disabled={viewMonth === initialMonth && viewYear === initialYear} style={{ background: 'none', border: '1px solid var(--dt-card-border)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 14, color: 'var(--dt-text-secondary)', fontFamily: 'inherit', opacity: viewMonth === initialMonth && viewYear === initialYear ? 0.3 : 1 }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
          <div key={d} style={{ fontSize: 10, textAlign: 'center', color: 'var(--dt-text-secondary)', fontWeight: 600 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
        {dailyTotals.map((val, i) => (
          <div
            key={i}
            title={`Tgl ${i + 1}: ${fmt(val)}`}
            style={{
              aspectRatio: '1', borderRadius: 5, background: getColor(val),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: val > maxVal * 0.5 ? '#fff' : 'var(--dt-text-secondary)',
              fontWeight: 600, cursor: 'default',
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 10, color: 'var(--dt-text-secondary)' }}>
        <span>Sedikit</span>
        {['#86efac', '#fb923c', '#f59e0b', '#dc2626'].map(c => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
        ))}
        <span>Banyak</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// COMPONENT: Financial Forecast Card
// ═══════════════════════════════════════════
export function ForecastCard({ forecast }: { forecast: FinancialForecast | null }) {
  if (!forecast || !forecast.hasEnoughData) {
    return (
      <div style={{ padding: '20px 22px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--dt-card-border)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} /> Forecast Keuangan
        </h3>
        <p style={{ fontSize: 13, opacity: 0.5 }}>Butuh minimal 3 bulan data transaksi untuk forecast. Terus catat ya!</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 22px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--dt-card-border)' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Zap size={16} style={{ color: '#8b5cf6' }} /> Forecast Keuangan
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--input-bg)' }}>
          <div style={{ fontSize: 10, color: 'var(--dt-text-secondary)' }}>Proyeksi Bulan Ini</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dt-expense)' }}>{fmt(forecast.projectedMonthExpense!)}</div>
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--input-bg)' }}>
          <div style={{ fontSize: 10, color: 'var(--dt-text-secondary)' }}>Rata-rata Nabung/bln</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: forecast.avgSaving! >= 0 ? 'var(--dt-income)' : 'var(--dt-expense)' }}>{fmt(forecast.avgSaving!)}</div>
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--input-bg)' }}>
          <div style={{ fontSize: 10, color: 'var(--dt-text-secondary)' }}>Burn Rate / Hari</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{fmt(forecast.dailyBurnRate!)}</div>
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 10, background: forecast.survivalDays! < 7 ? 'rgba(239,68,68,0.08)' : 'var(--input-bg)' }}>
          <div style={{ fontSize: 10, color: 'var(--dt-text-secondary)' }}>Survive</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: forecast.survivalDays! < 7 ? 'var(--dt-expense)' : 'inherit' }}>
            {forecast.survivalDays! > 30 ? '30+ hari' : `${forecast.survivalDays} hari`}
          </div>
        </div>
      </div>

      {forecast.wishlistForecast && forecast.wishlistForecast.length > 0 && (
        <div style={{ borderTop: '1px solid var(--dt-card-border)', paddingTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--dt-text-secondary)' }}>📦 Kapan bisa beli wishlist?</div>
          {forecast.wishlistForecast.map((w, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{w.name}</span>
              <span style={{ fontSize: 12, color: 'var(--dt-text-secondary)' }}>
                {w.monthsNeeded ? `~${w.monthsNeeded} bulan (${w.targetDate?.split('-').reverse().slice(0, 2).join('/')})` : 'Belum bisa dihitung'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// COMPONENT: Spending Comparison Card
// ═══════════════════════════════════════════
export function ComparisonCard({ comparison }: { comparison: SpendingComparison | null }) {
  if (!comparison || comparison.totalUsers < 2) {
    return (
      <div style={{ padding: '20px 22px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--dt-card-border)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={16} /> Perbandingan Peer
        </h3>
        <p style={{ fontSize: 13, opacity: 0.5 }}>Belum cukup data pengguna lain. Ajak temen pakai Synapse biar bisa bandingin!</p>
      </div>
    );
  }

  const isAbove = comparison.userTotal > comparison.avgTotal;

  return (
    <div style={{ padding: '20px 22px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--dt-card-border)' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Users size={16} style={{ color: '#6366f1' }} /> Perbandingan Peer
      </h3>

      <div style={{ padding: '14px 16px', borderRadius: 12, background: isAbove ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)', marginBottom: 12, border: `1px solid ${isAbove ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)'}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          {isAbove ? '😅' : '💪'} Kamu di percentile ke-{comparison.percentile}
        </div>
        <div style={{ fontSize: 12, color: 'var(--dt-text-secondary)' }}>
          Spending kamu {fmt(comparison.userTotal)} vs rata-rata {fmt(comparison.avgTotal)} ({comparison.totalUsers} pengguna)
        </div>
      </div>

      {comparison.categoryComparison.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {comparison.categoryComparison.slice(0, 5).map((cc, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 0' }}>
              <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{cc.category}</span>
              <span style={{ color: cc.diff > 0 ? 'var(--dt-expense)' : 'var(--dt-income)', fontWeight: 600 }}>
                {cc.diff > 0 ? `+${cc.diff}%` : `${cc.diff}%`} dari rata-rata
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// COMPONENT: Budget Challenge Card
// ═══════════════════════════════════════════
export function ChallengeSection({ challenges, onRefresh }: { challenges: BudgetChallenge[]; onRefresh: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'daily_limit', targetAmount: '', targetDays: '7', category: '' });
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const TEMPLATES = [
    { title: 'Hemat Makan', desc: 'Makan di bawah 50K/hari', type: 'daily_limit', targetAmount: 50000, targetDays: 7, category: 'makanan' },
    { title: 'No Spend Day', desc: 'Gak keluar duit sama sekali', type: 'no_spend_day', targetAmount: 0, targetDays: 3, category: '' },
    { title: 'Anti Ngopi', desc: 'Gak beli kopi 1 minggu', type: 'category_limit', targetAmount: 0, targetDays: 7, category: 'minuman' },
    { title: 'Minimalis Week', desc: 'Total spending < 500K/minggu', type: 'weekly_limit', targetAmount: 500000, targetDays: 7, category: '' },
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;
    const targetAmount = parseCurrency(form.targetAmount);
    const targetDays = parseInt(form.targetDays);
    if (form.targetDays && (isNaN(targetDays) || targetDays < 1)) {
      showToast('Durasi harus berupa angka minimal 1 hari', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await duitTrackerService.createChallenge({
        title: form.title,
        type: form.type,
        targetAmount: targetAmount || undefined,
        targetDays: targetDays || 7,
        category: form.category || undefined,
      });
      showToast('Challenge dimulai! 🔥', 'success');
      setShowModal(false);
      setForm({ title: '', type: 'daily_limit', targetAmount: '', targetDays: '7', category: '' });
      onRefresh();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ message: 'Hapus challenge ini?', variant: 'danger' })) return;
    try {
      await duitTrackerService.deleteChallenge(id);
      showToast('Challenge dihapus', 'success');
      onRefresh();
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const active = challenges.filter(c => c.isActive);
  const completed = challenges.filter(c => !c.isActive);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flame size={18} style={{ color: '#f97316' }} /> Budget Challenge
        </h3>
        <Button size="sm" onClick={() => setShowModal(true)}><Plus size={14} /> Buat</Button>
      </div>

      {active.length === 0 && completed.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 16px', opacity: 0.5 }}>
          <Flame size={36} style={{ marginBottom: 8, opacity: 0.3 }} />
          <p style={{ fontSize: 14, fontWeight: 500 }}>Belum ada challenge</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Tantang dirimu buat lebih hemat!</p>
        </div>
      )}

      {active.map(ch => {
        const totalDays = ch.completedDays + ch.failedDays;
        const progress = ch.targetDays > 0 ? Math.round((totalDays / ch.targetDays) * 100) : 0;
        const successRate = totalDays > 0 ? Math.round((ch.completedDays / totalDays) * 100) : 0;
        return (
          <div key={ch.id} style={{ padding: '16px 18px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--dt-card-border)', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>🔥 {ch.title}</div>
                {ch.description && <div style={{ fontSize: 12, color: 'var(--dt-text-secondary)', marginTop: 2 }}>{ch.description}</div>}
              </div>
              <button onClick={() => handleDelete(ch.id)} style={{ background: 'none', border: 'none', opacity: 0.4, cursor: 'pointer' }}><Trash2 size={14} /></button>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 12 }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 8, background: 'var(--input-bg)' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#f97316' }}>{ch.currentStreak}</div>
                <div style={{ color: 'var(--dt-text-secondary)' }}>Streak</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 8, background: 'var(--input-bg)' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#8b5cf6' }}>{ch.bestStreak}</div>
                <div style={{ color: 'var(--dt-text-secondary)' }}>Best</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 8, background: 'var(--input-bg)' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{successRate}%</div>
                <div style={{ color: 'var(--dt-text-secondary)' }}>Sukses</div>
              </div>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--input-bg)', marginTop: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, borderRadius: 3, background: 'linear-gradient(90deg, #f97316, #eab308)', transition: 'width 0.5s' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--dt-text-secondary)', marginTop: 4 }}>
              {totalDays}/{ch.targetDays} hari • {ch.targetAmount ? `Target: ${fmt(ch.targetAmount)}/hari` : 'No spend'}
            </div>
          </div>
        );
      })}

      {completed.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--dt-text-secondary)' }}>
            Challenge selesai ({completed.length})
          </summary>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {completed.slice(0, 5).map(ch => (
              <div key={ch.id} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--input-bg)', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                <span>{ch.title}</span>
                <span style={{ color: 'var(--dt-text-secondary)' }}>Best: {ch.bestStreak}🔥 • {ch.completedDays}/{ch.targetDays}✓</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Create Challenge Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Buat Challenge Baru">
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--dt-text-secondary)' }}>Template Cepat:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {TEMPLATES.map((t, i) => (
              <button
                key={i}
                onClick={() => setForm({ title: t.title, type: t.type, targetAmount: t.targetAmount ? String(t.targetAmount) : '', targetDays: String(t.targetDays), category: t.category })}
                style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--input-bg)', border: form.title === t.title ? '2px solid var(--dt-accent)' : '1px solid transparent', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ fontSize: 12, fontWeight: 700 }}>{t.title}</div>
                <div style={{ fontSize: 10, color: 'var(--dt-text-secondary)', marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TextInput label="Nama Challenge" value={form.title} onChange={v => setForm({ ...form, title: v })} placeholder="Hemat makan minggu ini" required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <CurrencyInput label="Target (Rp/hari)" value={form.targetAmount} onChange={v => setForm({ ...form, targetAmount: v })} placeholder="50.000" />
            <TextInput label="Durasi (hari)" value={form.targetDays} onChange={v => { const num = v.replace(/\D/g, ''); setForm({ ...form, targetDays: num }); }} placeholder="7" />
          </div>
          <Button type="submit" disabled={submitting} style={{ width: '100%' }}>{submitting ? <Loader2 size={14} className="spin" /> : <Flame size={14} />} Mulai Challenge!</Button>
        </form>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════
// COMPONENT: Custom Category Manager
// ═══════════════════════════════════════════
const EMOJI_OPTIONS = ['🍔', '☕', '🚗', '🛍️', '🎬', '💡', '💊', '📚', '🏠', '💳', '🎮', '👗', '💅', '🏋️', '🐾', '✈️', '🎁', '📱', '🍺', '🧹'];

export function CustomCategoryManager({ categories, onRefresh }: { categories: CustomCategory[]; onRefresh: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', emoji: '📦', type: 'expense' });
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await duitTrackerService.createCustomCategory({ name: form.name, emoji: form.emoji, type: form.type });
      showToast('Kategori baru ditambahkan! ✨', 'success');
      setShowModal(false);
      setForm({ name: '', emoji: '📦', type: 'expense' });
      onRefresh();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await duitTrackerService.deleteCustomCategory(id);
      showToast('Kategori dihapus', 'success');
      onRefresh();
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  return (
    <div style={{ padding: '16px 18px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--dt-card-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700 }}>Kategori Custom</h4>
        <button onClick={() => setShowModal(true)} style={{ background: 'none', border: 'none', color: 'var(--dt-accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ Tambah</button>
      </div>

      {categories.length === 0 ? (
        <p style={{ fontSize: 12, opacity: 0.5 }}>Belum ada kategori custom. Buat untuk tracking yang lebih personal!</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {categories.map(cat => (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: 'var(--input-bg)', fontSize: 13 }}>
              <span>{cat.emoji}</span>
              <span style={{ textTransform: 'capitalize' }}>{cat.name}</span>
              <button onClick={() => handleDelete(cat.id)} style={{ background: 'none', border: 'none', opacity: 0.4, cursor: 'pointer', padding: 0, display: 'flex' }}><X size={12} /></button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Kategori Baru">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TextInput label="Nama Kategori" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Skincare, Date, Gym..." required />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Emoji</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EMOJI_OPTIONS.map(em => (
                <button key={em} type="button" onClick={() => setForm({ ...form, emoji: em })} style={{ width: 32, height: 32, borderRadius: 8, border: form.emoji === em ? '2px solid var(--dt-accent)' : '1px solid var(--dt-card-border)', background: form.emoji === em ? 'var(--input-bg)' : 'transparent', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {em}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Tipe</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['expense', 'income'].map(t => (
                <button key={t} type="button" onClick={() => setForm({ ...form, type: t })} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: form.type === t ? '2px solid var(--dt-accent)' : '1px solid var(--dt-card-border)', background: form.type === t ? 'var(--input-bg)' : 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  {t === 'expense' ? '💸 Pengeluaran' : '💰 Pemasukan'}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={submitting} style={{ width: '100%' }}>{submitting ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Simpan</Button>
        </form>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════
// COMPONENT: CSV Import Modal
// ═══════════════════════════════════════════
export function CsvImportModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [parsed, setParsed] = useState<{ amount: number; type: string; category: string; label: string; date?: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { showToast('File kosong atau format salah', 'error'); return; }

      // Auto-detect format: date,amount,type,category,label OR date,label,amount
      const header = lines[0].toLowerCase();
      const hasHeader = header.includes('date') || header.includes('tanggal') || header.includes('amount') || header.includes('jumlah');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const results: typeof parsed = [];
      for (const line of dataLines) {
        const cols = line.split(/[,;\t]/).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 3) continue;

        // Try format: date, label, amount, type, category
        let date = '', label = '', amount = 0, type = 'expense', category = 'lainnya';

        // Detect which column is amount (first numeric-like column)
        const amountIdx = cols.findIndex(c => /^-?[\d.,]+$/.test(c.replace(/[Rp\s.]/g, '')));
        if (amountIdx >= 0) {
          const rawAmt = parseFloat(cols[amountIdx].replace(/[Rp\s.]/g, '').replace(',', '.'));
          amount = Math.abs(rawAmt);
          type = rawAmt < 0 ? 'expense' : (cols.find(c => /income|masuk|pemasukan/i.test(c)) ? 'income' : 'expense');
        }

        // Detect date column (contains - or / with numbers)
        const dateIdx = cols.findIndex(c => /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}$/.test(c));
        if (dateIdx >= 0) date = cols[dateIdx];

        // Label is the longest non-numeric non-date column
        const labelCandidates = cols.filter((_, i) => i !== amountIdx && i !== dateIdx);
        label = labelCandidates.sort((a, b) => b.length - a.length)[0] || 'Import';

        // Category detection from label/other cols
        const catCol = cols.find(c => /makanan|minuman|transport|belanja|tagihan|hiburan|kesehatan|pendidikan|kos|gaji|freelance/i.test(c));
        if (catCol) category = catCol.toLowerCase();

        if (amount > 0) results.push({ amount, type, category, label, date: date || undefined });
      }

      setParsed(results);
      if (results.length === 0) showToast('Tidak ada data yang bisa di-parse dari file ini', 'error');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    try {
      const result = await duitTrackerService.bulkImport(parsed);
      showToast(`${result.count} transaksi berhasil diimport! 📥`, 'success');
      setParsed([]);
      onClose();
      onSuccess();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setImporting(false); }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Import CSV / Excel">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ padding: '16px', borderRadius: 12, background: 'var(--input-bg)', border: '2px dashed var(--dt-card-border)', textAlign: 'center', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
          <Upload size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
          <p style={{ fontSize: 13, fontWeight: 500 }}>Pilih file CSV / TSV</p>
          <p style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>Format: tanggal, label, jumlah, tipe, kategori</p>
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} style={{ display: 'none' }} />
        </div>

        {parsed.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Preview ({parsed.length} transaksi):</div>
            <div style={{ maxHeight: 200, overflow: 'auto', borderRadius: 8, border: '1px solid var(--dt-card-border)' }}>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--input-bg)' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Label</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Jumlah</th>
                    <th style={{ padding: '6px 8px' }}>Tipe</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 20).map((p, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--dt-card-border)' }}>
                      <td style={{ padding: '5px 8px' }}>{p.label}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt(p.amount)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center' }}>{p.type === 'income' ? '💰' : '💸'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.length > 20 && <div style={{ padding: '6px 8px', fontSize: 11, opacity: 0.5, textAlign: 'center' }}>...dan {parsed.length - 20} lainnya</div>}
            </div>
            <Button onClick={handleImport} disabled={importing} style={{ width: '100%' }}>
              {importing ? <Loader2 size={14} className="spin" /> : <Download size={14} />} Import {parsed.length} Transaksi
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════
// COMPONENT: Export Report (PDF/CSV)
// ═══════════════════════════════════════════
export function ExportButton({ transactions, month, year, summary }: { transactions: Transaction[]; month: number; year: number; summary: any }) {
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const exportCSV = () => {
    const header = 'Tanggal,Label,Kategori,Tipe,Jumlah\n';
    const rows = transactions.map(t =>
      `${new Date(t.date).toLocaleDateString('id-ID')},${t.label.replace(/,/g, ';')},${t.category},${t.type},${t.type === 'expense' ? '-' : ''}${t.amount}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `duit-tracker-${monthNames[month - 1]}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV berhasil diexport! 📄', 'success');
  };

  const exportPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.text(`Laporan Keuangan - ${monthNames[month - 1]} ${year}`, 14, 20);

      // Summary
      doc.setFontSize(11);
      doc.text(`Pemasukan: ${fmt(summary?.income || 0)}`, 14, 32);
      doc.text(`Pengeluaran: ${fmt(summary?.expense || 0)}`, 14, 38);
      doc.text(`Saldo: ${fmt(summary?.balance || 0)}`, 14, 44);
      doc.text(`Total Transaksi: ${transactions.length}`, 14, 50);

      // Category breakdown
      if (summary?.categoryReport?.length > 0) {
        doc.setFontSize(13);
        doc.text('Pengeluaran per Kategori:', 14, 62);
        autoTable(doc, {
          startY: 66,
          head: [['Kategori', 'Jumlah', 'Budget', '% Terpakai']],
          body: summary.categoryReport.map((c: any) => [
            c.category, fmt(c.spent), c.budget ? fmt(c.budget) : '-', c.percentage != null ? `${c.percentage}%` : '-',
          ]),
          styles: { fontSize: 9 },
        });
      }

      // Transaction table
      const finalY = (doc as any).lastAutoTable?.finalY || 100;
      doc.setFontSize(13);
      doc.text('Detail Transaksi:', 14, finalY + 10);
      autoTable(doc, {
        startY: finalY + 14,
        head: [['Tanggal', 'Label', 'Kategori', 'Tipe', 'Jumlah']],
        body: transactions.slice(0, 100).map(t => [
          new Date(t.date).toLocaleDateString('id-ID'),
          t.label.slice(0, 30),
          t.category,
          t.type === 'income' ? 'Masuk' : 'Keluar',
          `${t.type === 'expense' ? '-' : ''}${fmt(t.amount)}`,
        ]),
        styles: { fontSize: 8 },
      });

      doc.save(`laporan-keuangan-${monthNames[month - 1]}-${year}.pdf`);
      showToast('PDF berhasil diexport! 📊', 'success');
    } catch (e) {
      showToast('Gagal export PDF', 'error');
    }
    setExporting(false);
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: 'var(--input-bg)', border: '1px solid var(--dt-card-border)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
        <Download size={13} /> CSV
      </button>
      <button onClick={exportPDF} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: 'var(--input-bg)', border: '1px solid var(--dt-card-border)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
        <Download size={13} /> {exporting ? '...' : 'PDF'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════
// COMPONENT: Smart Reminders Banner
// ═══════════════════════════════════════════
export function ReminderBanner({ reminders, onPayBill, onPayDebt }: { reminders: SmartReminders | null; onPayBill: (id: string) => void; onPayDebt: (id: string) => void }) {
  if (!reminders) return null;
  const hasReminders = reminders.dueBills.length > 0 || reminders.dueDebts.length > 0 || reminders.dailySpending.isAboveAverage;
  if (!hasReminders) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
      {/* Due Bills */}
      {reminders.dueBills.map(b => (
        <div key={b.id} style={{ padding: '12px 16px', borderRadius: 12, background: b.isOverdue ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${b.isOverdue ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {b.isOverdue ? '🚨' : '⏰'} {b.name} — {fmt(b.amount)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--dt-text-secondary)', marginTop: 2 }}>
              {b.isOverdue ? `Terlambat ${Math.abs(b.daysUntilDue)} hari` : b.daysUntilDue === 0 ? 'Jatuh tempo HARI INI!' : `Jatuh tempo ${b.daysUntilDue} hari lagi`}
            </div>
          </div>
          <button onClick={() => onPayBill(b.id)} style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--dt-accent)', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            Bayar
          </button>
        </div>
      ))}

      {/* Due Debts */}
      {reminders.dueDebts.map(d => (
        <div key={d.id} style={{ padding: '12px 16px', borderRadius: 12, background: d.isOverdue ? 'rgba(239,68,68,0.06)' : 'rgba(168,85,247,0.06)', border: `1px solid ${d.isOverdue ? 'rgba(239,68,68,0.15)' : 'rgba(168,85,247,0.15)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {d.isOverdue ? '🚨' : '🤝'} {d.description} — {fmt(d.amount)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--dt-text-secondary)', marginTop: 2 }}>
              {d.debtType === 'owed_by_me' ? `Ke ${d.personName}` : `Dari ${d.personName}`} •
              {d.isOverdue ? ' Sudah lewat jatuh tempo' : ` ${d.daysUntilDue} hari lagi`}
            </div>
          </div>
          {d.debtType === 'owed_by_me' && (
            <button onClick={() => onPayDebt(d.id)} style={{ padding: '6px 12px', borderRadius: 8, background: '#8b5cf6', color: '#fff', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Lunasin
            </button>
          )}
        </div>
      ))}

      {/* Daily Spending Alert */}
      {reminders.dailySpending.isAboveAverage && (
        <div style={{ padding: '10px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
          <div style={{ fontSize: 12 }}>
            <span style={{ fontWeight: 600 }}>Spending hari ini {fmt(reminders.dailySpending.today)}</span>
            <span style={{ color: 'var(--dt-text-secondary)' }}> — 1.5x di atas rata-rata harianmu ({fmt(reminders.dailySpending.average)})</span>
          </div>
        </div>
      )}
    </div>
  );
}
