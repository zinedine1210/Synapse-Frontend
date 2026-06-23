'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useFeatureAccess } from '@/lib/feature-access';
import { useInfiniteScroll } from '@/lib/useInfiniteScroll';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Modal, useToast, useConfirm, CurrencyInput, parseCurrency, DateTimePicker, PullToRefresh, SelectOption, TextInput, TextArea } from '@/components/ui';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import { duitTrackerService, Transaction, Summary, SavingTree, CategoryBudget, FinancialOverview, WishlistItem, RecurringBill, BudgetChallenge, CustomCategory, FinancialForecast, SpendingComparison, SmartReminders } from '@/services/duitTrackerService';
import { siBawelService, BawelSetting, WeeklyRoast } from '@/services/siBawelService';
import { SubscriptionCard } from '@/components/duit-tracker/SubscriptionCard';
import { FinancialHero } from '@/components/duit-tracker/FinancialHero';
import { TransactionSheet } from '@/components/duit-tracker/TransactionSheet';
import { ReceiptScannerModal, ScannedItem } from '@/components/duit-tracker/ReceiptScannerModal';
import { PieChartSvg, LineChartSvg, SpendingHeatmap, ForecastCard, ComparisonCard, ChallengeSection, CustomCategoryManager, CsvImportModal, ExportButton, ReminderBanner } from '@/components/duit-tracker/DuitTrackerAdvanced';
import { WhatIfCalculator } from '@/components/duit-tracker/WhatIfCalculator';
import { useCache } from '@/lib/cache';
import { useAiJob } from '@/lib/useAiJob';
import { Plus, Trash2, Loader2, Wallet, TreePine, Sparkles, Edit2, Target, Settings, X, Camera, ExternalLink, Check, CalendarClock, ToggleLeft, ToggleRight, TrendingDown, TrendingUp, Upload, BarChart3, Users, PieChart, Calendar, ArrowRight } from 'lucide-react';

type PeriodPreset = 'today' | 'yesterday' | '2days' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

const PERIOD_PRESETS: { key: PeriodPreset; label: string; emoji: string }[] = [
  { key: 'today', label: 'Hari Ini', emoji: '📅' },
  { key: 'yesterday', label: 'Kemarin', emoji: '⏪' },
  { key: '2days', label: '2 Hari Lalu', emoji: '📆' },
  { key: 'this_week', label: 'Minggu Ini', emoji: '🗓️' },
  { key: 'last_week', label: 'Minggu Lalu', emoji: '📋' },
  { key: 'this_month', label: 'Bulan Ini', emoji: '🗂️' },
  { key: 'last_month', label: 'Bulan Lalu', emoji: '🗃️' },
  { key: 'custom', label: 'Pilih Tanggal', emoji: '🔧' },
];

function getPeriodRange(preset: PeriodPreset): { startDate: string; endDate: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  switch (preset) {
    case 'today':
      return { startDate: fmt(today), endDate: fmt(today) };
    case 'yesterday': {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return { startDate: fmt(y), endDate: fmt(y) };
    }
    case '2days': {
      const d = new Date(today); d.setDate(d.getDate() - 2);
      return { startDate: fmt(d), endDate: fmt(d) };
    }
    case 'this_week': {
      const dow = today.getDay();
      const mon = new Date(today); mon.setDate(today.getDate() - ((dow + 6) % 7));
      return { startDate: fmt(mon), endDate: fmt(today) };
    }
    case 'last_week': {
      const dow = today.getDay();
      const thisMon = new Date(today); thisMon.setDate(today.getDate() - ((dow + 6) % 7));
      const lastMon = new Date(thisMon); lastMon.setDate(thisMon.getDate() - 7);
      const lastSun = new Date(thisMon); lastSun.setDate(thisMon.getDate() - 1);
      return { startDate: fmt(lastMon), endDate: fmt(lastSun) };
    }
    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: fmt(start), endDate: fmt(today) };
    }
    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: fmt(start), endDate: fmt(end) };
    }
    default:
      return { startDate: fmt(today), endDate: fmt(today) };
  }
}

const EXPENSE_CATEGORIES = [
  { id: 'makanan', emoji: '🍽️', label: 'Makan & Minum' },
  { id: 'transportasi', emoji: '🚗', label: 'Transport' },
  { id: 'belanja', emoji: '🛒', label: 'Belanja' },
  { id: 'hiburan', emoji: '🎮', label: 'Hiburan' },
  { id: 'tagihan', emoji: '💡', label: 'Tagihan' },
  { id: 'kesehatan', emoji: '💊', label: 'Kesehatan' },
  { id: 'pendidikan', emoji: '📚', label: 'Pendidikan' },
  { id: 'kos', emoji: '🏠', label: 'Kos' },
  { id: 'lainnya', emoji: '📦', label: 'Lainnya' },
];
const INCOME_CATEGORIES = [
  { id: 'gaji', emoji: '💼', label: 'Gaji' },
  { id: 'freelance', emoji: '💻', label: 'Freelance' },
  { id: 'kiriman', emoji: '💌', label: 'Kiriman' },
  { id: 'beasiswa', emoji: '🎓', label: 'Beasiswa' },
  { id: 'bonus', emoji: '🎁', label: 'Bonus' },
  { id: 'jualan', emoji: '🏪', label: 'Jualan' },
  { id: 'lainnya', emoji: '📦', label: 'Lainnya' },
];

/** Category color map for accent strip on transaction cards */
const CATEGORY_COLORS: Record<string, string> = {
  makanan: '#f59e0b',
  minuman: '#f59e0b',
  transportasi: '#3b82f6',
  belanja: '#ec4899',
  hiburan: '#10b981',
  tagihan: '#ef4444',
  kesehatan: '#06b6d4',
  pendidikan: '#6366f1',
  kos: '#f97316',
  lainnya: '#6b7280',
  gaji: '#10b981',
  freelance: '#8b5cf6',
  kiriman: '#ec4899',
  beasiswa: '#6366f1',
  bonus: '#f59e0b',
  jualan: '#3b82f6',
};

const TREE_TEMPLATES = [
  { emoji: '🎧', name: 'AirPods Pro', target: 4200000 },
  { emoji: '📱', name: 'iPhone Baru', target: 16000000 },
  { emoji: '💻', name: 'Laptop Baru', target: 18000000 },
  { emoji: '✈️', name: 'Liburan', target: 3000000 },
  { emoji: '🎓', name: 'Biaya Wisuda', target: 2000000 },
  { emoji: '🏠', name: 'Dana Darurat', target: 5000000 },
];

function getTreeStage(pct: number) {
  if (pct <= 0) return { emoji: '🕳️', label: 'Tanah kosong', color: '#8B7355' };
  if (pct < 15) return { emoji: '🌱', label: 'Benih', color: '#90EE90' };
  if (pct < 30) return { emoji: '🌿', label: 'Tunas', color: '#3CB371' };
  if (pct < 50) return { emoji: '🌲', label: 'Pohon muda', color: '#228B22' };
  if (pct < 70) return { emoji: '🌳', label: 'Pohon dewasa', color: '#006400' };
  if (pct < 85) return { emoji: '🌳✨', label: 'Pohon rindang', color: '#006400' };
  if (pct < 100) return { emoji: '🍎', label: 'Hampir panen', color: '#FF6347' };
  return { emoji: '🏆🎊', label: 'Target tercapai!', color: '#FFD700' };
}

/** Enhanced tree stage SVG visualization */
function TreeStageSvg({ pct }: { pct: number }) {
  const getScale = () => {
    if (pct <= 0) return 0.3;
    if (pct < 15) return 0.4;
    if (pct < 30) return 0.55;
    if (pct < 50) return 0.7;
    if (pct < 70) return 0.82;
    if (pct < 85) return 0.92;
    if (pct < 100) return 0.96;
    return 1;
  };

  const getColor = () => {
    if (pct <= 0) return '#8B7355';
    if (pct < 15) return '#90EE90';
    if (pct < 30) return '#3CB371';
    if (pct < 50) return '#228B22';
    if (pct < 70) return '#006400';
    if (pct < 85) return '#006400';
    if (pct < 100) return '#FF6347';
    return '#FFD700';
  };

  const scale = getScale();
  const color = getColor();
  const isComplete = pct >= 100;

  return (
    <div style={{
      width: 120,
      height: 120,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}>
      <svg
        width="100"
        height="100"
        viewBox="0 0 100 100"
        style={{
          transform: `scale(${scale})`,
          transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: isComplete ? 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.5))' : 'none',
        }}
      >
        {/* Ground */}
        <ellipse cx="50" cy="90" rx="30" ry="6" fill="#8B7355" opacity="0.3" />
        {/* Trunk */}
        <rect x="44" y="50" width="12" height="40" rx="4" fill="#8B4513" />
        {/* Canopy */}
        {pct > 0 && (
          <>
            <circle cx="50" cy="35" r={pct < 30 ? 15 : pct < 50 ? 20 : 25} fill={color} style={{ transition: 'r 0.6s ease, fill 0.4s ease' }} />
            {pct >= 30 && <circle cx="35" cy="45" r={pct < 50 ? 10 : 14} fill={color} opacity="0.85" />}
            {pct >= 30 && <circle cx="65" cy="45" r={pct < 50 ? 10 : 14} fill={color} opacity="0.85" />}
            {pct >= 70 && <circle cx="40" cy="25" r="10" fill={color} opacity="0.7" />}
            {pct >= 70 && <circle cx="60" cy="25" r="10" fill={color} opacity="0.7" />}
          </>
        )}
        {/* Fruits / sparkles for near-complete */}
        {pct >= 85 && pct < 100 && (
          <>
            <circle cx="38" cy="38" r="4" fill="#FF6347" />
            <circle cx="62" cy="40" r="4" fill="#FF6347" />
            <circle cx="50" cy="48" r="3.5" fill="#FF6347" />
          </>
        )}
        {/* Trophy for complete */}
        {isComplete && (
          <text x="50" y="20" textAnchor="middle" fontSize="16">🏆</text>
        )}
      </svg>
    </div>
  );
}

function getCatEmoji(id: string, type: string) {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return list.find(c => c.id === id)?.emoji || '📦';
}

export default function DuitTrackerPage() {
  useAuth();
  const { hasFeature } = useFeatureAccess();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tab, setTab] = useState<'transactions' | 'summary' | 'trees' | 'budget' | 'debts' | 'wishlist' | 'bills' | 'challenges'>('transactions');
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [appliedRange, setAppliedRange] = useState<{ start: string; end: string } | null>(null);

  // Build tx query params (memoized so fetcher reference is stable)
  const txQueryParams = useMemo(() => {
    let params: { month?: number; year?: number; type?: string; category?: string; startDate?: string; endDate?: string } = {};
    if (periodPreset === 'custom' && appliedRange) {
      params = { startDate: appliedRange.start, endDate: appliedRange.end };
    } else if (periodPreset !== 'custom') {
      const range = getPeriodRange(periodPreset);
      params = { startDate: range.startDate, endDate: range.endDate };
    } else {
      params = { month, year };
    }
    if (typeFilter) params.type = typeFilter;
    if (categoryFilter) params.category = categoryFilter;
    return params;
  }, [periodPreset, appliedRange, month, year, typeFilter, categoryFilter]);

  // Infinite scroll for transactions — cached for instant back-navigation
  const txCacheKey = `dt:transactions:${JSON.stringify(txQueryParams)}`;
  const txFetcher = useCallback(async (page: number) => {
    return duitTrackerService.getTransactions({ ...txQueryParams, page, limit: 30 });
  }, [txQueryParams]);

  const {
    items: transactions,
    loading: txLoading,
    sentinelRef: txSentinelRef,
    refresh: refreshTx,
    removeItem: removeTx,
    updateItem: updateTx,
    setItems: setTransactions,
  } = useInfiniteScroll<Transaction>({ fetcher: txFetcher, cacheKey: txCacheKey });

  // Cached side data — instant on navigation back
  const summaryFetcher = useCallback(() => duitTrackerService.getSummary(month, year), [month, year]);
  const treesFetcher = useCallback(() => duitTrackerService.getTrees(), []);
  const budgetsFetcher = useCallback(() => duitTrackerService.getBudgets(month, year), [month, year]);

  const { data: summary, loading, revalidate: refetchSummary } = useCache<Summary>(`dt:summary:${month}:${year}`, summaryFetcher);
  const { data: trees = [], revalidate: refetchTrees } = useCache<SavingTree[]>('dt:trees', treesFetcher);
  const { data: budgets = [], revalidate: refetchBudgets, mutate: mutateBudgets } = useCache<CategoryBudget[]>(`dt:budgets:${month}:${year}`, budgetsFetcher);

  // Financial overview (debts + bills summary for hero card)
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const refetchOverview = useCallback(() => {
    duitTrackerService.getFinancialOverview().then(setOverview).catch(() => {});
  }, []);
  useEffect(() => { refetchOverview(); }, [refetchOverview]);

  // Period label for hero card
  const periodLabel = useMemo(() => {
    const found = PERIOD_PRESETS.find(p => p.key === periodPreset);
    return found ? `Saldo ${found.label.toLowerCase()}` : 'Saldo';
  }, [periodPreset]);

  const fetchData = useCallback(async () => {
    refreshTx();
    refetchSummary();
    refetchTrees();
    refetchBudgets();
    refetchOverview();
  }, [refreshTx, refetchSummary, refetchTrees, refetchBudgets, refetchOverview]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [form, setForm] = useState({ amount: '', type: 'expense', category: 'lainnya', label: '', note: '', date: '' });
  const [treeForm, setTreeForm] = useState({ name: '', targetAmount: '', deadline: '' });
  const [budgetForm, setBudgetForm] = useState({ category: 'makanan', amount: '' });
  const [aiText, setAiText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [depositTreeId, setDepositTreeId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositType, setDepositType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [bawelSetting, setBawelSetting] = useState<BawelSetting | null>(null);
  const [showBawelSettings, setShowBawelSettings] = useState(false);


  // Recurring Bills / Tagihan
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billsLoaded, setBillsLoaded] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billForm, setBillForm] = useState({ name: '', amount: '', dueDay: '1', category: 'tagihan', notes: '' });
  const [billFilter, setBillFilter] = useState<'all' | 'active' | 'inactive'>('active');

  const fetchBills = useCallback(async () => {
    if (!billsLoaded) setBillsLoading(true);
    try {
      const data = await duitTrackerService.getBills();
      setBills(data);
      setBillsLoaded(true);
    } catch { }
    finally { setBillsLoading(false); }
  }, [billsLoaded]);

  useEffect(() => { if (tab === 'bills') fetchBills(); }, [tab, fetchBills]);

  const filteredBills = useMemo(() => {
    if (billFilter === 'all') return bills;
    return bills.filter(b => billFilter === 'active' ? b.isActive : !b.isActive);
  }, [bills, billFilter]);

  const billsSummary = useMemo(() => {
    const active = bills.filter(b => b.isActive);
    const totalMonthly = active.reduce((sum, b) => sum + b.amount, 0);
    const unpaid = active.filter(b => !b.isPaidThisMonth);
    const totalUnpaid = unpaid.reduce((sum, b) => sum + b.amount, 0);
    const dueSoon = active.filter(b => b.isDueSoon);
    return { totalMonthly, unpaidCount: unpaid.length, totalUnpaid, dueSoonCount: dueSoon.length };
  }, [bills]);

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseCurrency(billForm.amount);
    if (!billForm.name || !amount) return;
    setSubmitting(true);
    try {
      const created = await duitTrackerService.createBill({
        name: billForm.name,
        amount,
        dueDay: parseInt(billForm.dueDay) || 1,
        category: billForm.category || 'tagihan',
        notes: billForm.notes || undefined,
      });
      setBills(prev => [created, ...prev]);
      showToast('Tagihan ditambahkan! \ud83d\udcdd', 'success');
      setShowBillModal(false);
      setBillForm({ name: '', amount: '', dueDay: '1', category: 'tagihan', notes: '' });
      refetchOverview();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleMarkBillPaid = async (id: string) => {
    try {
      await duitTrackerService.markBillPaid(id);
      setBills(prev => prev.map(b => b.id === id ? { ...b, isPaidThisMonth: true, isDueSoon: false, lastPaidAt: new Date().toISOString() } : b));
      showToast('Tagihan dibayar bulan ini! \u2705', 'success');
      refetchOverview();
      refreshTx();
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleToggleBillActive = async (bill: RecurringBill) => {
    setBills(prev => prev.map(b => b.id === bill.id ? { ...b, isActive: !b.isActive } : b));
    try {
      await duitTrackerService.updateBill(bill.id, { isActive: !bill.isActive });
      showToast(bill.isActive ? 'Tagihan dinonaktifkan' : 'Tagihan diaktifkan kembali', 'success');
      refetchOverview();
    } catch (e: any) {
      setBills(prev => prev.map(b => b.id === bill.id ? { ...b, isActive: bill.isActive } : b));
      showToast(e.message, 'error');
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (!await confirm({ message: 'Yakin hapus tagihan ini?', variant: 'danger' })) return;
    const prev = bills;
    setBills(p => p.filter(b => b.id !== id));
    try {
      await duitTrackerService.deleteBill(id);
      showToast('Tagihan dihapus', 'success');
      refetchOverview();
    } catch (e: any) {
      setBills(prev);
      showToast(e.message, 'error');
    }
  };

  // Debts
  const [debts, setDebts] = useState<any[]>([]);
  const [debtsLoading, setDebtsLoading] = useState(false);
  const [debtsLoaded, setDebtsLoaded] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [debtForm, setDebtForm] = useState({ description: '', amount: '', debtType: 'owed_by_me', personName: '', dueDate: '' });
  const [debtFilter, setDebtFilter] = useState<'all' | 'active' | 'paid'>('active');

  const fetchDebts = useCallback(async () => {
    if (!debtsLoaded) setDebtsLoading(true);
    try {
      const isPaid = debtFilter === 'all' ? undefined : debtFilter === 'paid';
      const data = await duitTrackerService.getDebts(isPaid);
      setDebts(data);
      setDebtsLoaded(true);
    } catch { }
    finally { setDebtsLoading(false); }
  }, [debtFilter, debtsLoaded]);

  useEffect(() => { if (tab === 'debts') fetchDebts(); }, [tab, fetchDebts]);

  const handleDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseCurrency(debtForm.amount);
    if (!debtForm.description || !amount || !debtForm.personName) return;
    setSubmitting(true);
    try {
      const created = await duitTrackerService.createDebt({
        description: debtForm.description,
        amount,
        debtType: debtForm.debtType,
        personName: debtForm.personName,
        dueDate: debtForm.dueDate || undefined,
      });
      setDebts(prev => [created, ...prev]);
      showToast('Hutang dicatat! 📝', 'success');
      setShowDebtModal(false);
      setDebtForm({ description: '', amount: '', debtType: 'owed_by_me', personName: '', dueDate: '' });
      refetchOverview();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleMarkDebtPaid = async (debtId: string) => {
    setDebts(prev => prev.map(d => d.id === debtId ? { ...d, isPaid: true, paidAt: new Date().toISOString() } : d));
    try {
      await duitTrackerService.markDebtPaid(debtId);
      showToast('Hutang lunas! Transaksi tercatat otomatis 🎉', 'success');
      refetchOverview();
      refreshTx();
      refetchSummary();
    } catch (e: any) {
      fetchDebts();
      showToast(e.message, 'error');
    }
  };

  const handleDeleteDebt = async (debtId: string) => {
    const prev = debts;
    setDebts(p => p.filter(d => d.id !== debtId));
    try {
      await duitTrackerService.deleteDebt(debtId);
      showToast('Hutang dihapus', 'success');
      refetchOverview();
    } catch (e: any) {
      setDebts(prev);
      showToast(e.message, 'error');
    }
  };

  // Wishlist / Rencana Belanja
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistLoaded, setWishlistLoaded] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [wishlistForm, setWishlistForm] = useState({ name: '', estimatedPrice: '', priority: 'medium', category: '', targetDate: '', notes: '', url: '' });
  const [wishlistFilter, setWishlistFilter] = useState<'pending' | 'purchased' | 'all'>('pending');

  const fetchWishlist = useCallback(async () => {
    if (!wishlistLoaded) setWishlistLoading(true);
    try {
      const data = await duitTrackerService.getWishlist();
      setWishlist(data);
      setWishlistLoaded(true);
    } catch { }
    finally { setWishlistLoading(false); }
  }, [wishlistLoaded]);

  useEffect(() => { if (tab === 'wishlist') fetchWishlist(); }, [tab, fetchWishlist]);

  const filteredWishlist = useMemo(() => {
    if (wishlistFilter === 'all') return wishlist;
    return wishlist.filter(w => wishlistFilter === 'purchased' ? w.isPurchased : !w.isPurchased);
  }, [wishlist, wishlistFilter]);

  const wishlistSummary = useMemo(() => {
    const pending = wishlist.filter(w => !w.isPurchased);
    const totalNeeded = pending.reduce((sum, w) => sum + w.estimatedPrice, 0);
    const highPriority = pending.filter(w => w.priority === 'high');
    const highTotal = highPriority.reduce((sum, w) => sum + w.estimatedPrice, 0);
    return { totalNeeded, highPriorityCount: highPriority.length, highTotal, pendingCount: pending.length };
  }, [wishlist]);

  // Spending Insights computation
  const spendingInsights = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length === 0) return null;

    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);

    // Group by day of week
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const byDay: Record<number, number> = {};
    expenses.forEach(t => {
      const d = new Date(t.date).getDay();
      byDay[d] = (byDay[d] || 0) + t.amount;
    });
    const busiestDayIdx = Object.entries(byDay).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    const busiestDay = busiestDayIdx ? { name: dayNames[Number(busiestDayIdx[0])], amount: Number(busiestDayIdx[1]) } : null;

    // Group by week number
    const byWeek: Record<number, number> = {};
    expenses.forEach(t => {
      const d = new Date(t.date);
      const weekNum = Math.ceil(d.getDate() / 7);
      byWeek[weekNum] = (byWeek[weekNum] || 0) + t.amount;
    });
    const weeks = Object.values(byWeek);
    const avgWeekly = weeks.length > 0 ? weeks.reduce((s, v) => s + v, 0) / weeks.length : 0;

    // Unique days with transactions
    const uniqueDays = new Set(expenses.map(t => new Date(t.date).toDateString())).size;
    const avgDaily = uniqueDays > 0 ? totalExpense / uniqueDays : 0;

    // Biggest single expense
    const biggestTx = expenses.reduce((max, t) => t.amount > max.amount ? t : max, expenses[0]);

    // Current week vs previous week
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const thisWeekExpense = expenses.filter(t => new Date(t.date) >= startOfThisWeek).reduce((s, t) => s + t.amount, 0);
    const lastWeekExpense = expenses.filter(t => { const d = new Date(t.date); return d >= startOfLastWeek && d < startOfThisWeek; }).reduce((s, t) => s + t.amount, 0);
    const weekChange = lastWeekExpense > 0 ? Math.round(((thisWeekExpense - lastWeekExpense) / lastWeekExpense) * 100) : null;

    return { totalExpense, avgDaily, avgWeekly, busiestDay, biggestTx, thisWeekExpense, lastWeekExpense, weekChange, txCount: expenses.length };
  }, [transactions]);

  const handleWishlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const estimatedPrice = parseCurrency(wishlistForm.estimatedPrice);
    if (!wishlistForm.name || !estimatedPrice) return;
    setSubmitting(true);
    try {
      await duitTrackerService.createWishlistItem({
        name: wishlistForm.name,
        estimatedPrice,
        priority: wishlistForm.priority,
        category: wishlistForm.category || undefined,
        targetDate: wishlistForm.targetDate || undefined,
        notes: wishlistForm.notes || undefined,
        url: wishlistForm.url || undefined,
      });
      showToast('Wishlist ditambahkan! 🛒', 'success');
      setShowWishlistModal(false);
      setWishlistForm({ name: '', estimatedPrice: '', priority: 'medium', category: '', targetDate: '', notes: '', url: '' });
      fetchWishlist();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleMarkWishlistPurchased = async (id: string) => {
    setWishlist(prev => prev.map(w => w.id === id ? { ...w, isPurchased: true, purchasedAt: new Date().toISOString() } as WishlistItem : w));
    try {
      await duitTrackerService.markWishlistPurchased(id);
      showToast('Item sudah dibeli! ✅', 'success');
    } catch (e: any) {
      fetchWishlist();
      showToast(e.message, 'error');
    }
  };

  const handleDeleteWishlistItem = async (id: string) => {
    const prev = wishlist;
    setWishlist(p => p.filter(w => w.id !== id));
    try {
      await duitTrackerService.deleteWishlistItem(id);
      showToast('Item dihapus dari wishlist', 'success');
    } catch (e: any) {
      setWishlist(prev);
      showToast(e.message, 'error');
    }
  };

  // AI Job tracking for weekly roast
  const weeklyRoastJob = useAiJob<WeeklyRoast>('weekly_roast', {
    onComplete: () => showToast('Weekly Roast udah siap! Siap-siap di-roast 🔥', 'success'),
    onError: (err) => showToast(err || 'Gagal bikin Weekly Roast nih.', 'error'),
  });
  const weeklyRoast = weeklyRoastJob.result;
  const roastLoading = weeklyRoastJob.isProcessing || weeklyRoastJob.isInitializing;

  // ── New Features State ──
  const [challenges, setChallenges] = useState<BudgetChallenge[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [forecast, setForecast] = useState<FinancialForecast | null>(null);
  const [comparison, setComparison] = useState<SpendingComparison | null>(null);
  const [reminders, setReminders] = useState<SmartReminders | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);

  const fetchChallenges = useCallback(() => { duitTrackerService.getChallenges().then(setChallenges).catch(() => {}); }, []);
  const fetchCustomCategories = useCallback(() => { duitTrackerService.getCustomCategories().then(setCustomCategories).catch(() => {}); }, []);
  const fetchForecast = useCallback(() => { duitTrackerService.getFinancialForecast().then(setForecast).catch(() => {}); }, []);
  const fetchComparison = useCallback(() => { duitTrackerService.getSpendingComparison().then(setComparison).catch(() => {}); }, []);
  const fetchReminders = useCallback(() => { duitTrackerService.getReminders().then(setReminders).catch(() => {}); }, []);

  useEffect(() => {
    fetchChallenges();
    fetchCustomCategories();
    fetchForecast();
    fetchComparison();
    fetchReminders();
  }, [fetchChallenges, fetchCustomCategories, fetchForecast, fetchComparison, fetchReminders]);

  // Merged categories (built-in + custom)
  const allExpenseCategories = useMemo(() => {
    const custom = customCategories.filter(c => c.type === 'expense').map(c => ({ id: c.name, label: c.name.charAt(0).toUpperCase() + c.name.slice(1), emoji: c.emoji }));
    return [...EXPENSE_CATEGORIES, ...custom];
  }, [customCategories]);

  // Pie chart data for summary
  const pieChartData = useMemo(() => {
    if (!summary?.categoryReport) return [];
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6'];
    return summary.categoryReport
      .filter(cr => cr.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .map((cr, i) => {
        const catInfo = allExpenseCategories.find(c => c.id === cr.category);
        return { label: catInfo?.label || cr.category, value: cr.spent, color: colors[i % colors.length], emoji: catInfo?.emoji };
      });
  }, [summary, allExpenseCategories]);

  // Monthly line chart data (computed from transactions grouped by week)
  const weeklyLineData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const weekMap: Record<number, number> = {};
    expenses.forEach(t => {
      const w = Math.ceil(new Date(t.date).getDate() / 7);
      weekMap[w] = (weekMap[w] || 0) + t.amount;
    });
    return Object.entries(weekMap).sort((a, b) => Number(a[0]) - Number(b[0])).map(([w, v]) => ({ label: `W${w}`, value: v }));
  }, [transactions]);

  const handleGenerateWeeklyRoast = async () => {
    if (roastLoading) return;
    try {
      await weeklyRoastJob.trigger(() => siBawelService.generateWeeklyRoast());
      showToast('Weekly Roast sedang diproses AI... tunggu ya~ 🔥', 'success');
    } catch (err: any) {
      if (!err.message?.includes('sedang memproses')) {
        showToast(err.message || 'Gagal bikin Weekly Roast nih.', 'error');
      }
    }
  };

  useEffect(() => {
    siBawelService.getSetting().then(setBawelSetting).catch(() => {});
  }, []);

  const handleBawelToggle = async (field: string, value: any) => {
    try {
      const updated = await siBawelService.updateSetting({ [field]: value } as any);
      setBawelSetting(updated);
      showToast('Setting Si Bawel udah di-update!', 'success');
    } catch { showToast('Gagal update setting nih.', 'error'); }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseCurrency(form.amount);
    if (!amt || !form.label) return;
    setSubmitting(true);
    const now = new Date().toISOString();
    try {
      if (editingTx) {
        // Optimistic update
        const optimistic: Transaction = { ...editingTx, amount: amt, type: form.type as any, category: form.category, label: form.label, note: form.note || undefined, date: form.date || editingTx.date };
        updateTx(tx => tx.id === editingTx.id, () => optimistic);
        setShowAddModal(false); setEditingTx(null);
        setForm({ amount: '', type: 'expense', category: 'lainnya', label: '', note: '', date: '' });
        try {
          const updated = await duitTrackerService.updateTransaction(editingTx.id, { amount: amt, type: form.type as any, category: form.category, label: form.label, note: form.note || undefined, date: form.date || undefined });
          updateTx(tx => tx.id === editingTx.id, () => updated);
          showToast('Transaksi udah di-update! ✅', 'success');
          refetchOverview();
        } catch (e: any) {
          updateTx(tx => tx.id === editingTx.id, () => editingTx);
          showToast(e.message || 'Gagal update transaksi.', 'error');
        }
      } else {
        // Optimistic create
        const tempId = `temp-${Date.now()}`;
        const tempTx: Transaction = { id: tempId, amount: amt, type: form.type as any, category: form.category, label: form.label, note: form.note || undefined, date: form.date || now, createdAt: now, updatedAt: now, bawelComment: undefined, bawelLevel: undefined } as any;
        setTransactions(prev => [tempTx, ...prev]);
        // Optimistically update summary balance
        refetchSummary();
        setShowAddModal(false); setEditingTx(null);
        setForm({ amount: '', type: 'expense', category: 'lainnya', label: '', note: '', date: '' });
        try {
          const created = await duitTrackerService.createTransaction({ amount: amt, type: form.type as any, category: form.category, label: form.label, note: form.note || undefined, date: form.date || undefined });
          // Replace temp with real
          updateTx(tx => tx.id === tempId, () => created);
          showToast('Transaksi udah ditambahin! ✅', 'success');
          refetchSummary();
          refetchOverview();
        } catch (e: any) {
          removeTx(tx => tx.id === tempId);
          showToast(e.message || 'Gagal tambah transaksi.', 'error');
        }
      }
    } finally { setSubmitting(false); }
  };

  const handleBulkCreate = async (items: ScannedItem[]) => {
    for (const item of items) {
      await duitTrackerService.createTransaction({
        amount: item.amount,
        type: item.type as any,
        category: item.category,
        label: item.label,
      });
    }
    fetchData();
  };

  const openEdit = (tx: Transaction) => {
    const h = (Date.now() - new Date(tx.createdAt).getTime()) / 3600000;
    if (h > 24) { showToast('Udah lewat 24 jam, gak bisa diedit lagi nih.', 'error'); return; }
    setEditingTx(tx);
    setForm({ amount: String(tx.amount), type: tx.type, category: tx.category, label: tx.label, note: tx.note || '', date: tx.date ? new Date(tx.date).toISOString().split('T')[0] : '' });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    const confirmed = await confirm({
      title: 'Hapus Transaksi?',
      message: `"${tx.label || tx.category}" sebesar ${tx.type === 'income' ? '+' : '-'}${fmt(tx.amount)} bakal dihapus permanen nih.`,
      confirmText: 'Gas Hapus',
      cancelText: 'Gak Jadi',
      variant: 'danger',
    });
    if (!confirmed) return;

    removeTx(t => t.id === id);
    refetchSummary();
    try {
      await duitTrackerService.deleteTransaction(id);
      showToast('Transaksi udah dihapus! 🗑️', 'success');
      refetchSummary();
      refetchOverview();
    } catch (e: any) {
      showToast(e.message, 'error');
      refreshTx();
    }
  };

  const handleAiParse = async () => {
    if (!aiText.trim()) return;
    setSubmitting(true);
    try {
      const p = await duitTrackerService.parseNaturalInput(aiText);
      if (p.amount) {
        if (p.isDebt) {
          setDebtForm({ description: p.label || aiText, amount: String(p.amount), debtType: p.debtType || 'owed_by_me', personName: p.personName || '', dueDate: '' });
          setShowAiInput(false); setShowDebtModal(true);
          showToast('Terdeteksi sebagai hutang! Cek datanya ya 🤝', 'success');
        } else if (p.isBill) {
          setBillForm({ name: p.label || aiText, amount: String(p.amount), dueDay: String(p.dueDay || 1), category: p.category || 'tagihan', notes: p.note || '' });
          setShowAiInput(false); setShowBillModal(true);
          showToast('Terdeteksi sebagai tagihan rutin! Cek datanya ya 💳', 'success');
        } else if (p.isWishlist) {
          setWishlistForm({ name: p.label || aiText, estimatedPrice: String(p.amount), priority: p.priority || 'medium', category: p.category || '', targetDate: '', notes: p.note || '', url: '' });
          setShowAiInput(false); setShowWishlistModal(true);
          showToast('Terdeteksi sebagai wishlist! Cek datanya ya 🛒', 'success');
        } else {
          setForm({ amount: String(p.amount), type: p.type || 'expense', category: p.category || 'lainnya', label: p.label || aiText, note: p.note || '', date: p.date || '' });
          setShowAiInput(false); setShowAddModal(true);
          showToast('Berhasil di-parse! Cek datanya ya~', 'success');
        }
      } else { showToast('Hmm, gak bisa di-parse nih. Coba tulis ulang!', 'error'); }
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); setAiText(''); }
  };

  const handleAddTree = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseCurrency(treeForm.targetAmount);
    if (!treeForm.name || !target) return;
    setSubmitting(true);
    try {
      await duitTrackerService.createTree({ name: treeForm.name, targetAmount: target, deadline: treeForm.deadline || undefined });
      showToast('Pohon tabungan udah ditanem! 🌱', 'success');
      setShowTreeModal(false); setTreeForm({ name: '', targetAmount: '', deadline: '' }); fetchData();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleTreeTx = async () => {
    if (!depositTreeId || !depositAmount) return;
    const amt = parseCurrency(depositAmount);
    if (!amt) return;
    setSubmitting(true);
    try {
      await duitTrackerService.addTreeTransaction(depositTreeId, { amount: amt, type: depositType });
      showToast(depositType === 'deposit' ? 'Tabungan nambah! 🌳' : 'Udah ditarik ya.', 'success');
      setDepositTreeId(null); setDepositAmount(''); fetchData();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteTree = async (id: string) => {
    if (!await confirm({ message: 'Yakin nih mau hapus pohon tabungan ini?', variant: 'danger' })) return;
    try { await duitTrackerService.deleteTree(id); showToast('Udah dihapus!', 'success'); fetchData(); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleDeleteBudget = async (budget: CategoryBudget) => {
    const catInfo = EXPENSE_CATEGORIES.find(c => c.id === budget.category);
    const catLabel = catInfo?.label || budget.category;
    if (!await confirm({ message: `Yakin hapus budget ${catLabel} bulan ini?`, variant: 'danger' })) return;

    // Optimistic removal
    const prevBudgets = budgets;
    mutateBudgets(prev => (prev || []).filter(b => b.id !== budget.id));

    try {
      await duitTrackerService.deleteBudget(budget.id);
      showToast('Budget udah dihapus!', 'success');
    } catch (e: any) {
      // Revert optimistic update on error
      mutateBudgets(prevBudgets);
      showToast(e.message || 'Gagal hapus budget nih.', 'error');
    }
  };

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseCurrency(budgetForm.amount);
    if (!amt) return;
    setSubmitting(true);
    try {
      await duitTrackerService.setBudget({ category: budgetForm.category, amount: amt, month, year });
      showToast('Budget udah di-set! 💰', 'success');
      setShowBudgetModal(false); setBudgetForm({ category: 'makanan', amount: '' }); fetchData();
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  // Group transactions by date
  const txByDate = transactions.reduce((acc, tx) => {
    const key = new Date(tx.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  return (
    <AuthGuard requiredFeature="duit_tracker">
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content" style={{ animation: 'fadeSlideIn 0.4s ease-out' }}>
            <PullToRefresh onRefresh={fetchData}>
            <div className="duit-tracker-container duit-tracker" style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 'calc(var(--bottom-nav-height, 60px) + 16px)' }}>

              <div className="duit-tracker-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>💰 Duit Tracker</h1>
                  <p style={{ fontSize: 13, color: 'var(--dt-text-secondary)', marginTop: 2 }}>Pantau cuan & bocornya duitmu, biar makin melek finansial 💪</p>
                </div>
                <div className="duit-tracker-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {hasFeature('si_bawel') && (
                    <button onClick={() => setShowBawelSettings(true)} style={{ background: 'var(--input-bg)', border: '1px solid var(--border-default)', cursor: 'pointer', padding: '8px 10px', borderRadius: 10, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'inherit' }} className="hover-lift" title="Pengaturan Si Bawel">
                      <Settings size={14} /> 🗣️
                    </button>
                  )}
                  <Button onClick={() => setShowAiInput(true)} variant="secondary" size="sm"><Sparkles size={14} /> AI Input</Button>
                  <Button onClick={() => { setEditingTx(null); setForm({ amount: '', type: 'expense', category: 'lainnya', label: '', note: '', date: '' }); setShowAddModal(true); }} size="sm"><Plus size={14} /> Tambah</Button>
                </div>
              </div>

              {/* Financial Hero — bold overview with count-up + daily trend */}
              {summary && (
                <FinancialHero transactions={transactions} month={month} year={year} periodLabel={periodLabel} overview={overview} />
              )}

              {/* Smart Reminders Banner */}
              <ReminderBanner reminders={reminders} onPayBill={handleMarkBillPaid} onPayDebt={handleMarkDebtPaid} />

              {/* Tabs — pill style */}
              <div className="duit-tabs" style={{ display: 'flex', gap: 4, marginBottom: 24, padding: 4, borderRadius: 14, background: 'var(--input-bg)', width: 'fit-content' }}>
                {[
                  { key: 'transactions', label: '📝 Transaksi' },
                  { key: 'summary', label: '📊 Ringkasan', feature: 'duit_tracker_summary' },
                  { key: 'budget', label: '🎯 Budget', feature: 'duit_tracker_budget' },
                  { key: 'trees', label: '🌳 Tabungan', feature: 'duit_tracker_saving_tree' },
                  { key: 'bills', label: '💳 Tagihan' },
                  { key: 'debts', label: '🤝 Hutang' },
                  { key: 'wishlist', label: '🛒 Wishlist' },
                  { key: 'challenges', label: '🔥 Challenge' },
                ].filter(t => !t.feature || hasFeature(t.feature)).map(t => (
                  <button key={t.key} onClick={() => setTab(t.key as any)} style={{
                    padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontWeight: tab === t.key ? 600 : 400, fontSize: 13,
                    background: tab === t.key ? 'var(--card-bg)' : 'transparent',
                    color: tab === t.key ? 'rgb(var(--color-primary))' : 'inherit',
                    boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                    whiteSpace: 'nowrap', transition: 'all 0.2s',
                  }}>{t.label}</button>
                ))}
              </div>

              {/* Global Period Filter — shown on all tabs */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Row 1: Period dropdown + Type chips (type chips only for transactions) */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 160 }}>
                      <SelectOption
                        value={periodPreset}
                        onChange={(v) => { setPeriodPreset(v as PeriodPreset); if (v !== 'custom') setAppliedRange(null); }}
                        options={PERIOD_PRESETS.map(p => ({ value: p.key, label: `${p.emoji} ${p.label}` }))}
                        placeholder="Pilih Periode"
                      />
                    </div>
                    {/* Type filter chips — transactions only */}
                    {tab === 'transactions' && [{ v: '', l: 'Semua' }, { v: 'income', l: '↑ Masuk' }, { v: 'expense', l: '↓ Keluar' }].map(f => (
                      <button key={f.v} onClick={() => setTypeFilter(f.v)} className="dt-filter-chip" style={{
                        padding: '7px 12px', borderRadius: 8, border: typeFilter === f.v ? '1.5px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                        cursor: 'pointer', fontSize: 12, fontWeight: 500,
                        background: typeFilter === f.v ? 'rgba(var(--color-primary) / 0.08)' : 'transparent',
                        color: typeFilter === f.v ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))', transition: 'all 0.2s',
                      }}>{f.l}</button>
                    ))}
                  </div>

                  {/* Row 2: Custom date range (only when custom is selected) */}
                  {periodPreset === 'custom' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <DateTimePicker
                          mode="date"
                          value={customStart}
                          onChange={setCustomStart}
                          placeholder="Dari tanggal"
                        />
                      </div>
                      <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))', flexShrink: 0 }}>—</span>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <DateTimePicker
                          mode="date"
                          value={customEnd}
                          onChange={setCustomEnd}
                          placeholder="Sampai tanggal"
                          min={customStart || undefined}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!customStart || !customEnd) { showToast('Pilih tanggal awal dan akhir dulu dong!', 'error'); return; }
                          setAppliedRange({ start: customStart, end: customEnd });
                        }}
                        disabled={!customStart || !customEnd}
                        style={{ flexShrink: 0, borderRadius: 10 }}
                      >
                        🔍 Cari
                      </Button>
                    </div>
                  )}

                  {/* Row 3: Category filter — transactions only */}
                  {tab === 'transactions' && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 160 }}>
                        <SelectOption
                          value={categoryFilter}
                          onChange={setCategoryFilter}
                          placeholder="📂 Semua Kategori"
                          options={[
                            { value: '', label: '📂 Semua Kategori' },
                            ...[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]
                              .filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i)
                              .map(c => ({ value: c.id, label: `${c.emoji} ${c.label}` })),
                          ]}
                        />
                      </div>
                      {/* Clear all filters */}
                      {(typeFilter || categoryFilter || appliedRange) && (
                        <button
                          onClick={() => { setTypeFilter(''); setCategoryFilter(''); setPeriodPreset('this_month'); setAppliedRange(null); setCustomStart(''); setCustomEnd(''); }}
                          style={{
                            padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontSize: 11.5, color: 'rgb(var(--color-error))', background: 'rgba(var(--color-error) / 0.08)',
                            display: 'flex', alignItems: 'center', gap: 3, fontWeight: 500,
                          }}
                        >
                          <X size={12} /> Reset Filter
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {loading && !transactions.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3].map(n => <div key={n} className="skeleton" style={{ height: 80, borderRadius: 14 }} />)}
                </div>
              ) : <>

              {/* ─── Transactions Tab ─── */}
              {tab === 'transactions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Export & Import buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <ExportButton transactions={transactions} month={month} year={year} summary={summary} />
                    <button onClick={() => setShowCsvImport(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: 'var(--input-bg)', border: '1px solid var(--dt-card-border)', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                      <Upload size={13} /> Import
                    </button>
                  </div>
                  {transactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                      <Wallet size={48} style={{ opacity: 0.15, marginBottom: 12 }} />
                      <p style={{ opacity: 0.6, fontSize: 15, fontWeight: 500 }}>Belum ada transaksi bulan ini nih</p>
                      <p style={{ opacity: 0.35, fontSize: 13, marginTop: 4 }}>Gas catat lewat &ldquo;AI Input&rdquo; atau &ldquo;Tambah&rdquo; biar gak lupa! 📝</p>
                    </div>
                  ) : Object.entries(txByDate).map(([dateLabel, txs]) => (
                    <div key={dateLabel}>
                      <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--dt-text-secondary)', marginBottom: 8 }}>{dateLabel}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {txs.map(tx => (
                          <SwipeableRow
                            key={tx.id}
                            onSwipeLeft={() => handleDelete(tx.id)}
                            leftLabel="🗑️ Hapus"
                            leftColor="var(--color-error)"
                          >
                            <div className="tx-card hover-lift" style={{
                              padding: '12px 14px', borderRadius: 14, background: 'rgb(var(--bg-surface))',
                              border: '1px solid var(--dt-card-border)', transition: 'all 0.2s',
                              borderLeft: `4px solid ${CATEGORY_COLORS[tx.category] || CATEGORY_COLORS.lainnya}`,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                {/* Category emoji bubble */}
                                <div style={{
                                  width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                                  background: tx.type === 'income' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.06)',
                                  flexShrink: 0, marginTop: 1,
                                }}>
                                  {getCatEmoji(tx.category, tx.type)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                                    <span className="dt-tx-title" style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--dt-text-primary)', lineHeight: 1.35, wordBreak: 'break-word' }}>{tx.label}</span>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: tx.type === 'income' ? 'var(--dt-income)' : 'var(--dt-expense)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                      {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 5, background: 'var(--dt-badge-bg)', color: 'var(--dt-text-secondary)', textTransform: 'capitalize', fontWeight: 500 }}>{tx.category}</span>
                                    {tx.note && <span style={{ fontSize: 11.5, color: 'var(--dt-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.note}</span>}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 1, flexShrink: 0, marginTop: 1 }}>
                                  <button onClick={(e) => { e.stopPropagation(); openEdit(tx); }} className="tx-action-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: 5, borderRadius: 8, transition: 'all 0.2s', color: 'var(--dt-text-secondary)' }}><Edit2 size={13} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }} className="tx-action-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: 5, borderRadius: 8, transition: 'all 0.2s', color: 'var(--dt-text-secondary)' }}><Trash2 size={13} /></button>
                                </div>
                              </div>
                              {/* Si Bawel comment — only show if already generated */}
                              {tx.bawelComment && (
                                <div style={{
                                  marginTop: 8, fontSize: 12, lineHeight: 1.5, padding: '8px 12px', borderRadius: 10,
                                  background: tx.bawelLevel === 'warning' ? 'rgba(245, 158, 11, 0.06)' : tx.bawelLevel === 'praise' ? 'rgba(16, 185, 129, 0.06)' : 'var(--input-bg)',
                                  border: '1px solid transparent',
                                  display: 'flex', alignItems: 'flex-start', gap: 6,
                                }}>
                                  <span style={{ flexShrink: 0 }}>🗣️</span>
                                  <span style={{ opacity: 0.7 }}>{tx.bawelComment}</span>
                                </div>
                              )}
                            </div>
                          </SwipeableRow>
                        ))}
                      </div>
                    </div>
                  ))}
                  {/* Infinite scroll sentinel */}
                  <div ref={txSentinelRef} />
                  {txLoading && transactions.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                      <Loader2 size={20} className="spin" style={{ opacity: 0.5 }} />
                    </div>
                  )}
                </div>
              )}

              {/* ─── Summary Tab ─── */}
              {tab === 'summary' && summary && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Weekly Roast */}
                  {hasFeature('si_bawel') && (
                    roastLoading ? (
                      <div style={{
                        padding: '24px', borderRadius: 16,
                        background: 'linear-gradient(135deg, rgba(255, 100, 0, 0.08) 0%, rgba(255, 50, 0, 0.02) 100%)',
                        border: '1px solid rgba(255, 100, 0, 0.15)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, marginBottom: 16,
                      }}>
                        <Loader2 size={32} className="spin" style={{ color: '#ff6b35' }} />
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Weekly Roast</h3>
                          <p style={{ fontSize: 13, opacity: 0.7, margin: 0 }}>Si Bawel lagi mikir keras buat roasting kamu... 🔥</p>
                        </div>
                      </div>
                    ) : weeklyRoast ? (
                      <div style={{
                        padding: '20px 22px', borderRadius: 16,
                        background: 'linear-gradient(135deg, rgba(255, 100, 0, 0.04) 0%, rgba(255, 50, 0, 0.02) 100%)',
                        border: '1px solid rgba(255, 100, 0, 0.12)',
                        marginBottom: 16,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                          <span style={{ fontSize: 22 }}>🔥</span>
                          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Weekly Roast</h3>
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 700 }}>{weeklyRoast.score}/10</span>
                            <div style={{ width: 60, height: 6, borderRadius: 3, background: 'rgba(255,100,0,0.1)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${weeklyRoast.score * 10}%`, borderRadius: 3, background: 'linear-gradient(90deg, #ff6b35, #f7c948)', transition: 'width 0.5s' }} />
                            </div>
                          </div>
                        </div>
                        <p style={{ fontSize: 14, lineHeight: 1.7, margin: '0 0 12px', fontStyle: 'italic', opacity: 0.85 }}>&ldquo;{weeklyRoast.roast}&rdquo;</p>
                        {weeklyRoast.tip && (
                          <div style={{ fontSize: 13, padding: '10px 14px', borderRadius: 10, background: 'rgba(var(--color-primary), 0.05)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                            <span>💡</span> <span style={{ opacity: 0.7 }}>{weeklyRoast.tip}</span>
                          </div>
                        )}
                        {/* Unnecessary Spending */}
                        {weeklyRoast.unnecessarySpending && weeklyRoast.unnecessarySpending.length > 0 && (
                          <div style={{ marginTop: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.6, marginBottom: 8 }}>⚠️ Pengeluaran yang bisa dihindari:</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {weeklyRoast.unnecessarySpending.map((item, i) => (
                                <div key={i} style={{ fontSize: 13, padding: '8px 12px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <span style={{ fontWeight: 600 }}>{item.item}</span>
                                    <span style={{ opacity: 0.5, marginLeft: 6, fontSize: 11 }}>{item.reason}</span>
                                  </div>
                                  <span style={{ fontWeight: 700, color: 'var(--dt-expense)', fontSize: 12 }}>Rp {item.amount.toLocaleString('id-ID')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Advice */}
                        {weeklyRoast.advice && weeklyRoast.advice.length > 0 && (
                          <div style={{ marginTop: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.6, marginBottom: 8 }}>📝 Saran:</div>
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8, opacity: 0.8 }}>
                              {weeklyRoast.advice.map((a, i) => <li key={i}>{a}</li>)}
                            </ul>
                          </div>
                        )}
                        {/* Saving Potential */}
                        {weeklyRoast.savingPotential && weeklyRoast.savingPotential > 0 && (
                          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>💰</span>
                            <span>Potensi hemat: <strong style={{ color: 'var(--dt-income)' }}>Rp {weeklyRoast.savingPotential.toLocaleString('id-ID')}</strong>/minggu</span>
                          </div>
                        )}
                        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleGenerateWeeklyRoast}
                            disabled={roastLoading}
                            style={{ fontSize: 12, padding: '6px 12px', borderRadius: 10, cursor: 'pointer' }}
                          >
                            Roast Ulang 🔥
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        padding: '24px', borderRadius: 16,
                        background: 'linear-gradient(135deg, rgba(255, 100, 0, 0.08) 0%, rgba(255, 50, 0, 0.02) 100%)',
                        border: '1px solid rgba(255, 100, 0, 0.15)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, marginBottom: 16,
                      }}>
                        <span style={{ fontSize: 32 }}>🔥</span>
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Minta Weekly Roast</h3>
                          <p style={{ fontSize: 13, opacity: 0.7, maxWidth: 440, margin: 0, lineHeight: 1.5 }}>
                            Ingin tahu seberapa boros kamu minggu ini? Biarkan Si Bawel me-roast kebiasaan belanjamu dengan humor pedas!
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={handleGenerateWeeklyRoast}
                          style={{
                            background: 'linear-gradient(135deg, #ff6b35 0%, #ff4f00 100%)',
                            border: 'none', color: '#fff', fontWeight: 600, borderRadius: 12, padding: '10px 20px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                          }}
                        >
                          Minta Roast 🔥
                        </Button>
                      </div>
                    )
                  )}

                  {/* Spending Insights */}
                  {spendingInsights && (
                    <Card style={{ padding: '20px 22px' }}>
                      <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TrendingDown size={18} /> Insight Pengeluaran
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--input-bg)' }}>
                          <div style={{ fontSize: 11, color: 'var(--dt-text-secondary)', marginBottom: 4 }}>Rata-rata / Hari</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dt-expense)' }}>{fmt(Math.round(spendingInsights.avgDaily))}</div>
                        </div>
                        <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--input-bg)' }}>
                          <div style={{ fontSize: 11, color: 'var(--dt-text-secondary)', marginBottom: 4 }}>Rata-rata / Minggu</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dt-expense)' }}>{fmt(Math.round(spendingInsights.avgWeekly))}</div>
                        </div>
                        {spendingInsights.busiestDay && (
                          <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--input-bg)' }}>
                            <div style={{ fontSize: 11, color: 'var(--dt-text-secondary)', marginBottom: 4 }}>Hari Paling Boros</div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{spendingInsights.busiestDay.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--dt-text-secondary)' }}>{fmt(spendingInsights.busiestDay.amount)}</div>
                          </div>
                        )}
                        {spendingInsights.biggestTx && (
                          <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--input-bg)' }}>
                            <div style={{ fontSize: 11, color: 'var(--dt-text-secondary)', marginBottom: 4 }}>Pengeluaran Terbesar</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dt-expense)' }}>{fmt(spendingInsights.biggestTx.amount)}</div>
                            <div style={{ fontSize: 11, color: 'var(--dt-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spendingInsights.biggestTx.label}</div>
                          </div>
                        )}
                      </div>
                      {spendingInsights.weekChange !== null && (
                        <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, background: spendingInsights.weekChange > 0 ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)', border: `1px solid ${spendingInsights.weekChange > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {spendingInsights.weekChange > 0 ? <TrendingUp size={16} style={{ color: 'var(--dt-expense)' }} /> : <TrendingDown size={16} style={{ color: 'var(--dt-income)' }} />}
                            <span style={{ fontSize: 13, fontWeight: 600 }}>
                              {spendingInsights.weekChange > 0 ? `Minggu ini kamu lebih boros ${spendingInsights.weekChange}% dari minggu lalu` : `Minggu ini kamu lebih hemat ${Math.abs(spendingInsights.weekChange)}% dari minggu lalu`}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--dt-text-secondary)', marginTop: 6 }}>
                            Minggu ini: {fmt(spendingInsights.thisWeekExpense)} vs Minggu lalu: {fmt(spendingInsights.lastWeekExpense)}
                          </div>
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Category Breakdown */}
                  <Card style={{ padding: '20px 22px' }}>
                    <h3 style={{ marginBottom: 18, fontSize: 16, fontWeight: 700 }}>Duit Keluar per Kategori</h3>
                    {summary.categoryReport.length === 0 ? <p style={{ opacity: 0.5, fontSize: 14 }}>Belum ada data nih, catat transaksi dulu ya~</p> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        {summary.categoryReport.sort((a, b) => b.spent - a.spent).map(cr => {
                          const catInfo = EXPENSE_CATEGORIES.find(c => c.id === cr.category);
                          return (
                            <div key={cr.category}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span>{catInfo?.emoji || '📦'}</span> {catInfo?.label || cr.category}
                                </span>
                                <span style={{ fontSize: 13 }}>
                                  <strong>{fmt(cr.spent)}</strong>
                                  {cr.budget ? <span style={{ opacity: 0.4 }}> / {fmt(cr.budget)}</span> : ''}
                                </span>
                              </div>
                              <div style={{ height: 8, borderRadius: 4, background: 'var(--input-bg)', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%', borderRadius: 4,
                                  width: cr.percentage != null ? `${Math.min(cr.percentage, 100)}%` : '0%',
                                  background: (cr.percentage ?? 0) > 90
                                    ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                                    : (cr.percentage ?? 0) > 70
                                    ? 'linear-gradient(90deg, #f59e0b, #eab308)'
                                    : 'linear-gradient(90deg, #10b981, #34d399)',
                                  transition: 'width 0.5s ease',
                                }} />
                              </div>
                              {cr.percentage != null && cr.percentage >= 80 && (
                                <div style={{ fontSize: 11, color: cr.percentage > 100 ? 'var(--dt-expense)' : 'var(--color-warning)', marginTop: 3 }}>
                                  ⚠️ {cr.percentage > 100 ? `Over budget ${cr.percentage - 100}%` : `${cr.percentage}% budget terpakai`}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>

                  {/* ─── Subscription Tracker (Bocor Halus) ─── */}
                  <SubscriptionCard
                    transactions={transactions}
                    getCategoryEmoji={(cat) => getCatEmoji(cat, 'expense')}
                    onDismiss={fetchData}
                  />

                  {/* Financial Forecast */}
                  <ForecastCard forecast={forecast} />

                  {/* What If Calculator + Time Machine */}
                  <WhatIfCalculator transactions={transactions} />

                  {/* Spending Comparison (Peer) */}
                  <ComparisonCard comparison={comparison} />

                  {/* Spending Heatmap */}
                  <Card style={{ padding: '20px 22px' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={16} /> Heatmap Pengeluaran
                    </h3>
                    <SpendingHeatmap transactions={transactions} month={month} year={year} />
                  </Card>

                  {/* Pie Chart */}
                  {pieChartData.length > 0 && (
                    <Card style={{ padding: '20px 22px' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PieChart size={16} /> Distribusi Pengeluaran
                      </h3>
                      <PieChartSvg data={pieChartData} size={180} />
                    </Card>
                  )}

                  {/* Weekly Line Chart */}
                  {weeklyLineData.length >= 2 && (
                    <Card style={{ padding: '20px 22px' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BarChart3 size={16} /> Tren Mingguan
                      </h3>
                      <LineChartSvg data={weeklyLineData} color="#ef4444" width={300} height={140} />
                    </Card>
                  )}

                  {/* Custom Categories Manager */}
                  <CustomCategoryManager categories={customCategories} onRefresh={fetchCustomCategories} />

                  {/* Split Bill Link */}
                  <a href="/split-bill" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--dt-card-border)', textDecoration: 'none', color: 'inherit' }}>
                    <Users size={20} style={{ color: '#6366f1' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>Split Bill / Patungan</div>
                      <div style={{ fontSize: 12, color: 'var(--dt-text-secondary)', marginTop: 2 }}>Bagi rata pengeluaran bareng temen</div>
                    </div>
                    <ArrowRight size={16} style={{ opacity: 0.4 }} />
                  </a>
                </div>
              )}

              {/* ─── Budget Tab ─── */}
              {tab === 'budget' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Button onClick={() => setShowBudgetModal(true)} size="sm"><Target size={14} /> Set Budget</Button>
                  </div>
                  {budgets.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                      <Target size={48} style={{ opacity: 0.15, marginBottom: 12 }} />
                      <p style={{ opacity: 0.6, fontSize: 15, fontWeight: 500 }}>Belum ada budget nih</p>
                      <p style={{ opacity: 0.35, fontSize: 13, marginTop: 4 }}>Set budget per kategori biar spending-mu gak kebablasan! 💰</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {budgets.map(b => {
                        const spent = summary?.categoryReport.find(c => c.category === b.category)?.spent ?? 0;
                        const pct = Math.round((spent / b.amount) * 100);
                        const catInfo = EXPENSE_CATEGORIES.find(c => c.id === b.category);
                        return (
                          <div key={b.id} style={{ padding: '16px 18px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--dt-card-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{catInfo?.emoji || '📦'}</span> {catInfo?.label || b.category}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 13 }}>{fmt(spent)} / {fmt(b.amount)}</span>
                                <button
                                  onClick={() => handleDeleteBudget(b)}
                                  aria-label={`Hapus budget ${catInfo?.label || b.category}`}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s' }}
                                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <div style={{ height: 10, borderRadius: 5, background: 'var(--input-bg)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 5, width: `${Math.min(pct, 100)}%`, background: pct > 100 ? 'linear-gradient(90deg, #ef4444, #dc2626)' : pct > 80 ? 'linear-gradient(90deg, #f59e0b, #eab308)' : 'linear-gradient(90deg, #10b981, #34d399)', transition: 'width 0.5s ease' }} />
                            </div>
                            <div style={{ fontSize: 12, marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--dt-text-secondary)' }}>{pct}% terpakai</span>
                              <span style={{ color: pct > 100 ? 'var(--dt-expense)' : 'var(--dt-income)', fontWeight: 600 }}>
                                {pct > 100 ? `Over ${fmt(spent - b.amount)}` : `Sisa ${fmt(b.amount - spent)}`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Trees Tab ─── */}
              {tab === 'trees' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Button onClick={() => setShowTreeModal(true)} size="sm"><TreePine size={14} /> Buat Pohon</Button>
                  </div>
                  {trees.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                      <span style={{ fontSize: 56, display: 'block', marginBottom: 12 }}>🌱</span>
                      <p style={{ opacity: 0.6, fontSize: 15, fontWeight: 500 }}>Belum ada pohon tabungan nih</p>
                      <p style={{ opacity: 0.35, fontSize: 13, marginTop: 4 }}>Tanem pohon buat nabung sambil have fun! 🌱</p>
                    </div>
                  ) : (
                    <div className="duit-trees-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                      {trees.map(tree => {
                        const pct = tree.targetAmount > 0 ? Math.min(Math.round((tree.currentAmount / tree.targetAmount) * 100), 100) : 0;
                        const stage = getTreeStage(pct);
                        const remaining = tree.targetAmount - tree.currentAmount;
                        return (
                          <div key={tree.id} style={{
                            borderRadius: 20, background: 'var(--card-bg)',
                            border: pct >= 100 ? '2px solid #FFD700' : '1px solid var(--dt-card-border)',
                            position: 'relative', overflow: 'hidden',
                            boxShadow: pct >= 100 ? '0 4px 24px rgba(255,215,0,0.18)' : '0 2px 12px rgba(0,0,0,0.06)',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                          }} className="hover-lift">
                            {/* Top gradient accent strip */}
                            <div style={{ height: 4, background: pct >= 100 ? 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)' : `linear-gradient(90deg, ${stage.color}, ${stage.color}aa)`, borderRadius: '20px 20px 0 0' }} />
                            
                            <div style={{ padding: '18px 20px 20px' }}>
                              {/* Header */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div>
                                  <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>{tree.name}</h3>
                                  {tree.deadline && (
                                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      🎯 Deadline: {new Date(tree.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                  )}
                                </div>
                                <button onClick={() => handleDeleteTree(tree.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.25, padding: 6, borderRadius: 8, transition: 'opacity 0.2s' }}
                                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.6')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.25')}>
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              {/* Tree visualization — centered */}
                              <div style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                padding: '16px 0 8px',
                                borderRadius: 14,
                                background: pct >= 100
                                  ? 'linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,165,0,0.06))'
                                  : `linear-gradient(135deg, ${stage.color}0d, ${stage.color}06)`,
                                marginBottom: 16,
                                border: `1px solid ${stage.color}22`,
                              }}>
                                <TreeStageSvg pct={pct} />
                                <div style={{ fontSize: 12, fontWeight: 700, color: stage.color, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 }}>{stage.label}</div>
                                <div style={{ fontSize: 32, fontWeight: 900, marginTop: 2, color: stage.color, lineHeight: 1 }}>{pct}%</div>
                              </div>

                              {/* Progress bar */}
                              <div style={{ height: 10, borderRadius: 99, background: 'var(--input-bg)', overflow: 'hidden', marginBottom: 10 }}>
                                <div style={{
                                  height: '100%', borderRadius: 99,
                                  width: `${pct}%`,
                                  background: pct >= 100 ? 'linear-gradient(90deg, #FFD700, #FFA500)' : `linear-gradient(90deg, ${stage.color}, ${stage.color}cc)`,
                                  transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                                }} />
                              </div>

                              {/* Amount info */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 16 }}>
                                <div>
                                  <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 1 }}>Terkumpul</div>
                                  <div style={{ fontWeight: 700, fontSize: 15 }}>{fmt(tree.currentAmount)}</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 1 }}>Target</div>
                                  <div style={{ fontWeight: 600, opacity: 0.7 }}>{fmt(tree.targetAmount)}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 1 }}>{pct >= 100 ? '🎉 Tercapai!' : 'Kurang'}</div>
                                  <div style={{ fontWeight: 700, color: pct >= 100 ? '#FFD700' : stage.color, fontSize: 13 }}>
                                    {pct >= 100 ? 'LUNAS!' : fmt(Math.max(0, remaining))}
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div style={{ display: 'flex', gap: 8 }}>
                                <Button size="sm" style={{ flex: 1, borderRadius: 12, fontWeight: 700 }} onClick={() => { setDepositTreeId(tree.id); setDepositType('deposit'); }}>💰 Setor</Button>
                                <Button size="sm" variant="secondary" style={{ flex: 1, borderRadius: 12 }} onClick={() => { setDepositTreeId(tree.id); setDepositType('withdrawal'); }}>↩️ Tarik</Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Bills/Tagihan Tab ─── */}
              {tab === 'bills' && (
                <div>
                  {/* Summary Banner */}
                  {billsSummary.unpaidCount > 0 && (
                    <Card style={{ padding: '16px 20px', marginBottom: 16, borderRadius: 16, background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(251, 191, 36, 0.04) 100%)', border: '1px solid rgba(239, 68, 68, 0.12)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 28 }}>💳</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 2 }}>Total tagihan bulan ini</div>
                          <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(billsSummary.totalMonthly)}</div>
                          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>
                            {billsSummary.unpaidCount} belum bayar ({fmt(billsSummary.totalUnpaid)})
                            {billsSummary.dueSoonCount > 0 && <span style={{ color: '#ef4444', fontWeight: 600 }}> • {billsSummary.dueSoonCount} jatuh tempo!</span>}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['active', 'inactive', 'all'] as const).map(f => (
                        <button key={f} onClick={() => setBillFilter(f)} style={{
                          padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          fontSize: 12, fontWeight: billFilter === f ? 600 : 400,
                          background: billFilter === f ? 'rgb(var(--color-primary))' : 'var(--input-bg)',
                          color: billFilter === f ? '#fff' : 'inherit',
                        }}>{f === 'active' ? 'Aktif' : f === 'inactive' ? 'Nonaktif' : 'Semua'}</button>
                      ))}
                    </div>
                    <Button onClick={() => setShowBillModal(true)} size="sm"><Plus size={14} /> Tambah Tagihan</Button>
                  </div>

                  {billsLoading ? (
                    <div style={{ textAlign: 'center', padding: 48, opacity: 0.5 }}>Memuat...</div>
                  ) : filteredBills.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                      <span style={{ fontSize: 56, display: 'block', marginBottom: 12 }}>💳</span>
                      <p style={{ opacity: 0.6, fontSize: 15, fontWeight: 500 }}>Belum ada tagihan rutin</p>
                      <p style={{ opacity: 0.35, fontSize: 13, marginTop: 4 }}>Catat tagihan bulanan biar gak kelewat bayar! ⏰</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {filteredBills.map(bill => {
                        const today = new Date().getDate();
                        const daysUntilDue = bill.dueDay - today;
                        const statusColor = bill.isPaidThisMonth ? '#4ade80' : bill.isDueSoon ? '#ef4444' : daysUntilDue <= 7 && daysUntilDue > 0 ? '#f59e0b' : 'var(--border-default)';
                        return (
                          <Card key={bill.id} style={{
                            padding: 16, borderRadius: 16, opacity: bill.isActive ? 1 : 0.5,
                            border: `1px solid ${statusColor}44`,
                            background: bill.isDueSoon && !bill.isPaidThisMonth ? 'rgba(239, 68, 68, 0.03)' : undefined,
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <span style={{ fontSize: 16 }}>{bill.isPaidThisMonth ? '✅' : bill.isDueSoon ? '🔴' : '💳'}</span>
                                  <span style={{ fontSize: 14, fontWeight: 700 }}>{bill.name}</span>
                                  {bill.isPaidThisMonth && <span style={{ fontSize: 10, background: '#4ade8022', color: '#4ade80', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>LUNAS</span>}
                                  {bill.isDueSoon && !bill.isPaidThisMonth && <span style={{ fontSize: 10, background: '#ef444422', color: '#ef4444', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>JATUH TEMPO!</span>}
                                  {!bill.isActive && <span style={{ fontSize: 10, background: 'var(--input-bg)', color: 'var(--dt-text-secondary)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>NONAKTIF</span>}
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: bill.isPaidThisMonth ? '#4ade80' : 'rgb(var(--color-primary))' }}>
                                  {fmt(bill.amount)}
                                </div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 11, opacity: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <CalendarClock size={10} /> Jatuh tempo: Tanggal {bill.dueDay} setiap bulan
                                  </span>
                                  {bill.category && bill.category !== 'tagihan' && (
                                    <span style={{ fontSize: 10, background: 'var(--input-bg)', padding: '2px 8px', borderRadius: 6 }}>{bill.category}</span>
                                  )}
                                </div>
                                {bill.notes && <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>📝 {bill.notes}</div>}
                                {bill.lastPaidAt && (
                                  <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>
                                    Terakhir bayar: {new Date(bill.lastPaidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {bill.isActive && !bill.isPaidThisMonth && (
                                  <Button size="sm" onClick={() => handleMarkBillPaid(bill.id)} style={{ fontSize: 12, borderRadius: 8 }}>✅ Bayar</Button>
                                )}
                                <button onClick={() => handleToggleBillActive(bill)} title={bill.isActive ? 'Nonaktifkan' : 'Aktifkan'} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {bill.isActive ? <ToggleRight size={18} style={{ color: 'rgb(var(--color-primary))' }} /> : <ToggleLeft size={18} />}
                                </button>
                                <button onClick={() => handleDeleteBill(bill.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: 6 }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Wishlist Tab ─── */}
              {tab === 'wishlist' && (
                <div>
                  {/* Summary Banner */}
                  {wishlistSummary.pendingCount > 0 && (
                    <Card style={{ padding: '16px 20px', marginBottom: 16, borderRadius: 16, background: 'linear-gradient(135deg, rgba(var(--color-primary), 0.06) 0%, rgba(var(--color-accent-yellow, 255 214 80), 0.04) 100%)', border: '1px solid rgba(var(--color-primary), 0.12)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 28 }}>🎯</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 2 }}>Total rencana belanja</div>
                          <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(wishlistSummary.totalNeeded)}</div>
                          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>
                            {wishlistSummary.pendingCount} item belum dibeli
                            {wishlistSummary.highPriorityCount > 0 && ` • ${wishlistSummary.highPriorityCount} prioritas tinggi (${fmt(wishlistSummary.highTotal)})`}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['pending', 'purchased', 'all'] as const).map(f => (
                        <button key={f} onClick={() => setWishlistFilter(f)} style={{
                          padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          fontSize: 12, fontWeight: wishlistFilter === f ? 600 : 400,
                          background: wishlistFilter === f ? 'rgb(var(--color-primary))' : 'var(--input-bg)',
                          color: wishlistFilter === f ? '#fff' : 'inherit',
                        }}>{f === 'pending' ? 'Belum Beli' : f === 'purchased' ? 'Sudah Beli' : 'Semua'}</button>
                      ))}
                    </div>
                    <Button onClick={() => setShowWishlistModal(true)} size="sm"><Plus size={14} /> Tambah</Button>
                  </div>

                  {wishlistLoading ? (
                    <div style={{ textAlign: 'center', padding: 48, opacity: 0.5 }}>Memuat...</div>
                  ) : filteredWishlist.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                      <span style={{ fontSize: 56, display: 'block', marginBottom: 12 }}>🛒</span>
                      <p style={{ opacity: 0.6, fontSize: 15, fontWeight: 500 }}>Belum ada rencana belanja</p>
                      <p style={{ opacity: 0.35, fontSize: 13, marginTop: 4 }}>Catat barang yang ingin kamu beli supaya bisa plan keuanganmu! 💡</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {filteredWishlist.map(item => {
                        const priorityConfig = { high: { color: '#ef4444', label: 'Tinggi', emoji: '🔴' }, medium: { color: '#f59e0b', label: 'Sedang', emoji: '🟡' }, low: { color: '#6b7280', label: 'Rendah', emoji: '⚪' } };
                        const p = priorityConfig[item.priority] || priorityConfig.medium;
                        return (
                          <Card key={item.id} style={{ padding: 16, borderRadius: 16, opacity: item.isPurchased ? 0.6 : 1, border: item.isPurchased ? '1px solid #4ade8044' : `1px solid ${p.color}22` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <span style={{ fontSize: 16 }}>{item.isPurchased ? '✅' : p.emoji}</span>
                                  <span style={{ fontSize: 14, fontWeight: 700, textDecoration: item.isPurchased ? 'line-through' : 'none' }}>{item.name}</span>
                                  {item.category && <span style={{ fontSize: 10, background: 'var(--input-bg)', padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>{item.category}</span>}
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: item.isPurchased ? '#4ade80' : 'rgb(var(--color-primary))' }}>
                                  {fmt(item.estimatedPrice)}
                                </div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                                  {item.targetDate && (
                                    <span style={{ fontSize: 11, opacity: 0.5 }}>
                                      🎯 Target: {new Date(item.targetDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                  )}
                                  {item.notes && <span style={{ fontSize: 11, opacity: 0.5 }}>📝 {item.notes}</span>}
                                </div>
                                {item.url && (
                                  <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'rgb(var(--color-primary))', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, textDecoration: 'none' }}>
                                    <ExternalLink size={10} /> Lihat produk
                                  </a>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {!item.isPurchased && (
                                  <Button size="sm" onClick={() => handleMarkWishlistPurchased(item.id)} style={{ fontSize: 12, borderRadius: 8 }}><Check size={12} /> Beli</Button>
                                )}
                                <button onClick={() => handleDeleteWishlistItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: 6 }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Debts Tab ─── */}
              {tab === 'debts' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['active', 'paid', 'all'] as const).map(f => (
                        <button key={f} onClick={() => setDebtFilter(f)} style={{
                          padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          fontSize: 12, fontWeight: debtFilter === f ? 600 : 400,
                          background: debtFilter === f ? 'rgb(var(--color-primary))' : 'var(--input-bg)',
                          color: debtFilter === f ? '#fff' : 'inherit',
                        }}>{f === 'active' ? 'Belum Lunas' : f === 'paid' ? 'Lunas' : 'Semua'}</button>
                      ))}
                    </div>
                    <Button onClick={() => setShowDebtModal(true)} size="sm"><Plus size={14} /> Catat Hutang</Button>
                  </div>

                  {debtsLoading ? (
                    <div style={{ textAlign: 'center', padding: 48, opacity: 0.5 }}>Memuat...</div>
                  ) : debts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 48 }}>
                      <span style={{ fontSize: 56, display: 'block', marginBottom: 12 }}>🤝</span>
                      <p style={{ opacity: 0.6, fontSize: 15, fontWeight: 500 }}>Belum ada catatan hutang</p>
                      <p style={{ opacity: 0.35, fontSize: 13, marginTop: 4 }}>Catat hutang biar gak lupa! 📝</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {debts.map(debt => (
                        <Card key={debt.id} style={{ padding: 16, borderRadius: 16, border: debt.isPaid ? '1px solid #4ade8044' : debt.debtType === 'owed_by_me' ? '1px solid #f8717144' : '1px solid #60a5fa44' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 18 }}>{debt.debtType === 'owed_by_me' ? '📤' : '📥'}</span>
                                <span style={{ fontSize: 14, fontWeight: 700 }}>{debt.description}</span>
                                {debt.isPaid && <span style={{ fontSize: 10, background: '#4ade8022', color: '#4ade80', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>LUNAS</span>}
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
                                {debt.debtType === 'owed_by_me' ? 'Saya hutang ke' : 'Piutang dari'}: <strong>{debt.personName}</strong>
                              </div>
                              <div style={{ fontSize: 18, fontWeight: 800, color: debt.debtType === 'owed_by_me' ? '#f87171' : '#60a5fa' }}>
                                {fmt(debt.amount)}
                              </div>
                              {debt.dueDate && (
                                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                                  ⏰ Jatuh tempo: {new Date(debt.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {!debt.isPaid && (
                                <Button size="sm" onClick={() => handleMarkDebtPaid(debt.id)} style={{ fontSize: 12, borderRadius: 8 }}>✅ Lunas</Button>
                              )}
                              <button onClick={() => handleDeleteDebt(debt.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: 6 }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              </>}
            </div>

            {/* ─── Challenge Tab ─── */}
            {tab === 'challenges' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <ChallengeSection challenges={challenges} onRefresh={fetchChallenges} />
              </div>
            )}

            {/* CSV Import Modal */}
            <CsvImportModal open={showCsvImport} onClose={() => setShowCsvImport(false)} onSuccess={fetchData} />

            {/* ─── MODALS ─── */}

            {/* Add/Edit Transaction — attractive BottomSheet experience */}
            <TransactionSheet
              isOpen={showAddModal}
              onClose={() => { setShowAddModal(false); setEditingTx(null); }}
              form={form}
              setForm={setForm}
              editingTx={editingTx}
              submitting={submitting}
              onSubmit={handleAddTransaction}
              expenseCategories={EXPENSE_CATEGORIES}
              incomeCategories={INCOME_CATEGORIES}
            />

            <ReceiptScannerModal
              isOpen={showScannerModal}
              onClose={() => setShowScannerModal(false)}
              onBulkCreate={handleBulkCreate}
            />

            {/* AI Input */}
            <Modal isOpen={showAiInput} onClose={() => setShowAiInput(false)} title="✨ Input Cerdas">
              {/* Scan Struk option */}
              <div
                onClick={() => { setShowAiInput(false); setShowScannerModal(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  borderRadius: 12, cursor: 'pointer', marginBottom: 16,
                  background: 'rgba(var(--color-warning) / 0.06)',
                  border: '1.5px dashed rgba(var(--color-warning) / 0.4)',
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(var(--color-warning) / 0.12)', flexShrink: 0,
                }}>
                  <Camera size={18} style={{ color: 'rgb(var(--color-warning))' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, display: 'block' }}>📸 Scan Struk</span>
                  <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))' }}>Foto struk belanja, AI otomatis catat semua item</span>
                </div>
              </div>

              <div style={{ position: 'relative', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
                <span style={{ fontSize: 11, color: 'rgb(var(--text-muted))', fontWeight: 600 }}>atau ketik manual</span>
                <span style={{ flex: 1, height: 1, background: 'var(--border-default)' }} />
              </div>

              <p style={{ marginBottom: 12, fontSize: 13, opacity: 0.6 }}>Ketik aja kayak ngobrol biasa, AI langsung ngerti mau catat apa! 🧠</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {['kopi 25rb', 'makan warteg 15rb', 'gaji 5.5 juta', 'grab 12k'].map(ex => (
                  <button key={ex} type="button" onClick={() => setAiText(ex)} style={{
                    padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 11, background: 'var(--input-bg)', opacity: 0.7, transition: 'opacity 0.2s',
                  }}>&ldquo;{ex}&rdquo;</button>
                ))}
              </div>
              <TextArea placeholder="Ketik di sini..." value={aiText} onChange={setAiText} rows={3} resize="none" />
              <div style={{ marginTop: 14 }}>
                <Button onClick={handleAiParse} disabled={submitting || !aiText.trim()} style={{ width: '100%', borderRadius: 12, padding: '12px 0' }}>
                  {submitting ? <Loader2 className="spin" size={16} /> : <><Sparkles size={16} /> Parse & Tambahkan</>}
                </Button>
              </div>
            </Modal>

            {/* Tree Modal */}
            <Modal isOpen={showTreeModal} onClose={() => setShowTreeModal(false)} title="🌱 Buat Pohon Tabungan">
              <form onSubmit={handleAddTree} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Quick templates */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.6 }}>Pilih template atau isi sendiri</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {TREE_TEMPLATES.map(t => (
                      <button key={t.name} type="button" onClick={() => setTreeForm({ name: t.name, targetAmount: String(t.target), deadline: '' })} style={{
                        padding: '6px 12px', borderRadius: 10, border: '1px solid var(--border-default)', cursor: 'pointer',
                        fontSize: 12, background: treeForm.name === t.name ? 'rgba(var(--color-primary), 0.08)' : 'transparent',
                        display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s',
                      }}><span>{t.emoji}</span> {t.name}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Nama tujuan</label>
                  <TextInput placeholder="Laptop Baru, Liburan Bali..." value={treeForm.name} onChange={v => setTreeForm({ ...treeForm, name: v })} required />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Target tabungan</label>
                  <CurrencyInput value={treeForm.targetAmount} onChange={(val) => setTreeForm({ ...treeForm, targetAmount: val })} placeholder="Rp 0" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Deadline (opsional)</label>
                  <DateTimePicker mode="date" value={treeForm.deadline} onChange={v => setTreeForm({ ...treeForm, deadline: v })} placeholder="Pilih deadline" />
                </div>
                <Button type="submit" disabled={submitting} style={{ borderRadius: 12, padding: '12px 0', marginTop: 4 }}>
                  {submitting ? <Loader2 className="spin" size={16} /> : '🌱 Buat Pohon'}
                </Button>
              </form>
            </Modal>

            {/* Deposit/Withdraw Modal */}
            <Modal isOpen={!!depositTreeId} onClose={() => setDepositTreeId(null)} title={depositType === 'deposit' ? '💰 Setor Tabungan' : '💸 Tarik Tabungan'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Jumlah</label>
                  <CurrencyInput value={depositAmount} onChange={setDepositAmount} placeholder="Rp 0" />
                </div>
                <Button onClick={handleTreeTx} disabled={submitting || !depositAmount} style={{ borderRadius: 12, padding: '12px 0' }}>
                  {submitting ? <Loader2 className="spin" size={16} /> : 'Konfirmasi'}
                </Button>
              </div>
            </Modal>

            {/* Budget Modal */}
            <Modal isOpen={showBudgetModal} onClose={() => setShowBudgetModal(false)} title="🎯 Atur Budget Kategori">
              <form onSubmit={handleSetBudget} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}>Set budget bulanan biar dapet warning kalo udah mau over limit! ⚠️</p>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.6 }}>Kategori</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {EXPENSE_CATEGORIES.map(c => (
                      <button key={c.id} type="button" onClick={() => setBudgetForm({ ...budgetForm, category: c.id })} style={{
                        padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12,
                        fontWeight: budgetForm.category === c.id ? 600 : 400,
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: budgetForm.category === c.id ? 'rgba(var(--color-primary), 0.1)' : 'var(--input-bg)',
                        color: budgetForm.category === c.id ? 'rgb(var(--color-primary))' : 'inherit',
                        outline: budgetForm.category === c.id ? '2px solid rgb(var(--color-primary))' : 'none',
                        outlineOffset: -1, transition: 'all 0.2s',
                      }}><span>{c.emoji}</span> {c.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', opacity: 0.6 }}>Budget bulanan</label>
                  <CurrencyInput value={budgetForm.amount} onChange={(val) => setBudgetForm({ ...budgetForm, amount: val })} placeholder="Rp 0" />
                </div>
                <Button type="submit" disabled={submitting} style={{ borderRadius: 12, padding: '12px 0', marginTop: 4 }}>
                  {submitting ? <Loader2 className="spin" size={16} /> : '💾 Simpan Budget'}
                </Button>
              </form>
            </Modal>

            {/* Si Bawel Settings */}
            <Modal isOpen={showBawelSettings} onClose={() => setShowBawelSettings(false)} title="🗣️ Pengaturan Si Bawel">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}>Si Bawel bakal auto komen soal transaksi kamu — kadang nyebelin tapi berguna! 😜</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: 'var(--input-bg)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Aktifkan Si Bawel</span>
                  <button onClick={() => handleBawelToggle('isEnabled', !bawelSetting?.isEnabled)} style={{ width: 50, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer', background: bawelSetting?.isEnabled ? 'rgb(var(--color-primary))' : 'var(--border-default)', position: 'relative', transition: 'background 0.3s' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: bawelSetting?.isEnabled ? 25 : 3, transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                  </button>
                </div>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'block' }}>Level Kebawelan</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['SANTAI', 'NORMAL', 'CEREWET'] as const).map(level => (
                      <button key={level} onClick={() => handleBawelToggle('level', level)} style={{
                        flex: 1, padding: '14px 8px', borderRadius: 14,
                        border: bawelSetting?.level === level ? '2px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                        background: bawelSetting?.level === level ? 'rgba(var(--color-primary), 0.06)' : 'transparent',
                        cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                      }} className="hover-lift">
                        <div style={{ fontSize: 24, marginBottom: 6 }}>{level === 'SANTAI' ? '😌' : level === 'NORMAL' ? '🗣️' : '😤'}</div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{level}</div>
                        <div style={{ fontSize: 10, opacity: 0.45, marginTop: 3, lineHeight: 1.3 }}>{level === 'SANTAI' ? '>Rp100K saja' : level === 'NORMAL' ? 'Semua transaksi' : 'Detail + cross-ref'}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Modal>

            {/* Bill Modal */}
            <Modal isOpen={showBillModal} onClose={() => setShowBillModal(false)} title="💳 Tambah Tagihan Rutin">
              <form onSubmit={handleBillSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <TextInput label="Nama Tagihan" value={billForm.name} onChange={v => setBillForm(f => ({ ...f, name: v }))} placeholder="Listrik, WiFi, Spotify..." required />
                  <CurrencyInput label="Jumlah per Bulan" value={billForm.amount} onChange={v => setBillForm(f => ({ ...f, amount: v }))} />
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Tanggal Jatuh Tempo</label>
                    <SelectOption
                      value={billForm.dueDay}
                      onChange={v => setBillForm(f => ({ ...f, dueDay: v }))}
                      options={Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `Tanggal ${i + 1}` }))}
                    />
                  </div>
                  <SelectOption label="Kategori" value={billForm.category} onChange={v => setBillForm(f => ({ ...f, category: v }))} options={[
                    { value: 'tagihan', label: '💡 Tagihan Umum' },
                    { value: 'kos', label: '🏠 Kos/Sewa' },
                    { value: 'internet', label: '📶 Internet/WiFi' },
                    { value: 'streaming', label: '🎬 Streaming' },
                    { value: 'asuransi', label: '🛡️ Asuransi' },
                    { value: 'cicilan', label: '💳 Cicilan' },
                    { value: 'lainnya', label: '📦 Lainnya' },
                  ]} />
                  <TextArea label="Catatan (opsional)" value={billForm.notes} onChange={v => setBillForm(f => ({ ...f, notes: v }))} placeholder="Info tambahan..." rows={2} />
                  <Button type="submit" disabled={submitting} style={{ marginTop: 8 }}>{submitting ? 'Menyimpan...' : '💳 Simpan Tagihan'}</Button>
                </div>
              </form>
            </Modal>

            {/* Wishlist Modal */}
            <Modal isOpen={showWishlistModal} onClose={() => setShowWishlistModal(false)} title="🛒 Tambah Rencana Belanja">
              <form onSubmit={handleWishlistSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <TextInput label="Nama Barang" value={wishlistForm.name} onChange={v => setWishlistForm(f => ({ ...f, name: v }))} placeholder="Laptop, Sepatu, dll..." required />
                  <CurrencyInput label="Estimasi Harga" value={wishlistForm.estimatedPrice} onChange={v => setWishlistForm(f => ({ ...f, estimatedPrice: v }))} />
                  <SelectOption label="Prioritas" value={wishlistForm.priority} onChange={v => setWishlistForm(f => ({ ...f, priority: v }))} options={[
                    { value: 'high', label: '🔴 Tinggi — Butuh segera' },
                    { value: 'medium', label: '🟡 Sedang — Bisa ditunda' },
                    { value: 'low', label: '⚪ Rendah — Nice to have' },
                  ]} />
                  <TextInput label="Kategori (opsional)" value={wishlistForm.category} onChange={v => setWishlistForm(f => ({ ...f, category: v }))} placeholder="Elektronik, Fashion, dll" />
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Target Beli (opsional)</label>
                    <DateTimePicker mode="date" value={wishlistForm.targetDate} onChange={v => setWishlistForm(f => ({ ...f, targetDate: v }))} placeholder="Kapan mau beli?" />
                  </div>
                  <TextInput label="Link Produk (opsional)" value={wishlistForm.url} onChange={v => setWishlistForm(f => ({ ...f, url: v }))} placeholder="https://tokopedia.com/..." />
                  <TextArea label="Catatan (opsional)" value={wishlistForm.notes} onChange={v => setWishlistForm(f => ({ ...f, notes: v }))} placeholder="Alasan, spek yang diinginkan..." rows={2} />
                  <Button type="submit" disabled={submitting} style={{ marginTop: 8 }}>{submitting ? 'Menyimpan...' : '🛒 Simpan ke Wishlist'}</Button>
                </div>
              </form>
            </Modal>

            {/* Debt Modal */}
            <Modal isOpen={showDebtModal} onClose={() => setShowDebtModal(false)} title="Catat Hutang">
              <form onSubmit={handleDebtSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <TextInput label="Deskripsi" value={debtForm.description} onChange={v => setDebtForm(f => ({ ...f, description: v }))} placeholder="Hutang buat apa..." required />
                  <CurrencyInput label="Jumlah" value={debtForm.amount} onChange={v => setDebtForm(f => ({ ...f, amount: v }))} />
                  <TextInput label="Nama Orang" value={debtForm.personName} onChange={v => setDebtForm(f => ({ ...f, personName: v }))} placeholder="Siapa..." required />
                  <SelectOption label="Tipe" value={debtForm.debtType} onChange={v => setDebtForm(f => ({ ...f, debtType: v }))} options={[{ value: 'owed_by_me', label: '📤 Saya yang hutang' }, { value: 'owed_to_me', label: '📥 Orang hutang ke saya' }]} />
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Jatuh Tempo (opsional)</label>
                    <DateTimePicker mode="date" value={debtForm.dueDate} onChange={v => setDebtForm(f => ({ ...f, dueDate: v }))} placeholder="Pilih tanggal jatuh tempo" />
                  </div>
                  <Button type="submit" disabled={submitting} style={{ marginTop: 8 }}>{submitting ? 'Menyimpan...' : 'Simpan Hutang'}</Button>
                </div>
              </form>
            </Modal>

            </PullToRefresh>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
