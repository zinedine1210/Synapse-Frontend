'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { superadminService } from '@/services/superadminService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Button, Alert, Modal, useToast, useConfirm, DataTable, Card, CurrencyInput, TextInput, SelectOption, NumberInput } from '@/components/ui';
import type { Column } from '@/components/ui';
import { Layers, Loader2, Clock } from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  maxUploadPerMonth: number;
  maxFileSizeMb: number;
  aiRequestLimit: number;
  features: string[];
  price: number;
  durationDays: number;
}

interface FeatureItem { id: string; label: string; }
interface FeatureSection { section: string; items: FeatureItem[]; }

const FEATURE_SECTIONS: FeatureSection[] = [
  {
    section: '📚 Akademik & Kelas',
    items: [
      { id: 'class', label: 'Akses Kelas' },
      { id: 'class_settings', label: 'Pengaturan Kelas (Edit Info, Roles)' },
      { id: 'class_sessions', label: 'Pertemuan & Materi Kuliah' },
      { id: 'class_custom_tabs', label: 'Tab Kustom Kelas' },
      { id: 'forum', label: 'Forum & Chat' },
      { id: 'forum_announcement', label: 'Pengumuman Forum' },
      { id: 'forum_poll', label: 'Polling / Voting Forum' },
      { id: 'forum_reminder', label: 'Reminder Otomatis Forum' },
      { id: 'forum_file_upload', label: 'Upload File di Forum' },
      { id: 'forum_discussion', label: 'Pembahasan Topik Forum' },
      { id: 'quiz', label: 'Pembuatan Kuis' },
      { id: 'task', label: 'Tugas Kelas' },
      { id: 'task_ai_solver', label: 'AI Solver Tugas' },
      { id: 'task_image_ocr', label: 'Upload Foto Soal (OCR)' },
      { id: 'kolektif', label: 'Kas Kelas (Kolektif)' },
      { id: 'group', label: 'Pembagian Kelompok' },
      { id: 'exam_prediction', label: 'Prediksi Ujian AI' },
      { id: 'exam_manual', label: 'Bank Soal Manual' },
      { id: 'exam_kisi_kisi', label: 'Upload Kisi-Kisi (AI Vision)' },
      { id: 'canvas', label: 'Canvas Editor' },
      { id: 'unread_tracking', label: 'Pelacakan Belum Dibaca' },
    ],
  },
  {
    section: '🤖 AI & Dokumen',
    items: [
      { id: 'ai_digitalization', label: 'AI Digitalisasi Materi' },
      { id: 'schedule_parser', label: 'AI Schedule Parser' },
      { id: 'pdf_export', label: 'Smart B5 Printer' },
      { id: 'ai_insight', label: 'AI Insight Mingguan' },
      { id: 'daily_briefing', label: 'Briefing Harian AI' },
      { id: 'ai_briefing_tips', label: 'Tips & Motivasi AI' },
    ],
  },
  {
    section: '💰 Keuangan',
    items: [
      { id: 'duit_tracker', label: 'Duit Tracker (Catat Transaksi)' },
      { id: 'duit_tracker_budget', label: 'Budget / Anggaran' },
      { id: 'duit_tracker_saving_tree', label: 'Pohon Tabungan' },
      { id: 'duit_tracker_summary', label: 'Ringkasan & Grafik Keuangan' },
      { id: 'duit_tracker_quick_input', label: 'Input Cepat (AI Parse)' },
      { id: 'si_bawel', label: 'Si Bawel (AI Keuangan)' },
      { id: 'split_bill', label: 'Split Bill' },
      { id: 'receipt_scanner', label: 'Scan Struk (OCR)' },
    ],
  },
  {
    section: '📋 Produktivitas',
    items: [
      { id: 'todo_list', label: 'To-Do List' },
      { id: 'todo_calendar', label: 'Kalender View Todo' },
      { id: 'todo_timeline', label: 'Timeline View Todo' },
      { id: 'todo_categories', label: 'Kategori & Label Todo' },
      { id: 'todo_subtasks', label: 'Sub-tugas (Nested Checklist)' },
      { id: 'todo_recurring', label: 'Tugas Berulang (Harian/Mingguan)' },
      { id: 'qna_public', label: 'Q&A Publik' },
      { id: 'qna_voting', label: 'Voting Q&A' },
      { id: 'qna_ai_answer', label: 'Jawaban AI di Q&A' },
      { id: 'food_recommend', label: 'Rekomendasi Makan' },
    ],
  },
  {
    section: '🎮 Gamifikasi & UX',
    items: [
      { id: 'gamification', label: 'Gamifikasi & XP' },
      { id: 'gamification_streak', label: 'Streak & Tantangan Mingguan' },
      { id: 'gamification_leaderboard', label: 'Leaderboard & Perbandingan' },
      { id: 'notification', label: 'Notifikasi' },
      { id: 'command_palette', label: 'Command Palette' },
      { id: 'quick_action', label: 'Quick Action FAB' },
    ],
  },
  {
    section: '👤 Profil & Personalisasi',
    items: [
      { id: 'profile_ai_context', label: 'Konteks AI Personal' },
      { id: 'profile_avatar', label: 'Upload Avatar Profil' },
      { id: 'dashboard_class_comparison', label: 'Perbandingan Kelas (Dashboard)' },
      { id: 'dashboard_trending_qna', label: 'Trending Q&A (Dashboard)' },
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

export default function SuperadminPlansPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configs, setConfigs] = useState<PricingPlan[]>([]);

  // Plan modal
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

  const formatCurrencyInput = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) return '';
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(parseInt(clean));
  };

  const cleanAmount = (val: string) => {
    return val ? parseFloat(val.replace(/\D/g, '')) : 0;
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await superadminService.getPlanConfigs();
      setConfigs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data paket.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenPlanModal = (plan: PricingPlan | null = null) => {
    setEditingPlan(plan);
    if (plan) {
      setPlanName(plan.name);
      setPlanDescription(plan.description || '');
      setPlanPrice(formatCurrencyInput(plan.price.toString()));
      setPlanMaxUpload(plan.maxUploadPerMonth);
      setPlanMaxSize(plan.maxFileSizeMb);
      setPlanAiLimit(plan.aiRequestLimit);
      setPlanDurationDays(plan.durationDays || 0);
      setPlanFeatures(plan.features);
    } else {
      setPlanName('');
      setPlanDescription('');
      setPlanPrice('Rp 0');
      setPlanMaxUpload(5);
      setPlanMaxSize(10);
      setPlanAiLimit(10);
      setPlanDurationDays(0);
      setPlanFeatures(['class', 'pdf_export']);
    }
    setPlanError(null);
    setShowPlanModal(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPlan(true);
    setPlanError(null);
    const formattedName = planName.toUpperCase().replace(/\s+/g, '_');
    if (!formattedName) { setPlanError('Nama paket tidak boleh kosong.'); setIsSavingPlan(false); return; }

    const planData = {
      name: formattedName,
      description: planDescription,
      price: cleanAmount(planPrice),
      maxUploadPerMonth: Number(planMaxUpload),
      maxFileSizeMb: Number(planMaxSize),
      aiRequestLimit: Number(planAiLimit),
      durationDays: Number(planDurationDays),
      features: planFeatures,
    };

    try {
      if (editingPlan) {
        await superadminService.updatePricingPlan(editingPlan.id, planData);
        showToast('Paket berhasil diperbarui!', 'success');
      } else {
        await superadminService.createPricingPlan(planData);
        showToast('Paket baru berhasil dibuat!', 'success');
      }
      await loadData();
      setShowPlanModal(false);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Gagal menyimpan paket.');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleDeletePlan = async (id: string, name: string) => {
    if (name === 'FREE' || name === 'PRO') { showToast('Paket bawaan FREE & PRO tidak boleh dihapus.', 'warning'); return; }
    const ok = await confirm({ title: 'Konfirmasi', message: `Apakah Anda yakin ingin menghapus paket ${name}?`, confirmText: 'Hapus', variant: 'danger' });
    if (!ok) return;
    try {
      await superadminService.deletePricingPlan(id);
      showToast(`Paket ${name} berhasil dihapus!`, 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus paket.', 'error');
    }
  };

  const handleFeatureToggle = async (plan: PricingPlan, featureId: string, isChecked: boolean) => {
    const updatedFeatures = isChecked ? [...plan.features, featureId] : plan.features.filter((f) => f !== featureId);
    try {
      setConfigs((prev) => prev.map((c) => (c.id === plan.id ? { ...c, features: updatedFeatures } : c)));
      await superadminService.updatePricingPlan(plan.id, { features: updatedFeatures });
      showToast(`Fitur paket ${plan.name} berhasil diperbarui!`, 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memperbarui fitur paket.', 'error');
      await loadData();
    }
  };

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const formatDuration = (days: number) => {
    if (days === 0) return 'Tak Terbatas';
    if (days >= 365) return `${Math.floor(days / 365)} Tahun`;
    if (days >= 30) return `${Math.floor(days / 30)} Bulan`;
    return `${days} Hari`;
  };

  const columns: Column<PricingPlan>[] = [
    {
      key: 'name',
      label: 'Nama Paket',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 700, color: 'rgb(var(--text-primary))' }}>{row.name}</span>
          {row.description && <div style={{ fontSize: '0.72rem', color: 'rgb(var(--text-muted))', marginTop: '0.1rem' }}>{row.description}</div>}
        </div>
      ),
    },
    {
      key: 'price',
      label: 'Harga',
      render: (row) => (
        <span style={{ fontWeight: 700, color: 'rgb(var(--color-secondary))' }}>{formatRupiah(row.price)}</span>
      ),
      exportValue: (row) => row.price,
    },
    {
      key: 'durationDays',
      label: 'Durasi',
      render: (row) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
          <Clock size={12} style={{ color: 'rgb(var(--text-muted))' }} />
          {formatDuration(row.durationDays || 0)}
        </span>
      ),
      exportValue: (row) => formatDuration(row.durationDays || 0),
    },
    {
      key: 'limits',
      label: 'Batasan',
      sortable: false,
      render: (row) => (
        <div style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
          <div>Upload: <b>{row.maxUploadPerMonth}</b>/bln</div>
          <div>File: <b>{row.maxFileSizeMb}</b> MB</div>
          <div>AI: <b>{row.aiRequestLimit}</b> req</div>
        </div>
      ),
      exportValue: (row) => `Upload:${row.maxUploadPerMonth} File:${row.maxFileSizeMb}MB AI:${row.aiRequestLimit}`,
    },
    {
      key: 'features',
      label: 'Fitur',
      sortable: false,
      render: (row) => (
        <span style={{ fontSize: '0.75rem' }}>
          <span style={{ fontWeight: 700, color: 'rgb(var(--color-primary))' }}>{row.features.length}</span>
          <span style={{ color: 'rgb(var(--text-muted))' }}> / {ALL_FEATURES.length} aktif</span>
        </span>
      ),
      exportValue: (row) => row.features.join(', '),
    },
  ];

  // Expanded row to show feature toggles
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  return (
    <AuthGuard requiredRole="SUPERADMIN">
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Manajemen Paket" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          {loading ? (
            <div style={{ minHeight: 'calc(100vh - var(--appbar-height))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="animate-spin" size={48} style={{ color: 'rgb(var(--color-primary))' }} />
            </div>
          ) : (
            <div className="page-content animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'rgb(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Layers size={24} style={{ color: 'rgb(var(--color-secondary))' }} />
                    Paket Berlangganan
                  </h2>
                  <p style={{ color: 'rgb(var(--text-muted))', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Buat, edit, dan kelola paket harga, durasi, serta batasan kuota fitur untuk pengguna.
                  </p>
                </div>
                <Button onClick={() => handleOpenPlanModal(null)}>Buat Paket Baru</Button>
              </div>

              {error && <Alert type="error" message={error} />}

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(var(--text-primary))' }}>{configs.length}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgb(var(--text-muted))' }}>Total Paket</span>
                </Card>
                <Card style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-default)' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(var(--color-primary))' }}>{ALL_FEATURES.length}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgb(var(--text-muted))' }}>Total Fitur</span>
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
                onRowClick={(row) => setExpandedPlanId(expandedPlanId === row.id ? null : row.id)}
                actions={(row) => (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenPlanModal(row); }}>Edit</Button>
                    {row.name !== 'FREE' && row.name !== 'PRO' && (
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeletePlan(row.id, row.name); }} style={{ color: 'rgb(248, 113, 113)' }}>Hapus</Button>
                    )}
                  </div>
                )}
              />

              {/* Feature toggles for expanded plan */}
              {expandedPlanId && (() => {
                const plan = configs.find((c) => c.id === expandedPlanId);
                if (!plan) return null;
                return (
                  <Card style={{ border: '1px solid rgba(var(--color-primary) / 0.15)', background: 'rgba(var(--color-primary) / 0.02)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgb(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                      Fitur Aktif – {plan.name}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {FEATURE_SECTIONS.map((section) => (
                        <div key={section.section}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgb(var(--text-muted))', marginBottom: '0.4rem' }}>{section.section}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                            {section.items.map((feat) => {
                              const isChecked = plan.features.includes(feat.id);
                              return (
                                <label key={feat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.6rem', borderRadius: '6px', background: isChecked ? 'rgba(var(--color-primary) / 0.06)' : 'rgba(var(--bg-elevated) / 0.5)', border: isChecked ? '1px solid rgba(var(--color-primary) / 0.15)' : '1px solid var(--border-subtle)', fontSize: '0.78rem', color: isChecked ? 'rgb(var(--text-primary))' : 'rgb(var(--text-muted))', cursor: 'pointer', transition: 'all 0.15s' }}>
                                  <input type="checkbox" checked={isChecked} onChange={(e) => handleFeatureToggle(plan, feat.id, e.target.checked)} style={{ accentColor: 'rgb(var(--color-primary))', cursor: 'pointer' }} />
                                  <span>{feat.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })()}
            </div>
          )}
        </div>

        {/* Modal Create/Edit Plan */}
        <Modal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} title={editingPlan ? `Edit Paket ${editingPlan.name}` : 'Buat Paket Baru'}>
          <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {planError && <Alert type="error" message={planError} />}

            <TextInput label="Nama Paket" value={planName} onChange={v => setPlanName(v)} disabled={!!editingPlan && (editingPlan.name === 'FREE' || editingPlan.name === 'PRO')} required placeholder="e.g. PRO_PLUS" />
            <TextInput label="Deskripsi" value={planDescription} onChange={v => setPlanDescription(v)} placeholder="Deskripsi singkat paket" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>Harga</label>
                <CurrencyInput value={planPrice.replace(/^Rp\s?/, '')} onChange={(v) => setPlanPrice('Rp ' + v)} required style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>
                  Durasi Berlaku
                </label>
                <SelectOption
                  value={String(DURATION_PRESETS.find((d) => d.days === planDurationDays) ? planDurationDays : 'custom')}
                  onChange={(v) => {
                    if (v !== 'custom') setPlanDurationDays(Number(v));
                  }}
                  options={[
                    ...DURATION_PRESETS.map((d) => ({ value: String(d.days), label: d.label })),
                    { value: 'custom', label: 'Kustom...' },
                  ]}
                />
              </div>
            </div>

            {!DURATION_PRESETS.find((d) => d.days === planDurationDays) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>Durasi Kustom (hari)</label>
                <NumberInput value={String(planDurationDays)} onChange={v => setPlanDurationDays(Number(v))} min={1} />
                <span style={{ fontSize: '0.7rem', color: 'rgb(var(--text-muted))' }}>
                  ≈ {planDurationDays >= 30 ? `${(planDurationDays / 30).toFixed(1)} bulan` : `${planDurationDays} hari`}
                  {planDurationDays >= 365 ? ` (${(planDurationDays / 365).toFixed(1)} tahun)` : ''}
                </span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <NumberInput label="Max Upload / Bulan" value={String(planMaxUpload)} onChange={v => setPlanMaxUpload(Number(v))} min={0} />
              <NumberInput label="Max File Size (MB)" value={String(planMaxSize)} onChange={v => setPlanMaxSize(Number(v))} min={1} />
              <NumberInput label="Kuota AI / Bulan" value={String(planAiLimit)} onChange={v => setPlanAiLimit(Number(v))} min={0} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>Akses Fitur</label>
              {FEATURE_SECTIONS.map((section) => (
                <div key={section.section}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgb(var(--text-muted))', marginBottom: '0.35rem' }}>{section.section}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {section.items.map((feat) => {
                      const isChecked = planFeatures.includes(feat.id);
                      return (
                        <label key={feat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: '6px', background: 'rgba(var(--bg-elevated) / 0.5)', border: '1px solid var(--border-subtle)', fontSize: 'var(--font-xs)', color: 'rgb(var(--text-primary))', cursor: 'pointer' }}>
                          <input type="checkbox" checked={isChecked} onChange={() => setPlanFeatures((prev) => isChecked ? prev.filter((x) => x !== feat.id) : [...prev, feat.id])} style={{ accentColor: 'rgb(var(--color-primary))' }} />
                          <span>{feat.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
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
