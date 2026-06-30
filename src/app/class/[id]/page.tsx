'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useClassDetail } from '@/viewmodels/useClassDetail';
import { classService } from '@/services/classService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button, useToast } from '@/components/ui';
import { useFeatureAccess } from '@/lib/feature-access';
import dynamic from 'next/dynamic';

import {
  Loader2,
  Share2,
  Pencil,
  MessagesSquare,
  BookOpen,
  Info,
  ClipboardList,
  Wallet,
  Users,
  ChevronDown,
  Target,
} from 'lucide-react';

// Lazy-loaded tab components — only loaded when active
const ForumTab = dynamic(() => import('@/components/ForumTab').then(m => ({ default: m.ForumTab })), { ssr: false, loading: () => <TabLoader /> });
const PertemuanTab = dynamic(() => import('@/components/PertemuanTab').then(m => ({ default: m.PertemuanTab })), { ssr: false, loading: () => <TabLoader /> });
const KolektifTab = dynamic(() => import('@/components/KolektifTab').then(m => ({ default: m.KolektifTab })), { ssr: false, loading: () => <TabLoader /> });
const TugasTab = dynamic(() => import('@/components/TugasTab').then(m => ({ default: m.TugasTab })), { ssr: false, loading: () => <TabLoader /> });
const KelompokTab = dynamic(() => import('@/components/KelompokTab').then(m => ({ default: m.KelompokTab })), { ssr: false, loading: () => <TabLoader /> });
const PrediksiUjianTab = dynamic(() => import('@/components/PrediksiUjianTab').then(m => ({ default: m.PrediksiUjianTab })), { ssr: false, loading: () => <TabLoader /> });
const ClassInfoTab = dynamic(() => import('@/components/class/ClassInfoTab').then(m => ({ default: m.ClassInfoTab })), { ssr: false, loading: () => <TabLoader /> });
const ClassEditModal = dynamic(() => import('@/components/class/ClassModals').then(m => ({ default: m.ClassEditModal })), { ssr: false });
const ClassShareModal = dynamic(() => import('@/components/class/ClassModals').then(m => ({ default: m.ClassShareModal })), { ssr: false });

function TabLoader() {
  return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem 0', color: 'rgb(var(--text-muted))' }}><Loader2 size={24} className="spin" /> </div>;
}

// Feature tabs config — moved outside component to avoid re-creation
const FEATURES = [
  { id: 'forum' as const, label: 'Forum', icon: MessagesSquare, featureKey: 'forum' },
  { id: 'pertemuan' as const, label: 'Pertemuan', icon: BookOpen, featureKey: 'class_sessions' },
  { id: 'tugas' as const, label: 'Tugas', icon: ClipboardList, featureKey: 'task' },
  { id: 'kolektif' as const, label: 'Kas', icon: Wallet, featureKey: 'kolektif' },
  { id: 'kelompok' as const, label: 'Kelompok', icon: Users, featureKey: 'group' },
  { id: 'prediksi' as const, label: 'Prediksi Ujian', icon: Target, featureKey: 'exam_prediction' },
  { id: 'info' as const, label: 'Info Kelas', icon: Info, featureKey: null },
] as const;

type FeatureType = typeof FEATURES[number]['id'];
const validFeatures: string[] = FEATURES.map(f => f.id);

interface ClassDetailPageProps {
  params: { id: string };
}

export default function ClassDetailPage({ params }: ClassDetailPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { hasFeature } = useFeatureAccess();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    classData,
    setClassData,
    sessions,
    selectedSession,
    setSelectedSession,
    isLoading,
    isUploading,
    uploadedMaterials,
    uploadMaterial,
    quizzes,
    sessionDetailsLoading,
    refetchSessionDetails,
    createSession,
    updateSession,
    deleteSession,
    reorderSession,
  } = useClassDetail(params.id);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // URL-based feature tab
  const urlTab = searchParams.get('tab') as FeatureType | null;
  const activeFeature: FeatureType = urlTab && validFeatures.includes(urlTab) ? urlTab : 'forum';

  const setActiveFeature = useCallback((feat: FeatureType) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', feat);
    if (feat !== 'pertemuan') {
      p.delete('session');
      p.delete('subtab');
    }
    router.replace(`?${p.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // URL-based session selection for pertemuan tab
  const urlSessionId = searchParams.get('session');
  useEffect(() => {
    if (activeFeature === 'pertemuan' && sessions.length > 0 && urlSessionId) {
      const sess = sessions.find(s => s.id === urlSessionId);
      if (sess && selectedSession?.id !== sess.id) {
        setSelectedSession(sess);
      }
    }
  }, [activeFeature, urlSessionId, sessions]);

  const handleSetSelectedSession = useCallback((sess: any) => {
    setSelectedSession(sess);
    if (sess) {
      const p = new URLSearchParams(searchParams.toString());
      p.set('session', sess.id);
      router.replace(`?${p.toString()}`, { scroll: false });
    }
  }, [router, searchParams, setSelectedSession]);

  // URL-based sub-tab
  const urlSubTab = searchParams.get('subtab');
  const urlTaskId = searchParams.get('taskId');
  const urlGroupId = searchParams.get('groupId');
  const handleSetSubTab = useCallback((sub: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('subtab', sub);
    router.replace(`?${p.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Modal state
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Class info expanded
  const [showClassInfo, setShowClassInfo] = useState(false);

  const hasQuizFeature = hasFeature('quiz');

  // Class members — shared between Info tab and ForumTab to avoid duplicate fetches
  const [classMembers, setClassMembers] = useState<any[]>([]);
  const [classRoles, setClassRoles] = useState<any[]>([]);
  const [classTasks, setClassTasks] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (classData?.id) {
      classService.getClassMembers(classData.id).then(setClassMembers).catch(() => {});
      classService.getClassRoles(classData.id).then(setClassRoles).catch(() => {});
      import('@/services/taskService').then(({ taskService }) => {
        taskService.getClassTasks(classData.id).then((t) => setClassTasks((t || []).map((x: any) => ({ id: x.id, title: x.title })))).catch(() => {});
      });
    }
  }, [classData?.id]);

  // Filter features by plan — memoized
  const availableFeatures = useMemo(() =>
    FEATURES.filter(f => !f.featureKey || hasFeature(f.featureKey)),
    [hasFeature]
  );

  return (
    <AuthGuard requiredFeature="class">
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} style={{ paddingTop: 0, overflowX: 'hidden' }}>

          {isLoading ? (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="animate-spin" size={32} style={{ color: 'rgb(var(--color-primary))' }} />
            </div>
          ) : (
            <div className="class-page-container" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: '100vw', overflow: 'hidden' }}>
              {/* Class header bar */}
              <div className="class-header-bar" style={{
                padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-default)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
                background: 'rgb(var(--bg-surface))',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                  <button onClick={() => router.push('/classes')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: '0.2rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }} title="Kembali ke Daftar Kelas">
                    <ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} />
                  </button>
                  <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'rgb(var(--text-primary))', margin: 0 }}>
                    {classData?.name}
                  </h2>
                  <button onClick={() => setShowClassInfo((p) => !p)} title="Info kelas" style={{
                    background: showClassInfo ? 'rgba(var(--color-primary) / 0.08)' : 'none', border: 'none', cursor: 'pointer',
                    color: showClassInfo ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))', padding: '0.2rem', borderRadius: '4px',
                  }}>
                    <Info size={15} />
                  </button>
                </div>
                <div className="class-header-actions" style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <Button variant="ghost" size="sm" leftIcon={<Share2 size={13} />} onClick={() => setShowShareModal(true)}><span>Bagikan</span></Button>
                  {(classData?.memberRole === 'OWNER' || classData?.memberRole === 'ADMIN') && hasFeature('class_settings') && (
                    <Button variant="ghost" size="sm" leftIcon={<Pencil size={13} />} onClick={() => setShowEditClassModal(true)}><span>Edit</span></Button>
                  )}
                </div>
              </div>

              {/* Class info dropdown */}
              {showClassInfo && (
                <div className="class-info-bar" style={{
                  padding: '0.5rem 1.25rem', borderBottom: '1px solid var(--border-default)',
                  fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))',
                  background: 'rgba(var(--color-primary) / 0.02)', flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    {classData?.lecturer && <span>👨‍🏫 <strong style={{ color: 'rgb(var(--text-primary))' }}>{classData.lecturer}</strong></span>}
                    {classData?.day && classData?.time && <span>📅 {classData.day}, {classData.time}</span>}
                    {classData?.room && <span>🏫 {classData.room}</span>}
                    {classData?.description && <span style={{ width: '100%', opacity: 0.7 }}>{classData.description}</span>}
                    {!classData?.lecturer && !classData?.day && !classData?.room && (
                      <span style={{ opacity: 0.5 }}>Belum ada info kelas. {classData?.memberRole === 'OWNER' && 'Klik Edit untuk menambahkan.'}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Feature tabs */}
              <div className="class-feature-tabs" style={{
                display: 'flex', gap: '0', borderBottom: '1px solid var(--border-default)', flexShrink: 0,
                background: 'rgb(var(--bg-surface))', paddingLeft: '0.75rem',
                overflowX: 'auto', scrollbarWidth: 'none',
              }}>
                {availableFeatures.map((feat) => {
                  const isActive = activeFeature === feat.id;
                  const Icon = feat.icon;
                  return (
                    <button key={feat.id} onClick={() => setActiveFeature(feat.id)} style={{
                      padding: '0.55rem 1rem', background: 'none', border: 'none',
                      borderBottom: isActive ? '2px solid rgb(var(--color-primary))' : '2px solid transparent',
                      color: isActive ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))',
                      cursor: 'pointer', fontWeight: isActive ? 600 : 400, fontSize: 'var(--font-sm)',
                      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.35rem',
                      transition: 'var(--transition-fast)', whiteSpace: 'nowrap',
                    }}>
                      <Icon size={14} /> {feat.label}
                    </button>
                  );
                })}
              </div>

              {/* Feature content */}
              <div className="class-feature-content" style={{ flex: 1, minHeight: 0, overflow: activeFeature === 'forum' ? 'hidden' : 'auto', overflowX: 'hidden' }}>
                {activeFeature === 'forum' && classData && user && (
                  <ForumTab classId={classData.id} userId={user.id} memberRole={classData.memberRole} permissions={classData.permissions} sessions={sessions} tasks={classTasks} classMembers={classMembers} onNavigate={(tab, params) => {
                    const p = new URLSearchParams(searchParams.toString());
                    p.set('tab', tab);
                    if (params) {
                      Object.entries(params).forEach(([k, v]) => p.set(k, v));
                    }
                    router.replace(`?${p.toString()}`, { scroll: false });
                  }} />
                )}

                {activeFeature === 'pertemuan' && (
                  <div style={{ padding: '1.25rem' }}>
                    <PertemuanTab
                      classData={classData}
                      sessions={sessions}
                      selectedSession={selectedSession}
                      setSelectedSession={handleSetSelectedSession}
                      uploadedMaterials={uploadedMaterials}
                      isUploading={isUploading}
                      uploadMaterial={uploadMaterial}
                      quizzes={quizzes}
                      sessionDetailsLoading={sessionDetailsLoading}
                      refetchSessionDetails={refetchSessionDetails}
                      hasQuizFeature={hasQuizFeature}
                      createSession={createSession}
                      updateSession={updateSession}
                      deleteSession={deleteSession}
                      reorderSession={reorderSession}
                      urlSubTab={urlSubTab || undefined}
                      onSubTabChange={handleSetSubTab}
                    />
                  </div>
                )}

                {activeFeature === 'tugas' && classData && (
                  <div style={{ padding: '1.25rem' }}>
                    <TugasTab classId={classData.id} memberRole={classData.memberRole} permissions={classData.permissions} urlTaskId={urlTaskId || undefined} onTaskSelect={(taskId) => {
                      const p = new URLSearchParams(searchParams.toString());
                      if (taskId) p.set('taskId', taskId); else p.delete('taskId');
                      router.replace(`?${p.toString()}`, { scroll: false });
                    }} />
                  </div>
                )}

                {activeFeature === 'kolektif' && classData && (
                  <div style={{ padding: '1.25rem' }}>
                    <KolektifTab classId={classData.id} memberRole={classData.memberRole} permissions={classData.permissions} />
                  </div>
                )}

                {activeFeature === 'kelompok' && classData && user && (
                  <div style={{ padding: '1.25rem' }}>
                    <KelompokTab classId={classData.id} memberRole={classData.memberRole} permissions={classData.permissions} userId={user.id} classMembers={classMembers} urlGroupId={urlGroupId || undefined} onGroupSelect={(groupId) => {
                      const p = new URLSearchParams(searchParams.toString());
                      if (groupId) p.set('groupId', groupId); else p.delete('groupId');
                      router.replace(`?${p.toString()}`, { scroll: false });
                    }} />
                  </div>
                )}

                {activeFeature === 'prediksi' && classData && (
                  <div style={{ padding: '1.25rem' }}>
                    <PrediksiUjianTab classId={classData.id} memberRole={classData.memberRole} permissions={classData.permissions} />
                  </div>
                )}

                {activeFeature === 'info' && classData && user && (
                  <ClassInfoTab
                    classData={classData}
                    setClassData={setClassData}
                    classMembers={classMembers}
                    setClassMembers={setClassMembers}
                    classRoles={classRoles}
                    setClassRoles={setClassRoles}
                    userId={user.id}
                    onEditClass={() => setShowEditClassModal(true)}
                    onShareClass={() => setShowShareModal(true)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals — lazy loaded, only mount when needed */}
      {showEditClassModal && <ClassEditModal isOpen={showEditClassModal} onClose={() => setShowEditClassModal(false)} classData={classData} />}
      {showShareModal && <ClassShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} classData={classData} />}
    </AuthGuard>
  );
}
