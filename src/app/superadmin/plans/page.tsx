'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { superadminService } from '@/services/superadminService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Button, Alert, Modal, useToast, useConfirm, DataTable, Card, CurrencyInput, TextInput, SelectOption, NumberInput } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useCache } from '@/lib/cache';
import { Layers, Clock } from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  maxUploadPerMonth: number;
  maxFileSizeMb: number;
  aiRequestLimit: number;
  aiBriefingLimit: number;
  aiWeeklyRoastLimit: number;
  aiFoodLimit: number;
  aiDigitalizationLimit: number;
  aiInsightLimit: number;
  aiExamPredictionLimit: number;
  aiQuizGenLimit: number;
  aiReceiptScanLimit: number;
  aiSkripsweetLimit: number;
  aiTodoParseLimit: number;
  features: string[];
  price: number;
  durationDays: number;
}

interface FeatureItem { id: string; label: string; }
interface FeatureSection { section: string; items: FeatureItem[]; }

const FEATURE_SECTIONS: FeatureSection[] = [
  {
    section: 'Kelas & Pertemuan',
    items: [
      { id: 'class', label: 'Akses Kelas' },
      { id: 'class_settings', label: 'Pengaturan Kelas (Edit, Roles)' },
      { id: 'class_sessions', label: 'Pertemuan & Materi' },
      { id: 'class_custom_tabs', label: 'Tab Kustom Kelas' },
      { id: 'canvas', label: 'Canvas Editor' },
      { id: 'unread_tracking', label: 'Pelacakan Belum Dibaca' },
    ],
  },
  {
    section: 'Forum & Diskusi',
    items: [
      { id: 'forum', label: 'Forum & Chat' },
      { id: 'forum_announcement', label: 'Pengumuman Forum' },
      { id: 'forum_poll', label: 'Polling / Voting' },
      { id: 'forum_reminder', label: 'Reminder Otomatis' },
      { id: 'forum_file_upload', label: 'Upload File di Forum' },
      { id: 'forum_discussion', label: 'Topik Diskusi' },
    ],
  },
  {
    section: 'Tugas & Kuis',
    items: [
      { id: 'task', label: 'Tugas Kelas' },
      { id: 'task_ai_solver', label: 'AI Solver Tugas' },
      { id: 'task_image_ocr', label: 'Upload Foto Soal (OCR)' },
      { id: 'quiz', label: 'Pembuatan Kuis AI' },
      { id: 'group', label: 'Pembagian Kelompok' },
      { id: 'kolektif', label: 'Kas Kelas (Kolektif)' },
    ],
  },
  {
    section: 'Prediksi Ujian',
    items: [
      { id: 'exam_prediction', label: 'Prediksi Ujian AI' },
      { id: 'exam_manual', label: 'Bank Soal Manual' },
      { id: 'exam_kisi_kisi', label: 'Upload Kisi-Kisi (AI Vision)' },
    ],
  },
  {
    section: 'AI Digitalisasi & Dokumen',
    items: [
      { id: 'ai_digitalization', label: 'AI Digitalisasi Materi' },
      { id: 'schedule_parser', label: 'AI Schedule Parser' },
      { id: 'pdf_export', label: 'Smart B5 Printer' },
    ],
  },
  {
    section: 'AI Insight & Briefing',
    items: [
      { id: 'ai_insight', label: 'AI Insight Mingguan' },
      { id: 'daily_briefing', label: 'Briefing Harian AI' },
      { id: 'ai_briefing_tips', label: 'Tips & Motivasi AI' },
    ],
  },
  {
    section: 'Duit Tracker (Keuangan)',
    items: [
      { id: 'duit_tracker', label: 'Catat Transaksi' },
      { id: 'duit_tracker_budget', label: 'Budget / Anggaran' },
      { id: 'duit_tracker_saving_tree', label: 'Pohon Tabungan' },
      { id: 'duit_tracker_summary', label: 'Ringkasan & Grafik' },
      { id: 'duit_tracker_quick_input', label: 'Input Cepat (AI Parse)' },
      { id: 'duit_tracker_bills', label: 'Tagihan Rutin' },
      { id: 'duit_tracker_debts', label: 'Pencatatan Hutang' },
      { id: 'duit_tracker_wishlist', label: 'Wishlist / Rencana Belanja' },
      { id: 'duit_tracker_challenges', label: 'Budget Challenge & Streak' },
      { id: 'what_if_calculator', label: 'What If Calculator' },
    ],
  },
  {
    section: 'Si Bawel (AI Keuangan)',
    items: [
      { id: 'si_bawel', label: 'Si Bawel Chat' },
      { id: 'si_bawel_memory', label: 'Memory & Evolusi' },
      { id: 'receipt_scanner', label: 'Scan Struk (OCR)' },
    ],
  },
  {
    section: 'Split Bill',
    items: [
      { id: 'split_bill', label: 'Split Bill' },
      { id: 'split_bill_scan', label: 'Scan Struk Split Bill' },
    ],
  },
  {
    section: 'Makan Apa (Rekomendasi Makanan)',
    items: [
      { id: 'food_recommend', label: 'Rekomendasi Makan AI' },
      { id: 'food_meal_plan', label: 'Meal Plan Mingguan' },
      { id: 'food_fridge_scan', label: 'Foto Kulkas (AI Vision)' },
      { id: 'food_menu_scan', label: 'Foto Menu (AI Vision)' },
    ],
  },
  {
    section: 'To-Do List',
    items: [
      { id: 'todo_list', label: 'To-Do List' },
      { id: 'todo_calendar', label: 'Kalender View' },
      { id: 'todo_timeline', label: 'Timeline View' },
      { id: 'todo_categories', label: 'Kategori & Label' },
      { id: 'todo_subtasks', label: 'Sub-tugas (Checklist)' },
      { id: 'todo_recurring', label: 'Tugas Berulang' },
      { id: 'todo_events', label: 'Jadwal & Event' },
      { id: 'todo_shared', label: 'Sharing Todo' },
      { id: 'todo_reminders', label: 'Pengingat Todo' },
      { id: 'todo_bulk', label: 'Bulk Actions' },
      { id: 'todo_ai_parse', label: 'Input Natural (AI Parse)' },
      { id: 'todo_sync_class', label: 'Sinkronisasi Tugas Kelas' },
    ],
  },
  {
    section: 'Q&A Publik',
    items: [
      { id: 'qna_public', label: 'Q&A Publik' },
      { id: 'qna_voting', label: 'Voting Q&A' },
      { id: 'qna_ai_answer', label: 'Jawaban AI di Q&A' },
    ],
  },
  {
    section: 'Skripsweet (Asisten Skripsi)',
    items: [
      { id: 'skripsweet', label: 'Akses Skripsweet' },
      { id: 'skripsweet_chat', label: 'Chat AI Skripsi' },
      { id: 'skripsweet_ai_chat', label: 'AI Chat (Advanced)' },
      { id: 'skripsweet_write_assist', label: 'AI Write Assist' },
      { id: 'skripsweet_feedback', label: 'Feedback Bab AI' },
      { id: 'skripsweet_journal', label: 'Pencarian Jurnal Manual' },
      { id: 'skripsweet_journal_search', label: 'Pencarian Jurnal AI' },
      { id: 'skripsweet_bibliography', label: 'Generate Daftar Pustaka' },
      { id: 'skripsweet_versions', label: 'Version History' },
      { id: 'skripsweet_docx_export', label: 'Export DOCX/PDF' },
      { id: 'skripsweet_revisions', label: 'Catatan Revisi' },
      { id: 'skripsweet_community', label: 'Komunitas Skripsi' },
      { id: 'skripsweet_format', label: 'Format Template AI' },
    ],
  },
  {
    section: 'Quiz Kepribadian Keuangan',
    items: [
      { id: 'quiz_keuangan', label: 'Quiz Kepribadian Keuangan' },
      { id: 'quiz_keuangan_history', label: 'Riwayat Hasil Quiz' },
    ],
  },
  {
    section: 'Gamifikasi & UX',
    items: [
      { id: 'gamification', label: 'Gamifikasi & XP' },
      { id: 'gamification_streak', label: 'Streak & Tantangan' },
      { id: 'gamification_leaderboard', label: 'Leaderboard' },
      { id: 'notification', label: 'Notifikasi' },
      { id: 'command_palette', label: 'Command Palette' },
      { id: 'quick_action', label: 'Quick Action FAB' },
      { id: 'virtual_pet', label: 'Virtual Pet (Pixel Cat)' },
      { id: 'streak_calendar', label: 'Streak Calendar (Heatmap)' },
    ],
  },
  {
    section: 'Profil & Personalisasi',
    items: [
      { id: 'profile_ai_context', label: 'Konteks AI Personal' },
      { id: 'profile_avatar', label: 'Upload Avatar' },
      { id: 'profile_card', label: 'Digital Identity Card' },
      { id: 'dashboard_class_comparison', label: 'Perbandingan Kelas' },
      { id: 'dashboard_trending_qna', label: 'Trending Q&A' },
    ],
  },
];

const ALL_FEATURES = FEATURE_SECTIONS.flatMap(s => s.items);

const DURATION_PRESETS = [
  { label: 'Tak Terbatas', days: 0 },
  { label: '7 Hari', days: 7 },
  { label: '30 Hari (1 Bulan)', days: 30 },
  { label: '90 Hari (3 Bulan)', days: 90 },
  { label: '180 Hari (6 Bulan)', days: 180 },
  { label: '365 Hari (1 Tahun)', days: 365 },
];

const AI_LIMITS = [
  { key: 'aiBriefingLimit', label: 'Briefing AI / Hari', default: 1 },
  { key: 'aiWeeklyRoastLimit', label: 'Weekly Roast / Minggu', default: 1 },
  { key: 'aiFoodLimit', label: 'Food AI / Hari', default: 5 },
  { key: 'aiDigitalizationLimit', label: 'Digitalisasi AI / Hari', default: 5 },
  { key: 'aiInsightLimit', label: 'AI Insight / Hari', default: 3 },
  { key: 'aiExamPredictionLimit', label: 'Prediksi Ujian / Hari', default: 3 },
  { key: 'aiQuizGenLimit', label: 'Generate Kuis / Hari', default: 5 },
  { key: 'aiReceiptScanLimit', label: 'Scan Struk / Hari', default: 5 },
  { key: 'aiSkripsweetLimit', label: 'Skripsweet AI / Hari', default: 10 },
  { key: 'aiTodoParseLimit', label: 'Parse Todo / Hari', default: 10 },
] as const;

type AiLimitKey = typeof AI_LIMITS[number]['key'];

export default function SuperadminPlansPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { data: configs = [], loading, error: cacheError, revalidate: loadData } = useCache<PricingPlan[]>('superadmin:plans', () => superadminService.getPlanConfigs());
  const error = cacheError ? (cacheError instanceof Error ? cacheError.message : 'Gagal memuat data paket.') : null;

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planPrice, setPlanPrice] = useState('Rp 0');
  const [planMaxUpload, setPlanMaxUpload] = useState(5);
  const [planMaxSize, setPlanMaxSize] = useState(10);
  const [planAiLimit, setPlanAiLimit] = useState(10);
  const [planDurationDays, setPlanDurationDays] = useState(0);
  const [planFeatures, setPlanFeatures] = useState<string[]>(['class', 'pdf_export']);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [featureSearch, setFeatureSearch] = useState('');

  const [aiLimits, setAiLimits] = useState<Record<AiLimitKey, number>>(() => {
    const d: Record<string, number> = {};
    AI_LIMITS.forEach(l => { d[l.key] = l.default; });
    return d as Record<AiLimitKey, number>;
  });

  const setAiLimit = (key: AiLimitKey, value: number) => setAiLimits(prev => ({ ...prev, [key]: value }));

  const fmtCurrency = (value: string) => {
    const clean = value.replace(/\D/g, '');
    return clean ? 'Rp ' + new Intl.NumberFormat('id-ID').format(parseInt(clean)) : '';
  };

  const cleanAmount = (val: string) => val ? parseFloat(val.replace(/\D/g, '')) : 0;

  const handleOpenPlanModal = (plan: PricingPlan | null = null) => {
    setEditingPlan(plan);
    if (plan) {
      setPlanName(plan.name);
      setPlanDescription(plan.description || '');
      setPlanPrice(fmtCurrency(plan.price.toString()));
      setPlanMaxUpload(plan.maxUploadPerMonth);
      setPlanMaxSize(plan.maxFileSizeMb);
      setPlanAiLimit(plan.aiRequestLimit);
      setPlanDurationDays(plan.durationDays || 0);
      setPlanFeatures(plan.features);
      const lim: Record<string, number> = {};
      AI_LIMITS.forEach(l => { lim[l.key] = (plan as any)[l.key] ?? l.default; });
      setAiLimits(lim as Record<AiLimitKey, number>);
    } else {
      setPlanName(''); setPlanDescription(''); setPlanPrice('Rp 0');
      setPlanMaxUpload(5); setPlanMaxSize(10); setPlanAiLimit(10);
      setPlanDurationDays(0); setPlanFeatures(['class', 'pdf_export']);
      const d: Record<string, number> = {};
      AI_LIMITS.forEach(l => { d[l.key] = l.default; });
      setAiLimits(d as Record<AiLimitKey, number>);
    }
    setPlanError(null); setFeatureSearch(''); setShowPlanModal(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPlan(true); setPlanError(null);
    const formattedName = planName.toUpperCase().replace(/\s+/g, '_');
    if (!formattedName) { setPlanError('Nama paket tidak boleh kosong.'); setIsSavingPlan(false); return; }
    const planData: any = {
      name: formattedName, description: planDescription,
      price: cleanAmount(planPrice), maxUploadPerMonth: Number(planMaxUpload),
      maxFileSizeMb: Number(planMaxSize), aiRequestLimit: Number(planAiLimit),
      durationDays: Number(planDurationDays), features: planFeatures,
    };
    AI_LIMITS.forEach(l => { planData[l.key] = Number(aiLimits[l.key]); });

    try {
      if (editingPlan) {
        await superadminService.updatePricingPlan(editingPlan.id, planData);
        showToast('Paket berhasil diperbarui!', 'success');
      } else {
        await superadminService.createPricingPlan(planData);
        showToast('Paket baru berhasil dibuat!', 'success');
      }
      await loadData(); setShowPlanModal(false);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Gagal menyimpan paket.');
    } finally { setIsSavingPlan(false); }
  };

  const handleDeletePlan = async (id: string, name: string) => {
    const ok = await confirm({ title: 'Hapus Paket', message: `Yakin hapus paket "${name}"? User yang menggunakannya akan kehilangan akses.`, confirmText: 'Hapus', variant: 'danger' });
    if (!ok) return;
    try {
      await superadminService.deletePricingPlan(id);
      showToast(`Paket ${name} dihapus!`, 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus.', 'error');
    }
  };

  const handleModalSectionToggle = (section: FeatureSection, checked: boolean) => {
    const ids = section.items.map(i => i.id);
    setPlanFeatures(prev => checked ? Array.from(new Set([...prev, ...ids])) : prev.filter(f => !ids.includes(f)));
  };

  const handleModalSelectAll = (all: boolean) => setPlanFeatures(all ? ALL_FEATURES.map(f => f.id) : []);

  const fmtRupiah = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  const fmtDuration = (days: number) => {
    if (days === 0) return 'Unlimited';
    if (days >= 365) return `${Math.floor(days / 365)} Tahun`;
    if (days >= 30) return `${Math.floor(days / 30)} Bulan`;
    return `${days} Hari`;
  };

  const getFilteredSections = (): FeatureSection[] => {
    if (!featureSearch.trim()) return FEATURE_SECTIONS;
    const q = featureSearch.toLowerCase();
    return FEATURE_SECTIONS.map(s => ({ ...s, items: s.items.filter(i => i.label.toLowerCase().includes(q) || i.id.includes(q) || s.section.toLowerCase().includes(q)) })).filter(s => s.items.length > 0);
  };

  const columns: Column<PricingPlan>[] = [
    {
      key: 'name', label: 'Nama Paket',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 700 }}>{row.name}</span>
          {row.description && <div style={{ fontSize: '0.72rem', color: 'rgb(var(--text-muted))', marginTop: 1 }}>{row.description}</div>}
        </div>
      ),
    },
    {
      key: 'price', label: 'Harga',
      render: (row) => <span style={{ fontWeight: 700, color: 'rgb(var(--color-secondary))' }}>{fmtRupiah(row.price)}</span>,
      exportValue: (row) => row.price,
    },
    {
      key: 'durationDays', label: 'Durasi',
      render: (row) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
          <Clock size={12} style={{ color: 'rgb(var(--text-muted))' }} /> {fmtDuration(row.durationDays || 0)}
        </span>
      ),
    },
    {
      key: 'limits', label: 'Kuota', sortable: false,
      render: (row) => (
        <div style={{ fontSize: '0.72rem', lineHeight: 1.7 }}>
          <div>Upload: <b>{row.maxUploadPerMonth}</b>/bln · File: <b>{row.maxFileSizeMb}</b> MB</div>
          <div>AI: <b>{row.aiRequestLimit}</b> · Brief: <b>{row.aiBriefingLimit ?? 1}</b>/d · Roast: <b>{row.aiWeeklyRoastLimit ?? 1}</b>/w</div>
          <div>Food: <b>{row.aiFoodLimit ?? 5}</b>/d · Digit: <b>{row.aiDigitalizationLimit ?? 5}</b>/d · Quiz: <b>{row.aiQuizGenLimit ?? 5}</b>/d</div>
        </div>
      ),
    },
    {
      key: 'features', label: 'Fitur', sortable: false,
      render: (row) => (
        <span style={{ fontSize: '0.75rem' }}>
          <b style={{ color: 'rgb(var(--color-primary))' }}>{row.features.length}</b>
          <span style={{ color: 'rgb(var(--text-muted))' }}> / {ALL_FEATURES.length}</span>
        </span>
      ),
      exportValue: (row) => row.features.join(', '),
    },
  ];

  return (
    <AuthGuard requiredRole="SUPERADMIN">
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Manajemen Paket" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          {loading ? (
            <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="skeleton" style={{ height: 22, width: '50%', borderRadius: 8 }} />
              {[1,2,3,4].map(n => <div key={n} className="skeleton" style={{ height: 56, borderRadius: 12 }} />)}
            </div>
          ) : (
            <div className="page-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Layers size={24} style={{ color: 'rgb(var(--color-secondary))' }} /> Paket Berlangganan
                  </h2>
                  <p style={{ color: 'rgb(var(--text-muted))', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Kelola paket, kuota AI, batas file, dan akses fitur.
                  </p>
                </div>
                <Button onClick={() => handleOpenPlanModal(null)}>Buat Paket Baru</Button>
              </div>

              {error && <Alert type="error" message={error} />}

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{configs.length}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgb(var(--text-muted))' }}>Total Paket</span>
                </Card>
                <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(var(--color-primary))' }}>{ALL_FEATURES.length}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgb(var(--text-muted))' }}>Total Fitur</span>
                </Card>
                <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(var(--color-secondary))' }}>{FEATURE_SECTIONS.length}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgb(var(--text-muted))' }}>Kategori</span>
                </Card>
              </div>

              <DataTable<PricingPlan>
                columns={columns}
                data={configs}
                rowKey="id"
                searchPlaceholder="Cari paket..."
                searchKeys={['name', 'description'] as (keyof PricingPlan)[]}
                exportFilename="plans-synapse"
                emptyMessage="Belum ada paket."
                actions={(row) => (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenPlanModal(row); }}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeletePlan(row.id, row.name); }} style={{ color: 'rgb(248, 113, 113)' }}>Hapus</Button>
                  </div>
                )}
              />
            </div>
          )}
        </div>

        {/* ────── Modal Create/Edit Plan ────── */}
        <Modal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} title={editingPlan ? 'Edit Paket "' + editingPlan.name + '"' : 'Buat Paket Baru'}>
          <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {planError && <Alert type="error" message={planError} />}

            <fieldset style={fsStyle}><legend style={lgStyle}>Info Dasar</legend>
              <TextInput label="Nama Paket" value={planName} onChange={v => setPlanName(v)} required placeholder="e.g. PRO_PLUS" />
              <TextInput label="Deskripsi" value={planDescription} onChange={v => setPlanDescription(v)} placeholder="Deskripsi singkat" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={fl}>Harga</label>
                  <CurrencyInput value={planPrice.replace(/^Rp\s?/, '')} onChange={v => setPlanPrice('Rp ' + v)} required style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={fl}>Durasi Berlaku</label>
                  <SelectOption
                    value={String(DURATION_PRESETS.find(d => d.days === planDurationDays) ? planDurationDays : 'custom')}
                    onChange={v => { if (v !== 'custom') setPlanDurationDays(Number(v)); }}
                    options={[...DURATION_PRESETS.map(d => ({ value: String(d.days), label: d.label })), { value: 'custom', label: 'Kustom...' }]}
                  />
                </div>
              </div>
              {!DURATION_PRESETS.find(d => d.days === planDurationDays) && (
                <div>
                  <label style={fl}>Durasi Kustom (hari)</label>
                  <NumberInput value={String(planDurationDays)} onChange={v => setPlanDurationDays(Number(v))} min={1} />
                </div>
              )}
            </fieldset>

            <fieldset style={fsStyle}><legend style={lgStyle}>Kuota & Batas Upload</legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <NumberInput label="Max Upload / Bulan" value={String(planMaxUpload)} onChange={v => setPlanMaxUpload(Number(v))} min={0} />
                <NumberInput label="Max File Size (MB)" value={String(planMaxSize)} onChange={v => setPlanMaxSize(Number(v))} min={1} />
                <NumberInput label="Kuota AI / Bulan" value={String(planAiLimit)} onChange={v => setPlanAiLimit(Number(v))} min={0} />
              </div>
              <p style={ht}>Max File Size berlaku di semua upload (materi, forum, struk, foto). Nilai 0 = tak terbatas.</p>
            </fieldset>

            <fieldset style={fsStyle}><legend style={lgStyle}>Batas AI per Fitur</legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {AI_LIMITS.map(l => (
                  <NumberInput key={l.key} label={l.label} value={String(aiLimits[l.key])} onChange={v => setAiLimit(l.key, Number(v))} min={0} />
                ))}
              </div>
              <p style={ht}>Nilai 0 = tak terbatas. Batas per hari/minggu sesuai tipe fitur.</p>
            </fieldset>

            <fieldset style={fsStyle}><legend style={lgStyle}>Akses Fitur ({planFeatures.length}/{ALL_FEATURES.length})</legend>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <TextInput value={featureSearch} onChange={setFeatureSearch} placeholder="Cari fitur..." />
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <Button type="button" size="sm" variant="ghost" onClick={() => handleModalSelectAll(true)} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>Semua</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => handleModalSelectAll(false)} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>Hapus</Button>
                </div>
              </div>
              <div style={{ maxHeight: 400, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {getFilteredSections().map(section => {
                  const ids = section.items.map(i => i.id);
                  const cnt = ids.filter(id => planFeatures.includes(id)).length;
                  const all = cnt === ids.length, some = cnt > 0 && !all;
                  return (
                    <div key={section.section}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, color: 'rgb(var(--text-secondary))', marginBottom: '0.35rem', cursor: 'pointer', userSelect: 'none' }}>
                        <input type="checkbox" checked={all} ref={el => { if (el) el.indeterminate = some; }} onChange={e => handleModalSectionToggle(section, e.target.checked)} style={{ accentColor: 'rgb(var(--color-primary))', cursor: 'pointer' }} />
                        {section.section} <span style={{ fontWeight: 400, opacity: 0.7 }}>({cnt}/{ids.length})</span>
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                        {section.items.map(feat => {
                          const on = planFeatures.includes(feat.id);
                          return (
                            <label key={feat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: 6, background: on ? 'rgba(var(--color-primary)/0.06)' : 'rgba(var(--bg-elevated)/0.5)', border: on ? '1px solid rgba(var(--color-primary)/0.15)' : '1px solid var(--border-subtle)', fontSize: 'var(--font-xs)', color: on ? 'rgb(var(--text-primary))' : 'rgb(var(--text-muted))', cursor: 'pointer', transition: 'all 0.15s' }}>
                              <input type="checkbox" checked={on} onChange={() => setPlanFeatures(prev => on ? prev.filter(x => x !== feat.id) : [...prev, feat.id])} style={{ accentColor: 'rgb(var(--color-primary))' }} />
                              <span>{feat.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </fieldset>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button type="button" variant="ghost" onClick={() => setShowPlanModal(false)}>Batal</Button>
              <Button type="submit" isLoading={isSavingPlan}>Simpan</Button>
            </div>
          </form>
        </Modal>
      </div>
    </AuthGuard>
  );
}

const fsStyle: React.CSSProperties = { border: '1px solid var(--border-default)', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' };
const lgStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 700, color: 'rgb(var(--text-secondary))', padding: '0 0.5rem' };
const fl: React.CSSProperties = { fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' };
const ht: React.CSSProperties = { fontSize: '0.7rem', color: 'rgb(var(--text-muted))', margin: 0 };
