'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useFeatureAccess } from '@/lib/feature-access';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Modal, useToast, useConfirm, PullToRefresh, TextInput, TextArea, SelectOption, DateTimePicker, UserAvatar, TagInput } from '@/components/ui';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { HtmlRenderer } from '@/components/ui/HtmlRenderer';
import {
  skripsweetService,
  ThesisProject, ThesisChapter, ThesisJournal, ThesisBimbingan,
  ThesisChatMessage, ThesisProgress, JournalSearchResult, ThesisBibliography,
  ThesisComment, ExploreResult, ChapterRevision,
} from '@/services/skripsweetService';
import {
  useTheses, useThesisDetail, useThesisProgress, useChatHistory,
  useExplore, useTrendingTags, useCreateThesis, useDeleteThesis,
  useExplainFormat, useUploadFormatFile, useCreateChapter, useUpdateChapter,
  useDeleteChapter, useReorderChapters, useGetChapterFeedback,
  useAddJournal, useUpdateJournal, useRemoveJournal,
  useCreateBimbingan, useUpdateBimbingan, useDeleteBimbingan,
  useSendChat, useGenerateBibliography, usePublishThesis, useUnpublishThesis,
  useAddRevision, useResolveRevision, useUnresolveRevision, useDeleteRevision,
  useToggleLike, useToggleBookmark, useAddComment, useSearchJournals,
  useUploadBimbinganAttachment, skripsweetKeys,
} from '@/lib/hooks/useSkripsweet';
import { useQueryClient } from '@tanstack/react-query';
import {
  Plus, Loader2, BookOpen, Search, Sparkles, Trash2, X, ChevronRight, ChevronDown, ChevronUp,
  FileText, MessageSquare, ClipboardList, BookMarked, Globe,
  BarChart3, Edit2, Check, Send, RefreshCw, ExternalLink, Eye,
  Heart, Bookmark, Copy, TrendingUp, Download, ArrowUpRight, Pencil, Upload, AlertCircle,
} from 'lucide-react';

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor').then(m => ({ default: m.RichTextEditor })), { ssr: false });

type Tab = 'dashboard' | 'chapters' | 'journals' | 'bimbingan' | 'bibliography' | 'chat' | 'explore';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#6b7280' },
  in_progress: { label: 'Sedang Dikerjakan', color: '#3b82f6' },
  review: { label: 'Review', color: '#f59e0b' },
  revision: { label: 'Revisi', color: '#ef4444' },
  completed: { label: 'Selesai', color: '#22c55e' },
};

const CHAPTER_STATUS: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Belum Mulai', color: '#6b7280' },
  drafting: { label: 'Drafting', color: '#3b82f6' },
  reviewing: { label: 'Review', color: '#f59e0b' },
  revision: { label: 'Revisi', color: '#ef4444' },
  done: { label: 'Selesai', color: '#22c55e' },
};

export default function SkripsweetPage() {
  useAuth();
  const router = useRouter();
  const { hasFeature } = useFeatureAccess();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tab, setTab] = useState<Tab>('dashboard');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // State
  const [activeThesisId, setActiveThesisId] = useState<string | null>(null);
  const [exploreQuery2, setExploreQuery2] = useState('');
  const [exploreTag, setExploreTag] = useState('');
  const queryClient = useQueryClient();

  // ─── TanStack Query ─────────────────────────────────────────
  const thesesQuery = useTheses();
  const theses = thesesQuery.data ?? [];
  const loading = thesesQuery.isLoading;

  const detailQuery = useThesisDetail(activeThesisId);
  const activeThesis = detailQuery.data ?? null;

  const progressQuery = useThesisProgress(activeThesisId, tab === 'dashboard');
  const progress = progressQuery.data ?? null;

  const chatQuery = useChatHistory(activeThesisId, tab === 'chat');
  const chatMessages = chatQuery.data ?? [];

  const exploreResult = useExplore(exploreQuery2, exploreTag, tab === 'explore');
  const exploreData = exploreResult.data ?? null;
  const exploreLoading = exploreResult.isLoading;

  const trendingQuery = useTrendingTags(tab === 'explore');
  const trendingTags = trendingQuery.data ?? [];

  // Auto-select first thesis
  useEffect(() => {
    if (theses.length > 0 && !activeThesisId) setActiveThesisId(theses[0].id);
  }, [theses, activeThesisId]);

  // Mutations
  const createThesisMut = useCreateThesis();
  const deleteThesisMut = useDeleteThesis();
  const explainFormatMut = useExplainFormat();
  const uploadFormatMut = useUploadFormatFile();
  const createChapterMut = useCreateChapter();
  const updateChapterMut = useUpdateChapter();
  const deleteChapterMut = useDeleteChapter();
  const reorderChaptersMut = useReorderChapters();
  const feedbackMut = useGetChapterFeedback();
  const addJournalMut = useAddJournal();
  const updateJournalMut = useUpdateJournal();
  const removeJournalMut = useRemoveJournal();
  const createBimbinganMut = useCreateBimbingan();
  const updateBimbinganMut = useUpdateBimbingan();
  const deleteBimbinganMut = useDeleteBimbingan();
  const sendChatMut = useSendChat();
  const generateBibMut = useGenerateBibliography();
  const publishMut = usePublishThesis();
  const unpublishMut = useUnpublishThesis();
  const addRevisionMut = useAddRevision();
  const resolveRevisionMut = useResolveRevision();
  const unresolveRevisionMut = useUnresolveRevision();
  const deleteRevisionMut = useDeleteRevision();
  const toggleLikeMut = useToggleLike();
  const toggleBookmarkMut = useToggleBookmark();
  const addCommentMut = useAddComment();
  const searchJournalsMut = useSearchJournals();
  const uploadBimbinganMut = useUploadBimbinganAttachment();

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showBimbinganModal, setShowBimbinganModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showPublicDetail, setShowPublicDetail] = useState<ThesisProject | null>(null);
  const [showMatrixModal, setShowMatrixModal] = useState(false);

  // Forms
  const [thesisForm, setThesisForm] = useState({ title: '', university: '', faculty: '', department: '', supervisor: '', supervisorTwo: '', startDate: '', targetDate: '', abstract: '' });
  const [formatExplanation, setFormatExplanation] = useState('');
  const [chapterForm, setChapterForm] = useState({ title: '', chapterNum: '', targetWords: '', targetPages: '', targetParagraphs: '' });
  const [journalForm, setJournalForm] = useState({ title: '', authors: '', journalName: '', year: '', doi: '', url: '', abstract: '', relevance: '', citationKey: '' });
  const [bimbinganForm, setBimbinganForm] = useState({ date: '', supervisor: '', topic: '', feedback: '', actionItems: '' });
  const [publishTags, setPublishTags] = useState<string[]>([]);

  // Journal search (inline)
  const [journalSearchQuery, setJournalSearchQuery] = useState('');
  const [journalSearchResults, setJournalSearchResults] = useState<JournalSearchResult[]>([]);
  const [journalSearching, setJournalSearching] = useState(false);
  const [journalSearchMode, setJournalSearchMode] = useState<'list' | 'search'>('list');

  // Journal edit
  const [editingJournal, setEditingJournal] = useState<ThesisJournal | null>(null);

  // Bibliography style
  const [bibStyle, setBibStyle] = useState('apa7');

  // Chat
  const [chatInput, setChatInput] = useState('');
  const [chatContext, setChatContext] = useState('');

  // Explore
  const [publicCommentInput, setPublicCommentInput] = useState('');

  // Relevance matrix
  const [matrixData, setMatrixData] = useState<any[] | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);

  // Loading states
  const [submitting, setSubmitting] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Edit bimbingan
  const [editingBimbingan, setEditingBimbingan] = useState<ThesisBimbingan | null>(null);

  // Format upload
  const [formatMode, setFormatMode] = useState<'text' | 'file'>('text');
  const formatFileRef = useRef<HTMLInputElement>(null);

  // Revisions
  const [revisionModal, setRevisionModal] = useState<{ chapterId: string; chapterTitle: string } | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [expandedRevisions, setExpandedRevisions] = useState<string | null>(null);

  // Scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const refreshAll = useCallback(async () => {
    if (!activeThesisId) return;
    queryClient.invalidateQueries({ queryKey: skripsweetKeys.detail(activeThesisId) });
    queryClient.invalidateQueries({ queryKey: skripsweetKeys.progress(activeThesisId) });
  }, [activeThesisId, queryClient]);

  // ─── Handlers ───────────────────────────────────────────────
  const handleCreateThesis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thesisForm.title.trim()) return;
    setSubmitting(true);
    try {
      const thesis = await createThesisMut.mutateAsync({
        title: thesisForm.title, university: thesisForm.university || undefined,
        faculty: thesisForm.faculty || undefined, department: thesisForm.department || undefined,
        supervisor: thesisForm.supervisor || undefined, supervisorTwo: thesisForm.supervisorTwo || undefined,
        startDate: thesisForm.startDate || undefined, targetDate: thesisForm.targetDate || undefined,
        abstract: thesisForm.abstract || undefined,
      });
      setActiveThesisId(thesis.id);
      setShowCreateModal(false);
      setThesisForm({ title: '', university: '', faculty: '', department: '', supervisor: '', supervisorTwo: '', startDate: '', targetDate: '', abstract: '' });
      showToast('Proyek skripsi berhasil dibuat! Sekarang atur format skripsimu.', 'success');
      setTimeout(() => setShowFormatModal(true), 300);
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteThesis = async () => {
    if (!activeThesis) return;
    if (!await confirm({ title: 'Hapus Proyek Skripsi?', message: `"${activeThesis.title}" dan semua datanya akan dihapus permanen.`, variant: 'danger', confirmText: 'Hapus' })) return;
    try {
      await deleteThesisMut.mutateAsync(activeThesis.id);
      setActiveThesisId(null);
      showToast('Proyek skripsi dihapus.', 'success');
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleExplainFormat = async () => {
    if (!activeThesis || !formatExplanation.trim()) return;
    setSubmitting(true);
    try {
      await explainFormatMut.mutateAsync({ thesisId: activeThesis.id, explanation: formatExplanation });
      showToast('Format berhasil diparsing oleh AI! Bab-bab sudah otomatis dibuat.', 'success');
      setShowFormatModal(false); setFormatExplanation('');
    } catch (e: any) { showToast(e.message || 'Gagal mengatur format', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleUploadFormatFile = async (file: File) => {
    if (!activeThesis) return;
    setSubmitting(true);
    try {
      await uploadFormatMut.mutateAsync({ thesisId: activeThesis.id, file });
      showToast('File berhasil dianalisis! Struktur bab sudah dibuat otomatis.', 'success');
      setShowFormatModal(false);
    } catch (e: any) { showToast(e.message || 'Gagal menganalisis file', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThesis || !chapterForm.title.trim()) return;
    setSubmitting(true);
    try {
      await createChapterMut.mutateAsync({
        thesisId: activeThesis.id,
        data: {
          title: chapterForm.title,
          chapterNum: parseInt(chapterForm.chapterNum) || (activeThesis.chapters?.length || 0) + 1,
          targetWords: chapterForm.targetWords ? parseInt(chapterForm.targetWords) : undefined,
          targetPages: chapterForm.targetPages ? parseInt(chapterForm.targetPages) : undefined,
          targetParagraphs: chapterForm.targetParagraphs ? parseInt(chapterForm.targetParagraphs) : undefined,
        } as any,
      });
      showToast('Bab ditambahkan!', 'success');
      setShowChapterModal(false);
      setChapterForm({ title: '', chapterNum: '', targetWords: '', targetPages: '', targetParagraphs: '' });
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleUpdateChapterStatus = async (chapterId: string, status: string) => {
    if (!activeThesis) return;
    try { await updateChapterMut.mutateAsync({ thesisId: activeThesis.id, chapterId, data: { status } as any }); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!activeThesis) return;
    if (!await confirm({ message: 'Yakin hapus bab ini?', variant: 'danger' })) return;
    try { await deleteChapterMut.mutateAsync({ thesisId: activeThesis.id, chapterId }); showToast('Bab dihapus.', 'success'); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleGetFeedback = async (chapterId: string) => {
    if (!activeThesis) return;
    setFeedbackLoading(chapterId);
    try {
      await feedbackMut.mutateAsync({ thesisId: activeThesis.id, chapterId });
      showToast('Feedback AI sudah siap!', 'success');
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setFeedbackLoading(null); }
  };

  // Journal search (inline)
  const handleSearchJournals = async () => {
    if (!activeThesis || !journalSearchQuery.trim()) return;
    setJournalSearching(true);
    try {
      const res = await searchJournalsMut.mutateAsync({ thesisId: activeThesis.id, query: journalSearchQuery });
      setJournalSearchResults(res.results);
      if (res.results.length === 0) showToast('Tidak ada hasil. Coba kata kunci lain (dalam bahasa Inggris untuk hasil lebih baik).', 'info');
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setJournalSearching(false); }
  };

  const handleAddFromSearch = async (result: JournalSearchResult) => {
    if (!activeThesis) return;
    try {
      await addJournalMut.mutateAsync({
        thesisId: activeThesis.id,
        data: {
          title: result.title, authors: result.authors, journalName: result.journalName,
          year: result.year, doi: result.doi, url: result.url, abstract: result.abstract, isFromSearch: true,
        },
      });
      showToast('Jurnal ditambahkan!', 'success');
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleAddJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThesis || !journalForm.title.trim()) return;
    setSubmitting(true);
    try {
      await addJournalMut.mutateAsync({
        thesisId: activeThesis.id,
        data: {
          title: journalForm.title, authors: journalForm.authors || undefined,
          journalName: journalForm.journalName || undefined, year: journalForm.year ? parseInt(journalForm.year) : undefined,
          doi: journalForm.doi || undefined, url: journalForm.url || undefined,
          abstract: journalForm.abstract || undefined, relevance: journalForm.relevance || undefined,
          citationKey: journalForm.citationKey || undefined,
        },
      });
      showToast('Jurnal ditambahkan!', 'success');
      setShowJournalModal(false);
      setJournalForm({ title: '', authors: '', journalName: '', year: '', doi: '', url: '', abstract: '', relevance: '', citationKey: '' });
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleRemoveJournal = async (journalId: string) => {
    if (!activeThesis) return;
    try { await removeJournalMut.mutateAsync({ thesisId: activeThesis.id, journalId }); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleUpdateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThesis || !editingJournal) return;
    setSubmitting(true);
    try {
      await updateJournalMut.mutateAsync({
        thesisId: activeThesis.id,
        journalId: editingJournal.id,
        data: {
          title: journalForm.title, authors: journalForm.authors || undefined,
          journalName: journalForm.journalName || undefined, year: journalForm.year ? parseInt(journalForm.year) : undefined,
          doi: journalForm.doi || undefined, url: journalForm.url || undefined,
          abstract: journalForm.abstract || undefined, relevance: journalForm.relevance || undefined,
          citationKey: journalForm.citationKey || undefined,
        },
      });
      showToast('Jurnal diperbarui!', 'success');
      setEditingJournal(null);
      setShowJournalModal(false);
      setJournalForm({ title: '', authors: '', journalName: '', year: '', doi: '', url: '', abstract: '', relevance: '', citationKey: '' });
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const startEditJournal = (j: ThesisJournal) => {
    setEditingJournal(j);
    setJournalForm({
      title: j.title, authors: j.authors || '', journalName: j.journalName || '',
      year: j.year ? String(j.year) : '', doi: j.doi || '', url: j.url || '',
      abstract: j.abstract || '', relevance: j.relevance || '', citationKey: j.citationKey || '',
    });
    setShowJournalModal(true);
  };

  const handleReorderChapter = async (chapterId: string, direction: 'up' | 'down') => {
    if (!activeThesis) return;
    const sorted = [...chapters].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex(c => c.id === chapterId);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sorted.length - 1)) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];
    const newOrder = sorted.map(c => c.id);
    try {
      await reorderChaptersMut.mutateAsync({ thesisId: activeThesis.id, chapterIds: newOrder });
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleCreateBimbingan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThesis || !bimbinganForm.topic.trim() || !bimbinganForm.date) return;
    setSubmitting(true);
    try {
      await createBimbinganMut.mutateAsync({
        thesisId: activeThesis.id,
        data: {
          date: bimbinganForm.date, supervisor: bimbinganForm.supervisor || undefined,
          topic: bimbinganForm.topic, feedback: bimbinganForm.feedback || undefined,
          actionItems: bimbinganForm.actionItems ? JSON.stringify(bimbinganForm.actionItems.split('\n').filter(Boolean)) : undefined,
        },
      });
      showToast('Log bimbingan ditambahkan!', 'success');
      setShowBimbinganModal(false);
      setBimbinganForm({ date: '', supervisor: '', topic: '', feedback: '', actionItems: '' });
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteBimbingan = async (id: string) => {
    if (!activeThesis || !await confirm({ message: 'Hapus log bimbingan?', variant: 'danger' })) return;
    try { await deleteBimbinganMut.mutateAsync({ thesisId: activeThesis.id, bimbinganId: id }); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleMarkBimbinganDone = async (id: string) => {
    if (!activeThesis) return;
    try { await updateBimbinganMut.mutateAsync({ thesisId: activeThesis.id, bimbinganId: id, data: { status: 'done' } }); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const startEditBimbingan = (b: ThesisBimbingan) => {
    setEditingBimbingan(b);
    let actions: string[] = [];
    try { actions = b.actionItems ? JSON.parse(b.actionItems) : []; } catch { }
    setBimbinganForm({
      date: b.date ? b.date.split('T')[0] : '',
      supervisor: b.supervisor || '',
      topic: b.topic,
      feedback: b.feedback || '',
      actionItems: actions.join('\n'),
    });
    setShowBimbinganModal(true);
  };

  const handleSaveBimbingan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThesis || !bimbinganForm.topic.trim()) return;
    setSubmitting(true);
    const payload = {
      date: bimbinganForm.date, supervisor: bimbinganForm.supervisor || undefined,
      topic: bimbinganForm.topic, feedback: bimbinganForm.feedback || undefined,
      actionItems: bimbinganForm.actionItems ? JSON.stringify(bimbinganForm.actionItems.split('\n').filter(Boolean)) : undefined,
    };
    try {
      if (editingBimbingan) {
        await updateBimbinganMut.mutateAsync({ thesisId: activeThesis.id, bimbinganId: editingBimbingan.id, data: payload });
        showToast('Bimbingan diperbarui!', 'success');
      } else {
        await createBimbinganMut.mutateAsync({ thesisId: activeThesis.id, data: payload });
        showToast('Log bimbingan ditambahkan!', 'success');
      }
      setShowBimbinganModal(false); setEditingBimbingan(null);
      setBimbinganForm({ date: '', supervisor: '', topic: '', feedback: '', actionItems: '' });
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleUploadBimbinganFile = async (bimbinganId: string, file: File) => {
    if (!activeThesis) return;
    try {
      await uploadBimbinganMut.mutateAsync({ thesisId: activeThesis.id, bimbinganId, file });
      showToast('Lampiran berhasil diupload!', 'success');
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  // ─── Revision Handlers ─────────────────────────────────────
  const handleAddRevision = async () => {
    if (!activeThesis || !revisionModal || !revisionNote.trim()) return;
    setSubmitting(true);
    try {
      await addRevisionMut.mutateAsync({ thesisId: activeThesis.id, chapterId: revisionModal.chapterId, note: revisionNote.trim() });
      showToast('Catatan revisi ditambahkan.', 'success');
      setRevisionModal(null); setRevisionNote('');
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleToggleRevision = async (chapterId: string, rev: ChapterRevision) => {
    if (!activeThesis) return;
    try {
      if (rev.status === 'pending') {
        await resolveRevisionMut.mutateAsync({ thesisId: activeThesis.id, chapterId, revisionId: rev.id });
      } else {
        await unresolveRevisionMut.mutateAsync({ thesisId: activeThesis.id, chapterId, revisionId: rev.id });
      }
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleDeleteRevision = async (chapterId: string, revisionId: string) => {
    if (!activeThesis) return;
    try {
      await deleteRevisionMut.mutateAsync({ thesisId: activeThesis.id, chapterId, revisionId });
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleSendChat = async () => {
    if (!activeThesis || !chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatLoading(true);
    try {
      await sendChatMut.mutateAsync({ thesisId: activeThesis.id, message: msg, context: chatContext || undefined });
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setChatLoading(false); }
  };

  const handleGenerateBibliography = async () => {
    if (!activeThesis) return;
    setSubmitting(true);
    try {
      const res = await generateBibMut.mutateAsync({ thesisId: activeThesis.id, style: bibStyle });
      showToast(`Daftar pustaka di-generate (${res.bibliography.length} entri, format ${bibStyle.toUpperCase()})!`, 'success');
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handlePublish = async () => {
    if (!activeThesis) return;
    setSubmitting(true);
    try {
      await publishMut.mutateAsync({ thesisId: activeThesis.id, tags: publishTags });
      showToast('Skripsi dipublikasikan ke komunitas!', 'success');
      setShowPublishModal(false); setPublishTags([]);
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleUnpublish = async () => {
    if (!activeThesis) return;
    try { await unpublishMut.mutateAsync(activeThesis.id); showToast('Skripsi di-unpublish.', 'success'); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleExportThesis = async () => {
    if (!activeThesis) return;
    setExporting(true);
    try {
      const res = await skripsweetService.exportThesis(activeThesis.id);
      // Open HTML in new window and trigger browser print (Save as PDF)
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(res.html);
        printWindow.document.close();
        printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
        setTimeout(() => printWindow.print(), 1000);
      } else {
        const blob = new Blob([res.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = res.filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
      }
      showToast(`Dokumen "${res.title}" siap diunduh! (${res.totalWords.toLocaleString()} kata, ${res.chapterCount} bab)`, 'success');
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setExporting(false); }
  };

  const handleExportDocx = async () => {
    if (!activeThesis) return;
    setExporting(true);
    try {
      const res = await skripsweetService.exportThesis(activeThesis.id);
      const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5}@page{margin:2.54cm 2.54cm 2.54cm 3.17cm}h1{font-size:14pt;text-align:center;font-weight:bold;text-transform:uppercase}h2{font-size:13pt;font-weight:bold}h3{font-size:12pt;font-weight:bold}table{border-collapse:collapse;width:100%}td,th{border:1px solid #000;padding:6px 10px;font-size:11pt}</style></head><body>${res.html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<\/?html[^>]*>|<\/?head[^>]*>|<\/?body[^>]*>|<meta[^>]*>/gi, '')}</body></html>`;
      const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeThesis.title.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 50)}.doc`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      showToast('Dokumen .doc berhasil diunduh!', 'success');
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setExporting(false); }
  };

  const handleToggleLike = async (id: string) => {
    try {
      const res = await toggleLikeMut.mutateAsync(id);
      if (exploreData) {
        queryClient.setQueryData(skripsweetKeys.explore(exploreQuery2, exploreTag), (prev: ExploreResult | undefined) =>
          prev ? { ...prev, items: prev.items.map(i => i.id === id ? { ...i, isLiked: res.liked, _count: { ...i._count!, likes: (i._count?.likes || 0) + (res.liked ? 1 : -1) } } : i) } : prev
        );
      }
      if (showPublicDetail?.id === id) {
        setShowPublicDetail(prev => prev ? { ...prev, isLiked: res.liked, _count: { ...prev._count!, likes: (prev._count?.likes || 0) + (res.liked ? 1 : -1) } } : null);
      }
    } catch { }
  };

  const handleToggleBookmark = async (id: string) => {
    try { await toggleBookmarkMut.mutateAsync(id); } catch { }
  };

  const handleViewPublic = async (id: string) => {
    try { setShowPublicDetail(await skripsweetService.getPublicThesis(id)); } catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleAddComment = async () => {
    if (!showPublicDetail || !publicCommentInput.trim()) return;
    try {
      const comment = await addCommentMut.mutateAsync({ thesisId: showPublicDetail.id, content: publicCommentInput });
      setShowPublicDetail(prev => prev ? { ...prev, comments: [comment, ...(prev as any).comments] } : null);
      setPublicCommentInput('');
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  const handleGetMatrix = async () => {
    if (!activeThesis) return;
    setMatrixLoading(true);
    try {
      const res = await skripsweetService.getRelevanceMatrix(activeThesis.id);
      setMatrixData(res.matrix);
      setShowMatrixModal(true);
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setMatrixLoading(false); }
  };

  // ─── Computed ───────────────────────────────────────────────
  const chapters = (activeThesis?.chapters || []).sort((a, b) => a.sortOrder - b.sortOrder);
  const journals = activeThesis?.journals || [];
  const bimbingans = activeThesis?.bimbingans || [];
  const bibliographies = activeThesis?.bibliographies || [];
  const statusInfo = STATUS_LABELS[activeThesis?.status || 'draft'] || STATUS_LABELS.draft;

  const copyBibliography = () => {
    const text = bibliographies.map((b, i) => `[${i + 1}] ${b.rawEntry}`).join('\n\n');
    navigator.clipboard.writeText(text);
    showToast('Daftar pustaka di-copy!', 'success');
  };

  // ─── Render ─────────────────────────────────────────────────
  return (
    <AuthGuard requiredFeature="skripsweet">
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content" style={{ animation: 'fadeSlideIn 0.4s ease-out' }}>
            <PullToRefresh onRefresh={refreshAll}>
            <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 'calc(var(--bottom-nav-height, 60px) + 16px)' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Skripsweet</span>
                  </h1>
                  <p style={{ fontSize: 13, color: 'var(--dt-text-secondary)', marginTop: 2 }}>Asisten skripsi AI — dari draft sampai sidang</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {activeThesis && (
                    <>
                      <Button onClick={handleExportThesis} variant="secondary" size="sm" disabled={exporting}>
                        {exporting ? <Loader2 size={13} className="spin" /> : <Download size={13} />} PDF
                      </Button>
                      <Button onClick={handleExportDocx} variant="secondary" size="sm" disabled={exporting}>
                        <Download size={13} /> .doc
                      </Button>
                    </>
                  )}
                  {activeThesis && !activeThesis.isPublished && (
                    <Button onClick={() => { setPublishTags(activeThesis.tags || []); setShowPublishModal(true); }} variant="secondary" size="sm">
                      <Globe size={13} /> Publikasi
                    </Button>
                  )}
                  {activeThesis?.isPublished && (
                    <Button onClick={handleUnpublish} variant="secondary" size="sm" style={{ color: '#22c55e' }}>
                      <Globe size={13} /> Published
                    </Button>
                  )}
                  <Button onClick={() => setShowCreateModal(true)} size="sm"><Plus size={14} /> Proyek Baru</Button>
                </div>
              </div>

              {/* Thesis selector */}
              {theses.length > 1 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
                  {theses.map(t => (
                    <button key={t.id} onClick={() => { setActiveThesisId(t.id); }} style={{
                      padding: '8px 16px', borderRadius: 10, border: activeThesis?.id === t.id ? '1.5px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                      cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 13, fontWeight: activeThesis?.id === t.id ? 700 : 400,
                      background: activeThesis?.id === t.id ? 'rgba(var(--color-primary), 0.06)' : 'transparent',
                      color: activeThesis?.id === t.id ? 'rgb(var(--color-primary))' : 'inherit', transition: 'all 0.2s',
                    }}>{t.title.length > 30 ? t.title.substring(0, 30) + '...' : t.title}</button>
                  ))}
                </div>
              )}

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3].map(n => <div key={n} className="skeleton" style={{ height: 80, borderRadius: 14 }} />)}
                </div>
              ) : !activeThesis && tab !== 'explore' ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <BookOpen size={56} style={{ marginBottom: 16, opacity: 0.4, color: '#6366f1' }} />
                  <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Mulai Perjalanan Skripsimu!</h2>
                  <p style={{ fontSize: 14, opacity: 0.6, maxWidth: 460, margin: '0 auto 28px', lineHeight: 1.7 }}>
                    Asisten lengkap dari draft sampai sidang. Kelola bab, cari jurnal, catat bimbingan, dan export siap serah ke dosen.
                  </p>

                  {/* Step-by-step preview */}
                  <div style={{ maxWidth: 420, margin: '0 auto 28px', textAlign: 'left' }}>
                    {[
                      { step: '1', title: 'Buat proyek & atur format', desc: 'Jelaskan format kampusmu, AI buatkan struktur bab otomatis' },
                      { step: '2', title: 'Tulis tiap bab dengan AI', desc: 'Editor pintar dengan auto-save & AI writing assistant' },
                      { step: '3', title: 'Cari jurnal & generate pustaka', desc: 'Cari di Semantic Scholar, AI format daftar pustaka' },
                      { step: '4', title: 'Export PDF siap sidang', desc: 'Download dokumen lengkap siap diserahkan ke dosen' },
                    ].map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 12, marginBottom: 6, background: 'var(--card-bg)', border: '1px solid var(--border-default)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99, 102, 241, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#6366f1', flexShrink: 0 }}>{s.step}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{s.title}</div>
                          <div style={{ fontSize: 11, opacity: 0.5 }}>{s.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <Button onClick={() => setShowCreateModal(true)} style={{ padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #a855f7)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700 }}><Plus size={16} /> Buat Proyek Skripsi</Button>
                    <Button onClick={() => setTab('explore')} variant="secondary" style={{ padding: '12px 24px', borderRadius: 12 }}><Globe size={16} /> Jelajahi Komunitas</Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Hero Card */}
                  {activeThesis && tab !== 'explore' && (
                    <div style={{ padding: '24px 28px', marginBottom: 20, borderRadius: 20, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.04) 100%)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                      <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.06)' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, position: 'relative' }}>
                        <div style={{ flex: 1 }}>
                          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, lineHeight: 1.3 }}>{activeThesis.title}</h2>
                          <div style={{ display: 'flex', gap: 16, fontSize: 12, opacity: 0.6, flexWrap: 'wrap' }}>
                            {activeThesis.university && <span>🏫 {activeThesis.university}</span>}
                            {activeThesis.department && <span>{activeThesis.department}</span>}
                            {activeThesis.supervisor && <span>{activeThesis.supervisor}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${statusInfo.color}18`, color: statusInfo.color }}>{statusInfo.label}</span>
                          <button onClick={() => setShowFormatModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, padding: 4, borderRadius: 8 }} title="Format"><Edit2 size={14} /></button>
                          <button onClick={handleDeleteThesis} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: 4, borderRadius: 8 }}><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {progress && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8, position: 'relative' }}>
                          {[
                            { value: `${progress.overallProgress}%`, label: 'Progress', color: '#6366f1' },
                            { value: progress.totalWords.toLocaleString(), label: 'Kata', color: '#8b5cf6' },
                            { value: `${progress.doneChapters}/${progress.totalChapters}`, label: 'Bab Selesai', color: '#22c55e' },
                            { value: String(progress.totalJournals), label: 'Jurnal', color: '#f59e0b' },
                            ...(progress.daysRemaining !== null ? [{ value: String(progress.daysRemaining), label: 'Hari Tersisa', color: progress.daysRemaining < 30 ? '#ef4444' : '#6b7280' }] : []),
                          ].map((item, i) => (
                            <div key={i} style={{ padding: '12px 10px', borderRadius: 14, background: 'rgba(var(--bg-primary), 0.7)', backdropFilter: 'blur(8px)', textAlign: 'center', border: '1px solid rgba(var(--color-primary), 0.06)' }}>
                              <div style={{ fontSize: 20, fontWeight: 800, color: item.color, lineHeight: 1.2 }}>{item.value}</div>
                              <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2, fontWeight: 500 }}>{item.label}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {!activeThesis.formatTemplate && (
                        <div onClick={() => setShowFormatModal(true)} style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, cursor: 'pointer', background: 'rgba(245, 158, 11, 0.06)', border: '1.5px dashed rgba(245, 158, 11, 0.4)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                          <Edit2 size={16} style={{ opacity: 0.6 }} />
                          <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>Atur Format Skripsi</div><div style={{ fontSize: 11, opacity: 0.6 }}>Jelaskan format kampusmu, AI otomatis buat struktur bab!</div></div>
                          <ChevronRight size={16} style={{ opacity: 0.4 }} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 24, padding: 4, borderRadius: 14, background: 'var(--input-bg)', overflowX: 'auto' }}>
                    {([
                      { key: 'dashboard', label: 'Dashboard', feature: null },
                      { key: 'chapters', label: 'Bab', feature: null },
                      { key: 'journals', label: 'Jurnal', feature: 'skripsweet_journal' },
                      { key: 'bimbingan', label: 'Bimbingan', feature: 'skripsweet_feedback' },
                      { key: 'bibliography', label: 'Pustaka', feature: 'skripsweet_bibliography' },
                      { key: 'chat', label: 'Chat AI', feature: 'skripsweet_ai_chat' },
                      { key: 'explore', label: 'Komunitas', feature: 'skripsweet_community' },
                    ] as { key: Tab; label: string; feature: string | null }[]).map(t => {
                      const locked = t.feature && !hasFeature(t.feature);
                      return (
                      <button key={t.key} onClick={() => { if (locked) { showToast('Fitur ini belum tersedia di paket kamu. Upgrade yuk! 🔓', 'error'); return; } setTab(t.key); }} style={{
                        padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        fontWeight: tab === t.key ? 600 : 400, fontSize: 13,
                        background: tab === t.key ? 'var(--card-bg)' : 'transparent',
                        color: locked ? 'rgb(var(--text-muted))' : tab === t.key ? 'rgb(var(--color-primary))' : 'inherit',
                        boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                        whiteSpace: 'nowrap', transition: 'all 0.2s', opacity: locked ? 0.55 : 1,
                      }}>{t.label}{locked ? ' 🔒' : ''}</button>
                      );
                    })}
                  </div>

                  {/* ═══════ DASHBOARD ═══════ */}
                  {tab === 'dashboard' && activeThesis && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                      {/* Guided Steps — shows when thesis setup is incomplete */}
                      {(() => {
                        const steps = [
                          { done: !!activeThesis.formatTemplate, label: 'Atur format skripsi', desc: 'Jelaskan format kampusmu, AI otomatis buat struktur bab', action: () => setShowFormatModal(true) },
                          { done: chapters.length > 0, label: 'Tambah bab / chapter', desc: 'Buat bab-bab skripsimu atau gunakan template dari format AI', action: () => setTab('chapters') },
                          { done: chapters.some(c => c.wordCount > 50), label: 'Mulai menulis', desc: 'Klik bab untuk membuka editor & mulai menulis dengan bantuan AI', action: () => { if (chapters[0]) router.push(`/skripsweet/chapter?thesisId=${activeThesis.id}&chapterId=${chapters[0].id}`); } },
                          { done: journals.length > 0, label: 'Cari jurnal referensi', desc: 'Cari jurnal ilmiah dari Semantic Scholar atau tambah manual', action: () => setTab('journals') },
                          { done: bimbingans.length > 0, label: 'Catat bimbingan', desc: 'Log riwayat bimbingan dengan dosen pembimbing', action: () => setTab('bimbingan') },
                          { done: bibliographies.length > 0, label: 'Generate daftar pustaka', desc: 'AI otomatis format daftar pustaka dari jurnal yang sudah dikumpulkan', action: () => setTab('bibliography') },
                        ];
                        const completedCount = steps.filter(s => s.done).length;
                        if (completedCount >= steps.length) return null;
                        return (
                          <Card style={{ padding: '20px 22px', border: '1.5px solid rgba(99, 102, 241, 0.15)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.03), rgba(168, 85, 247, 0.02))' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                Langkah Selanjutnya
                              </h3>
                              <span style={{ fontSize: 11, opacity: 0.5, fontWeight: 600 }}>{completedCount}/{steps.length} selesai</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {steps.map((step, i) => (
                                <div
                                  key={i}
                                  onClick={step.done ? undefined : step.action}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12,
                                    border: `1px solid ${step.done ? 'rgba(34,197,94,0.2)' : 'var(--border-default)'}`,
                                    background: step.done ? 'rgba(34,197,94,0.04)' : 'var(--card-bg)',
                                    cursor: step.done ? 'default' : 'pointer',
                                    opacity: step.done ? 0.6 : 1, transition: 'all 0.2s',
                                  }}
                                >
                                  <span style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: step.done ? '#22c55e' : 'var(--input-bg)', color: step.done ? '#fff' : 'inherit', fontSize: 11, fontWeight: 700 }}>{step.done ? <Check size={12} /> : (i + 1)}</span>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, textDecoration: step.done ? 'line-through' : 'none' }}>{step.label}</div>
                                    {!step.done && <div style={{ fontSize: 11, opacity: 0.5, marginTop: 1 }}>{step.desc}</div>}
                                  </div>
                                  {!step.done && <ChevronRight size={16} style={{ opacity: 0.3, flexShrink: 0 }} />}
                                </div>
                              ))}
                            </div>
                          </Card>
                        );
                      })()}

                      {progress && (<>
                      <Card style={{ padding: '20px 22px' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={18} /> Progress per Bab</h3>
                        {progress.chapterProgress.length === 0 ? (
                          <p style={{ opacity: 0.5, fontSize: 14 }}>Belum ada bab. Atur format atau tambah bab manual.</p>
                        ) : progress.chapterProgress.map(ch => {
                          const st = CHAPTER_STATUS[ch.status] || CHAPTER_STATUS.not_started;
                          return (
                            <div key={ch.id} style={{ marginBottom: 14 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>{ch.title}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${st.color}15`, color: st.color, fontWeight: 700 }}>{st.label}</span>
                                  <span style={{ fontSize: 11, opacity: 0.4 }}>{ch.wordCount.toLocaleString()} kata</span>
                                </div>
                              </div>
                              <div style={{ height: 8, borderRadius: 4, background: 'var(--input-bg)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: 4, width: `${ch.progress}%`, background: ch.status === 'done' ? 'linear-gradient(90deg, #22c55e, #4ade80)' : `linear-gradient(90deg, ${st.color}, ${st.color}88)`, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
                              </div>
                            </div>
                          );
                        })}
                      </Card>
                      {progress.pendingActions.length > 0 && (
                        <Card style={{ padding: '20px 22px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardList size={18} /> Action Items</h3>
                          {progress.pendingActions.map((item, i) => (
                            <div key={i} style={{ fontSize: 13, padding: '10px 14px', borderRadius: 10, background: 'rgba(245, 158, 11, 0.06)', marginBottom: 6, borderLeft: '3px solid #f59e0b' }}>{String(item)}</div>
                          ))}
                        </Card>
                      )}
                      </>)}
                    </div>
                  )}

                  {/* ═══════ CHAPTERS ═══════ */}
                  {tab === 'chapters' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                        <Button onClick={() => setShowChapterModal(true)} size="sm"><Plus size={14} /> Tambah Bab</Button>
                      </div>
                      {chapters.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                          <FileText size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Belum ada bab</h3>
                          <p style={{ opacity: 0.5, fontSize: 13, maxWidth: 360, margin: '0 auto 20px', lineHeight: 1.6 }}>
                            Kamu bisa buat bab manual atau jelaskan format skripsi kampusmu agar AI otomatis membuat struktur bab.
                          </p>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <Button onClick={() => setShowChapterModal(true)} size="sm"><Plus size={14} /> Tambah Manual</Button>
                            <Button onClick={() => setShowFormatModal(true)} variant="secondary" size="sm">Atur Format</Button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {chapters.map(ch => {
                            const st = CHAPTER_STATUS[ch.status] || CHAPTER_STATUS.not_started;
                            const wordPct = ch.targetWords ? Math.min(Math.round((ch.wordCount / ch.targetWords) * 100), 100) : 0;
                            const pagePct = ch.targetPages ? Math.min(Math.round((ch.pageEstimate / ch.targetPages) * 100), 100) : 0;
                            const paraPct = ch.targetParagraphs ? Math.min(Math.round((ch.paragraphCount / ch.targetParagraphs) * 100), 100) : 0;
                            return (
                              <Card key={ch.id} style={{ padding: 0, borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
                                <div style={{ borderLeft: `4px solid ${st.color}`, padding: '18px 20px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <span style={{ fontWeight: 700, fontSize: 15 }}>{ch.title}</span>
                                        <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: `${st.color}12`, color: st.color, fontWeight: 700 }}>{st.label}</span>
                                      </div>
                                      {/* Stats row */}
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                                        <div style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--input-bg)', fontSize: 11 }}>
                                          <div style={{ opacity: 0.5 }}>Kata</div>
                                          <div style={{ fontWeight: 700, fontSize: 14 }}>{ch.wordCount.toLocaleString()}{ch.targetWords ? <span style={{ opacity: 0.4, fontWeight: 400 }}>/{ch.targetWords}</span> : ''}</div>
                                          {ch.targetWords && <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.06)', marginTop: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${wordPct}%`, background: wordPct >= 100 ? '#22c55e' : st.color, borderRadius: 2 }} /></div>}
                                        </div>
                                        <div style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--input-bg)', fontSize: 11 }}>
                                          <div style={{ opacity: 0.5 }}>Halaman</div>
                                          <div style={{ fontWeight: 700, fontSize: 14 }}>{ch.pageEstimate}{ch.targetPages ? <span style={{ opacity: 0.4, fontWeight: 400 }}>/{ch.targetPages}</span> : ''}</div>
                                          {ch.targetPages && <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.06)', marginTop: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${pagePct}%`, background: pagePct >= 100 ? '#22c55e' : '#8b5cf6', borderRadius: 2 }} /></div>}
                                        </div>
                                        <div style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--input-bg)', fontSize: 11 }}>
                                          <div style={{ opacity: 0.5 }}>¶ Paragraf</div>
                                          <div style={{ fontWeight: 700, fontSize: 14 }}>{ch.paragraphCount}{ch.targetParagraphs ? <span style={{ opacity: 0.4, fontWeight: 400 }}>/{ch.targetParagraphs}</span> : ''}</div>
                                          {ch.targetParagraphs && <div style={{ height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.06)', marginTop: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${paraPct}%`, background: paraPct >= 100 ? '#22c55e' : '#22c55e80', borderRadius: 2 }} /></div>}
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ width: 110, flexShrink: 0 }}>
                                      <SelectOption value={ch.status} onChange={(v) => handleUpdateChapterStatus(ch.id, v)} options={Object.entries(CHAPTER_STATUS).map(([k, v]) => ({ value: k, label: v.label }))} placeholder="Status" />
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <Button size="sm" variant="secondary" onClick={() => router.push(`/skripsweet/chapter?thesisId=${activeThesis!.id}&chapterId=${ch.id}`)} style={{ fontSize: 11, borderRadius: 10 }}>
                                      <Edit2 size={12} /> Buka Editor
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={() => setRevisionModal({ chapterId: ch.id, chapterTitle: ch.title })} style={{ fontSize: 11, borderRadius: 10 }}>
                                      <AlertCircle size={12} /> Revisi
                                    </Button>
                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, alignItems: 'center' }}>
                                      {chapters.length > 1 && (
                                        <>
                                          <button onClick={() => handleReorderChapter(ch.id, 'up')} title="Geser ke atas" style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: '6px 0 0 6px', cursor: 'pointer', opacity: 0.4, padding: '4px 6px', display: 'flex' }}><ChevronUp size={12} /></button>
                                          <button onClick={() => handleReorderChapter(ch.id, 'down')} title="Geser ke bawah" style={{ background: 'none', border: '1px solid var(--border-default)', borderLeft: 'none', borderRadius: '0 6px 6px 0', cursor: 'pointer', opacity: 0.4, padding: '4px 6px', display: 'flex' }}><ChevronDown size={12} /></button>
                                        </>
                                      )}
                                      <button onClick={() => handleDeleteChapter(ch.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: 6 }}><Trash2 size={13} /></button>
                                    </div>
                                  </div>
                                  {/* Revisions */}
                                  {ch.revisions && ch.revisions.length > 0 && (
                                    <div style={{ marginTop: 12 }}>
                                      <button
                                        onClick={() => setExpandedRevisions(expandedRevisions === ch.id ? null : ch.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#ef4444', padding: 0 }}
                                      >
                                        <AlertCircle size={13} />
                                        {ch.revisions.filter(r => r.status === 'pending').length} revisi belum selesai
                                        <span style={{ opacity: 0.4, fontWeight: 400 }}>dari {ch.revisions.length} total</span>
                                        {expandedRevisions === ch.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                      </button>
                                      {expandedRevisions === ch.id && (
                                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                          {ch.revisions.map(rev => (
                                            <div key={rev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', borderRadius: 10, background: rev.status === 'pending' ? 'rgba(239, 68, 68, 0.04)' : 'rgba(34, 197, 94, 0.04)', border: `1px solid ${rev.status === 'pending' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)'}` }}>
                                              <button
                                                onClick={() => handleToggleRevision(ch.id, rev)}
                                                style={{ marginTop: 2, width: 18, height: 18, borderRadius: 4, border: `2px solid ${rev.status === 'pending' ? '#ef4444' : '#22c55e'}`, background: rev.status === 'resolved' ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, padding: 0 }}
                                              >
                                                {rev.status === 'resolved' && <Check size={11} color="#fff" />}
                                              </button>
                                              <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 13, lineHeight: 1.5, textDecoration: rev.status === 'resolved' ? 'line-through' : 'none', opacity: rev.status === 'resolved' ? 0.5 : 1 }}>{rev.note}</div>
                                                <div style={{ fontSize: 10, opacity: 0.4, marginTop: 2 }}>
                                                  Revisi ke-{rev.round} · {new Date(rev.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                  {rev.resolvedAt && ` · Selesai ${new Date(rev.resolvedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                                                </div>
                                              </div>
                                              <button onClick={() => handleDeleteRevision(ch.id, rev.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.2, padding: 4, flexShrink: 0 }}><Trash2 size={11} /></button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ═══════ JOURNALS (Inline search) ═══════ */}
                  {tab === 'journals' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setJournalSearchMode('list')} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: journalSearchMode === 'list' ? 700 : 400, background: journalSearchMode === 'list' ? 'var(--card-bg)' : 'transparent', boxShadow: journalSearchMode === 'list' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none' }}>Koleksi ({journals.length})</button>
                          <button onClick={() => setJournalSearchMode('search')} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: journalSearchMode === 'search' ? 700 : 400, background: journalSearchMode === 'search' ? 'var(--card-bg)' : 'transparent', boxShadow: journalSearchMode === 'search' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none' }}>Cari Jurnal</button>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button onClick={handleGetMatrix} variant="secondary" size="sm" disabled={matrixLoading || journals.length === 0}>
                            {matrixLoading ? <Loader2 size={13} className="spin" /> : <BarChart3 size={13} />} Matrix
                          </Button>
                          <Button onClick={() => setShowJournalModal(true)} size="sm"><Plus size={14} /> Manual</Button>
                        </div>
                      </div>

                      {journalSearchMode === 'search' && (
                        <div style={{ marginBottom: 20 }}>
                          <Card style={{ padding: '16px 20px', borderRadius: 16, background: 'rgba(99, 102, 241, 0.02)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                            <p style={{ fontSize: 12, opacity: 0.6, margin: '0 0 10px' }}>Cari dari database Semantic Scholar. Gunakan kata kunci dalam <strong>bahasa Inggris</strong> untuk hasil terbaik.</p>
                            <div style={{ display: 'flex', gap: 8 }} onKeyDown={(e) => { if (e.key === 'Enter') handleSearchJournals(); }}>
                              <div style={{ flex: 1 }}><TextInput value={journalSearchQuery} onChange={setJournalSearchQuery} placeholder="e.g. machine learning education prediction" /></div>
                              <Button onClick={handleSearchJournals} disabled={journalSearching || !journalSearchQuery.trim()}>{journalSearching ? <Loader2 size={14} className="spin" /> : <Search size={14} />} Cari</Button>
                            </div>
                          </Card>
                          {journalSearchResults.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                              <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>{journalSearchResults.length} hasil ditemukan</div>
                              {journalSearchResults.map((r, i) => (
                                <Card key={i} style={{ padding: '14px 18px', borderRadius: 14 }}>
                                  <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, lineHeight: 1.4 }}>{r.title}</div>
                                      <div style={{ fontSize: 11, opacity: 0.6 }}>{r.authors && `${r.authors} • `}{r.year && `${r.year} • `}{r.journalName}</div>
                                      {r.citationCount !== undefined && r.citationCount > 0 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(var(--color-primary), 0.08)', marginTop: 6, display: 'inline-block' }}>{r.citationCount} citations</span>}
                                      {r.abstract && <p style={{ fontSize: 11, opacity: 0.5, marginTop: 4, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.abstract}</p>}
                                    </div>
                                    <Button size="sm" variant="secondary" onClick={() => handleAddFromSearch(r)} style={{ fontSize: 11, flexShrink: 0, alignSelf: 'center' }}><Plus size={12} /> Tambah</Button>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {journalSearchMode === 'list' && (
                        journals.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                            <BookOpen size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Belum ada referensi jurnal</h3>
                            <p style={{ opacity: 0.5, fontSize: 13, maxWidth: 360, margin: '0 auto 20px', lineHeight: 1.6 }}>
                              Cari jurnal ilmiah dari Semantic Scholar atau tambah manual. Gunakan kata kunci bahasa Inggris untuk hasil terbaik.
                            </p>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                              <Button onClick={() => setJournalSearchMode('search')} size="sm"><Search size={14} /> Mulai Cari Jurnal</Button>
                              <Button onClick={() => setShowJournalModal(true)} variant="secondary" size="sm"><Plus size={14} /> Tambah Manual</Button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {journals.map((j, idx) => (
                              <Card key={j.id} style={{ padding: '16px 20px', borderRadius: 16 }}>
                                <div style={{ display: 'flex', gap: 14 }}>
                                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: j.isFromSearch ? 'rgba(99, 102, 241, 0.08)' : 'rgba(245, 158, 11, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                                    {j.isFromSearch ? <Search size={14} /> : <FileText size={14} />}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, lineHeight: 1.4 }}>[{idx + 1}] {j.title}</h4>
                                    <div style={{ display: 'flex', gap: 12, fontSize: 11, opacity: 0.6, flexWrap: 'wrap' }}>
                                      {j.authors && <span>{j.authors}</span>}
                                      {j.year && <span>{j.year}</span>}
                                      {j.journalName && <span style={{ fontStyle: 'italic' }}>{j.journalName}</span>}
                                    </div>
                                    {j.relevance && <div style={{ marginTop: 6, fontSize: 12, padding: '6px 10px', borderRadius: 8, background: 'rgba(var(--color-primary), 0.04)', borderLeft: '3px solid rgb(var(--color-primary))' }}>{j.relevance}</div>}
                                    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                                      {j.citationKey && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'var(--input-bg)', fontFamily: 'monospace' }}>{j.citationKey}</span>}
                                      {j.doi && <a href={`https://doi.org/${j.doi}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'rgb(var(--color-primary))', display: 'flex', alignItems: 'center', gap: 2 }}><ExternalLink size={10} /> DOI</a>}
                                    </div>
                                  </div>
                                  <button onClick={() => handleRemoveJournal(j.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.2, padding: 4, flexShrink: 0, alignSelf: 'flex-start' }}><Trash2 size={14} /></button>
                                  <button onClick={() => startEditJournal(j)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: 4, flexShrink: 0, alignSelf: 'flex-start' }} title="Edit jurnal"><Pencil size={13} /></button>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* ═══════ BIMBINGAN ═══════ */}
                  {tab === 'bimbingan' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                        <Button onClick={() => setShowBimbinganModal(true)} size="sm"><Plus size={14} /> Catat Bimbingan</Button>
                      </div>
                      {bimbingans.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                          <ClipboardList size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Belum ada log bimbingan</h3>
                          <p style={{ opacity: 0.5, fontSize: 13, maxWidth: 360, margin: '0 auto 20px', lineHeight: 1.6 }}>
                            Catat setiap pertemuan bimbingan dengan dosen pembimbing. Simpan feedback, action items, dan status progres.
                          </p>
                          <Button onClick={() => setShowBimbinganModal(true)} size="sm"><Plus size={14} /> Catat Bimbingan Pertama</Button>
                        </div>
                      ) : (
                        <div style={{ position: 'relative', paddingLeft: 24 }}>
                          <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: 'var(--border-default)' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {bimbingans.map(b => {
                              let actions: string[] = [];
                              try { actions = b.actionItems ? JSON.parse(b.actionItems) : []; } catch { }
                              return (
                                <div key={b.id} style={{ position: 'relative' }}>
                                  <div style={{ position: 'absolute', left: -20, top: 8, width: 12, height: 12, borderRadius: '50%', background: b.status === 'done' ? '#22c55e' : '#f59e0b', border: '2px solid var(--card-bg)' }} />
                                  <Card style={{ padding: '16px 20px', borderRadius: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                          <span style={{ fontWeight: 700, fontSize: 14 }}>{b.topic}</span>
                                          {b.status === 'done' && <span style={{ fontSize: 10, background: '#22c55e22', color: '#22c55e', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>SELESAI</span>}
                                        </div>
                                        <div style={{ display: 'flex', gap: 12, fontSize: 12, opacity: 0.5 }}>
                                          <span>{new Date(b.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                          {b.supervisor && <span>Pembimbing {b.supervisor}</span>}
                                        </div>
                                        {b.feedback && <div style={{ marginTop: 10, fontSize: 13, padding: '10px 14px', borderRadius: 12, background: 'var(--input-bg)', lineHeight: 1.6 }}><HtmlRenderer content={b.feedback} compact /></div>}
                                        {actions.length > 0 && (
                                          <div style={{ marginTop: 10 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.5 }}>Action Items:</span>
                                            <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12, lineHeight: 1.8 }}>
                                              {actions.map((a, i) => <li key={i}>{String(a)}</li>)}
                                            </ul>
                                          </div>
                                        )}
                                        {/* Attachment section */}
                                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                          {b.attachment ? (
                                            <a href={b.attachment} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 4 }}>
                                              <FileText size={12} /> Lampiran
                                            </a>
                                          ) : (
                                            <label style={{ fontSize: 11, opacity: 0.4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                              <Upload size={12} /> Upload lampiran
                                              <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadBimbinganFile(b.id, f); }} />
                                            </label>
                                          )}
                                        </div>
                                      </div>
                                      <div style={{ display: 'flex', gap: 4 }}>
                                        {b.status !== 'done' && <Button size="sm" onClick={() => handleMarkBimbinganDone(b.id)} style={{ fontSize: 11, borderRadius: 10 }}><Check size={12} /></Button>}
                                        <button onClick={() => startEditBimbingan(b)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 6 }} title="Edit"><Pencil size={13} /></button>
                                        <button onClick={() => handleDeleteBimbingan(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: 6 }}><Trash2 size={13} /></button>
                                      </div>
                                    </div>
                                  </Card>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ═══════ BIBLIOGRAPHY ═══════ */}
                  {tab === 'bibliography' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                        <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, opacity: 0.5, fontWeight: 500 }}>Format:</span>
                          <SelectOption value={bibStyle} onChange={setBibStyle} options={[
                            { value: 'apa7', label: 'APA 7th' },
                            { value: 'ieee', label: 'IEEE' },
                            { value: 'chicago', label: 'Chicago' },
                            { value: 'vancouver', label: 'Vancouver' },
                            { value: 'harvard', label: 'Harvard' },
                          ]} />
                        </div>
                        {bibliographies.length > 0 && <Button onClick={copyBibliography} variant="secondary" size="sm"><Copy size={13} /> Copy All</Button>}
                        <Button onClick={handleGenerateBibliography} variant="secondary" size="sm" disabled={submitting || journals.length === 0}>
                          {submitting ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Generate
                        </Button>
                      </div>
                      {bibliographies.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                          <BookMarked size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Belum ada daftar pustaka</h3>
                          <p style={{ opacity: 0.5, fontSize: 13, maxWidth: 380, margin: '0 auto 8px', lineHeight: 1.6 }}>
                            {journals.length > 0
                              ? `Kamu sudah punya ${journals.length} jurnal referensi. Klik Generate untuk membuat daftar pustaka otomatis dengan format APA/IEEE.`
                              : 'Tambahkan jurnal referensi terlebih dahulu di tab "Jurnal", lalu kembali ke sini untuk generate daftar pustaka otomatis.'}
                          </p>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                            {journals.length > 0 ? (
                              <Button onClick={handleGenerateBibliography} disabled={submitting}>
                                {submitting ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Generate Daftar Pustaka
                              </Button>
                            ) : (
                              <Button onClick={() => setTab('journals')} size="sm"><BookOpen size={14} /> Tambah Jurnal Dulu</Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <Card style={{ padding: '24px 28px', borderRadius: 18 }}>
                          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Daftar Pustaka ({activeThesis?.formatTemplate?.citationStyle?.toUpperCase() || 'APA7'})</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {bibliographies.map((bib, i) => (
                              <div key={bib.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 10, background: i % 2 === 0 ? 'var(--input-bg)' : 'transparent' }}>
                                <span style={{ fontSize: 12, opacity: 0.3, fontWeight: 700, minWidth: 28, fontFamily: 'monospace' }}>[{i + 1}]</span>
                                <p style={{ flex: 1, fontSize: 13, lineHeight: 1.7, margin: 0 }}>{bib.rawEntry}</p>
                                <button onClick={() => { if (activeThesis) skripsweetService.deleteBibliographyEntry(activeThesis.id, bib.id).then(refreshAll); }} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.2, padding: 4 }}><X size={12} /></button>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* ═══════ CHAT AI ═══════ */}
                  {tab === 'chat' && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 300px)', minHeight: 400 }}>
                      {chapters.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <SelectOption value={chatContext} onChange={setChatContext} placeholder="Konteks bab (opsional)"
                            options={[{ value: '', label: 'Umum (semua konteks)' }, ...chapters.map(c => ({ value: c.id, label: c.title }))]} />
                        </div>
                      )}
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 4px', background: 'rgba(var(--bg-primary), 0.3)', borderRadius: 16, marginBottom: 12 }}>
                        {chatMessages.length === 0 && !chatLoading && (
                          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                            <MessageSquare size={36} style={{ marginBottom: 12, opacity: 0.2 }} />
                            <p style={{ fontSize: 15, fontWeight: 600, opacity: 0.5 }}>Chat dengan AI Skripsweet</p>
                            <p style={{ fontSize: 12, opacity: 0.35, maxWidth: 300, margin: '4px auto 16px' }}>AI yang paham konteks skripsimu — tanya soal penulisan, cari referensi, atau minta review.</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                              {['Bagaimana cara menulis latar belakang?', 'Review bab 1 saya', 'Carikan referensi machine learning', 'Bantu buat kerangka berpikir'].map(q => (
                                <button key={q} onClick={() => setChatInput(q)} style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid var(--border-default)', background: 'transparent', cursor: 'pointer', fontSize: 11, opacity: 0.6 }}>{q}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        {chatMessages.map(msg => (
                          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', padding: '0 12px' }}>
                            <div style={{ display: 'flex', gap: 8, maxWidth: '85%', alignItems: 'flex-start' }}>
                              {msg.role === 'assistant' && <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, color: '#fff', fontWeight: 800 }}>AI</div>}
                              <div style={{
                                padding: msg.role === 'assistant' ? '14px 18px' : '12px 18px', borderRadius: 18,
                                background: msg.role === 'user' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgb(var(--bg-surface))',
                                color: msg.role === 'user' ? '#fff' : 'inherit',
                                border: msg.role === 'assistant' ? '1px solid var(--border-default)' : 'none',
                                borderTopLeftRadius: msg.role === 'assistant' ? 4 : 18,
                                borderTopRightRadius: msg.role === 'user' ? 4 : 18,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                              }}>
                                {msg.role === 'assistant' ? <MarkdownRenderer content={msg.content} compact /> : <span style={{ fontSize: 14, lineHeight: 1.6 }}>{msg.content}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                        {chatLoading && (
                          <div style={{ display: 'flex', padding: '0 12px', gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, color: '#fff', fontWeight: 800 }}>AI</div>
                            <div style={{ padding: '14px 18px', borderRadius: 18, borderTopLeftRadius: 4, background: 'rgb(var(--bg-surface))', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ display: 'flex', gap: 4 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', opacity: 0.4, animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />)}</div>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, padding: '12px 0' }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}>
                        <div style={{ flex: 1 }}><TextInput value={chatInput} onChange={setChatInput} placeholder="Tanya AI soal skripsimu..." /></div>
                        <button onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()} style={{ width: 44, height: 44, borderRadius: 14, border: 'none', cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer', background: chatInput.trim() ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'var(--input-bg)', color: chatInput.trim() ? '#fff' : 'var(--dt-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', opacity: chatLoading ? 0.5 : 1 }}><Send size={18} /></button>
                      </div>
                    </div>
                  )}

                  {/* ═══════ EXPLORE / COMMUNITY ═══════ */}
                  {tab === 'explore' && (
                    <div>
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ flex: 1 }}><TextInput value={exploreQuery2} onChange={setExploreQuery2} placeholder="Cari skripsi, topik, universitas..." /></div>
                        </div>
                        {trendingTags.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, opacity: 0.4, display: 'flex', alignItems: 'center', gap: 4 }}><TrendingUp size={12} /> Trending:</span>
                            {trendingTags.slice(0, 10).map(t => (
                              <button key={t.tag} onClick={() => setExploreTag(exploreTag === t.tag ? '' : t.tag)} style={{ padding: '4px 10px', borderRadius: 20, border: exploreTag === t.tag ? '1.5px solid rgb(var(--color-primary))' : '1px solid var(--border-default)', background: exploreTag === t.tag ? 'rgba(var(--color-primary), 0.06)' : 'transparent', cursor: 'pointer', fontSize: 11, color: exploreTag === t.tag ? 'rgb(var(--color-primary))' : 'inherit' }}>#{t.tag} <span style={{ opacity: 0.4 }}>({t.count})</span></button>
                            ))}
                          </div>
                        )}
                      </div>
                      {exploreLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[1, 2, 3].map(n => <div key={n} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}</div>
                      ) : !exploreData?.items.length ? (
                        <div style={{ textAlign: 'center', padding: 48 }}><Globe size={48} style={{ opacity: 0.15, marginBottom: 12 }} /><p style={{ opacity: 0.6, fontSize: 15 }}>Belum ada skripsi yang dipublikasikan</p></div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                          {exploreData.items.map(thesis => (
                            <Card key={thesis.id} style={{ padding: 0, borderRadius: 18, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleViewPublic(thesis.id)}>
                              <div style={{ height: 4, background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)' }} />
                              <div style={{ padding: '18px 20px' }}>
                                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                                  <UserAvatar name={thesis.user?.fullName || ''} avatarUrl={thesis.user?.avatarUrl} size={36} />
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>{thesis.user?.fullName}</div>
                                    <div style={{ fontSize: 11, opacity: 0.4 }}>{thesis.university || ''} • {thesis.department || ''}</div>
                                  </div>
                                </div>
                                <h4 style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{thesis.title}</h4>
                                {thesis.tags.length > 0 && (
                                  <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                                    {thesis.tags.slice(0, 3).map(tag => <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(var(--color-primary), 0.06)', color: 'rgb(var(--color-primary))' }}>#{tag}</span>)}
                                  </div>
                                )}
                                <div style={{ display: 'flex', gap: 16, fontSize: 12, opacity: 0.5, borderTop: '1px solid var(--border-default)', paddingTop: 10 }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: thesis.isLiked ? '#ef4444' : 'inherit' }} onClick={(e) => { e.stopPropagation(); handleToggleLike(thesis.id); }}><Heart size={13} fill={thesis.isLiked ? '#ef4444' : 'none'} /> {thesis._count?.likes || 0}</span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MessageSquare size={13} /> {thesis._count?.comments || 0}</span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={13} /> {thesis.viewCount}</span>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

            </div>
            </PullToRefresh>

            {/* ═══════ MODALS ═══════ */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Buat Proyek Skripsi Baru">
              <form onSubmit={handleCreateThesis} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 12, opacity: 0.5, margin: '0 0 4px', lineHeight: 1.5 }}>Isi minimal judul saja, data lain bisa dilengkapi nanti. Setelah dibuat, kamu bisa atur format kampus agar AI buat struktur bab otomatis.</p>
                <TextInput label="Judul Skripsi *" value={thesisForm.title} onChange={v => setThesisForm(f => ({ ...f, title: v }))} placeholder="Analisis Pengaruh..." required />
                <TextInput label="Universitas" value={thesisForm.university} onChange={v => setThesisForm(f => ({ ...f, university: v }))} placeholder="Universitas Indonesia" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <TextInput label="Fakultas" value={thesisForm.faculty} onChange={v => setThesisForm(f => ({ ...f, faculty: v }))} placeholder="Fakultas Teknik" />
                  <TextInput label="Program Studi" value={thesisForm.department} onChange={v => setThesisForm(f => ({ ...f, department: v }))} placeholder="Teknik Informatika" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <TextInput label="Pembimbing 1" value={thesisForm.supervisor} onChange={v => setThesisForm(f => ({ ...f, supervisor: v }))} placeholder="Dr. ..." />
                  <TextInput label="Pembimbing 2" value={thesisForm.supervisorTwo} onChange={v => setThesisForm(f => ({ ...f, supervisorTwo: v }))} placeholder="Dr. ..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Mulai</label><DateTimePicker mode="date" value={thesisForm.startDate} onChange={v => setThesisForm(f => ({ ...f, startDate: v }))} placeholder="Tanggal mulai" /></div>
                  <div><label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Target Selesai</label><DateTimePicker mode="date" value={thesisForm.targetDate} onChange={v => setThesisForm(f => ({ ...f, targetDate: v }))} placeholder="Deadline" /></div>
                </div>
                <TextArea label="Abstrak (opsional)" value={thesisForm.abstract} onChange={v => setThesisForm(f => ({ ...f, abstract: v }))} placeholder="Tulis abstrak skripsimu..." rows={4} />
                <Button type="submit" disabled={submitting} style={{ borderRadius: 12, padding: '12px 0', marginTop: 4 }}>{submitting ? <Loader2 className="spin" size={16} /> : 'Buat Proyek'}</Button>
              </form>
            </Modal>

            {/* Format Modal - uses TextArea instead of RichTextEditor for plain text to AI */}
            <Modal isOpen={showFormatModal} onClose={() => { setShowFormatModal(false); setFormatMode('text'); }} title="Atur Format Skripsi Kampusmu">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, opacity: 0.6, margin: 0, lineHeight: 1.6 }}>Jelaskan format skripsi atau upload contoh file skripsi kampusmu. AI akan menganalisis strukturnya.</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <button onClick={() => setFormatMode('text')} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: formatMode === 'text' ? '#6366f1' : 'var(--input-bg)', color: formatMode === 'text' ? '#fff' : 'inherit', transition: 'all .15s' }}>Jelaskan Format</button>
                  <button onClick={() => setFormatMode('file')} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: formatMode === 'file' ? '#6366f1' : 'var(--input-bg)', color: formatMode === 'file' ? '#fff' : 'inherit', transition: 'all .15s' }}>Upload Contoh Skripsi</button>
                </div>
                {formatMode === 'text' ? (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {[
                        'Margin: kiri 4cm, atas bawah kanan 3cm. Font TNR 12pt, spasi 1.5.',
                        'Format APA 7th edition, judul bab huruf kapital rata tengah.',
                        'Struktur: Pendahuluan, Tinjauan Pustaka, Metodologi, Hasil & Pembahasan, Kesimpulan.',
                      ].map((ex, i) => (
                        <button key={i} type="button" onClick={() => setFormatExplanation(prev => prev ? prev + '\n' + ex : ex)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, background: 'var(--input-bg)', opacity: 0.7 }}>+ {ex.substring(0, 50)}...</button>
                      ))}
                    </div>
                    <TextArea value={formatExplanation} onChange={setFormatExplanation} placeholder="Contoh: Di kampus saya, margin kiri 4cm, atas/bawah/kanan 3cm. Font Times New Roman 12pt, spasi 1.5. Struktur: BAB I Pendahuluan, BAB II Tinjauan Pustaka, BAB III Metode Penelitian, BAB IV Hasil, BAB V Kesimpulan." rows={6} />
                    <Button onClick={handleExplainFormat} disabled={submitting || !formatExplanation.trim()} style={{ borderRadius: 12, padding: '12px 0' }}>
                      {submitting ? <Loader2 className="spin" size={16} /> : <><Sparkles size={16} /> Parse Format dengan AI</>}
                    </Button>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '20px 0' }}>
                    <div style={{ padding: '30px 40px', borderRadius: 16, border: '2px dashed var(--border-color)', textAlign: 'center', cursor: 'pointer', width: '100%' }} onClick={() => formatFileRef.current?.click()}>
                      <Upload size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Klik untuk pilih file</div>
                      <div style={{ fontSize: 12, opacity: 0.5 }}>PDF hasil skripsi contoh dari kampusmu</div>
                    </div>
                    <input ref={formatFileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadFormatFile(f); }} />
                    <p style={{ fontSize: 11, opacity: 0.4, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>AI akan membaca struktur bab, format, dan aturan penulisan dari file contoh skripsi.</p>
                  </div>
                )}
              </div>
            </Modal>

            {/* Add Chapter */}
            <Modal isOpen={showChapterModal} onClose={() => setShowChapterModal(false)} title="Tambah Bab">
              <form onSubmit={handleCreateChapter} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <TextInput label="Judul Bab" value={chapterForm.title} onChange={v => setChapterForm(f => ({ ...f, title: v }))} placeholder="BAB I - Pendahuluan" required />
                <TextInput label="Nomor Bab" value={chapterForm.chapterNum} onChange={v => setChapterForm(f => ({ ...f, chapterNum: v.replace(/\D/g, '') }))} placeholder="1" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <TextInput label="Target Kata" value={chapterForm.targetWords} onChange={v => setChapterForm(f => ({ ...f, targetWords: v.replace(/\D/g, '') }))} placeholder="3000" />
                  <TextInput label="Target Halaman" value={chapterForm.targetPages} onChange={v => setChapterForm(f => ({ ...f, targetPages: v.replace(/\D/g, '') }))} placeholder="12" />
                  <TextInput label="Target Paragraf" value={chapterForm.targetParagraphs} onChange={v => setChapterForm(f => ({ ...f, targetParagraphs: v.replace(/\D/g, '') }))} placeholder="30" />
                </div>
                <Button type="submit" disabled={submitting} style={{ borderRadius: 12, padding: '12px 0' }}>{submitting ? <Loader2 className="spin" size={16} /> : 'Tambah Bab'}</Button>
              </form>
            </Modal>

            {/* Add Revision */}
            <Modal isOpen={!!revisionModal} onClose={() => { setRevisionModal(null); setRevisionNote(''); }} title={`Tambah Revisi — ${revisionModal?.chapterTitle || ''}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, opacity: 0.6, margin: 0, lineHeight: 1.6 }}>Catat apa yang perlu direvisi di bab ini berdasarkan feedback dosen.</p>
                <TextArea value={revisionNote} onChange={setRevisionNote} placeholder="Contoh: Tambahkan pembahasan teori X di sub-bab 2.3, perkuat argumen metodologi..." rows={4} />
                <Button onClick={handleAddRevision} disabled={submitting || !revisionNote.trim()} style={{ borderRadius: 12, padding: '12px 0' }}>
                  {submitting ? <Loader2 className="spin" size={16} /> : 'Tambah Revisi'}
                </Button>
              </div>
            </Modal>

            {/* Add Journal Manual */}
            <Modal isOpen={showJournalModal} onClose={() => { setShowJournalModal(false); setEditingJournal(null); setJournalForm({ title: '', authors: '', journalName: '', year: '', doi: '', url: '', abstract: '', relevance: '', citationKey: '' }); }} title={editingJournal ? 'Edit Jurnal' : 'Tambah Jurnal Manual'}>
              <form onSubmit={editingJournal ? handleUpdateJournal : handleAddJournal} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <TextInput label="Judul Paper" value={journalForm.title} onChange={v => setJournalForm(f => ({ ...f, title: v }))} placeholder="Judul paper..." required />
                <TextInput label="Penulis" value={journalForm.authors} onChange={v => setJournalForm(f => ({ ...f, authors: v }))} placeholder="Smith, J., Doe, A." />
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                  <TextInput label="Nama Jurnal" value={journalForm.journalName} onChange={v => setJournalForm(f => ({ ...f, journalName: v }))} placeholder="IEEE Access" />
                  <TextInput label="Tahun" value={journalForm.year} onChange={v => setJournalForm(f => ({ ...f, year: v }))} placeholder="2024" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <TextInput label="DOI" value={journalForm.doi} onChange={v => setJournalForm(f => ({ ...f, doi: v }))} placeholder="10.1234/..." />
                  <TextInput label="Citation Key" value={journalForm.citationKey} onChange={v => setJournalForm(f => ({ ...f, citationKey: v }))} placeholder="Smith2024" />
                </div>
                <TextInput label="URL" value={journalForm.url} onChange={v => setJournalForm(f => ({ ...f, url: v }))} placeholder="https://..." />
                <TextArea label="Relevansi" value={journalForm.relevance} onChange={v => setJournalForm(f => ({ ...f, relevance: v }))} placeholder="Mengapa relevan dengan skripsi..." rows={2} />
                <Button type="submit" disabled={submitting} style={{ borderRadius: 12, padding: '12px 0' }}>{submitting ? <Loader2 className="spin" size={16} /> : editingJournal ? 'Perbarui Jurnal' : 'Simpan'}</Button>
              </form>
            </Modal>

            {/* Bimbingan Modal */}
            <Modal isOpen={showBimbinganModal} onClose={() => { setShowBimbinganModal(false); setEditingBimbingan(null); setBimbinganForm({ date: '', supervisor: '', topic: '', feedback: '', actionItems: '' }); }} title={editingBimbingan ? 'Edit Bimbingan' : 'Catat Bimbingan'}>
              <form onSubmit={editingBimbingan ? handleSaveBimbingan : handleCreateBimbingan} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Tanggal</label><DateTimePicker mode="date" value={bimbinganForm.date} onChange={v => setBimbinganForm(f => ({ ...f, date: v }))} placeholder="Pilih tanggal" /></div>
                <SelectOption label="Pembimbing" value={bimbinganForm.supervisor} onChange={v => setBimbinganForm(f => ({ ...f, supervisor: v }))}
                  options={[{ value: '', label: 'Pilih...' }, ...(activeThesis?.supervisor ? [{ value: '1', label: `Pembimbing 1: ${activeThesis.supervisor}` }] : []), ...(activeThesis?.supervisorTwo ? [{ value: '2', label: `Pembimbing 2: ${activeThesis.supervisorTwo}` }] : [])]} />
                <TextInput label="Topik" value={bimbinganForm.topic} onChange={v => setBimbinganForm(f => ({ ...f, topic: v }))} placeholder="Yang dibahas..." required />
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Feedback Dosen</label>
                  <RichTextEditor content={bimbinganForm.feedback} onChange={v => setBimbinganForm(f => ({ ...f, feedback: v }))} placeholder="Feedback dari dosen..." minHeight={100} />
                </div>
                <TextArea label="Action Items (1 per baris)" value={bimbinganForm.actionItems} onChange={v => setBimbinganForm(f => ({ ...f, actionItems: v }))} placeholder={'Revisi bab 2\nTambah referensi'} rows={3} />
                <Button type="submit" disabled={submitting} style={{ borderRadius: 12, padding: '12px 0' }}>{submitting ? <Loader2 className="spin" size={16} /> : (editingBimbingan ? 'Simpan Perubahan' : 'Simpan')}</Button>
              </form>
            </Modal>

            {/* Publish Modal */}
            <Modal isOpen={showPublishModal} onClose={() => setShowPublishModal(false)} title="Publikasikan Skripsi">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, opacity: 0.6, margin: 0, lineHeight: 1.6 }}>Publikasikan skripsimu ke komunitas Skripsweet! Mahasiswa lain bisa melihat, memberi likes, dan berkomentar.</p>
                <div><label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Tags</label><TagInput value={publishTags} onChange={setPublishTags} placeholder="Tambah tag (Enter)..." /></div>
                <Button onClick={handlePublish} disabled={submitting} style={{ borderRadius: 12, padding: '12px 0', background: 'linear-gradient(135deg, #6366f1, #a855f7)', border: 'none', color: '#fff' }}>
                  {submitting ? <Loader2 className="spin" size={16} /> : <><Globe size={16} /> Publikasikan</>}
                </Button>
              </div>
            </Modal>

            {/* Public Thesis Detail */}
            <Modal isOpen={!!showPublicDetail} onClose={() => setShowPublicDetail(null)} title="">
              {showPublicDetail && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <UserAvatar name={showPublicDetail.user?.fullName || ''} avatarUrl={showPublicDetail.user?.avatarUrl} size={44} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{showPublicDetail.user?.fullName}</div>
                      <div style={{ fontSize: 12, opacity: 0.5 }}>{showPublicDetail.university} • {showPublicDetail.department}</div>
                    </div>
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3, margin: 0 }}>{showPublicDetail.title}</h2>
                  {showPublicDetail.abstract && <div style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.7 }}><HtmlRenderer content={showPublicDetail.abstract} compact /></div>}
                  {showPublicDetail.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {showPublicDetail.tags.map(t => <span key={t} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(var(--color-primary), 0.06)', color: 'rgb(var(--color-primary))' }}>#{t}</span>)}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                    <button onClick={() => handleToggleLike(showPublicDetail.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: showPublicDetail.isLiked ? '#ef4444' : 'inherit', fontWeight: 600, padding: 0 }}>
                      <Heart size={16} fill={showPublicDetail.isLiked ? '#ef4444' : 'none'} /> {showPublicDetail._count?.likes || 0} likes
                    </button>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 0.5 }}><Eye size={16} /> {showPublicDetail.viewCount} views</span>
                    <button onClick={() => handleToggleBookmark(showPublicDetail.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: 0.6, padding: 0 }}>
                      <Bookmark size={16} fill={showPublicDetail.isBookmarked ? 'currentColor' : 'none'} /> Simpan
                    </button>
                  </div>
                  {showPublicDetail.journals && showPublicDetail.journals.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Referensi ({showPublicDetail.journals.length})</h4>
                      {showPublicDetail.journals.slice(0, 5).map(j => (
                        <div key={j.id} style={{ fontSize: 12, padding: '8px 12px', borderRadius: 10, background: 'var(--input-bg)', marginBottom: 4, lineHeight: 1.5 }}>
                          <strong>{j.title}</strong>{j.authors && <span style={{ opacity: 0.5 }}> — {j.authors}</span>}{j.year && <span style={{ opacity: 0.5 }}> ({j.year})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Komentar ({showPublicDetail._count?.comments || 0})</h4>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }} onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}>
                      <div style={{ flex: 1 }}><TextInput value={publicCommentInput} onChange={setPublicCommentInput} placeholder="Tulis komentar..." /></div>
                      <Button onClick={handleAddComment} disabled={!publicCommentInput.trim()} size="sm"><Send size={14} /></Button>
                    </div>
                    {(showPublicDetail as any).comments?.map((c: ThesisComment) => (
                      <div key={c.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-default)' }}>
                        <UserAvatar name={c.user?.fullName || ''} avatarUrl={c.user?.avatarUrl} size={28} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{c.user?.fullName} <span style={{ opacity: 0.3, fontWeight: 400 }}>• {new Date(c.createdAt).toLocaleDateString('id-ID')}</span></div>
                          <p style={{ fontSize: 13, margin: '4px 0 0', lineHeight: 1.5 }}>{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Modal>

            {/* Relevance Matrix */}
            <Modal isOpen={showMatrixModal} onClose={() => setShowMatrixModal(false)} title="Literature Review Matrix">
              {matrixData && matrixData.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr style={{ background: 'var(--input-bg)' }}>
                      {['Judul', 'Tema', 'Metodologi', 'Temuan', 'Relevansi', 'Gap', 'Skor'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, borderBottom: '2px solid var(--border-default)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{matrixData.map((row: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, maxWidth: 160 }}>{row.title}</td>
                        <td style={{ padding: '10px 12px' }}>{row.theme}</td>
                        <td style={{ padding: '10px 12px' }}>{row.methodology}</td>
                        <td style={{ padding: '10px 12px' }}>{row.findings}</td>
                        <td style={{ padding: '10px 12px' }}>{row.relevanceToThesis}</td>
                        <td style={{ padding: '10px 12px' }}>{row.gap}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 20, fontWeight: 700, fontSize: 11, background: row.score >= 7 ? '#22c55e22' : row.score >= 4 ? '#f59e0b22' : '#ef444422', color: row.score >= 7 ? '#22c55e' : row.score >= 4 ? '#f59e0b' : '#ef4444' }}>{row.score}/10</span>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </Modal>

          </div>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; } 40% { transform: scale(1); opacity: 0.8; } }`}</style>
    </AuthGuard>
  );
}
