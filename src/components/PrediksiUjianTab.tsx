'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, useToast, AIPhotoInput, useConfirm, TextInput, SelectOption, NumberInput, TextArea } from './ui';
import { useFeatureAccess } from '@/lib/feature-access';
import { useAiJob } from '@/lib/useAiJob';
import { ExamPrediction, examPredictionService } from '@/services/examPredictionService';
import { classService } from '@/services/classService';
import { Session } from '@/models/Class';
import { Sparkles, Download, Trash2, BookOpen, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface PrediksiUjianTabProps {
  classId: string;
  memberRole?: string;
  permissions?: string[];
}

export function PrediksiUjianTab({ classId, memberRole = 'MEMBER', permissions }: PrediksiUjianTabProps) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { hasFeature } = useFeatureAccess();
  const isOwner = memberRole === 'OWNER' || (permissions || []).includes('PREDICTION_MANAGE');

  const [predictions, setPredictions] = useState<ExamPrediction[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sourceType, setSourceType] = useState<'AI' | 'KISI_KISI' | 'MANUAL'>('AI');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [examType, setExamType] = useState<'ESSAY' | 'MULTIPLE_CHOICE' | 'MIXED'>('MIXED');
  const [countPG, setCountPG] = useState(5);
  const [countEssay, setCountEssay] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);

  // AI Job tracking for exam prediction
  const examGenJob = useAiJob<any>('exam_prediction', {
    onComplete: () => {
      showToast('Soal prediksi berhasil dibuat dengan AI!', 'success');
      fetchPredictionsAndSessions();
      setShowCreateModal(false);
      resetForm();
      setIsGenerating(false);
    },
    onError: (err) => { showToast(err || 'Gagal membuat prediksi ujian.', 'error'); setIsGenerating(false); },
  });

  // Manual questions list
  const [manualQuestions, setManualQuestions] = useState<Array<{
    type: 'ESSAY' | 'MULTIPLE_CHOICE';
    question: string;
    options?: string;
    answerKey?: string;
    explanation?: string;
  }>>([{ type: 'MULTIPLE_CHOICE', question: '', options: '["", "", "", ""]', answerKey: 'A', explanation: '' }]);

  // Practice state
  const [selectedPrediction, setSelectedPrediction] = useState<ExamPrediction | null>(null);
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showAnswers, setShowAnswers] = useState(false);

  const fetchPredictionsAndSessions = async () => {
    try {
      setIsLoading(true);
      const [predList, sessList] = await Promise.all([
        examPredictionService.getClassPredictions(classId),
        classService.getClassSessions(classId),
      ]);
      setPredictions(predList || []);
      setSessions(sessList || []);
    } catch (err) {
      showToast('Gagal memuat prediksi ujian.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictionsAndSessions();
  }, [classId]);

  const handleSessionToggle = (id: string) => {
    setSelectedSessions(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAddManualQuestion = () => {
    setManualQuestions(prev => [
      ...prev,
      { type: 'MULTIPLE_CHOICE', question: '', options: '["", "", "", ""]', answerKey: 'A', explanation: '' }
    ]);
  };

  const handleManualQuestionChange = (index: number, field: string, value: any) => {
    setManualQuestions(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleManualOptionChange = (qIndex: number, oIndex: number, val: string) => {
    setManualQuestions(prev => {
      const copy = [...prev];
      const opts = JSON.parse(copy[qIndex].options || '["", "", "", ""]');
      opts[oIndex] = val;
      copy[qIndex].options = JSON.stringify(opts);
      return copy;
    });
  };

  const handleCreatePrediction = async () => {
    if (!title.trim()) {
      showToast('Judul prediksi harus diisi.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      if (sourceType === 'AI') {
        if (selectedSessions.length === 0) {
          showToast('Pilih minimal satu pertemuan untuk bahan AI.', 'error');
          setIsGenerating(false);
          return;
        }
        try {
          await examGenJob.trigger(() => examPredictionService.generate(classId, {
            title,
            description,
            sessionIds: selectedSessions,
            type: examType,
            countPG: examType === 'ESSAY' ? 0 : countPG,
            countEssay: examType === 'MULTIPLE_CHOICE' ? 0 : countEssay,
          }));
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Gagal membuat prediksi ujian.', 'error');
          setIsGenerating(false);
        }
        return; // async — onComplete handles the rest
      } else if (sourceType === 'MANUAL') {
        // Validation
        const invalid = manualQuestions.some(q => !q.question.trim());
        if (invalid) {
          showToast('Harap isi semua teks pertanyaan.', 'error');
          setIsGenerating(false);
          return;
        }
        await examPredictionService.createManual(classId, {
          title,
          description,
          sessionIds: [],
          source: 'MANUAL',
          questions: manualQuestions.map(q => ({
            ...q,
            options: q.type === 'MULTIPLE_CHOICE' ? q.options : undefined
          })),
        });
        showToast('Soal prediksi manual berhasil disimpan!', 'success');
      }
      fetchPredictionsAndSessions();
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal membuat prediksi ujian.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKisiKisiExtracted = async (result: any) => {
    // result contains questions array from Gemini:
    // array of objects: { type, question, options, answerKey, explanation }
    setIsGenerating(true);
    try {
      await examPredictionService.createManual(classId, {
        title: title || 'Ekstraksi Kisi-Kisi Foto',
        description: description || 'Diekstrak menggunakan AI Vision',
        sessionIds: [],
        source: 'KISI_KISI',
        questions: (result.questions || []).map((q: any) => ({
          type: 'ESSAY',
          question: q,
        })),
      });
      showToast('Kisi-kisi berhasil diekstrak dan disimpan!', 'success');
      fetchPredictionsAndSessions();
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memproses kisi-kisi.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeletePrediction = async (id: string) => {
    const ok = await confirm({ title: 'Konfirmasi', message: 'Hapus prediksi ini?', confirmText: 'Hapus', variant: 'danger' });
    if (!ok) return;
    try {
      await examPredictionService.delete(id);
      showToast('Prediksi ujian dihapus.', 'success');
      setPredictions(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus prediksi.', 'error');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedSessions([]);
    setManualQuestions([{ type: 'MULTIPLE_CHOICE', question: '', options: '["", "", "", ""]', answerKey: 'A', explanation: '' }]);
  };

  const handleExportPDF = async (pred: ExamPrediction) => {
    if (!pred.questions || pred.questions.length === 0) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'b5' });
    const mL = 20, mR = 12, mT = 15, mB = 15, cW = 176 - mL - mR;
    
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(14);
    doc.text(pred.title, mL, mT);
    
    doc.setFontSize(8); doc.setFont('Helvetica', 'italic');
    doc.text(`Prediksi Soal Ujian Synapse AI - Kelas ID: ${classId}`, mL, mT + 5);
    doc.line(mL, mT + 7, mL + cW, mT + 7);
    
    doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
    let y = mT + 14;

    pred.questions.forEach((q, idx) => {
      if (y > 250 - mB) { doc.addPage(); y = mT; }
      doc.setFont('Helvetica', 'bold');
      const qText = `${idx + 1}. [${q.type === 'MULTIPLE_CHOICE' ? 'PG' : 'ESSAY'}] ${q.question}`;
      const qLines = doc.splitTextToSize(qText, cW);
      qLines.forEach((l: string) => {
        doc.text(l, mL, y);
        y += 5;
      });

      if (q.type === 'MULTIPLE_CHOICE' && q.options) {
        doc.setFont('Helvetica', 'normal');
        try {
          const opts = JSON.parse(q.options);
          opts.forEach((opt: string) => {
            if (y > 250 - mB) { doc.addPage(); y = mT; }
            doc.text(`   ${opt}`, mL, y);
            y += 4.5;
          });
        } catch {}
      }
      
      // Divider
      y += 2;
    });

    // Page 2: Kunci Jawaban
    doc.addPage();
    y = mT;
    doc.setFont('Helvetica', 'bold'); doc.setFontSize(12);
    doc.text('KUNCI JAWABAN & PEMBAHASAN', mL, y);
    doc.line(mL, y + 2, mL + cW, y + 2);
    y += 8;

    // Build markdown content for answer key
    let answerContent = '';
    pred.questions.forEach((q, idx) => {
      answerContent += `### Soal ${idx + 1}\n**Kunci:** ${q.answerKey || '-'}\n\n`;
      if (q.explanation) {
        answerContent += `${q.explanation}\n\n---\n\n`;
      }
    });
    const { renderMarkdownToPDF } = await import('@/lib/pdfMarkdown');
    renderMarkdownToPDF(doc, answerContent, { marginLeft: mL, marginRight: mR, marginTop: mT, marginBottom: mB, pageWidth: 176, pageHeight: 250, startY: y });

    doc.save(`${pred.title.toLowerCase().replace(/\s+/g, '-')}-prediksi.pdf`);
    showToast('PDF berhasil diunduh!', 'success');
  };

  const handleStartPractice = (pred: ExamPrediction) => {
    setSelectedPrediction(pred);
    setUserAnswers({});
    setShowAnswers(false);
    setShowPracticeModal(true);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '1.25rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: 'rgb(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            🎯 Pusat Prediksi Ujian
          </h2>
          <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', marginTop: '0.25rem', margin: 0 }}>Persiapkan ujian secara matang dengan bank soal kisi-kisi atau prediksi bertenaga AI.</p>
        </div>
        {isOwner && (
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 px-4 shadow-md transition-all active:scale-95 font-semibold">
            <Sparkles className="h-4 w-4 text-indigo-200" />
            Buat Prediksi Baru
          </Button>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {predictions.length === 0 ? (
            <Card style={{ gridColumn: '1 / -1', padding: '3rem 2rem', textAlign: 'center', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-xl)', background: 'rgba(255,255,255,0.01)' }}>
              <BookOpen style={{ margin: '0 auto 1rem', color: 'rgb(var(--text-muted))', opacity: 0.3 }} size={48} />
              <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, color: 'rgb(var(--text-primary))' }}>Belum ada bank soal prediksi</h3>
              <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginTop: '0.25rem' }}>Gunakan AI untuk menghasilkan soal prediksi dari materi pertemuan yang sudah diajarkan.</p>
            </Card>
          ) : (
            predictions.map(pred => (
              <Card key={pred.id} style={{ padding: '1.25rem', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <h3 style={{ fontWeight: 800, color: 'rgb(var(--text-primary))', fontSize: 'var(--font-md)', lineHeight: 1.3 }}>{pred.title}</h3>
                    <span style={{ 
                      padding: '0.15rem 0.55rem', 
                      borderRadius: '9999px', 
                      fontSize: '0.65rem', 
                      fontWeight: 800, 
                      textTransform: 'uppercase',
                      background: pred.source === 'AI_GENERATED' ? 'rgba(139, 92, 246, 0.12)' :
                                  pred.source === 'KISI_KISI' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                      color: pred.source === 'AI_GENERATED' ? '#a78bfa' :
                             pred.source === 'KISI_KISI' ? '#60a5fa' : 'rgb(var(--text-secondary))',
                      border: pred.source === 'AI_GENERATED' ? '1px solid rgba(139, 92, 246, 0.25)' :
                              pred.source === 'KISI_KISI' ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid var(--border-subtle)',
                    }}>
                      {pred.source === 'AI_GENERATED' ? '🤖 AI' :
                       pred.source === 'KISI_KISI' ? '📷 Kisi-Kisi' : '✏️ Manual'}
                    </span>
                  </div>
                  <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-secondary))', marginTop: '0.35rem', marginBottom: '1.25rem' }} className="line-clamp-2">{pred.description || 'Tidak ada deskripsi.'}</p>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button onClick={() => handleStartPractice(pred)} variant="outline" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#818cf8', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
                      <BookOpen size={12} />
                      Latihan
                    </Button>
                    <Button onClick={() => handleExportPDF(pred)} variant="outline" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', borderColor: 'rgba(52, 211, 153, 0.3)', color: '#34d399', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
                      <Download size={12} />
                      Export B5
                    </Button>
                  </div>
                  {isOwner && (
                    <button 
                      onClick={() => handleDeletePrediction(pred.id)} 
                      style={{ border: 'none', background: 'none', color: '#f87171', padding: '0.35rem', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                      className="hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Buat Prediksi Ujian Baru" size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.03)', padding: '0.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
            {hasFeature('exam_prediction') && <button onClick={() => setSourceType('AI')} style={{ flex: 1, padding: '0.5rem', fontSize: 'var(--font-sm)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'var(--transition-fast)', background: sourceType === 'AI' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: sourceType === 'AI' ? '#818cf8' : 'rgb(var(--text-muted))', fontWeight: 600 }}>🤖 AI Generate</button>}
            {hasFeature('exam_kisi_kisi') && <button onClick={() => setSourceType('KISI_KISI')} style={{ flex: 1, padding: '0.5rem', fontSize: 'var(--font-sm)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'var(--transition-fast)', background: sourceType === 'KISI_KISI' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: sourceType === 'KISI_KISI' ? '#818cf8' : 'rgb(var(--text-muted))', fontWeight: 600 }}>📷 Upload Foto</button>}
            {hasFeature('exam_manual') && <button onClick={() => setSourceType('MANUAL')} style={{ flex: 1, padding: '0.5rem', fontSize: 'var(--font-sm)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'var(--transition-fast)', background: sourceType === 'MANUAL' ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: sourceType === 'MANUAL' ? '#818cf8' : 'rgb(var(--text-muted))', fontWeight: 600 }}>✏️ Manual</button>}
          </div>

            <TextInput label="Judul Prediksi" value={title} onChange={v => setTitle(v)} placeholder="e.g. UTS Kalkulus 1, Kisi-kisi Dosen UAS" />

            <TextArea label="Deskripsi / Catatan Tambahan" value={description} onChange={setDescription} placeholder="e.g. Mencakup bab pertidaksamaan hingga turunan fungsi" rows={3} />

          {sourceType === 'AI' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>Pilih Pertemuan Kuliah (Bahan Rujukan AI)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', maxHeight: '140px', overflowY: 'auto', padding: '0.5rem', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                  {sessions.length === 0 ? (
                    <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', gridColumn: '1 / -1', margin: '0.5rem 0', textAlign: 'center' }}>Belum ada pertemuan di kelas ini.</p>
                  ) : (
                    sessions.map(s => {
                      const isChecked = selectedSessions.includes(s.id);
                      return (
                        <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--font-xs)', color: isChecked ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))', cursor: 'pointer', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', background: isChecked ? 'rgba(99, 102, 241, 0.08)' : 'transparent', border: '1px solid', borderColor: isChecked ? 'rgba(99, 102, 241, 0.2)' : 'transparent', transition: 'var(--transition-fast)' }}>
                          <input type="checkbox" checked={isChecked} onChange={() => handleSessionToggle(s.id)} style={{ accentColor: '#818cf8', cursor: 'pointer' }} />
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{s.title}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <SelectOption label="Format Soal" value={examType} onChange={v => setExamType(v as any)} options={[
                    { value: 'MIXED', label: 'Campuran' },
                    { value: 'MULTIPLE_CHOICE', label: 'Pilihan Ganda' },
                    { value: 'ESSAY', label: 'Essay' },
                  ]} />
                {examType !== 'ESSAY' && (
                    <NumberInput label="Jumlah PG" value={String(countPG)} onChange={v => setCountPG(parseInt(v) || 1)} min={1} />
                )}
                {examType !== 'MULTIPLE_CHOICE' && (
                    <NumberInput label="Jumlah Essay" value={String(countEssay)} onChange={v => setCountEssay(parseInt(v) || 1)} min={1} />
                )}
              </div>
            </div>
          )}

          {sourceType === 'KISI_KISI' && (
            <div style={{ padding: '1.5rem', background: 'rgba(99, 102, 241, 0.03)', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(99, 102, 241, 0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <p style={{ fontSize: 'var(--font-xs)', color: '#818cf8', textAlign: 'center', fontWeight: 600, lineHeight: 1.5, maxWidth: '400px' }}>Upload foto coretan papan tulis, lembar kisi-kisi atau file soal dari dosen. AI Vision akan memindai dan menyusun bank soal latihan secara instan.</p>
              <AIPhotoInput mode="questions" onExtracted={handleKisiKisiExtracted} label="Unggah Foto Kisi-kisi" />
            </div>
          )}

          {sourceType === 'MANUAL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>Daftar Pertanyaan</span>
                <Button onClick={handleAddManualQuestion} variant="outline" size="sm" style={{ color: 'rgb(var(--color-primary))', borderColor: 'rgba(var(--color-primary), 0.3)', borderRadius: 'var(--radius-md)' }}>+ Tambah Soal</Button>
              </div>
              {manualQuestions.map((q, idx) => (
                <div key={idx} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--color-primary))' }}>Soal #{idx + 1}</span>
                    <SelectOption value={q.type} onChange={v => handleManualQuestionChange(idx, 'type', v)} options={[
                      { value: 'MULTIPLE_CHOICE', label: 'Pilihan Ganda' },
                      { value: 'ESSAY', label: 'Essay' },
                    ]} />
                  </div>
                  <TextInput value={q.question} onChange={v => handleManualQuestionChange(idx, 'question', v)} placeholder="Tulis pertanyaan soal..." />
                  
                  {q.type === 'MULTIPLE_CHOICE' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                      {['A', 'B', 'C', 'D'].map((opt, oIdx) => {
                        const opts = JSON.parse(q.options || '["", "", "", ""]');
                        return (
                          <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ fontSize: 'var(--font-xs)', fontWeight: 800, color: 'rgb(var(--text-muted))' }}>{opt}</span>
                            <input type="text" value={opts[oIdx] || ''} onChange={e => handleManualOptionChange(idx, oIdx, e.target.value)} placeholder="Teks opsi..." style={{ background: 'none', border: 'none', outline: 'none', color: 'rgb(var(--text-primary))', fontSize: 'var(--font-xs)', width: '100%' }} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                    <TextInput value={q.answerKey || ''} onChange={v => handleManualQuestionChange(idx, 'answerKey', v)} placeholder="Kunci/Acuan Jawaban..." />
                    <TextInput value={q.explanation || ''} onChange={v => handleManualQuestionChange(idx, 'explanation', v)} placeholder="Pembahasan / Alasan..." />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'end', gap: '0.5rem', borderTop: '1px solid var(--border-default)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <Button onClick={() => setShowCreateModal(false)} variant="outline" style={{ borderRadius: 'var(--radius-md)' }}>Batal</Button>
            {sourceType !== 'KISI_KISI' && (
              <Button onClick={handleCreatePrediction} disabled={isGenerating} style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', color: 'black', borderRadius: 'var(--radius-md)', fontWeight: 700 }}>
                {isGenerating ? 'Menyimpan...' : 'Simpan Prediksi'}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* PRACTICE MODAL */}
      <Modal isOpen={showPracticeModal} onClose={() => setShowPracticeModal(false)} title={`Latihan Mandiri: ${selectedPrediction?.title}`} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '4px' }}>
            {selectedPrediction?.questions?.map((q, idx) => (
              <div key={q.id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgb(var(--color-primary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SOAL LATIHAN #{idx + 1}</span>
                <p style={{ fontWeight: 700, color: 'rgb(var(--text-primary))', fontSize: 'var(--font-sm)', lineHeight: 1.5 }}>{q.question}</p>

                {q.type === 'MULTIPLE_CHOICE' && q.options && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {JSON.parse(q.options).map((opt: string) => {
                      const optCode = opt.charAt(0);
                      const isSelected = userAnswers[q.id] === optCode;
                      const isCorrect = q.answerKey === optCode;
                      
                      let btnBg = 'rgba(255, 255, 255, 0.02)';
                      let btnBorder = '1px solid var(--border-default)';
                      let btnColor = 'rgb(var(--text-primary))';
                      
                      if (showAnswers) {
                        if (isCorrect) {
                          btnBg = 'rgba(52, 211, 153, 0.12)';
                          btnBorder = '1px solid rgba(52, 211, 153, 0.3)';
                          btnColor = '#34d399';
                        } else if (isSelected) {
                          btnBg = 'rgba(248, 113, 113, 0.12)';
                          btnBorder = '1px solid rgba(248, 113, 113, 0.3)';
                          btnColor = '#f87171';
                        } else {
                          btnColor = 'rgb(var(--text-muted))';
                          btnBorder = '1px solid var(--border-subtle)';
                        }
                      } else if (isSelected) {
                        btnBg = 'rgba(99, 102, 241, 0.15)';
                        btnBorder = '1px solid #818cf8';
                        btnColor = '#818cf8';
                      }

                      return (
                        <button 
                          key={opt} 
                          onClick={() => !showAnswers && setUserAnswers(prev => ({ ...prev, [q.id]: optCode }))} 
                          style={{ 
                            textAlign: 'left', 
                            padding: '0.65rem 0.85rem', 
                            borderRadius: 'var(--radius-md)', 
                            border: btnBorder,
                            background: btnBg,
                            color: btnColor,
                            fontSize: 'var(--font-sm)', 
                            fontWeight: isSelected || (showAnswers && isCorrect) ? 600 : 500,
                            transition: 'var(--transition-fast)',
                            cursor: showAnswers ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <span>{opt}</span>
                          {showAnswers && isCorrect && <CheckCircle size={14} style={{ color: '#34d399' }} />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.type === 'ESSAY' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <TextArea value={userAnswers[q.id] || ''} onChange={v => !showAnswers && setUserAnswers(prev => ({ ...prev, [q.id]: v }))} disabled={showAnswers} placeholder="Tulis jawaban latihan Anda di sini..." rows={3} />
                  </div>
                )}

                {showAnswers && (
                  <div style={{ padding: '0.75rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.15)', fontSize: 'var(--font-xs)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertCircle size={12} /> Pembahasan & Kunci</span>
                    <p style={{ color: 'rgb(var(--text-secondary))', lineHeight: 1.5, margin: 0 }}>
                      <strong style={{ color: 'rgb(var(--text-primary))' }}>Kunci/Acuan: {q.answerKey || '-'}</strong>. {q.explanation || 'Tidak ada penjelasan khusus.'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-default)', paddingTop: '1rem' }}>
            <Button onClick={() => setShowPracticeModal(false)} variant="outline" style={{ borderRadius: 'var(--radius-md)' }}>Tutup</Button>
            {!showAnswers ? (
              <Button onClick={() => setShowAnswers(true)} style={{ background: 'rgb(var(--color-primary))', color: 'black', borderRadius: 'var(--radius-md)', fontWeight: 700 }}>
                Periksa Jawaban
              </Button>
            ) : (
              <Button onClick={() => { setShowAnswers(false); setUserAnswers({}); }} style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', color: 'black', borderRadius: 'var(--radius-md)', fontWeight: 700 }}>
                Coba Lagi
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
