'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, AnimatedNumber, useToast } from '@/components/ui';
import { TimeRangeSelector } from '@/components/insight/TimeRangeSelector';
import { insightService, WeeklySummary } from '@/services/insightService';
import { duitTrackerService, Transaction } from '@/services/duitTrackerService';
import { detectDayOfWeekPatterns, DayOfWeekPattern } from '@/services/contextualIntelligence';
import {
  TimeRange,
  getDateRange,
  getPreviousPeriod,
  getExpensesInRange,
  calculatePeriodComparison,
  PeriodComparisonResult,
} from '@/services/financial.helpers';
import {
  Brain,
  Loader2,
  TrendingDown,
  TrendingUp,
  Minus,
  Flame,
  Trophy,
  TreePine,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Lightbulb,
  Download,
  Share2,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';

// --- Time Range Labels ---
const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  this_week: 'Minggu Ini',
  this_month: 'Bulan Ini',
  last_month: 'Bulan Lalu',
  custom: 'Custom',
};

// --- Insight Card Canvas ---
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[i] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY;
}

export default function InsightPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [data, setData] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  // Enhanced: Time range state
  const [timeRange, setTimeRange] = useState<TimeRange>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Enhanced: Period comparison
  const [comparison, setComparison] = useState<PeriodComparisonResult | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  // Enhanced: Pattern insights
  const [patterns, setPatterns] = useState<DayOfWeekPattern[]>([]);

  // Enhanced: Shareable card
  const [showInsightCard, setShowInsightCard] = useState(false);
  const insightCanvasRef = useRef<HTMLCanvasElement>(null);
  const [canShare, setCanShare] = useState(false);

  // Load base insight data
  useEffect(() => {
    insightService.getWeekly()
      .then(setData)
      .catch((e: any) => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Load transactions for comparison and patterns
  useEffect(() => {
    setTransactionsLoading(true);
    // Load all recent transactions (last 3 months for pattern detection)
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    duitTrackerService.getTransactions({
      month: undefined,
      year: undefined,
    })
      .then((txns) => {
        setTransactions(txns);
        // Detect patterns from all transactions
        const detectedPatterns = detectDayOfWeekPatterns(txns);
        setPatterns(detectedPatterns);
      })
      .catch((e: any) => showToast(e.message, 'error'))
      .finally(() => setTransactionsLoading(false));
  }, []);

  // Recalculate period comparison when time range or transactions change
  useEffect(() => {
    if (transactions.length === 0) return;

    const currentRange = getDateRange(
      timeRange,
      customStart ? new Date(customStart) : undefined,
      customEnd ? new Date(customEnd) : undefined
    );
    const previousRange = getPreviousPeriod(timeRange, currentRange);

    const currentExpenses = getExpensesInRange(transactions, currentRange);
    const previousExpenses = getExpensesInRange(transactions, previousRange);

    const result = calculatePeriodComparison(currentExpenses, previousExpenses);
    setComparison(result);
  }, [timeRange, customStart, customEnd, transactions]);

  // Check Web Share API support
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare);
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

  const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

  const handleSelectRange = (range: TimeRange) => {
    setTimeRange(range);
    setShowCustomPicker(range === 'custom');
  };

  const net = data ? data.finance.income - data.finance.expense : 0;
  const TrendIcon = data?.finance.changeDirection === 'less' ? TrendingDown : data?.finance.changeDirection === 'more' ? TrendingUp : Minus;
  const trendColor = data?.finance.changeDirection === 'less' ? 'rgb(var(--color-secondary))' : data?.finance.changeDirection === 'more' ? 'rgb(var(--color-error))' : 'rgb(var(--text-muted))';

  // --- Insight Card Drawing ---
  const drawInsightCard = useCallback(() => {
    const canvas = insightCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;

    // Background gradient (purple-blue theme)
    const bgGradient = ctx.createLinearGradient(0, 0, w, h);
    bgGradient.addColorStop(0, '#6366F1');
    bgGradient.addColorStop(0.5, '#8B5CF6');
    bgGradient.addColorStop(1, '#06B6D4');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // Decorative circles
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(w * 0.85, h * 0.12, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w * 0.15, h * 0.8, 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Title section
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('📊 Insight Keuangan', w / 2, 120);

    // Period label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(TIME_RANGE_LABELS[timeRange], w / 2, 200);

    // Main content card
    const cardX = 80;
    const cardY = 300;
    const cardW = w - 160;
    const cardH = 1300;

    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 48);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Period comparison section
    if (comparison) {
      const compY = cardY + 80;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Perbandingan Pengeluaran', w / 2, compY);

      // Current period
      ctx.font = '800 72px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillText(fmt(comparison.currentTotal), w / 2, compY + 100);

      // vs Previous
      ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(`vs ${fmt(comparison.previousTotal)} periode sebelumnya`, w / 2, compY + 180);

      // Percentage change
      const pctChange = Math.round(comparison.percentageChange);
      const isIncrease = pctChange > 0;
      ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = isIncrease ? '#F87171' : '#34D399';
      const arrow = isIncrease ? '↑' : pctChange < 0 ? '↓' : '→';
      ctx.fillText(`${arrow} ${Math.abs(pctChange)}%`, w / 2, compY + 260);
    }

    // Patterns section
    if (patterns.length > 0) {
      const patY = cardY + 520;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💡 Pola Pengeluaran', w / 2, patY);

      ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.textAlign = 'center';

      patterns.slice(0, 3).forEach((pattern, i) => {
        wrapText(ctx, pattern.insight, w / 2, patY + 80 + i * 100, cardW - 120, 44);
      });
    }

    // Finance summary
    if (data) {
      const finY = cardY + 920;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`💰 Pemasukan: ${fmt(data.finance.income)}`, cardX + 60, finY);
      ctx.fillText(`💸 Pengeluaran: ${fmt(data.finance.expense)}`, cardX + 60, finY + 70);

      if (data.gamification.streak > 0) {
        ctx.fillText(`🔥 Streak: ${data.gamification.streak} hari`, cardX + 60, finY + 140);
      }

      ctx.fillText(`✅ Todo: ${data?.productivity.todosCompleted}/${data?.productivity.todosTotal}`, cardX + 60, finY + 210);
    }

    // Divider + branding
    const dividerY = h - 280;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.3, dividerY);
    ctx.lineTo(w * 0.7, dividerY);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✦ Synapse', w / 2, h - 200);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('Platform Mahasiswa Cerdas', w / 2, h - 140);
  }, [comparison, patterns, data, timeRange]);

  useEffect(() => {
    if (showInsightCard) {
      // Slight delay to ensure canvas is rendered
      setTimeout(drawInsightCard, 50);
    }
  }, [showInsightCard, drawInsightCard]);

  const handleDownloadCard = useCallback(() => {
    const canvas = insightCanvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `synapse-insight-${timeRange}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, [timeRange]);

  const handleShareCard = useCallback(async () => {
    const canvas = insightCanvasRef.current;
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], `synapse-insight-${timeRange}.png`, { type: 'image/png' });

      const shareData: ShareData = {
        title: 'Insight Keuangan — Synapse',
        text: `Insight keuangan ${TIME_RANGE_LABELS[timeRange]} 📊\n#Synapse`,
        files: [file],
      };

      try {
        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          await navigator.share({
            title: 'Insight Keuangan — Synapse',
            text: `Insight keuangan ${TIME_RANGE_LABELS[timeRange]} 📊\n#Synapse`,
          });
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.warn('Share failed:', err);
        }
      }
    }, 'image/png');
  }, [timeRange]);

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content page-transition">
            <div className="insight-wrap">
              {/* ── Page heading ───────────────────────────────── */}
              <div className="insight-head">
                <div className="insight-head-icon">
                  <Brain size={22} />
                </div>
                <div>
                  <h1 className="insight-title">Insight</h1>
                  <p className="insight-subtitle">Analitik keuangan &amp; produktivitasmu</p>
                </div>
              </div>

              {/* ── Time range selector ────────────────────────── */}
              <TimeRangeSelector
                value={timeRange}
                labels={TIME_RANGE_LABELS}
                onChange={handleSelectRange}
                showCustomPicker={showCustomPicker}
                customStart={customStart}
                customEnd={customEnd}
                onCustomStartChange={setCustomStart}
                onCustomEndChange={setCustomEnd}
              />

              {/* ── Hero summary ───────────────────────────────── */}
              <section className="hero animate-fade-in" aria-label="Ringkasan keuangan">
                <div className="hero-bg" aria-hidden />
                <div className="hero-row">
                  <span className="hero-chip">
                    <Wallet size={13} /> Sisa Bersih · {TIME_RANGE_LABELS[timeRange]}
                  </span>
                  {data && data.finance.changeDirection !== 'same' && (
                    <span className="hero-trend" style={{ color: trendColor }}>
                      <TrendIcon size={14} />
                      {Math.abs(data.finance.changePercent)}%
                    </span>
                  )}
                </div>

                <div className="hero-net" style={{ color: net >= 0 ? 'rgb(var(--color-secondary))' : 'rgb(var(--color-error))' }}>
                  {loading ? (
                    <span className="hero-skeleton" />
                  ) : (
                    <AnimatedNumber value={Math.round(net)} prefix="Rp " countUp />
                  )}
                </div>

                <div className="hero-stats">
                  <div className="hero-stat">
                    <div className="hero-stat-ic" style={{ background: 'rgba(var(--color-secondary) / 0.15)', color: 'rgb(var(--color-secondary))' }}>
                      <ArrowDownRight size={16} />
                    </div>
                    <div>
                      <div className="hero-stat-label">Pemasukan</div>
                      <div className="hero-stat-val">
                        {loading ? '—' : <AnimatedNumber value={Math.round(data?.finance.income || 0)} prefix="Rp " countUp />}
                      </div>
                    </div>
                  </div>
                  <div className="hero-divider" aria-hidden />
                  <div className="hero-stat">
                    <div className="hero-stat-ic" style={{ background: 'rgba(var(--color-error) / 0.15)', color: 'rgb(var(--color-error))' }}>
                      <ArrowUpRight size={16} />
                    </div>
                    <div>
                      <div className="hero-stat-label">Pengeluaran</div>
                      <div className="hero-stat-val">
                        {loading ? '—' : <AnimatedNumber value={Math.round(data?.finance.expense || 0)} prefix="Rp " countUp />}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Period comparison ──────────────────────────── */}
              {comparison && !transactionsLoading && (
                <Card className="ins-card" style={{ borderTop: '3px solid rgb(var(--color-primary))' }}>
                  <div className="ins-card-head">
                    <BarChart3 size={18} style={{ color: 'rgb(var(--color-primary))' }} />
                    <h3>Perbandingan Periode</h3>
                  </div>

                  <div className="cmp-grid">
                    <div className="cmp-tile cmp-tile--current">
                      <div className="cmp-label">Periode Sekarang</div>
                      <div className="cmp-value" style={{ color: 'rgb(var(--color-error))' }}>
                        <AnimatedNumber value={Math.round(comparison.currentTotal)} prefix="Rp " countUp />
                      </div>
                    </div>
                    <div className="cmp-tile">
                      <div className="cmp-label">Periode Sebelumnya</div>
                      <div className="cmp-value" style={{ color: 'rgb(var(--text-secondary))' }}>
                        <AnimatedNumber value={Math.round(comparison.previousTotal)} prefix="Rp " countUp />
                      </div>
                    </div>
                  </div>

                  <div
                    className="cmp-delta"
                    style={{
                      background:
                        comparison.difference > 0
                          ? 'rgba(var(--color-error) / 0.08)'
                          : comparison.difference < 0
                          ? 'rgba(var(--color-secondary) / 0.1)'
                          : 'rgba(var(--text-muted) / 0.08)',
                    }}
                  >
                    <div className="cmp-delta-row">
                      {comparison.difference > 0 ? (
                        <TrendingUp size={18} style={{ color: 'rgb(var(--color-error))' }} />
                      ) : comparison.difference < 0 ? (
                        <TrendingDown size={18} style={{ color: 'rgb(var(--color-secondary))' }} />
                      ) : (
                        <Minus size={18} style={{ color: 'rgb(var(--text-muted))' }} />
                      )}
                      <span
                        className="cmp-delta-val"
                        style={{
                          color:
                            comparison.difference > 0
                              ? 'rgb(var(--color-error))'
                              : comparison.difference < 0
                              ? 'rgb(var(--color-secondary))'
                              : 'rgb(var(--text-muted))',
                        }}
                      >
                        {comparison.difference > 0 ? '+' : ''}{fmt(comparison.difference)} ({comparison.difference > 0 ? '+' : ''}{Math.round(comparison.percentageChange)}%)
                      </span>
                    </div>
                    <div className="cmp-delta-note">
                      {comparison.difference > 0
                        ? 'Pengeluaran naik dari periode sebelumnya'
                        : comparison.difference < 0
                        ? 'Pengeluaran turun dari periode sebelumnya — bagus! 🎉'
                        : 'Sama dengan periode sebelumnya'}
                    </div>
                  </div>
                </Card>
              )}

              {/* ── Main content ───────────────────────────────── */}
              {loading ? (
                <div className="ins-loading">
                  <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'rgb(var(--color-primary))' }} />
                </div>
              ) : !data ? (
                <div className="empty-state">
                  <span className="empty-icon">📊</span>
                  <h3>Belum cukup data</h3>
                  <p>Mulai catat aktivitasmu dan kembali lagi nanti.</p>
                </div>
              ) : (
                <div className="animate-fade-in">
                  {/* AI Insight */}
                  {data.aiInsight ? (
                    <Card className="ins-card ai-card">
                      <div className="ins-card-head">
                        <span className="ai-spark"><Sparkles size={16} /></span>
                        <h3 className="ai-headline">{data.aiInsight.headline}</h3>
                      </div>
                      <p className="ai-body">{data.aiInsight.body}</p>
                      {data.aiInsight.tip && (
                        <div className="ai-tip">💡 {data.aiInsight.tip}</div>
                      )}
                    </Card>
                  ) : (
                    <Card className="ins-card ai-empty">
                      <Sparkles size={22} style={{ color: 'rgb(var(--color-primary))' }} />
                      <p>Mau lihat analisis AI dari datamu?</p>
                      <Button onClick={loadAiInsight} disabled={aiLoading} isLoading={aiLoading} leftIcon={<Sparkles size={15} />}>
                        {aiLoading ? 'Menganalisis...' : 'Generate AI Insight'}
                      </Button>
                    </Card>
                  )}

                  {/* Top Categories */}
                  {data.finance.topCategories.length > 0 && (
                    <Card className="ins-card">
                      <div className="ins-card-head">
                        <BarChart3 size={18} style={{ color: 'rgb(var(--color-primary))' }} />
                        <h3>Top Kategori Pengeluaran</h3>
                      </div>
                      <div className="bars">
                        {data.finance.topCategories.map((cat, i) => {
                          const maxAmount = data.finance.topCategories[0]?.amount || 1;
                          const pct = Math.max(2, Math.round((cat.amount / maxAmount) * 100));
                          return (
                            <div className="bar-row" key={cat.category}>
                              <div className="bar-top">
                                <span className="bar-rank">{i + 1}</span>
                                <span className="bar-name">{cat.category}</span>
                                <span className="bar-amt">
                                  <AnimatedNumber value={Math.round(cat.amount)} prefix="Rp " countUp />
                                </span>
                              </div>
                              <div className="bar-track">
                                <div
                                  className="bar-fill"
                                  style={{ ['--w' as any]: `${pct}%`, animationDelay: `${i * 80}ms` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}

                  {/* Cross-Feature Pattern Insights */}
                  {patterns.length > 0 && (
                    <Card className="ins-card" style={{ borderLeft: '3px solid rgb(var(--color-accent-yellow, 255 214 80))' }}>
                      <div className="ins-card-head">
                        <Lightbulb size={18} style={{ color: 'rgb(var(--color-accent-yellow, 255 214 80))' }} />
                        <h3>Pola Pengeluaran</h3>
                      </div>
                      <div className="patterns">
                        {patterns.map((pattern) => (
                          <div className="pattern" key={`${pattern.dayOfWeek}-${pattern.category}`}>
                            <span className="pattern-emoji">💡</span>
                            <div>
                              <div className="pattern-text">{pattern.insight}</div>
                              <div className="pattern-meta">{pattern.occurrences} transaksi terdeteksi</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Productivity + Gamification */}
                  <div className="pg-grid">
                    <Card className="ins-card pg-card">
                      <div className="pg-head"><CheckCircle2 size={16} style={{ color: 'rgb(var(--color-primary))' }} /> Produktivitas</div>
                      <div className="pg-ring" style={{ ['--pct' as any]: data.productivity.completionRate }}>
                        <div className="pg-pct">
                          <AnimatedNumber value={data.productivity.completionRate} suffix="%" countUp />
                        </div>
                      </div>
                      <p className="pg-note">{data.productivity.todosCompleted}/{data.productivity.todosTotal} todo selesai</p>
                    </Card>
                    <Card className="ins-card pg-card">
                      <div className="pg-head"><Trophy size={16} style={{ color: 'rgb(var(--color-accent-yellow, 255 214 80))' }} /> Gamifikasi</div>
                      <div className="pg-level">
                        <span className="pg-level-num">Lv {data.gamification.level}</span>
                        <span className="pg-xp"><AnimatedNumber value={data.gamification.totalXp} countUp /> XP</span>
                      </div>
                      {data.gamification.streak > 0 && (
                        <div className="pg-streak">
                          <Flame size={14} style={{ color: 'rgb(var(--color-warning, 255 159 64))' }} />
                          {data.gamification.streak} hari streak
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* Trees */}
                  {data.trees.length > 0 && (
                    <Card className="ins-card">
                      <div className="ins-card-head">
                        <TreePine size={18} style={{ color: 'rgb(var(--color-secondary))' }} />
                        <h3>Pohon Tabungan</h3>
                      </div>
                      <div className="bars">
                        {data.trees.map((tree, i) => (
                          <div className="bar-row" key={tree.name}>
                            <div className="bar-top">
                              <span className="bar-name">{tree.name}</span>
                              <span className="bar-meta">sisa {fmt(tree.remaining)}</span>
                            </div>
                            <div className="bar-track">
                              <div
                                className="bar-fill bar-fill--green"
                                style={{ ['--w' as any]: `${Math.max(2, tree.progress)}%`, animationDelay: `${i * 80}ms` }}
                              />
                            </div>
                            <span className="bar-pct">{tree.progress}%</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Alerts */}
                  {data.alerts.length > 0 && (
                    <Card className="ins-card" style={{ borderLeft: '3px solid rgb(var(--color-warning, 255 159 64))' }}>
                      <div className="ins-card-head">
                        <AlertTriangle size={18} style={{ color: 'rgb(var(--color-warning, 255 159 64))' }} />
                        <h3>Peringatan</h3>
                      </div>
                      <div className="alerts">
                        {data.alerts.map((alert, i) => (
                          <div className="alert" key={i}>⚠️ {alert.message}</div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* ── Shareable Insight Card ──────────────────────── */}
              <Card className="ins-card share-card">
                <div className="ins-card-head" style={{ justifyContent: 'center' }}>
                  <Share2 size={18} style={{ color: 'rgb(var(--color-primary))' }} />
                  <h3>Bagikan Insight</h3>
                </div>
                <p className="share-desc">
                  Buat kartu insight untuk dibagikan ke Instagram Story atau media sosial lainnya
                </p>
                {!showInsightCard ? (
                  <Button onClick={() => setShowInsightCard(true)} leftIcon={<Sparkles size={16} />}>
                    Generate Insight Card
                  </Button>
                ) : (
                  <div className="share-preview">
                    <canvas
                      ref={insightCanvasRef}
                      width={CANVAS_WIDTH}
                      height={CANVAS_HEIGHT}
                      className="share-canvas"
                    />
                    <div className="share-actions">
                      <button onClick={handleDownloadCard} aria-label="Download insight card" className="share-btn">
                        <Download size={18} /> Download
                      </button>
                      {canShare && (
                        <button onClick={handleShareCard} aria-label="Share insight card" className="share-btn share-btn--primary">
                          <Share2 size={18} /> Share
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .insight-wrap {
          max-width: 820px;
          margin: 0 auto;
          padding-bottom: calc(var(--bottom-nav-height, 60px) + 16px);
        }

        /* Heading */
        .insight-head {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }
        .insight-head-icon {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, rgba(var(--color-primary) / 0.18), rgba(var(--color-secondary) / 0.14));
          color: rgb(var(--color-primary));
          flex-shrink: 0;
        }
        .insight-title {
          font-size: var(--font-2xl);
          font-weight: 800;
          line-height: 1.1;
        }
        .insight-subtitle {
          font-size: var(--font-sm);
          color: rgb(var(--text-muted));
          margin: 0;
        }

        /* Hero */
        .hero {
          position: relative;
          overflow: hidden;
          border-radius: var(--radius-xl);
          border: 1px solid var(--border-default);
          background: rgb(var(--bg-surface));
          padding: 22px 22px 20px;
          margin-bottom: 16px;
        }
        .hero-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(120% 90% at 100% 0%, rgba(var(--color-primary) / 0.18), transparent 60%),
            radial-gradient(120% 90% at 0% 100%, rgba(var(--color-secondary) / 0.16), transparent 60%);
          pointer-events: none;
        }
        .hero-row {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
        }
        .hero-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 11px;
          border-radius: var(--radius-full);
          background: rgba(var(--color-primary) / 0.1);
          color: rgb(var(--color-primary));
          font-size: var(--font-xs);
          font-weight: 700;
        }
        .hero-trend {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: var(--font-sm);
          font-weight: 700;
        }
        .hero-net {
          position: relative;
          font-size: var(--font-hero);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.02em;
          margin-bottom: 18px;
          min-height: 2.25rem;
        }
        .hero-skeleton {
          display: inline-block;
          width: 180px;
          height: 2rem;
          border-radius: var(--radius-sm);
          background: rgb(var(--bg-elevated));
        }
        .hero-stats {
          position: relative;
          display: flex;
          align-items: stretch;
          gap: 14px;
        }
        .hero-stat {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .hero-stat-ic {
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          flex-shrink: 0;
        }
        .hero-stat-label {
          font-size: var(--font-xs);
          color: rgb(var(--text-muted));
        }
        .hero-stat-val {
          font-size: var(--font-md);
          font-weight: 700;
          color: rgb(var(--text-primary));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hero-divider {
          width: 1px;
          background: var(--border-default);
        }

        /* Generic card bits */
        :global(.ins-card) {
          margin-bottom: 16px;
        }
        .ins-card-head {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }
        .ins-card-head h3 {
          font-size: var(--font-lg);
          font-weight: 700;
        }

        .ins-loading {
          text-align: center;
          padding: 60px 0;
        }

        /* AI card */
        :global(.ai-card) {
          border-top: 3px solid rgb(var(--color-primary));
          background: linear-gradient(135deg, rgba(var(--color-primary) / 0.06), rgba(var(--color-secondary) / 0.04)), rgb(var(--bg-surface));
        }
        .ai-spark {
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)));
          color: rgb(var(--bg-base));
          flex-shrink: 0;
        }
        .ai-headline {
          font-size: var(--font-lg);
          font-weight: 800;
        }
        .ai-body {
          font-size: var(--font-sm);
          line-height: 1.7;
          margin-bottom: 12px;
          color: rgb(var(--text-secondary));
        }
        .ai-tip {
          padding: 11px 14px;
          background: rgba(var(--color-secondary) / 0.12);
          border-radius: var(--radius-md);
          font-size: var(--font-sm);
          color: rgb(var(--text-primary));
        }
        :global(.ai-empty) {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 26px 16px;
        }
        :global(.ai-empty) p {
          font-size: var(--font-sm);
          color: rgb(var(--text-muted));
        }

        /* Comparison */
        .cmp-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        .cmp-tile {
          text-align: center;
          padding: 14px 10px;
          background: rgba(var(--text-muted) / 0.06);
          border-radius: var(--radius-md);
        }
        .cmp-tile--current {
          background: rgba(var(--color-primary) / 0.07);
        }
        .cmp-label {
          font-size: var(--font-xs);
          color: rgb(var(--text-muted));
          margin-bottom: 6px;
        }
        .cmp-value {
          font-size: var(--font-xl);
          font-weight: 800;
          line-height: 1.1;
        }
        .cmp-delta {
          text-align: center;
          padding: 12px;
          border-radius: var(--radius-md);
        }
        .cmp-delta-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .cmp-delta-val {
          font-size: var(--font-lg);
          font-weight: 700;
        }
        .cmp-delta-note {
          font-size: var(--font-xs);
          color: rgb(var(--text-muted));
          margin-top: 4px;
        }

        /* Bars (categories + trees) */
        .bars {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .bar-top {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .bar-rank {
          display: grid;
          place-items: center;
          width: 20px;
          height: 20px;
          border-radius: var(--radius-full);
          background: rgba(var(--color-primary) / 0.12);
          color: rgb(var(--color-primary));
          font-size: 11px;
          font-weight: 800;
          flex-shrink: 0;
        }
        .bar-name {
          font-size: var(--font-sm);
          font-weight: 600;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .bar-amt {
          font-size: var(--font-sm);
          font-weight: 700;
          color: rgb(var(--text-primary));
        }
        .bar-meta {
          font-size: var(--font-xs);
          color: rgb(var(--text-muted));
        }
        .bar-track {
          height: 9px;
          border-radius: var(--radius-full);
          background: rgba(var(--text-muted) / 0.14);
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          border-radius: var(--radius-full);
          width: var(--w);
          background: linear-gradient(90deg, rgb(var(--color-primary)), rgb(var(--color-accent, 100 100 255)));
          animation: barGrow 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .bar-fill--green {
          background: linear-gradient(90deg, rgb(var(--color-secondary)), rgb(var(--color-primary)));
        }
        .bar-pct {
          font-size: 10px;
          color: rgb(var(--text-muted));
        }
        @keyframes barGrow {
          from {
            width: 0;
          }
          to {
            width: var(--w);
          }
        }

        /* Patterns */
        .patterns {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pattern {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          background: rgba(var(--color-accent-yellow, 255 214 80) / 0.08);
          border-radius: var(--radius-md);
        }
        .pattern-emoji {
          font-size: 1.1rem;
          line-height: 1.3;
        }
        .pattern-text {
          font-size: var(--font-sm);
          font-weight: 600;
          line-height: 1.5;
        }
        .pattern-meta {
          font-size: var(--font-xs);
          color: rgb(var(--text-muted));
          margin-top: 3px;
        }

        /* Productivity + gamification */
        .pg-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        :global(.pg-card) {
          text-align: center;
        }
        .pg-head {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: var(--font-sm);
          font-weight: 700;
          margin-bottom: 12px;
        }
        .pg-ring {
          display: grid;
          place-items: center;
          width: 86px;
          height: 86px;
          margin: 0 auto 8px;
          border-radius: var(--radius-full);
          background:
            radial-gradient(closest-side, rgb(var(--bg-surface)) 70%, transparent 71%),
            conic-gradient(rgb(var(--color-primary)) calc(var(--pct, 0) * 1%), rgba(var(--text-muted) / 0.15) 0);
        }
        .pg-pct {
          font-size: var(--font-xl);
          font-weight: 800;
          color: rgb(var(--color-primary));
        }
        .pg-note {
          font-size: var(--font-xs);
          color: rgb(var(--text-muted));
          margin: 0;
        }
        .pg-level {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          margin-bottom: 8px;
        }
        .pg-level-num {
          font-size: var(--font-2xl);
          font-weight: 800;
          color: rgb(var(--color-accent-yellow, 255 214 80));
          line-height: 1.1;
        }
        .pg-xp {
          font-size: var(--font-sm);
          font-weight: 700;
          color: rgb(var(--text-secondary));
        }
        .pg-streak {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: var(--radius-full);
          background: rgba(var(--color-warning, 255 159 64) / 0.12);
          font-size: var(--font-xs);
          font-weight: 700;
          color: rgb(var(--text-primary));
        }

        /* Alerts */
        .alerts {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .alert {
          padding: 10px 13px;
          background: rgba(var(--color-warning, 255 159 64) / 0.08);
          border-radius: var(--radius-md);
          font-size: var(--font-sm);
        }

        /* Share */
        :global(.share-card) {
          text-align: center;
        }
        .share-desc {
          font-size: var(--font-sm);
          color: rgb(var(--text-muted));
          margin-bottom: 16px;
        }
        .share-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .share-canvas {
          width: 100%;
          max-width: 300px;
          height: auto;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
        }
        .share-actions {
          display: flex;
          gap: 12px;
          width: 100%;
          max-width: 300px;
        }
        .share-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 14px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-default);
          background: rgb(var(--bg-elevated));
          color: rgb(var(--text-primary));
          font-size: var(--font-sm);
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .share-btn:hover {
          opacity: 0.85;
        }
        .share-btn--primary {
          border: none;
          background: linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)));
          color: rgb(var(--bg-base));
        }

        @media (max-width: 480px) {
          .hero-net {
            font-size: var(--font-2xl);
          }
          .insight-period-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 768px) {
          .insight-wrap {
            padding: 0 !important;
          }
          .insight-period-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bar-fill {
            animation: none;
          }
        }
      `}</style>
    </AuthGuard>
  );
}
