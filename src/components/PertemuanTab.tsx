'use client';

import React, { useState, useEffect } from 'react';
import { Session, Class } from '@/models/Class';
import { Material } from '@/models/File';
import { aiService } from '@/services/aiService';
import { classService } from '@/services/classService';
import { Card, Button, Alert, Modal, useToast, useConfirm, MarkdownRenderer, TextInput, SelectOption } from '@/components/ui';
import { useFeatureAccess } from '@/lib/feature-access';
import { useAiJob } from '@/lib/useAiJob';
import { TugasTab } from '@/components/TugasTab';
import {
  Upload, FileText, Music, CheckCircle2, XCircle, Loader2, Sparkles, Download,
  Layers, Eye, Trash2, Search, ChevronRight, HelpCircle, Play, RotateCcw,
  Plus, BookOpen, ChevronLeft, Settings,
  Pencil, ChevronUp, ChevronDown,
} from 'lucide-react';

interface PertemuanTabProps {
  classData: Class | null;
  sessions: Session[];
  selectedSession: Session | null;
  setSelectedSession: (s: Session | null) => void;
  uploadedMaterials: Material[];
  isUploading: boolean;
  uploadMaterial: (file: File) => Promise<any>;
  quizzes: any[];
  sessionDetailsLoading: boolean;
  refetchSessionDetails: () => void;
  hasQuizFeature: boolean;
  createSession?: (title?: string) => Promise<any>;
  updateSession?: (id: string, title: string) => Promise<any>;
  deleteSession?: (id: string) => Promise<any>;
  reorderSession?: (id: string, newSeq: number) => Promise<any>;
  urlSubTab?: string;
  onSubTabChange?: (sub: string) => void;
}

export function PertemuanTab({
  classData, sessions, selectedSession, setSelectedSession,
  uploadedMaterials, isUploading, uploadMaterial, quizzes,
  sessionDetailsLoading, refetchSessionDetails, hasQuizFeature,
  createSession, updateSession, deleteSession, reorderSession,
  urlSubTab, onSubTabChange,
}: PertemuanTabProps) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { hasFeature } = useFeatureAccess();

  const hasPerm = (perm: string) => classData?.memberRole === 'OWNER' || (classData?.permissions || []).includes(perm);
  const canSession = hasPerm('MANAGE_SESSIONS');
  const canUpload = hasPerm('MATERIAL_UPLOAD');
  const canDeleteMaterial = hasPerm('MATERIAL_DELETE');

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isMergingDocs, setIsMergingDocs] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ materialName: string; matches: { text: string; lineIdx: number }[] }[]>([]);
  
  const validSubTabs = ['materi', 'digitalisasi', 'kuis', 'tugas', 'pengaturan'] as const;
  type SubTabType = typeof validSubTabs[number];
  const subTab: SubTabType = urlSubTab && validSubTabs.includes(urlSubTab as SubTabType) ? (urlSubTab as SubTabType) : 'materi';
  const setSubTab = (tab: SubTabType) => {
    if (onSubTabChange) onSubTabChange(tab);
  };

  // Session local modal state
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionModalMode, setSessionModalMode] = useState<'create' | 'rename'>('create');
  const [sessionModalValue, setSessionModalValue] = useState('');
  const [editingSessionForModal, setEditingSessionForModal] = useState<Session | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Read mode (full-screen digitization view)
  const [readModeContent, setReadModeContent] = useState<string | null>(null);

  // Mobile detection for pertemuan layout
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleAddSession = () => {
    if (!createSession) return;
    setSessionModalMode('create');
    setSessionModalValue('');
    setShowSessionModal(true);
  };

  const handleRenameSession = (sess: Session) => {
    if (!updateSession) return;
    setSessionModalMode('rename');
    setEditingSessionForModal(sess);
    setSessionModalValue(sess.title);
    setShowSessionModal(true);
  };

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingSession(true);
    try {
    if (sessionModalMode === 'create') {
      if (!createSession) return;
      const res = await createSession(sessionModalValue.trim() || undefined);
      if (res.success) {
        showToast('Pertemuan berhasil ditambahkan.', 'success');
        setShowSessionModal(false);
      } else {
        showToast(res.error || 'Gagal menambahkan pertemuan.', 'error');
      }
    } else {
      if (!updateSession || !editingSessionForModal) return;
      const titleVal = sessionModalValue.trim();
      if (!titleVal) {
        showToast('Nama pertemuan tidak boleh kosong.', 'error');
        return;
      }
      const res = await updateSession(editingSessionForModal.id, titleVal);
      if (res.success) {
        showToast('Pertemuan berhasil diperbarui.', 'success');
        setShowSessionModal(false);
      } else {
        showToast(res.error || 'Gagal memperbarui pertemuan.', 'error');
      }
    }
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!deleteSession) return;
    const ok = await confirm({ title: 'Hapus Pertemuan', message: 'Apakah Anda yakin ingin menghapus pertemuan ini? Semua materi di dalamnya akan ikut terhapus.', confirmText: 'Hapus', variant: 'danger' });
    if (!ok) return;
    const res = await deleteSession(id);
    if (res.success) {
      showToast('Pertemuan berhasil dihapus.', 'success');
    } else {
      showToast(res.error || 'Gagal menghapus pertemuan.', 'error');
    }
  };

  const handleReorderSession = async (id: string, newSeq: number) => {
    if (!reorderSession) return;
    const res = await reorderSession(id, newSeq);
    if (res.success) {
      showToast('Urutan pertemuan berhasil diperbarui.', 'success');
    } else {
      showToast(res.error || 'Gagal mengubah urutan.', 'error');
    }
  };

  // Quiz states
  const quizGenJobPT = useAiJob<any>('generate_quiz', {
    onComplete: () => { refetchSessionDetails(); showToast('Kuis AI berhasil dibuat!', 'success'); },
    onError: (err) => showToast(err || 'Gagal menghasilkan kuis.', 'error'),
  });
  const isGeneratingQuiz = quizGenJobPT.isProcessing;
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false);
  const [ptQuizCount, setPtQuizCount] = useState('10');
  const [showPtQuizSettings, setShowPtQuizSettings] = useState(false);

  // Shuffle quiz options: returns shuffled options with mapped answer tracking
  const shuffleOptions = (options: string[], answerKey: string): { shuffledOptions: string[]; newAnswerKey: string } => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const parsed = options.map((opt, i) => ({
      originalLetter: opt.trim().charAt(0),
      text: opt.trim().replace(/^[A-F]\.\s*/, ''),
      index: i,
    }));
    // Fisher-Yates shuffle
    for (let i = parsed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [parsed[i], parsed[j]] = [parsed[j], parsed[i]];
    }
    const shuffledOptions = parsed.map((p, i) => `${letters[i]}. ${p.text}`);
    const correctIdx = parsed.findIndex(p => p.originalLetter === answerKey);
    const newAnswerKey = letters[correctIdx] || answerKey;
    return { shuffledOptions, newAnswerKey };
  };

  // Memoize shuffled quizzes so they don't reshuffle on every render
  const [shuffledQuizzes, setShuffledQuizzes] = useState<{ question: string; options: string[]; answerKey: string; explanation?: string }[]>([]);
  useEffect(() => {
    if (quizzes.length > 0) {
      const shuffled = quizzes.map((q) => {
        const parsed = JSON.parse(q.question);
        const { shuffledOptions, newAnswerKey } = shuffleOptions(parsed.options, parsed.answerKey);
        return { question: parsed.question, options: shuffledOptions, answerKey: newAnswerKey, explanation: parsed.explanation };
      });
      setShuffledQuizzes(shuffled);
    } else {
      setShuffledQuizzes([]);
    }
  }, [quizzes]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const res = await uploadMaterial(file);
    if (res && !res.success) setUploadError(res.error || 'Gagal mengunggah berkas.');
  };

  const handleDeleteMaterial = async (materialId: string, fileName: string) => {
    const ok = await confirm({ title: 'Hapus Berkas', message: `Hapus berkas "${fileName}"?`, confirmText: 'Hapus', variant: 'danger' });
    if (!ok) return;
    try { await aiService.deleteMaterial(materialId); showToast('Berkas dihapus.', 'success'); refetchSessionDetails(); }
    catch (err) { showToast(err instanceof Error ? err.message : 'Gagal menghapus.', 'error'); }
  };

  const handleMergeClassDocuments = async () => {
    if (!classData) return;
    setIsMergingDocs(true);
    try {
      const materials = await classService.getAllClassMaterials(classData.id);
      const readyMaterials = (materials || []).filter((m: any) => m.status === 'SUCCESS' && m.aiSummary);
      if (readyMaterials.length === 0) { showToast('Belum ada rangkuman yang siap.', 'warning'); setIsMergingDocs(false); return; }
      let combined = '';
      readyMaterials.forEach((m: any) => { combined += `## ${m.session?.title || 'Pertemuan'} - ${m.fileName}\n\n${m.aiSummary}\n\n---\n\n`; });
      handleExportB5(`Bundel ${classData.name}`, combined);
      showToast('Bundel berhasil diunduh!', 'success');
    } catch { showToast('Gagal menggabungkan.', 'error'); }
    finally { setIsMergingDocs(false); }
  };

  const handleDocumentSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    const ready = uploadedMaterials.filter((m) => m.status === 'SUCCESS' && m.aiSummary);
    const results: typeof searchResults = [];
    const lower = query.toLowerCase();
    ready.forEach((mat) => {
      const lines = (mat.aiSummary || '').split('\n');
      const matches: { text: string; lineIdx: number }[] = [];
      lines.forEach((line, i) => { if (line.toLowerCase().includes(lower)) matches.push({ text: line.trim(), lineIdx: i }); });
      if (matches.length > 0) results.push({ materialName: mat.fileName, matches });
    });
    setSearchResults(results);
  };

  const stripMarkdown = (text: string): string =>
    text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/_(.+?)_/g, '$1');

  const handleExportB5 = async (title: string, summary: string) => {
    if (!summary) return;
    const { jsPDF } = await import('jspdf');
    const { renderMarkdownToPDF } = await import('@/lib/pdfMarkdown');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'b5' });
    const mL = 20, mR = 12, mT = 15, mB = 15;
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(14);
    doc.text(stripMarkdown(title), mL, mT);
    doc.setFontSize(8); doc.setFont('Helvetica', 'italic');
    doc.text(`Digitalisasi AI Synapse - ${classData?.name || ''}`, mL, mT + 5);
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
    renderMarkdownToPDF(doc, summary, { marginLeft: mL, marginRight: mR, marginTop: mT, marginBottom: mB, pageWidth: 176, pageHeight: 250, startY: mT + 12 });
    doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-rangkuman.pdf`);
  };

  // Quiz handlers
  const handleGenerateQuiz = async () => {
    if (!selectedSession) return;
    try { await quizGenJobPT.trigger(() => aiService.generateQuiz([selectedSession.id], parseInt(ptQuizCount) || 10)); }
    catch (err) { showToast(err instanceof Error ? err.message : 'Gagal menghasilkan kuis.', 'error'); }
  };

  const handleSubmitQuiz = async () => {
    if (shuffledQuizzes.length === 0) return;
    let correctCount = 0;
    shuffledQuizzes.forEach((q, idx) => { if (userAnswers[idx] === q.answerKey) correctCount++; });
    const score = Math.round((correctCount / shuffledQuizzes.length) * 100);
    setQuizScore(score);
    setIsSubmittingAttempt(true);
    try { await aiService.submitQuizAttempt(quizzes[0].id, score, userAnswers as any); setQuizSubmitted(true); showToast('Jawaban kuis berhasil dikirim!', 'success'); }
    catch (err) { showToast(err instanceof Error ? err.message : 'Gagal mengirim nilai kuis.', 'error'); }
    finally { setIsSubmittingAttempt(false); }
  };

  const resetQuiz = () => { setQuizStarted(false); setCurrentQuestionIdx(0); setUserAnswers({}); setQuizSubmitted(false); setQuizScore(0); };

  const readyMaterials = uploadedMaterials.filter((m) => m.status === 'SUCCESS');
  const combinedSummary = readyMaterials.map((m) => m.aiSummary).filter(Boolean).join('\n\n');

  // ─── Split Layout: Session list (left) | Detail (right) ──────────────

  // Desktop: grid layout. Mobile: show list OR detail (not both)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%', minHeight: 0 }}>
      {/* Mobile: dropdown selector when session is selected */}
      {isMobile && selectedSession && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ flex: 1 }}>
            <SelectOption
              value={selectedSession.id}
              onChange={(val) => {
                const sess = sessions.find((s) => s.id === val);
                if (sess) { setSelectedSession(sess); setSubTab('materi'); resetQuiz(); }
              }}
              options={sessions.map((s) => ({ value: s.id, label: s.title }))}
              placeholder="Pilih pertemuan"
            />
          </div>
          {canSession && (
            <button onClick={handleAddSession} title="Tambah" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-primary))', padding: '0.25rem' }}>
              <Plus size={16} />
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: (!isMobile && selectedSession) ? '200px 1fr' : '1fr', gap: 0, flex: 1, minHeight: 0 }}>

      {/* Left: Session list — hidden on mobile when session is selected */}
      {!(isMobile && selectedSession) && (
      <div style={{
        borderRight: (!isMobile && selectedSession) ? '1px solid var(--border-default)' : 'none',
        padding: '0.75rem 0.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px',
        background: 'rgba(var(--color-primary) / 0.01)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.4rem', marginBottom: '0.4rem' }}>
          <h4 style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-muted))', textTransform: 'uppercase' }}>Pertemuan</h4>
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            {canSession && (
              <button onClick={handleAddSession} title="Tambah Pertemuan" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-primary))', padding: '0.15rem' }}>
                <Plus size={12} />
              </button>
            )}
            <button onClick={handleMergeClassDocuments} disabled={isMergingDocs} title="Gabung semua rangkuman" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-primary))', padding: '0.15rem' }}>
              {isMergingDocs ? <Loader2 className="animate-spin" size={12} /> : <Layers size={12} />}
            </button>
          </div>
        </div>
        {sessions.map((sess) => {
          const isActive = selectedSession?.id === sess.id;
          return (
            <div key={sess.id} style={{ marginBottom: '2px' }}>
              <button onClick={() => { setSelectedSession(sess); setSubTab('materi'); resetQuiz(); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                  background: isActive ? 'rgba(var(--color-primary) / 0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(var(--color-primary) / 0.15)' : '1px solid transparent',
                  color: isActive ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
                  fontWeight: isActive ? 600 : 400, fontSize: 'var(--font-sm)', transition: 'var(--transition-fast)',
                  overflow: 'hidden',
                }}>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sess.title}</span>
                {sess._count && (sess._count.materials > 0 || sess._count.quizzes > 0) && (
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgb(var(--color-secondary))', flexShrink: 0 }} />
                )}
              </button>
            </div>
          );
        })}
      </div>
      )}

      {/* Right: Detail */}
      {selectedSession ? (
        <div style={{ padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600 }}>{selectedSession.title}</h3>

          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-default)' }}>
            {([
              { id: 'materi' as const, label: 'Materi' },
              ...(hasFeature('ai_digitalization') ? [{ id: 'digitalisasi' as const, label: 'Digitalisasi AI' }] : []),
              ...(hasQuizFeature ? [{ id: 'kuis' as const, label: 'Kuis' }] : []),
              { id: 'tugas' as const, label: 'Tugas' },
              ...(canSession ? [{ id: 'pengaturan' as const, label: '⚙️' }] : []),
            ]).map((tab) => (
              <button key={tab.id} onClick={() => setSubTab(tab.id)} style={{
                padding: '0.35rem 0.1rem', background: 'none', border: 'none',
                borderBottom: subTab === tab.id ? '2px solid rgb(var(--color-primary))' : '2px solid transparent',
                color: subTab === tab.id ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))',
                cursor: 'pointer', fontWeight: subTab === tab.id ? 600 : 400, fontSize: 'var(--font-sm)', fontFamily: 'inherit',
              }}>{tab.label}</button>
            ))}
          </div>

          {sessionDetailsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={24} style={{ color: 'rgb(var(--color-primary))' }} /></div>
          ) : subTab === 'materi' ? (
            /* ═══ MATERI SUB-TAB ═══ */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {canUpload && (
                <Card style={{ padding: '0.75rem' }}>
                  <label style={{
                    border: '2px dashed rgba(var(--color-primary) / 0.15)', borderRadius: 'var(--radius-md)', padding: '1rem 0.75rem',
                    textAlign: 'center', cursor: isUploading ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem',
                    background: 'rgba(var(--color-primary) / 0.02)',
                  }}>
                    <input type="file" accept=".pdf,audio/*" onChange={handleFileUpload} disabled={isUploading} style={{ display: 'none' }} />
                    {isUploading ? <><Loader2 className="animate-spin" size={20} style={{ color: 'rgb(var(--color-primary))' }} /><span style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--color-primary))' }}>Mengunggah...</span></>
                      : <><Upload size={20} style={{ color: 'rgb(var(--text-muted))' }} /><span style={{ fontSize: 'var(--font-sm)' }}>PDF / Audio</span></>}
                  </label>
                  {uploadError && <div style={{ marginTop: '0.4rem' }}><Alert type="error" message={uploadError} /></div>}
                </Card>
              )}
              {uploadedMaterials.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: '1.5rem' }}><FileText size={24} style={{ color: 'rgb(var(--text-muted))', opacity: 0.3 }} /><p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginTop: '0.3rem' }}>Belum ada berkas.</p></Card>
              ) : uploadedMaterials.map((mat) => (
                <Card key={mat.id} style={{ padding: '0.5rem 0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
                    {mat.fileType === 'AUDIO' ? <Music size={14} style={{ color: 'rgb(var(--color-secondary))' }} /> : <FileText size={14} style={{ color: 'rgb(var(--color-primary))' }} />}
                    <span style={{ fontSize: 'var(--font-sm)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mat.fileName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                    {mat.status === 'PROCESSING' && <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--color-warning))', display: 'flex', alignItems: 'center', gap: '0.15rem' }}><Loader2 className="animate-spin" size={10} /> AI</span>}
                    {mat.status === 'FAILED' && (
                      <>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--color-error))' }}><XCircle size={10} /></span>
                        <button onClick={async () => {
                          try { await aiService.retryMaterial(mat.id); showToast('Proses digitalisasi ulang dimulai.', 'success'); refetchSessionDetails(); }
                          catch { showToast('Gagal memulai ulang.', 'error'); }
                        }} title="Coba lagi digitalisasi" style={{ background: 'rgba(var(--color-primary) / 0.08)', border: 'none', borderRadius: '3px', padding: '0.15rem 0.3rem', cursor: 'pointer', color: 'rgb(var(--color-primary))', fontSize: 'var(--font-xs)', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                          <RotateCcw size={9} /> Ulang
                        </button>
                      </>
                    )}
                    {mat.status === 'SUCCESS' && <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--color-success))' }}><CheckCircle2 size={10} /></span>}
                    {mat.fileUrl && <button onClick={() => setPreviewUrl(mat.fileUrl)} style={{ background: 'rgba(var(--color-primary) / 0.08)', border: 'none', borderRadius: '3px', padding: '0.15rem 0.3rem', cursor: 'pointer', color: 'rgb(var(--color-primary))', fontSize: 'var(--font-xs)' }}><Eye size={9} /></button>}
                    {canDeleteMaterial && <button onClick={() => handleDeleteMaterial(mat.id, mat.fileName)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-error))', opacity: 0.4, padding: '0.1rem' }}><Trash2 size={10} /></button>}
                  </div>
                </Card>
              ))}
            </div>
          ) : subTab === 'digitalisasi' ? (
            /* ═══ DIGITALISASI AI SUB-TAB ═══ */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Search size={13} style={{ color: 'rgb(var(--text-muted))' }} />
                <div style={{ flex: 1 }}>
                  <TextInput value={searchQuery} onChange={handleDocumentSearch} placeholder="Cari..." leftIcon={undefined} />
                </div>
                {combinedSummary.trim() && (
                  <>
                    <Button size="sm" variant="ghost" leftIcon={<BookOpen size={12} />} onClick={() => setReadModeContent(combinedSummary)}>Baca</Button>
                    {hasFeature('pdf_export') && <Button size="sm" variant="ghost" leftIcon={<Download size={12} />} onClick={() => handleExportB5(selectedSession.title, combinedSummary)}>PDF</Button>}
                  </>
                )}
              </div>
              {searchQuery && searchResults.length > 0 && (
                <Card style={{ maxHeight: 150, overflowY: 'auto', padding: '0.3rem' }}>
                  {searchResults.map((r, ri) => r.matches.slice(0, 3).map((m, mi) => (
                    <button key={`${ri}-${mi}`} onClick={() => {
                      const searchText = m.text.replace(/^#+\s*/, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/_(.+?)_/g, '$1').trim();
                      const searchSnippet = searchText.slice(0, 50);
                      // Clear search first, then scroll after DOM settles
                      setSearchQuery(''); setSearchResults([]);
                      setTimeout(() => {
                        const container = document.querySelector('[data-digitalisasi-content]');
                        if (!container) return;
                        // Search through rendered text nodes
                        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
                        let node: Text | null;
                        let found = false;
                        while ((node = walker.nextNode() as Text | null)) {
                          if (node.textContent && node.textContent.toLowerCase().includes(searchSnippet.toLowerCase())) {
                            const el = node.parentElement;
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              el.style.background = 'rgba(var(--color-primary) / 0.2)';
                              el.style.borderRadius = '4px';
                              el.style.transition = 'background 0.3s';
                              setTimeout(() => { el.style.background = ''; }, 2500);
                              found = true;
                            }
                            break;
                          }
                        }
                        if (!found) {
                          // Fallback: try broader text match
                          const allEls = container.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, span, td, th');
                          const lowerSnippet = searchSnippet.toLowerCase().slice(0, 25);
                          for (let i = 0; i < allEls.length; i++) {
                            if (allEls[i].textContent?.toLowerCase().includes(lowerSnippet)) {
                              (allEls[i] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                              (allEls[i] as HTMLElement).style.background = 'rgba(var(--color-primary) / 0.2)';
                              setTimeout(() => { (allEls[i] as HTMLElement).style.background = ''; }, 2500);
                              break;
                            }
                          }
                        }
                      }, 100);
                    }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.3rem 0.5rem', background: 'none', border: 'none', borderBottom: '1px solid var(--border-default)', color: 'rgb(var(--text-secondary))', fontSize: 'var(--font-xs)', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {m.text.replace(/^#+\s*/, '').slice(0, 80)}
                    </button>
                  )))}
                </Card>
              )}
              {combinedSummary.trim() ? (
                <Card data-digitalisasi-content style={{ padding: '1rem' }}><MarkdownRenderer content={combinedSummary} /></Card>
              ) : (
                <Card style={{ textAlign: 'center', padding: '1.5rem' }}><Sparkles size={24} style={{ color: 'rgb(var(--text-muted))', opacity: 0.3 }} /><p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginTop: '0.3rem' }}>Unggah berkas terlebih dahulu.</p></Card>
              )}
            </div>
          ) : subTab === 'kuis' ? (
            /* ═══ KUIS PER-SESSION ═══ */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {quizzes.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <HelpCircle size={24} style={{ color: 'rgb(var(--text-muted))', opacity: 0.3 }} />
                  <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginTop: '0.3rem', marginBottom: '0.5rem' }}>Belum ada kuis untuk pertemuan ini.</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <button onClick={() => setShowPtQuizSettings(!showPtQuizSettings)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: 'var(--font-xs)', fontFamily: 'inherit' }}>
                      ⚙️ {ptQuizCount} soal
                    </button>
                  </div>
                  {showPtQuizSettings && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ maxWidth: 160 }}>
                        <SelectOption value={ptQuizCount} onChange={setPtQuizCount} options={[
                          { value: '5', label: '5 soal' },
                          { value: '10', label: '10 soal' },
                          { value: '15', label: '15 soal' },
                          { value: '20', label: '20 soal' },
                          { value: '25', label: '25 soal' },
                        ]} />
                      </div>
                    </div>
                  )}
                  <Button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz || !readyMaterials.length} isLoading={isGeneratingQuiz} size="sm" leftIcon={<Sparkles size={12} />}>
                    {!readyMaterials.length ? 'Unggah Materi Dulu' : `Buat ${ptQuizCount} Soal Kuis AI`}
                  </Button>
                </Card>
              ) : !quizStarted ? (
                <Card style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <HelpCircle size={24} style={{ color: 'rgb(var(--color-primary))' }} />
                  <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', margin: '0.3rem 0 0.75rem' }}>{quizzes.length} soal pilihan ganda</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    <Button size="sm" onClick={() => setQuizStarted(true)} leftIcon={<Play size={12} />}>Mulai Kuis</Button>
                    <Button size="sm" variant="outline" onClick={() => { resetQuiz(); setShowPtQuizSettings(true); }} leftIcon={<Settings size={12} />}>Atur Ulang</Button>
                  </div>
                </Card>
              ) : quizSubmitted ? (
                <Card style={{ textAlign: 'center', padding: '1.25rem' }}>
                  <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, color: quizScore >= 70 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))', margin: '0.25rem 0' }}>{quizScore}</div>
                  <span style={{ fontSize: 'var(--font-xs)', padding: '0.1rem 0.4rem', borderRadius: '3px', background: quizScore >= 70 ? 'rgba(var(--color-success) / 0.1)' : 'rgba(var(--color-error) / 0.1)', color: quizScore >= 70 ? 'rgb(var(--color-success))' : 'rgb(var(--color-error))', fontWeight: 600 }}>{quizScore >= 70 ? 'LULUS' : 'BELUM LULUS'}</span>
                  <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    <Button variant="secondary" size="sm" onClick={resetQuiz} leftIcon={<RotateCcw size={12} />}>Ulangi</Button>
                    <Button variant="outline" size="sm" onClick={() => { resetQuiz(); setShowPtQuizSettings(true); }} leftIcon={<Settings size={12} />}>Atur Ulang</Button>
                  </div>
                </Card>
              ) : (() => {
                const currentQ = shuffledQuizzes[currentQuestionIdx];
                if (!currentQ) return null;
                return (
                  <Card style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>
                      <span>Soal {currentQuestionIdx + 1}/{shuffledQuizzes.length}</span>
                      <span>{Math.round((currentQuestionIdx / shuffledQuizzes.length) * 100)}%</span>
                    </div>
                    <h4 style={{ fontSize: 'var(--font-base)', fontWeight: 600, lineHeight: 1.5, marginBottom: '0.5rem' }}>{currentQ.question}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {currentQ.options.map((opt: string, i: number) => {
                        const letter = opt.trim().charAt(0);
                        const isSel = userAnswers[currentQuestionIdx] === letter;
                        return (
                          <button key={i} onClick={() => setUserAnswers((p) => ({ ...p, [currentQuestionIdx]: letter }))} style={{
                            padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-sm)', textAlign: 'left', fontSize: 'var(--font-sm)', cursor: 'pointer', fontFamily: 'inherit',
                            background: isSel ? 'rgba(var(--color-primary) / 0.08)' : 'var(--input-bg)',
                            border: isSel ? '1px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                            color: isSel ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
                            fontWeight: isSel ? 600 : 400,
                          }}>{opt}</button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-default)' }}>
                      <Button variant="ghost" size="sm" disabled={currentQuestionIdx === 0} onClick={() => setCurrentQuestionIdx((p) => p - 1)} leftIcon={<ChevronLeft size={12} />}>Kembali</Button>
                      {currentQuestionIdx < shuffledQuizzes.length - 1
                        ? <Button size="sm" disabled={!userAnswers[currentQuestionIdx]} onClick={() => setCurrentQuestionIdx((p) => p + 1)} rightIcon={<ChevronRight size={12} />}>Lanjut</Button>
                        : <Button size="sm" disabled={!userAnswers[currentQuestionIdx] || isSubmittingAttempt} isLoading={isSubmittingAttempt} onClick={handleSubmitQuiz} rightIcon={<CheckCircle2 size={12} />}>Kirim</Button>}
                    </div>
                  </Card>
                );
              })()}
            </div>
          ) : subTab === 'pengaturan' && canSession ? (
            /* ═══ PENGATURAN SUB-TAB ═══ */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Card style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'rgb(var(--text-primary))', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Settings size={14} style={{ color: 'rgb(var(--color-primary))' }} /> Pengaturan Pertemuan
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-muted))' }}>Nama Pertemuan</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <TextInput value={sessionModalValue || selectedSession.title} onChange={setSessionModalValue} placeholder="Nama pertemuan" />
                      <Button size="sm" onClick={async () => {
                        const val = (sessionModalValue || selectedSession.title).trim();
                        if (!val || !updateSession) return;
                        const res = await updateSession(selectedSession.id, val);
                        if (res.success) { showToast('Nama pertemuan diperbarui.', 'success'); setSessionModalValue(''); }
                        else showToast(res.error || 'Gagal.', 'error');
                      }} style={{ borderRadius: 'var(--radius-md)', whiteSpace: 'nowrap' }}>
                        <Pencil size={12} /> Simpan
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              <Card style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'rgb(var(--text-primary))', marginBottom: '0.75rem' }}>Urutan Pertemuan</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {sessions.map((sess, idx) => (
                    <div key={sess.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', border: sess.id === selectedSession.id ? '1px solid rgba(var(--color-primary) / 0.2)' : '1px solid var(--border-default)', background: sess.id === selectedSession.id ? 'rgba(var(--color-primary) / 0.04)' : 'transparent' }}>
                      <span style={{ fontSize: 'var(--font-sm)', fontWeight: sess.id === selectedSession.id ? 600 : 400, color: sess.id === selectedSession.id ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))' }}>{idx + 1}. {sess.title}</span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {idx > 0 && <button onClick={() => handleReorderSession(sess.id, sess.sequence - 1)} title="Naik" style={{ border: 'none', background: 'rgba(var(--color-primary) / 0.06)', borderRadius: '3px', padding: '0.15rem 0.25rem', cursor: 'pointer', color: 'rgb(var(--text-muted))' }}><ChevronUp size={12} /></button>}
                        {idx < sessions.length - 1 && <button onClick={() => handleReorderSession(sess.id, sess.sequence + 1)} title="Turun" style={{ border: 'none', background: 'rgba(var(--color-primary) / 0.06)', borderRadius: '3px', padding: '0.15rem 0.25rem', cursor: 'pointer', color: 'rgb(var(--text-muted))' }}><ChevronDown size={12} /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card style={{ padding: '1rem', border: '1px solid rgba(var(--color-error) / 0.15)' }}>
                <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'rgb(var(--color-error))', marginBottom: '0.5rem' }}>Zona Berbahaya</h4>
                <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginBottom: '0.75rem' }}>Menghapus pertemuan akan menghapus semua materi, kuis, dan tugas di dalamnya.</p>
                <Button variant="danger" size="sm" onClick={() => handleDeleteSession(selectedSession.id)} leftIcon={<Trash2 size={12} />}>Hapus Pertemuan Ini</Button>
              </Card>
            </div>
          ) : (
            /* ═══ TUGAS SUB-TAB ═══ */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {classData && <TugasTab classId={classData.id} memberRole={classData.memberRole} filterSessionId={selectedSession?.id} />}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)', padding: '3rem' }}>
          ← Pilih pertemuan untuk melihat detail
        </div>
      )}

      {/* SESSION MODAL (CREATE/RENAME) */}
      <Modal 
        isOpen={showSessionModal} 
        onClose={() => setShowSessionModal(false)} 
        title={sessionModalMode === 'create' ? 'Tambah Pertemuan Baru' : 'Ubah Nama Pertemuan'}
        size="sm"
      >
        <form onSubmit={handleSessionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <TextInput label="Nama Pertemuan" value={sessionModalValue} onChange={setSessionModalValue} placeholder="e.g. Pertemuan 1: Pengenalan" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'end', gap: '0.5rem', borderTop: '1px solid var(--border-default)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="outline" style={{ borderRadius: 'var(--radius-md)' }} onClick={() => setShowSessionModal(false)}>Batal</Button>
            <Button type="submit" isLoading={isCreatingSession} style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', color: 'black', borderRadius: 'var(--radius-md)', fontWeight: 700 }}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      {/* PDF Preview Modal */}
      {previewUrl && (
        <div onClick={() => setPreviewUrl(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 850, height: '80vh', background: 'var(--modal-bg)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: 'var(--font-sm)', fontWeight: 500 }}>Preview</span>
              <button onClick={() => setPreviewUrl(null)} style={{ background: 'var(--input-bg)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgb(var(--text-muted))' }}>✕</button>
            </div>
            <iframe src={previewUrl} style={{ flex: 1, border: 'none', width: '100%' }} title="Preview" />
          </div>
        </div>
      )}

      {/* Read Mode — Full-screen digitization view */}
      {readModeContent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', flexDirection: 'column', background: 'var(--modal-bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-default)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={16} style={{ color: 'rgb(var(--color-primary))' }} />
              <span style={{ fontSize: 'var(--font-base)', fontWeight: 600 }}>Mode Baca — {selectedSession?.title}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {hasFeature('pdf_export') && selectedSession && (
                <Button size="sm" variant="ghost" leftIcon={<Download size={12} />} onClick={() => handleExportB5(selectedSession.title, readModeContent)}>PDF</Button>
              )}
              <button onClick={() => setReadModeContent(null)} style={{ background: 'var(--input-bg)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgb(var(--text-muted))', fontSize: '14px' }}>✕</button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '1rem' : '2rem 3rem' }}>
            <div style={{ maxWidth: 800, margin: '0 auto', fontSize: 'var(--font-base)', lineHeight: 1.8 }}>
              <MarkdownRenderer content={readModeContent} />
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
