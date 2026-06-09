'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useDashboard } from '@/viewmodels/useDashboard';
import { useDeadlines } from '@/viewmodels/useDeadlines';
import { aiService } from '@/services/aiService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Alert, Modal, useToast, useConfirm } from '@/components/ui';
import { Plus, BookOpen, Trash2, Calendar, FileDown, Upload, Loader2, Check, Sparkles, Clock, AlertTriangle } from 'lucide-react';

interface ParsedCourse {
  courseName: string;
  day: string;
  time: string;
  room?: string;
  lecturer?: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { classes, isLoading, error, isCreating, createClass, deleteClass, refetch } = useDashboard();
  const { deadlines, isLoading: deadlinesLoading } = useDeadlines();

  // Layout states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Modal create class state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Schedule parser state
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedCourses, setParsedCourses] = useState<ParsedCourse[]>([]);
  const [createdFromParse, setCreatedFromParse] = useState<Record<string, boolean>>({});

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newClassName.trim()) {
      setCreateError('Nama kelas wajib diisi.');
      return;
    }

    const res = await createClass(newClassName, newClassDesc);
    if (res.success) {
      setNewClassName('');
      setNewClassDesc('');
      setShowCreateModal(false);
    } else {
      setCreateError(res.error || 'Gagal membuat kelas.');
    }
  };

  const handleDeleteClass = async (classId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await confirm({ title: 'Konfirmasi', message: 'Apakah Anda yakin ingin menghapus kelas ini?', confirmText: 'Hapus', variant: 'danger' });
    if (!ok) return;
    await deleteClass(classId);
  };

  // Schedule upload & parse handler
  const handleScheduleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);
    setParsedCourses([]);

    try {
      const result = await aiService.parseSchedule(file);
      setParsedCourses(result);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Gagal mengurai gambar jadwal kuliah.');
    } finally {
      setIsParsing(false);
    }
  };

  // Create class directly from parsed schedule
  const handleCreateFromParse = async (course: ParsedCourse) => {
    const key = `${course.courseName}-${course.day}`;
    if (createdFromParse[key]) return;

    try {
      const description = `Jadwal: ${course.day}, ${course.time}. Ruang: ${course.room || '-'}. Dosen: ${course.lecturer || '-'}`;
      const res = await createClass(course.courseName, description, {
        lecturer: course.lecturer,
        day: course.day,
        time: course.time,
        room: course.room,
      });
      if (res.success) {
        setCreatedFromParse((prev) => ({ ...prev, [key]: true }));
        showToast(`Kelas ${course.courseName} berhasil dibuat dari jadwal!`, 'success');
      } else {
        showToast(res.error || 'Gagal membuat kelas.', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat membuat kelas.', 'error');
    }
  };

  return (
    <AuthGuard>
      <div className="app-shell">
        {/* Collapsible Sidebar */}
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

        {/* Main Content Area */}
        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Dashboard Mahasiswa" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          <div className="page-content page-transition">
            {/* Welcome banner */}
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 600 }}>
                  Selamat Datang, {user?.fullName}!
                </h2>
                <span className={`badge ${user?.plan === 'PRO' ? 'badge-pro' : 'badge-free'}`}>
                  Paket {user?.plan}
                </span>
              </div>
              <p style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)', marginTop: '0.25rem' }}>
                Kelola perkuliahan Anda secara otomatis dan pelajari materi kuliah lebih cepat dengan kecerdasan AI.
              </p>
            </div>

            {error && (
              <div style={{ marginBottom: '2rem' }}>
                <Alert type="error" message={error} />
              </div>
            )}

            {/* Dashboard Sections Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
                gap: '2rem',
                alignItems: 'start',
              }}
            >
              {/* Left Column: Classes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BookOpen size={18} style={{ color: 'rgb(var(--color-primary))' }} />
                    Kelas Saya
                  </h3>
                  <Button size="sm" onClick={() => setShowCreateModal(true)} leftIcon={<Plus size={16} />}>
                    Buat Kelas
                  </Button>
                </div>

                {isLoading ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="skeleton" style={{ height: '160px', borderRadius: 'var(--radius-lg)' }} />
                    ))}
                  </div>
                ) : classes.length === 0 ? (
                  <Card style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                    <BookOpen size={36} style={{ color: 'rgb(var(--text-muted))', marginBottom: '0.75rem', opacity: 0.3 }} />
                    <p style={{ color: 'rgb(var(--text-muted))', fontWeight: 500, fontSize: 'var(--font-sm)', marginBottom: '1rem' }}>
                      Anda belum bergabung atau membuat kelas apa pun.
                    </p>
                    <Button onClick={() => setShowCreateModal(true)} leftIcon={<Plus size={16} />}>
                      Mulai Buat Kelas Pertama
                    </Button>
                  </Card>
                ) : (
                  <div
                    className="stagger-enter"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '1.25rem',
                    }}
                  >
                    {classes.map((cls) => (
                      <Link key={cls.id} href={`/class/${cls.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                        <Card
                          hoverable
                          style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            position: 'relative',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                              <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>
                                {cls.name}
                              </h4>
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '6px',
                                  background: cls.memberRole === 'OWNER' ? 'rgba(var(--color-primary) / 0.12)' : 'var(--input-bg)',
                                  color: cls.memberRole === 'OWNER' ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))',
                                  fontWeight: 600,
                                }}
                              >
                                {cls.memberRole}
                              </span>
                            </div>
                            <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', lineBreak: 'anywhere', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.6rem', marginBottom: '0.5rem' }}>
                              {cls.description || 'Tidak ada deskripsi.'}
                            </p>
                            {(cls.lecturer || cls.day || cls.room) && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginBottom: '0.5rem' }}>
                                {cls.lecturer && <span>👨‍🏫 {cls.lecturer}</span>}
                                {cls.day && cls.time && <span>📅 {cls.day}, {cls.time}</span>}
                                {cls.room && <span>🏫 Ruang {cls.room}</span>}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.6rem', borderTop: '1px solid var(--border-default)' }}>
                            <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                              16 Pertemuan
                            </span>
                            {cls.memberRole === 'OWNER' && (
                              <button
                                onClick={(e) => handleDeleteClass(cls.id, e)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'rgb(var(--color-error))',
                                  opacity: 0.5,
                                  padding: '0.25rem',
                                  borderRadius: '6px',
                                  transition: 'var(--transition-smooth)',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Deadlines & AI Parser */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Deadline Command Center */}
                <div>
                  <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                    <Clock size={18} style={{ color: 'rgb(var(--color-error, 239 68 68))' }} />
                    Deadline Command Center
                  </h3>
                  <Card style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
                    <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                      Tugas aktif mendatang dari seluruh kelas terdaftar.
                    </p>
                    {deadlinesLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><Loader2 className="animate-spin text-indigo-600" size={16} /></div>
                    ) : deadlines.length === 0 ? (
                      <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', textAlign: 'center', padding: '1rem 0' }}>🎉 Hore! Belum ada tugas mendesak.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
                        {deadlines.map((dl) => {
                          const date = new Date(dl.deadline!);
                          const diff = date.getTime() - new Date().getTime();
                          const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                          const isUrg = days <= 2;
                          
                          return (
                            <Link key={dl.id} href={`/class/${dl.classId}`} style={{ textDecoration: 'none' }}>
                              <div style={{
                                padding: '0.6rem',
                                background: isUrg ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                                border: isUrg ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(16, 185, 129, 0.15)',
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.2s',
                              }}>
                                <div>
                                  <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-primary))', display: 'block' }}>{dl.title}</span>
                                  <span style={{ fontSize: '0.65rem', color: 'rgb(var(--text-muted))', display: 'block' }}>Kelas: {dl.class?.name}</span>
                                </div>
                                <span style={{
                                  fontSize: '0.65rem',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  background: isUrg ? '#ef4444' : '#10b981',
                                  color: '#fff',
                                  fontWeight: 700,
                                }}>
                                  {days <= 0 ? 'Due' : `${days} Hari`}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </div>

                {/* AI Schedule Parser */}
                <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={18} style={{ color: 'rgb(var(--color-secondary))' }} />
                  AI Schedule Parser
                </h3>

                <Card style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>
                    Unggah foto jadwal kuliah Anda atau tangkapan layar SIAKAD. AI Gemini akan mengekstrak jadwal tersebut ke dalam data kelas terstruktur.
                  </p>

                  {!user?.pricingPlan?.features.includes('schedule_parser') ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: 'var(--input-bg)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-default)' }}>
                      <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: '0.75rem' }}>
                        AI Schedule Parser tidak tersedia di paket Anda.
                      </p>
                      <Link href="/billing">
                        <Button size="sm">Tingkatkan Paket</Button>
                      </Link>
                    </div>
                  ) : (
                    <label
                      style={{
                        border: '2px dashed rgba(var(--color-primary) / 0.15)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.5rem 1rem',
                        textAlign: 'center',
                        cursor: isParsing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'rgba(var(--color-primary) / 0.02)',
                        transition: 'border-color 0.25s',
                      }}
                      onMouseEnter={(e) => !isParsing && (e.currentTarget.style.borderColor = 'rgba(var(--color-primary) / 0.4)')}
                      onMouseLeave={(e) => !isParsing && (e.currentTarget.style.borderColor = 'rgba(var(--color-primary) / 0.15)')}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScheduleUpload}
                        disabled={isParsing}
                        style={{ display: 'none' }}
                      />
                      {isParsing ? (
                        <>
                          <Loader2 className="animate-spin" size={28} style={{ color: 'rgb(var(--color-primary))' }} />
                          <span style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--color-primary))', fontWeight: 500 }}>
                            AI sedang membaca jadwal...
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload size={28} style={{ color: 'rgb(var(--text-muted))' }} />
                          <span style={{ fontSize: 'var(--font-sm)', fontWeight: 500, color: 'rgb(var(--text-primary))' }}>
                            Pilih / Seret Gambar Jadwal
                          </span>
                          <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                            Format gambar (PNG, JPG)
                          </span>
                        </>
                      )}
                    </label>
                  )}

                  {parseError && <Alert type="error" message={parseError} />}

                  {/* Parsed courses list */}
                  {parsedCourses.length > 0 && (
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 600, borderBottom: '1px solid var(--border-default)', paddingBottom: '0.4rem' }}>
                        Jadwal yang Berhasil Diekstrak:
                      </h4>
                      <div
                        style={{
                          maxHeight: '300px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          paddingRight: '0.25rem',
                        }}
                      >
                        {parsedCourses.map((course, idx) => {
                          const key = `${course.courseName}-${course.day}`;
                          const isCreated = createdFromParse[key];

                          return (
                            <div
                              key={idx}
                              style={{
                                padding: '0.6rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--input-bg)',
                                border: '1px solid var(--border-default)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '0.75rem',
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h5 style={{ fontSize: 'var(--font-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {course.courseName}
                                </h5>
                                <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-secondary))', marginTop: '0.125rem' }}>
                                  📅 {course.day}, ⏰ {course.time}
                                </p>
                                <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                                  Ruang: {course.room || '-'} • Dosen: {course.lecturer || '-'}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant={isCreated ? 'ghost' : 'primary'}
                                disabled={isCreated || isCreating}
                                onClick={() => handleCreateFromParse(course)}
                                style={{ flexShrink: 0, padding: '0.35rem 0.65rem' }}
                              >
                                {isCreated ? <Check size={14} style={{ color: 'rgb(var(--color-success))' }} /> : <Plus size={14} />}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Buat Kelas */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Buat Kelas Baru">
          <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {createError && <Alert type="error" message={createError} />}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label htmlFor="className" style={{ fontSize: 'var(--font-sm)', fontWeight: 500, color: 'rgb(var(--text-primary))' }}>
                Nama Kelas / Mata Kuliah
              </label>
              <input
                id="className"
                className="themed-input"
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Matematika Ekonomi"
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label htmlFor="classDesc" style={{ fontSize: 'var(--font-sm)', fontWeight: 500, color: 'rgb(var(--text-primary))' }}>
                Deskripsi (Opsional)
              </label>
              <textarea
                id="classDesc"
                className="themed-textarea"
                rows={3}
                value={newClassDesc}
                onChange={(e) => setNewClassDesc(e.target.value)}
                placeholder="Deskripsi singkat mengenai kelas ini"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>
                Batal
              </Button>
              <Button type="submit" isLoading={isCreating}>
                Buat
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AuthGuard>
  );
}
