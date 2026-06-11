'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { taskService, Task, TaskSubmission } from '@/services/taskService';
import { classService } from '@/services/classService';
import { groupService, TaskGroupFull } from '@/services/groupService';
import { aiService } from '@/services/aiService';
import { Card, Button, Modal, useToast, useConfirm, MarkdownRenderer, stripMarkdown, TextInput, SelectOption, DateTimePicker, TextArea } from '@/components/ui';
import { useFeatureAccess } from '@/lib/feature-access';
import {
  ClipboardList, Calendar, ChevronRight, Loader2, Send, Plus, Trash2, Camera, FileText, Sparkles, User, Users, Copy, Download, Pencil, Eye, EyeOff, ChevronLeft, Save, ChevronDown
} from 'lucide-react';

interface TugasTabProps {
  classId: string;
  memberRole?: string;
  permissions?: string[];
  filterSessionId?: string;
  urlTaskId?: string;
  onTaskSelect?: (taskId: string | null) => void;
}


export function TugasTab({ classId, memberRole, permissions, filterSessionId, urlTaskId, onTaskSelect }: TugasTabProps) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { hasFeature } = useFeatureAccess();
  const hasPerm = (perm: string) => memberRole === 'OWNER' || (permissions || []).includes(perm);
  const canCreate = hasPerm('TASK_CREATE');
  const canEdit = hasPerm('TASK_EDIT');
  const isOwner = canCreate || canEdit;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskSubmissions, setTaskSubmissions] = useState<TaskSubmission[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New task form state
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [assignType, setAssignType] = useState<'ALL' | 'INDIVIDUAL' | 'GROUP'>('ALL');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [taskGroupId, setTaskGroupId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [taskImage, setTaskImage] = useState<File | null>(null);
  const [taskImagePreview, setTaskImagePreview] = useState<string | null>(null);
  const taskImageRef = useRef<HTMLInputElement>(null);
  const [descMode, setDescMode] = useState<'manual' | 'ai-ocr' | 'image-only'>('manual');
  const [isReadingImage, setIsReadingImage] = useState(false);

  // Lists for assignment
  const [members, setMembers] = useState<any[]>([]);
  const [groups, setGroups] = useState<TaskGroupFull[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState('');

  // Edit task state
  const [showEditTask, setShowEditTask] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editAssignType, setEditAssignType] = useState<'ALL' | 'INDIVIDUAL' | 'GROUP'>('ALL');
  const [editAssignedUserIds, setEditAssignedUserIds] = useState<string[]>([]);
  const [editTaskGroupId, setEditTaskGroupId] = useState('');
  const [editSessionId, setEditSessionId] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = filterSessionId
        ? await taskService.getSessionTasks(filterSessionId)
        : await taskService.getClassTasks(classId);
      setTasks(data || []);
    } catch { } finally { setLoading(false); }
  }, [classId, filterSessionId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (showNewTask) {
      classService.getClassMembers(classId).then(setMembers).catch(() => {});
      groupService.getClassGroups(classId).then(setGroups).catch(() => {});
      classService.getClassSessions(classId).then((res) => setSessions(res || [])).catch(() => {});
    }
  }, [showNewTask, classId]);

  const openTask = async (task: Task) => {
    setSelectedTask(task);
    onTaskSelect?.(task.id);
    try {
      const subs = await taskService.getSubmissions(task.id);
      setTaskSubmissions(subs || []);
    } catch { }
  };

  // Open task from URL
  useEffect(() => {
    if (urlTaskId && tasks.length > 0 && !selectedTask) {
      const task = tasks.find(t => t.id === urlTaskId);
      if (task) openTask(task);
    }
  }, [urlTaskId, tasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if ((descMode === 'ai-ocr' || descMode === 'image-only') && !taskImage) {
      showToast('Silakan upload gambar soal terlebih dahulu.', 'error');
      return;
    }
    setIsCreating(true);
    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;
      if (taskImage) {
        const buffer = await taskImage.arrayBuffer();
        imageBase64 = Buffer.from(buffer).toString('base64');
        imageMimeType = taskImage.type;
      }
      await taskService.createTask(classId, {
        title: newTitle.trim(),
        description: descMode === 'image-only' ? undefined : (newDesc.trim() || undefined),
        deadline: newDeadline || undefined,
        assignType,
        assignedUserIds: assignType === 'INDIVIDUAL' ? assignedUserIds : undefined,
        taskGroupId: assignType === 'GROUP' ? taskGroupId : undefined,
        sessionId: sessionId || undefined,
        imageBase64: (descMode === 'ai-ocr' || descMode === 'image-only') ? imageBase64 : undefined,
        imageMimeType: (descMode === 'ai-ocr' || descMode === 'image-only') ? imageMimeType : undefined,
      });
      setShowNewTask(false);
      setNewTitle('');
      setNewDesc('');
      setNewDeadline('');
      setAssignType('ALL');
      setAssignedUserIds([]);
      setTaskGroupId('');
      setSessionId('');
      setTaskImage(null);
      setTaskImagePreview(null);
      setDescMode('manual');
      fetchTasks();
      showToast('Tugas berhasil dibuat!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal membuat tugas.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAIOcr = async () => {
    if (!taskImage) return;
    setIsReadingImage(true);
    try {
      const buffer = await taskImage.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const result = await aiService.ocrImage(base64, taskImage.type);
      if (result.text) {
        setNewDesc(result.text);
        showToast('AI berhasil membaca soal dari gambar!', 'success');
      } else {
        showToast('AI tidak dapat membaca teks dari gambar.', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal membaca gambar dengan AI.', 'error');
    } finally {
      setIsReadingImage(false);
    }
  };

  // Text editor content for answer
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorContent, setEditorContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAiHelper, setShowAiHelper] = useState(false);

  const openEditTask = () => {
    if (!selectedTask) return;
    setEditTitle(selectedTask.title);
    setEditDesc(selectedTask.description || '');
    setEditDeadline(selectedTask.deadline ? new Date(selectedTask.deadline).toISOString().slice(0, 16) : '');
    setEditAssignType(selectedTask.assignType || 'ALL');
    setEditAssignedUserIds(selectedTask.assignedUserIds || []);
    setEditTaskGroupId(selectedTask.taskGroup?.id || '');
    setEditSessionId(selectedTask.sessionId || '');
    // Fetch lists for assignment
    classService.getClassMembers(classId).then(setMembers).catch(() => {});
    groupService.getClassGroups(classId).then(setGroups).catch(() => {});
    classService.getClassSessions(classId).then((res) => setSessions(res || [])).catch(() => {});
    setShowEditTask(true);
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !editTitle.trim()) return;
    setIsSavingEdit(true);
    try {
      const updated = await taskService.updateTask(selectedTask.id, {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        deadline: editDeadline || undefined,
        assignType: editAssignType,
        assignedUserIds: editAssignType === 'INDIVIDUAL' ? editAssignedUserIds : undefined,
        taskGroupId: editAssignType === 'GROUP' ? editTaskGroupId : undefined,
        sessionId: editSessionId || undefined,
      });
      setSelectedTask({ ...selectedTask, ...updated });
      setShowEditTask(false);
      fetchTasks();
      showToast('Tugas berhasil diperbarui!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengedit tugas.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const ok = await confirm({ title: 'Hapus Tugas', message: 'Apakah Anda yakin ingin menghapus tugas ini?', confirmText: 'Hapus', variant: 'danger' });
    if (!ok) return;
    try {
      await taskService.deleteTask(taskId);
      setSelectedTask(null);
      fetchTasks();
      showToast('Tugas dihapus.', 'success');
    } catch {
      showToast('Gagal menghapus.', 'error');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('Ukuran gambar maksimal 10MB.', 'error');
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save editor content as a submission (no AI)
  const handleSaveAnswer = async () => {
    const text = editorRef.current?.innerText || '';
    if (!text.trim() || !selectedTask) { showToast('Editor kosong. Tulis jawaban terlebih dahulu.', 'warning'); return; }
    setIsSaving(true);
    try {
      const sub = await taskService.submitTask(selectedTask.id, { content: text.trim(), skipAi: true });
      setTaskSubmissions((p) => [sub, ...p]);
      showToast('Jawaban berhasil disimpan!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan jawaban.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // AI helper: ask AI and insert answer into editor (does NOT save as submission)
  const handleSubmitQuestion = async () => {
    if (!selectedTask || (!taskInput.trim() && !selectedImage)) return;
    setIsSubmitting(true);
    try {
      let submitData: { content?: string; imageBase64?: string; imageMimeType?: string } = {};

      if (selectedImage) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(selectedImage);
        });
        submitData = { imageBase64: base64, imageMimeType: selectedImage.type, content: taskInput.trim() || undefined };
      } else {
        submitData = { content: taskInput.trim() };
      }

      const sub = await taskService.submitTask(selectedTask.id, submitData);
      
      // Insert AI response into editor (don't save as a separate submission — user will edit & save)
      if (sub.aiAnswer && editorRef.current) {
        const currentText = editorRef.current.innerText;
        const cleanAnswer = stripMarkdown(sub.aiAnswer);
        const separator = currentText.trim() ? '\n\n---\n\n' : '';
        editorRef.current.innerText = currentText + separator + cleanAnswer;
        setEditorContent(editorRef.current.innerText);
      }
      
      setTaskInput('');
      clearImage();
      showToast('Jawaban AI berhasil ditambahkan ke editor. Edit & simpan sesuai kebutuhan.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memproses dengan AI.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy editor content
  const handleCopyEditor = () => {
    const text = editorRef.current?.innerText || '';
    if (!text.trim()) { showToast('Editor kosong.', 'warning'); return; }
    navigator.clipboard.writeText(text);
    showToast('Konten berhasil disalin!', 'success');
  };

  // Export editor to PDF
  const handleExportPDF = async () => {
    const text = editorRef.current?.innerText || '';
    if (!text.trim()) { showToast('Editor kosong.', 'warning'); return; }
    const { jsPDF } = await import('jspdf');
    const { renderMarkdownToPDF } = await import('@/lib/pdfMarkdown');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const mL = 20, mR = 15, mT = 20, mB = 20;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(selectedTask?.title || 'Jawaban Tugas', mL, mT);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    renderMarkdownToPDF(doc, text, { marginLeft: mL, marginRight: mR, marginTop: mT, marginBottom: mB, pageWidth: 210, pageHeight: 297, startY: mT + 10 });
    doc.save(`${(selectedTask?.title || 'jawaban').toLowerCase().replace(/\s+/g, '-')}.pdf`);
    showToast('PDF berhasil diunduh!', 'success');
  };

  // Ask AI from selected text in editor — only injects into editor, no submission saved
  const handleAskAIFromEditor = async () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString()?.trim();
    const textToAsk = selectedText || taskInput.trim() || '';
    if (!textToAsk || !selectedTask) { showToast('Tulis atau seleksi teks soal terlebih dahulu.', 'warning'); return; }
    setIsSubmitting(true);
    try {
      const sub = await taskService.submitTask(selectedTask.id, { content: textToAsk });
      if (sub.aiAnswer && editorRef.current) {
        const currentText = editorRef.current.innerText;
        const cleanAnswer = stripMarkdown(sub.aiAnswer);
        const separator = currentText.trim() ? '\n\n---\n\n' : '';
        editorRef.current.innerText = currentText + separator + cleanAnswer;
        setEditorContent(editorRef.current.innerText);
      }
      showToast('Jawaban AI ditambahkan ke editor.', 'success');
    } catch {
      showToast('Gagal memproses dengan AI.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMemberToggle = (userId: string) => {
    setAssignedUserIds(prev =>
      prev.includes(userId) ? prev.filter(x => x !== userId) : [...prev, userId]
    );
  };

  const handleEditMemberToggle = (userId: string) => {
    setEditAssignedUserIds(prev =>
      prev.includes(userId) ? prev.filter(x => x !== userId) : [...prev, userId]
    );
  };

  const handleToggleVisibility = async (subId: string) => {
    try {
      const updated = await taskService.toggleSubmissionVisibility(subId);
      setTaskSubmissions((prev) => prev.map(s => s.id === subId ? { ...s, visibility: updated.visibility } : s));
      showToast(updated.visibility === 'PUBLIC' ? 'Jawaban sekarang publik.' : 'Jawaban sekarang privat.', 'success');
    } catch {
      showToast('Gagal mengubah visibilitas.', 'error');
    }
  };

  const formatDeadline = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    if (diff < 0) return { text: `Lewat ${dateStr}`, color: 'text-red-500 font-medium' };
    if (days <= 1) return { text: `Besok ${dateStr}`, color: 'text-amber-500 font-semibold' };
    if (days <= 3) return { text: `${days} hari lagi`, color: 'text-amber-600' };
    return { text: dateStr, color: 'text-gray-500' };
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  if (selectedTask) {
    return (
      <div className="flex flex-col gap-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
          <button onClick={() => { setSelectedTask(null); onTaskSelect?.(null); clearImage(); }} style={{
            background: 'none', border: 'none', fontSize: 'var(--font-sm)', fontWeight: 600,
            color: 'rgb(var(--color-primary))', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
          }}>
            <ChevronLeft size={16} /> Kembali ke Semua Tugas
          </button>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {isOwner && (
              <>
                <Button size="sm" variant="outline" onClick={openEditTask} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-xs)', color: 'rgb(var(--color-primary))', borderColor: 'rgba(var(--color-primary) / 0.3)' }}>
                  <Pencil size={12} /> Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDeleteTask(selectedTask.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-xs)' }}>
                  <Trash2 size={12} /> Hapus
                </Button>
              </>
            )}
          </div>
        </div>

        <Card style={{ padding: '1.25rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: 'rgb(var(--text-primary))', margin: 0 }}>{selectedTask.title}</h3>
            <span style={{ 
              padding: '0.15rem 0.6rem', 
              borderRadius: '9999px', 
              fontSize: '0.65rem', 
              fontWeight: 800, 
              textTransform: 'uppercase',
              background: selectedTask.assignType === 'INDIVIDUAL' ? 'rgba(251, 191, 36, 0.12)' :
                          selectedTask.assignType === 'GROUP' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(99, 102, 241, 0.12)',
              color: selectedTask.assignType === 'INDIVIDUAL' ? '#fbbf24' :
                     selectedTask.assignType === 'GROUP' ? '#a78bfa' : '#818cf8',
              border: selectedTask.assignType === 'INDIVIDUAL' ? '1px solid rgba(251, 191, 36, 0.25)' :
                      selectedTask.assignType === 'GROUP' ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid rgba(99, 102, 241, 0.25)',
            }}>
              {selectedTask.assignType === 'INDIVIDUAL' ? '👤 Individu' :
               selectedTask.assignType === 'GROUP' ? '👥 Kelompok' : '🌐 Semua'}
            </span>
          </div>
          {selectedTask.description && <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', marginTop: '0.5rem', margin: '0.5rem 0 0 0' }}>{selectedTask.description}</p>}
          {selectedTask.descriptionImageUrl && (
            <img src={selectedTask.descriptionImageUrl} alt="Foto Soal" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: 'var(--radius-md)', marginTop: '0.5rem', border: '1px solid var(--border-default)' }} />
          )}
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.7rem' }}>
            {selectedTask.session && <span style={{ background: 'var(--input-bg)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', color: 'rgb(var(--text-secondary))' }}>📚 {selectedTask.session.title}</span>}
            {selectedTask.taskGroup && <span style={{ background: 'var(--input-bg)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', color: 'rgb(var(--text-secondary))' }}>👥 Kelompok: {selectedTask.taskGroup.name}</span>}
            {selectedTask.deadline && (() => {
              const dl = formatDeadline(selectedTask.deadline);
              return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'var(--input-bg)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }} className={dl.color}><Calendar size={11} /> Deadline: {dl.text}</span>;
            })()}
          </div>
        </Card>

        {/* TEXT EDITOR for answers */}
        <Card style={{ padding: '1.25rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h5 style={{ fontWeight: 700, color: 'rgb(var(--text-primary))', fontSize: 'var(--font-sm)', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
              <FileText size={15} style={{ color: 'rgb(var(--color-primary))' }} /> Editor Jawaban
            </h5>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              <Button variant="ghost" size="sm" onClick={handleCopyEditor} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: 'var(--font-xs)' }}>
                <Copy size={12} /> Salin
              </Button>
              {hasFeature('pdf_export') && <Button variant="ghost" size="sm" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: 'var(--font-xs)' }}>
                <Download size={12} /> PDF
              </Button>}
            </div>
          </div>

          <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginBottom: '0.5rem', lineHeight: 1.5 }}>
            Tulis jawaban tugas di editor ini, lalu klik &quot;Simpan Jawaban&quot;. Gunakan bantuan AI jika diperlukan.
          </p>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={() => setEditorContent(editorRef.current?.innerText || '')}
            style={{
              minHeight: '200px',
              maxHeight: '500px',
              overflowY: 'auto',
              padding: '0.85rem',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--input-bg)',
              fontSize: 'var(--font-sm)',
              lineHeight: 1.7,
              color: 'rgb(var(--text-primary))',
              outline: 'none',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'inherit',
            }}
            data-placeholder="Mulai menulis jawaban di sini..."
          />

          {/* Primary action: Save Answer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', gap: '0.5rem' }}>
            <Button variant="ghost" size="sm" onClick={() => setShowAiHelper((p) => !p)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: 'var(--font-xs)', color: 'rgb(var(--text-secondary))' }}>
              <Sparkles size={12} style={{ color: '#818cf8' }} /> Bantuan AI
              <ChevronDown size={11} style={{ transform: showAiHelper ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </Button>
            <Button onClick={handleSaveAnswer} disabled={!editorContent.trim() || isSaving} isLoading={isSaving} style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', color: 'black', borderRadius: 'var(--radius-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Save size={14} /> Simpan Jawaban
            </Button>
          </div>
        </Card>

        {/* AI Helper — collapsible */}
        {showAiHelper && (
          <Card style={{ padding: '1rem', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: 'var(--radius-xl)', background: 'rgba(99, 102, 241, 0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h5 style={{ fontWeight: 700, color: '#818cf8', fontSize: 'var(--font-xs)', display: 'flex', alignItems: 'center', gap: '0.3rem', margin: 0 }}>
                <Sparkles size={13} /> Bantuan AI
              </h5>
              <span style={{ fontSize: '0.55rem', color: 'rgb(var(--text-muted))' }}>Jawaban AI akan ditambahkan ke editor</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" style={{ display: 'none' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {imagePreview && (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={imagePreview} alt="Preview soal" style={{ maxHeight: '80px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99, 102, 241, 0.2)' }} />
                    <button onClick={clearImage} style={{ position: 'absolute', top: '-0.35rem', right: '-0.35rem', background: 'rgba(15, 20, 32, 0.9)', border: '1px solid var(--border-strong)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', cursor: 'pointer' }}>✕</button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <TextArea value={taskInput} onChange={setTaskInput} placeholder="Tulis soal atau pertanyaan untuk AI..." rows={2} resize="none" />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: 'var(--font-xs)', color: '#818cf8', whiteSpace: 'nowrap' }}>
                  <Camera size={11} /> {selectedImage ? 'Ganti' : 'Foto'}
                </Button>
                <Button onClick={handleSubmitQuestion} disabled={(!taskInput.trim() && !selectedImage) || isSubmitting} isLoading={isSubmitting} size="sm" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', borderRadius: 'var(--radius-md)', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 'var(--font-xs)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <Sparkles size={11} /> Tanya AI
                </Button>
              </div>
            </div>
            <p style={{ fontSize: '0.55rem', color: 'rgb(var(--text-muted))', marginTop: '0.4rem' }}>
              Seleksi teks di editor lalu klik &quot;Tanya AI dari Seleksi&quot; atau tulis soal di atas.
              <button onClick={handleAskAIFromEditor} disabled={isSubmitting} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.55rem', textDecoration: 'underline', marginLeft: '0.25rem' }}>
                {isSubmitting ? 'Memproses...' : 'Tanya AI dari Seleksi'}
              </button>
            </p>
          </Card>
        )}

        {/* SUBMISSION HISTORY */}
        {taskSubmissions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h4 style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgb(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem' }}>Riwayat Jawaban</h4>
            {taskSubmissions.map((sub) => {
              const isOwnSubmission = sub.userId === (sub.user?.id || sub.userId);
              const submitterName = sub.user?.fullName || 'Anda';
              const isPublic = sub.visibility === 'PUBLIC';
              // Split AI answer by numbered sections for easier reading
              const splitAnswers = (answer: string): string[] => {
                if (!answer) return [];
                const sections = answer.split(/\n(?=(?:\*\*(?:Soal|Nomor|No\.?)\s*\d|\#{1,3}\s*(?:Soal|Nomor|No\.?)\s*\d|\d+\.\s*\*\*))/i);
                if (sections.length > 1) return sections.filter(s => s.trim());
                const altSections = answer.split(/\n{2,}(?=\d+[\.\)]\s)/);
                if (altSections.length > 1) return altSections.filter(s => s.trim());
                return [answer];
              };

              const answers = sub.aiAnswer ? splitAnswers(sub.aiAnswer) : [];

              const actionBtns = (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {sub.user && <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgb(var(--text-secondary))', background: 'rgba(var(--color-primary) / 0.06)', padding: '0.1rem 0.4rem', borderRadius: '999px' }}>{submitterName}</span>}
                  <button onClick={() => handleToggleVisibility(sub.id)} title={isPublic ? 'Jadikan Privat' : 'Jadikan Publik'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isPublic ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))', padding: '0.2rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.55rem' }}>
                    {isPublic ? <><Eye size={11} /> Publik</> : <><EyeOff size={11} /> Privat</>}
                  </button>
                  <span>{new Date(sub.createdAt).toLocaleString('id-ID')}</span>
                  <button onClick={async () => {
                    const ok = await confirm({ title: 'Hapus Riwayat', message: 'Hapus riwayat jawaban ini?', confirmText: 'Hapus', variant: 'danger' });
                    if (!ok) return;
                    try { await taskService.deleteSubmission(sub.id); setTaskSubmissions((p) => p.filter(s => s.id !== sub.id)); showToast('Riwayat dihapus.', 'success'); }
                    catch { showToast('Gagal menghapus.', 'error'); }
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-error))', padding: '0.2rem', opacity: 0.6 }} title="Hapus riwayat"><Trash2 size={12} /></button>
                </div>
              );

              const hasAi = !!sub.aiAnswer;
              const isManualAnswer = !hasAi && !!sub.content;

              return answers.length > 1 ? (
                <div key={sub.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {sub.content && <div style={{ fontSize: 'var(--font-xs)', background: 'rgba(0,0,0,0.15)', color: 'rgb(var(--text-secondary))', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', borderLeft: '3px solid #818cf8', fontStyle: 'italic', fontWeight: 500 }}>{sub.content}</div>}
                  {sub.imageUrl && <img src={sub.imageUrl} alt="Soal" style={{ maxHeight: '140px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }} />}
                  {answers.map((section, sIdx) => (
                    <Card key={`${sub.id}-${sIdx}`} style={{ padding: '1rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', borderLeft: '3px solid rgb(var(--color-primary))' }}>
                      <div style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-primary))', lineHeight: 1.6 }}><MarkdownRenderer content={section.trim()} compact /></div>
                    </Card>
                  ))}
                  <div style={{ fontSize: '0.65rem', color: 'rgb(var(--text-muted))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.25rem' }}>
                    <span>🤖 Gemini AI • {answers.length} jawaban</span>
                    {actionBtns}
                  </div>
                </div>
              ) : isManualAnswer ? (
                <Card key={sub.id} style={{ padding: '1.25rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', borderLeft: '3px solid rgb(var(--color-secondary))' }}>
                  <div style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-primary))', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{sub.content}</div>
                  <div style={{ fontSize: '0.65rem', color: 'rgb(var(--text-muted))', marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>✍️ Jawaban manual</span>
                    {actionBtns}
                  </div>
                </Card>
              ) : (
                <Card key={sub.id} style={{ padding: '1.25rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)' }}>
                  {sub.content && <div style={{ fontSize: 'var(--font-xs)', background: 'rgba(0,0,0,0.15)', color: 'rgb(var(--text-secondary))', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', borderLeft: '3px solid #818cf8', marginBottom: '0.75rem', fontStyle: 'italic', fontWeight: 500 }}>{sub.content}</div>}
                  {sub.imageUrl && <img src={sub.imageUrl} alt="Soal" style={{ maxHeight: '140px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '0.75rem' }} />}
                  {sub.aiAnswer && <div style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-primary))', lineHeight: 1.6 }}><MarkdownRenderer content={sub.aiAnswer} compact /></div>}
                  <div style={{ fontSize: '0.65rem', color: 'rgb(var(--text-muted))', marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🤖 Gemini AI</span>
                    {actionBtns}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* EDIT TASK MODAL (inside selectedTask block) */}
        <Modal isOpen={showEditTask} onClose={() => setShowEditTask(false)} title="Edit Tugas" size="md">
          <form onSubmit={handleEditTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>Judul Tugas</label>
              <TextInput value={editTitle} onChange={v => setEditTitle(v)} required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>Deskripsi Soal / Petunjuk</label>
              <TextArea value={editDesc} onChange={setEditDesc} placeholder="Tulis instruksi pengerjaan tugas..." rows={3} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>Batas Waktu (Deadline)</label>
                <DateTimePicker mode="datetime-local" value={editDeadline} onChange={setEditDeadline} placeholder="Pilih deadline" />
              </div>
              <SelectOption label="Tipe Penugasan" value={editAssignType} onChange={v => setEditAssignType(v as any)} options={[
                { value: 'ALL', label: 'Seluruh Anggota Kelas' },
                { value: 'INDIVIDUAL', label: 'Anggota Tertentu (Perorangan)' },
                { value: 'GROUP', label: 'Kelompok Tugas' },
              ]} />
            </div>
            <SelectOption label="Pertemuan (Sesi) (Opsional)" value={editSessionId} onChange={v => setEditSessionId(v)} options={[
              { value: '', label: '-- Tanpa Pertemuan --' },
              ...sessions.map((s: any) => ({ value: s.id, label: s.title })),
            ]} />
            {editAssignType === 'INDIVIDUAL' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>Pilih Mahasiswa</label>
                <div style={{ border: '1px solid var(--border-default)', padding: '0.75rem', borderRadius: 'var(--radius-lg)', maxHeight: '120px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', background: 'var(--input-bg)' }}>
                  {members.map((m: any) => (
                    <label key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: 'var(--font-xs)', color: editAssignedUserIds.includes(m.userId) ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))', cursor: 'pointer' }}>
                      <input type="checkbox" checked={editAssignedUserIds.includes(m.userId)} onChange={() => handleEditMemberToggle(m.userId)} style={{ accentColor: '#818cf8' }} />
                      <span className="truncate font-medium">{m.user.fullName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {editAssignType === 'GROUP' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <SelectOption label="Pilih Kelompok Tugas" value={editTaskGroupId} onChange={v => setEditTaskGroupId(v)} options={[
                  { value: '', label: '-- Pilih Kelompok --' },
                  ...groups.map((g: any) => ({ value: g.id, label: `${g.name} (${g.members.length} anggota)` })),
                ]} />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'end', gap: '0.5rem', borderTop: '1px solid var(--border-default)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <Button type="button" variant="outline" style={{ borderRadius: 'var(--radius-md)' }} onClick={() => setShowEditTask(false)}>Batal</Button>
              <Button type="submit" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', color: 'black', borderRadius: 'var(--radius-md)', fontWeight: 700 }} isLoading={isSavingEdit}>Simpan Perubahan</Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)' }}>
        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: 'rgb(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <ClipboardList size={18} style={{ color: 'rgb(var(--color-primary))' }} /> Pusat Tugas Kelas
        </h3>
        {isOwner && (
          <Button 
            onClick={() => setShowNewTask(true)} 
            style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', color: 'black', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: 'var(--radius-md)' }}
          >
            <Plus size={14} /> Tugas Baru
          </Button>
        )}
      </div>

      {tasks.length === 0 ? (
        <Card style={{ padding: '3rem 2rem', textAlign: 'center', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-xl)', background: 'rgba(255,255,255,0.01)' }}>
          <ClipboardList size={48} style={{ color: 'rgb(var(--text-muted))', margin: '0 auto 1rem', opacity: 0.3 }} />
          <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', margin: 0 }}>Belum ada tugas yang di-assign untuk Anda di kelas ini.</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {tasks.map((task) => {
            const dl = task.deadline ? formatDeadline(task.deadline) : null;
            return (
              <Card 
                key={task.id} 
                hoverable 
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', cursor: 'pointer', padding: '1rem' }} 
                onClick={() => openTask(task)}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <h4 style={{ fontWeight: 800, color: 'rgb(var(--text-primary))', fontSize: 'var(--font-md)' }} className="line-clamp-1">{task.title}</h4>
                    <span style={{ 
                      padding: '0.15rem 0.55rem', 
                      borderRadius: '9999px', 
                      fontSize: '0.6rem', 
                      fontWeight: 800, 
                      textTransform: 'uppercase',
                      background: task.assignType === 'INDIVIDUAL' ? 'rgba(251, 191, 36, 0.12)' :
                                  task.assignType === 'GROUP' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                      color: task.assignType === 'INDIVIDUAL' ? '#fbbf24' :
                             task.assignType === 'GROUP' ? '#a78bfa' : '#818cf8',
                      border: task.assignType === 'INDIVIDUAL' ? '1px solid rgba(251, 191, 36, 0.25)' :
                              task.assignType === 'GROUP' ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid rgba(99, 102, 241, 0.25)',
                    }}>
                      {task.assignType === 'INDIVIDUAL' ? 'Individu' :
                       task.assignType === 'GROUP' ? 'Kelompok' : 'Semua'}
                    </span>
                  </div>
                  {task.description && <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-secondary))', marginTop: '0.35rem' }} className="line-clamp-2">{task.description}</p>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.35rem', fontSize: '0.65rem' }}>
                    {task.session && <span style={{ background: 'var(--input-bg)', padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', color: 'rgb(var(--text-secondary))' }}>📚 {task.session.title}</span>}
                    {dl && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: 'var(--input-bg)', padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }} className={dl.color}><Calendar size={9} /> {dl.text}</span>}
                  </div>
                  <ChevronRight size={14} style={{ color: 'rgb(var(--text-muted))' }} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* NEW TASK MODAL */}
      <Modal isOpen={showNewTask} onClose={() => setShowNewTask(false)} title="Buat Tugas Baru" size="md">
        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <TextInput label="Judul Tugas" value={newTitle} onChange={v => setNewTitle(v)} placeholder="e.g. Tugas Mandiri Pertemuan 3" required />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>Deskripsi Soal / Petunjuk</label>
            <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.3rem' }}>
              {([
                { key: 'manual' as const, label: '✏️ Ketik Manual' },
                ...(hasFeature('task_image_ocr') ? [{ key: 'ai-ocr' as const, label: '🤖 Upload + AI Baca' }] : []),
                { key: 'image-only' as const, label: '🖼️ Upload Gambar Saja' },
              ]).map((m) => (
                <button key={m.key} type="button" onClick={() => { setDescMode(m.key); setTaskImage(null); setTaskImagePreview(null); setNewDesc(''); if (taskImageRef.current) taskImageRef.current.value = ''; }}
                  style={{
                    flex: 1, padding: '0.35rem 0.3rem', borderRadius: 'var(--radius-sm)', fontSize: '0.65rem', fontWeight: descMode === m.key ? 700 : 500,
                    border: descMode === m.key ? '1.5px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                    background: descMode === m.key ? 'rgba(var(--color-primary) / 0.08)' : 'transparent',
                    color: descMode === m.key ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Mode: Manual */}
            {descMode === 'manual' && (
              <TextArea value={newDesc} onChange={setNewDesc} placeholder="Tulis instruksi pengerjaan tugas..." rows={3} />
            )}

            {/* Mode: AI OCR */}
            {descMode === 'ai-ocr' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input ref={taskImageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { setTaskImage(file); const reader = new FileReader(); reader.onloadend = () => setTaskImagePreview(reader.result as string); reader.readAsDataURL(file); }
                }} />
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Button type="button" variant="outline" size="sm" style={{ borderRadius: 'var(--radius-md)' }} onClick={() => taskImageRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-1" /> Pilih Foto Soal
                  </Button>
                  {taskImage && (
                    <Button type="button" size="sm" onClick={handleAIOcr} isLoading={isReadingImage}
                      style={{ borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', color: '#000', fontWeight: 700 }}>
                      <Sparkles className="w-4 h-4 mr-1" /> AI Baca Soal
                    </Button>
                  )}
                  {taskImage && <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{taskImage.name}</span>}
                </div>
                {taskImagePreview && (
                  <div style={{ position: 'relative' }}>
                    <img src={taskImagePreview} alt="Preview" style={{ maxHeight: '120px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }} />
                    <button type="button" onClick={() => { setTaskImage(null); setTaskImagePreview(null); if (taskImageRef.current) taskImageRef.current.value = ''; }} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '12px' }}>✕</button>
                  </div>
                )}
                <TextArea value={newDesc} onChange={setNewDesc} placeholder={isReadingImage ? 'AI sedang membaca gambar...' : 'Hasil AI akan muncul di sini, atau ketik manual...'} rows={3} />
              </div>
            )}

            {/* Mode: Image only */}
            {descMode === 'image-only' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input ref={taskImageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { setTaskImage(file); const reader = new FileReader(); reader.onloadend = () => setTaskImagePreview(reader.result as string); reader.readAsDataURL(file); }
                }} />
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Button type="button" variant="outline" size="sm" style={{ borderRadius: 'var(--radius-md)' }} onClick={() => taskImageRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-1" /> Upload Gambar Soal
                  </Button>
                  {taskImage && <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{taskImage.name}</span>}
                </div>
                {taskImagePreview ? (
                  <div style={{ position: 'relative' }}>
                    <img src={taskImagePreview} alt="Preview" style={{ maxHeight: '200px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }} />
                    <button type="button" onClick={() => { setTaskImage(null); setTaskImagePreview(null); if (taskImageRef.current) taskImageRef.current.value = ''; }} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '12px' }}>✕</button>
                  </div>
                ) : (
                  <div style={{ border: '2px dashed var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '2rem', textAlign: 'center', cursor: 'pointer', color: 'rgb(var(--text-muted))', fontSize: 'var(--font-xs)' }} onClick={() => taskImageRef.current?.click()}>
                    📷 Klik untuk upload gambar soal
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>Batas Waktu (Deadline)</label>
              <DateTimePicker mode="datetime-local" value={newDeadline} onChange={setNewDeadline} placeholder="Pilih deadline" />
            </div>

            <SelectOption label="Tipe Penugasan" value={assignType} onChange={v => setAssignType(v as any)} options={[
              { value: 'ALL', label: 'Seluruh Anggota Kelas' },
              { value: 'INDIVIDUAL', label: 'Anggota Tertentu (Perorangan)' },
              { value: 'GROUP', label: 'Kelompok Tugas' },
            ]} />
          </div>

          <SelectOption label="Pertemuan (Sesi) (Opsional)" value={sessionId} onChange={v => setSessionId(v)} options={[
            { value: '', label: '-- Tanpa Pertemuan --' },
            ...sessions.map((s) => ({ value: s.id, label: s.title })),
          ]} />

          {/* INDIVIDUAL SELECTION */}
          {assignType === 'INDIVIDUAL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>Pilih Mahasiswa</label>
              <div style={{ border: '1px solid var(--border-default)', padding: '0.75rem', borderRadius: 'var(--radius-lg)', maxHeight: '120px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', background: 'var(--input-bg)' }}>
                {members.map((m) => (
                  <label key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: 'var(--font-xs)', color: assignedUserIds.includes(m.userId) ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))', cursor: 'pointer' }}>
                    <input type="checkbox" checked={assignedUserIds.includes(m.userId)} onChange={() => handleMemberToggle(m.userId)} style={{ accentColor: '#818cf8' }} />
                    <span className="truncate font-medium">{m.user.fullName}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* GROUP SELECTION */}
          {assignType === 'GROUP' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <SelectOption label="Pilih Kelompok Tugas" value={taskGroupId} onChange={v => setTaskGroupId(v)} options={[
                { value: '', label: '-- Pilih Kelompok --' },
                ...groups.map((g) => ({ value: g.id, label: `${g.name} (${g.members.length} anggota)` })),
              ]} />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'end', gap: '0.5rem', borderTop: '1px solid var(--border-default)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="outline" style={{ borderRadius: 'var(--radius-md)' }} onClick={() => setShowNewTask(false)}>Batal</Button>
            <Button type="submit" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', color: 'black', borderRadius: 'var(--radius-md)', fontWeight: 700 }} isLoading={isCreating}>Buat Tugas</Button>
          </div>
        </form>
      </Modal>

      {/* EDIT TASK MODAL */}
      <Modal isOpen={showEditTask} onClose={() => setShowEditTask(false)} title="Edit Tugas" size="md">
        <form onSubmit={handleEditTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextInput label="Judul Tugas" value={editTitle} onChange={v => setEditTitle(v)} required />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>Deskripsi Soal / Petunjuk</label>
            <TextArea value={editDesc} onChange={setEditDesc} placeholder="Tulis instruksi pengerjaan tugas..." rows={3} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>Batas Waktu (Deadline)</label>
              <DateTimePicker mode="datetime-local" value={editDeadline} onChange={setEditDeadline} placeholder="Pilih deadline" />
            </div>

            <SelectOption label="Tipe Penugasan" value={editAssignType} onChange={v => setEditAssignType(v as any)} options={[
              { value: 'ALL', label: 'Seluruh Anggota Kelas' },
              { value: 'INDIVIDUAL', label: 'Anggota Tertentu (Perorangan)' },
              { value: 'GROUP', label: 'Kelompok Tugas' },
            ]} />
          </div>

          <SelectOption label="Pertemuan (Sesi) (Opsional)" value={editSessionId} onChange={v => setEditSessionId(v)} options={[
            { value: '', label: '-- Tanpa Pertemuan --' },
            ...sessions.map((s) => ({ value: s.id, label: s.title })),
          ]} />

          {editAssignType === 'INDIVIDUAL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>Pilih Mahasiswa</label>
              <div style={{ border: '1px solid var(--border-default)', padding: '0.75rem', borderRadius: 'var(--radius-lg)', maxHeight: '120px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', background: 'var(--input-bg)' }}>
                {members.map((m) => (
                  <label key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: 'var(--font-xs)', color: editAssignedUserIds.includes(m.userId) ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editAssignedUserIds.includes(m.userId)} onChange={() => handleEditMemberToggle(m.userId)} style={{ accentColor: '#818cf8' }} />
                    <span className="truncate font-medium">{m.user.fullName}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {editAssignType === 'GROUP' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <SelectOption label="Pilih Kelompok Tugas" value={editTaskGroupId} onChange={v => setEditTaskGroupId(v)} options={[
                { value: '', label: '-- Pilih Kelompok --' },
                ...groups.map((g) => ({ value: g.id, label: `${g.name} (${g.members.length} anggota)` })),
              ]} />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'end', gap: '0.5rem', borderTop: '1px solid var(--border-default)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <Button type="button" variant="outline" style={{ borderRadius: 'var(--radius-md)' }} onClick={() => setShowEditTask(false)}>Batal</Button>
            <Button type="submit" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', color: 'black', borderRadius: 'var(--radius-md)', fontWeight: 700 }} isLoading={isSavingEdit}>Simpan Perubahan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
