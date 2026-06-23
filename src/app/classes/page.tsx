'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useDashboard } from '@/viewmodels/useDashboard';
import { classService } from '@/services/classService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Alert, Modal, useToast, PasswordInput, TextInput, TextArea } from '@/components/ui';
import { Plus, BookOpen, Search, ChevronRight, LogIn, Calendar, MapPin, GraduationCap } from 'lucide-react';

export default function ClassesPage() {
  const { user } = useAuth();
  const { classes, isLoading, error, isCreating, createClass } = useDashboard();
  const { showToast } = useToast();
  const router = useRouter();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newClassName.trim()) { setCreateError('Nama kelas-nya diisi dulu dong!'); return; }
    const res = await createClass(newClassName, newClassDesc);
    if (res.success) { setNewClassName(''); setNewClassDesc(''); setShowCreateModal(false); }
    else { setCreateError(res.error || 'Gagal bikin kelas nih.'); }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsJoining(true);
    setJoinError(null);
    try {
      // The code is the first 8 chars of the class ID (uppercase), resolve full ID
      const code = joinCode.trim();
      // Use join-by-code endpoint that resolves code → UUID internally
      const res = await classService.joinByCode(code, joinPassword || undefined);
      showToast(res.message || 'Berhasil join kelas! 🎉', 'success');
      setShowJoinModal(false);
      setJoinCode('');
      setJoinPassword('');
      // Redirect to class page
      if (res.classId) router.push(`/class/${res.classId}`);
      else window.location.reload();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Gagal join. Cek lagi kode kelas-nya ya!');
    } finally {
      setIsJoining(false);
    }
  };

  const filteredClasses = classes.filter(
    (cls) =>
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cls.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AuthGuard requiredFeature="class">
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Kelas Saya" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          <div className="page-content page-transition">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 600 }}>Kelas Kuliah</h2>
                <p style={{ fontSize: 'var(--font-sm)', marginTop: '0.2rem' }}>
                  Atur materi, rangkuman, dan kuis buat tiap kelas.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button size="sm" variant="ghost" onClick={() => setShowJoinModal(true)} leftIcon={<LogIn size={15} />}>
                  Gabung
                </Button>
                <Button size="sm" onClick={() => setShowCreateModal(true)} leftIcon={<Plus size={15} />}>
                  Buat Kelas
                </Button>
              </div>
            </div>

            {error && <div style={{ marginBottom: '1rem' }}><Alert type="error" message={error} /></div>}

            {/* Search */}
            <div style={{ marginBottom: '1.25rem', maxWidth: 360 }}>
              <TextInput placeholder="Cari kelas..." value={searchQuery} onChange={setSearchQuery} leftIcon={<Search size={15} />} />
            </div>

            {/* Grid */}
            {isLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {[1, 2, 3].map((n) => (
                  <div key={n} className="skeleton" style={{ height: '140px', borderRadius: 'var(--radius-lg)' }} />
                ))}
              </div>
            ) : filteredClasses.length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <BookOpen size={40} style={{ color: 'rgb(var(--text-muted))', marginBottom: '0.75rem', opacity: 0.4 }} />
                <h4 style={{ fontSize: 'var(--font-md)', marginBottom: '0.3rem' }}>
                  {searchQuery ? 'Kelas gak ketemu nih' : 'Belum ada kelas'}
                </h4>
                <p style={{ fontSize: 'var(--font-sm)', marginBottom: '1.25rem' }}>
                  {searchQuery ? `Gak ada kelas yang cocok sama "${searchQuery}".` : 'Bikin kelas baru yuk buat mulai ngatur materi kuliah!'}
                </p>
                {!searchQuery && <Button size="sm" onClick={() => setShowCreateModal(true)} leftIcon={<Plus size={14} />}>Bikin Kelas</Button>}
              </Card>
            ) : (
              <div className="stagger-enter classes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {filteredClasses.map((cls, idx) => {
                  const gradients = [
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
                    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                    'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
                  ];
                  const gradient = gradients[idx % gradients.length];
                  const initial = cls.name.charAt(0).toUpperCase();

                  return (
                    <Link key={cls.id} href={`/class/${cls.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                      <div
                        style={{
                          borderRadius: 'var(--radius-xl)',
                          overflow: 'hidden',
                          border: '1px solid var(--border-default)',
                          background: 'rgb(var(--bg-surface))',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {/* Gradient Header */}
                        <div style={{
                          background: gradient,
                          padding: '1.25rem 1.25rem 1rem',
                          position: 'relative',
                          overflow: 'hidden',
                        }}>
                          {/* Decorative circles */}
                          <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
                          <div style={{ position: 'absolute', bottom: -15, right: 40, width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 style={{
                                fontSize: 'var(--font-md)',
                                fontWeight: 700,
                                color: '#fff',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                marginBottom: '0.25rem',
                              }}>
                                {cls.name}
                              </h4>
                              {cls.description && (
                                <p style={{
                                  fontSize: 'var(--font-xs)',
                                  color: 'rgba(255,255,255,0.85)',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  margin: 0,
                                }}>
                                  {cls.description}
                                </p>
                              )}
                            </div>
                            <div style={{
                              width: 36, height: 36, borderRadius: 'var(--radius-md)',
                              background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 'var(--font-md)', fontWeight: 800, color: '#fff',
                              flexShrink: 0,
                            }}>
                              {initial}
                            </div>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div style={{ padding: '0.85rem 1.25rem 1rem' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            {cls.lecturer && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: 'var(--font-xs)', color: 'rgb(var(--text-secondary))', background: 'var(--input-bg)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                                <GraduationCap size={11} /> {cls.lecturer}
                              </span>
                            )}
                            {cls.day && cls.time && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: 'var(--font-xs)', color: 'rgb(var(--text-secondary))', background: 'var(--input-bg)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                                <Calendar size={11} /> {cls.day}, {cls.time}
                              </span>
                            )}
                            {cls.room && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: 'var(--font-xs)', color: 'rgb(var(--text-secondary))', background: 'var(--input-bg)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                                <MapPin size={11} /> {cls.room}
                              </span>
                            )}
                          </div>

                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{
                                fontSize: '0.6rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: 'var(--radius-sm)',
                                background: cls.memberRole === 'OWNER'
                                  ? 'rgba(var(--color-warning) / 0.1)'
                                  : 'rgba(var(--color-primary) / 0.08)',
                                color: cls.memberRole === 'OWNER'
                                  ? 'rgb(var(--color-warning))'
                                  : 'rgb(var(--color-primary))',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em',
                              }}>
                                {cls.memberRole === 'OWNER' ? 'Pemilik' : 'Anggota'}
                              </span>
                              <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <BookOpen size={11} /> Pertemuan
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <ChevronRight size={14} style={{ color: 'rgb(var(--text-muted))' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Buat Kelas Baru">
          <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {createError && <Alert type="error" message={createError} />}

            <TextInput label="Nama Kelas" value={newClassName} onChange={setNewClassName} placeholder="Contoh: Matematika Ekonomi" required />

            <TextArea label="Deskripsi (Opsional)" rows={3} value={newClassDesc} onChange={setNewClassDesc} placeholder="Deskripsi singkat kelas ini" />

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>Gak Jadi</Button>
              <Button type="submit" size="sm" isLoading={isCreating}>Bikin</Button>
            </div>
          </form>
        </Modal>

        {/* Join by Code Modal */}
        <Modal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} title="Gabung ke Kelas" size="sm">
          <form onSubmit={handleJoinByCode} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {joinError && <Alert type="error" message={joinError} />}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 500, color: 'rgb(var(--text-primary))' }}>Kode Kelas</label>
              <TextInput
                label="Kode Kelas"
                value={joinCode}
                onChange={(v) => setJoinCode(v.toUpperCase())}
                placeholder="Masukkan kode kelas (8 karakter)"
                required
                maxLength={8}
              />
              <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', margin: 0 }}>
                Minta kode kelas dari yang punya kelas ya.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: 'var(--font-sm)', fontWeight: 500, color: 'rgb(var(--text-primary))' }}>Password (Jika Diperlukan)</label>
              <PasswordInput
                value={joinPassword}
                onChange={setJoinPassword}
                placeholder="Kosongkan jika kelas publik"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowJoinModal(false)}>Gak Jadi</Button>
              <Button type="submit" size="sm" isLoading={isJoining} leftIcon={<LogIn size={13} />}>Gabung</Button>
            </div>
          </form>
        </Modal>
      </div>
    </AuthGuard>
  );
}
