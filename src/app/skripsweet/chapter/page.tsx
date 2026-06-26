'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, useToast, TextInput, TextArea, SelectOption } from '@/components/ui';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { HtmlRenderer } from '@/components/ui/HtmlRenderer';
import { skripsweetService, ThesisChapter } from '@/services/skripsweetService';
import { ArrowLeft, Loader2, Save, Sparkles, FileText, BarChart3, Wand2, PenTool, ListOrdered, CornerDownRight, X, ChevronDown, Send } from 'lucide-react';

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor').then(m => ({ default: m.RichTextEditor })), { ssr: false });

const CHAPTER_STATUS: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Belum Mulai', color: '#6b7280' },
  drafting: { label: 'Drafting', color: '#3b82f6' },
  reviewing: { label: 'Review', color: '#f59e0b' },
  revision: { label: 'Revisi', color: '#ef4444' },
  done: { label: 'Selesai', color: '#22c55e' },
};

const AI_ACTIONS = [
  { key: 'continue', label: 'Lanjutkan Tulisan', icon: '✍️', desc: 'AI melanjutkan dari posisi terakhir' },
  { key: 'outline', label: 'Buat Kerangka', icon: '📋', desc: 'Generate outline untuk bab ini' },
  { key: 'opening', label: 'Paragraf Pembuka', icon: '🎯', desc: 'Buat pembukaan bab yang kuat' },
  { key: 'transition', label: 'Paragraf Transisi', icon: '🔗', desc: 'Hubungkan antar bagian' },
  { key: 'conclusion', label: 'Paragraf Penutup', icon: '🏁', desc: 'Buat kesimpulan bab' },
  { key: 'expand', label: 'Kembangkan Teks', icon: '📝', desc: 'Perluas teks yang dipilih', needsSelection: true },
  { key: 'rewrite', label: 'Tulis Ulang', icon: '🔄', desc: 'Rewrite teks lebih akademis', needsSelection: true },
];

export default function ChapterEditorPage() {
  useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const thesisId = params.get('thesisId') || '';
  const chapterId = params.get('chapterId') || '';
  const { showToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [chapter, setChapter] = useState<ThesisChapter | null>(null);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('not_started');
  const [targetWords, setTargetWords] = useState('');
  const [targetPages, setTargetPages] = useState('');
  const [targetParagraphs, setTargetParagraphs] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  // AI Assist state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiAction, setAiAction] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    if (!thesisId || !chapterId) return;
    (async () => {
      try {
        const thesis = await skripsweetService.getDetail(thesisId);
        const ch = thesis.chapters.find(c => c.id === chapterId);
        if (ch) {
          setChapter(ch);
          setContent(ch.content || '');
          setStatus(ch.status);
          setTargetWords(ch.targetWords ? String(ch.targetWords) : '');
          setTargetPages(ch.targetPages ? String(ch.targetPages) : '');
          setTargetParagraphs(ch.targetParagraphs ? String(ch.targetParagraphs) : '');
        }
      } catch { showToast('Gagal memuat bab', 'error'); }
      finally { setLoading(false); }
    })();
  }, [thesisId, chapterId]);

  const wordCount = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const paragraphCount = (content.match(/<\/p>/gi) || []).length || 1;
  const pageEstimate = Math.round((wordCount / 250) * 10) / 10;

  const handleSave = async () => {
    if (!thesisId || !chapterId) return;
    setSaving(true);
    try {
      await skripsweetService.updateChapter(thesisId, chapterId, {
        content,
        status,
        targetWords: targetWords ? parseInt(targetWords) : undefined,
        targetPages: targetPages ? parseInt(targetPages) : undefined,
        targetParagraphs: targetParagraphs ? parseInt(targetParagraphs) : undefined,
      } as any);
      setHasUnsaved(false);
      showToast('Bab berhasil disimpan! 💾', 'success');
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleGetFeedback = async () => {
    if (!thesisId || !chapterId) return;
    setFeedbackLoading(true);
    try {
      const res = await skripsweetService.getChapterFeedback(thesisId, chapterId);
      setChapter(prev => prev ? { ...prev, aiSuggestion: res.feedback } : null);
      setShowFeedback(true);
      showToast('Feedback AI sudah siap!', 'success');
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setFeedbackLoading(false); }
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    setHasUnsaved(true);
  };

  // AI Writing Assist
  const handleAiAssist = async (action: string) => {
    if (!thesisId || !chapterId) return;
    if ((action === 'expand' || action === 'rewrite') && !selectedText.trim()) {
      showToast('Pilih/masukkan teks yang ingin di-' + (action === 'expand' ? 'kembangkan' : 'tulis ulang'), 'info');
      return;
    }
    setAiLoading(true);
    setAiAction(action);
    setAiResult(null);
    try {
      const res = await skripsweetService.aiWriteAssist(
        thesisId, chapterId, action,
        selectedText || undefined,
        action === 'custom' ? customPrompt : undefined,
      );
      setAiResult(res.content);
    } catch (e: any) { showToast(e.message || 'Gagal generate AI', 'error'); }
    finally { setAiLoading(false); }
  };

  const handleInsertAiResult = () => {
    if (!aiResult) return;
    setContent(prev => prev + aiResult);
    setHasUnsaved(true);
    setAiResult(null);
    setAiAction(null);
    showToast('Teks AI ditambahkan ke konten! ✨', 'success');
  };

  const handleReplaceWithAi = () => {
    if (!aiResult || !selectedText) return;
    setContent(prev => prev.replace(selectedText, aiResult));
    setHasUnsaved(true);
    setAiResult(null);
    setAiAction(null);
    setSelectedText('');
    showToast('Teks berhasil diganti! ✨', 'success');
  };

  // Auto-save every 30 seconds if there are unsaved changes
  useEffect(() => {
    if (!hasUnsaved) return;
    const timer = setTimeout(() => { handleSave(); }, 30000);
    return () => clearTimeout(timer);
  }, [hasUnsaved, content]);

  const st = CHAPTER_STATUS[status] || CHAPTER_STATUS.not_started;
  const wordPct = chapter?.targetWords ? Math.min(Math.round((wordCount / chapter.targetWords) * 100), 100) : null;
  const pagePct = targetPages ? Math.min(Math.round((pageEstimate / parseInt(targetPages)) * 100), 100) : null;
  const paraPct = targetParagraphs ? Math.min(Math.round((paragraphCount / parseInt(targetParagraphs)) * 100), 100) : null;

  return (
    <AuthGuard requiredFeature="skripsweet">
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 'calc(var(--bottom-nav-height, 60px) + 16px)' }}>

              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={32} className="spin" style={{ opacity: 0.3 }} /></div>
              ) : !chapter ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <p style={{ opacity: 0.5 }}>Bab tidak ditemukan</p>
                  <Button onClick={() => router.back()} variant="secondary" style={{ marginTop: 16 }}><ArrowLeft size={14} /> Kembali</Button>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 10, display: 'flex' }}><ArrowLeft size={20} /></button>
                      <div>
                        <h1 style={{ fontSize: 20, fontWeight: 800 }}>{chapter.title}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: `${st.color}15`, color: st.color, fontWeight: 700 }}>{st.label}</span>
                          {hasUnsaved && <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>● Belum disimpan</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button onClick={() => setShowAiPanel(!showAiPanel)} variant="secondary" size="sm" style={{ background: showAiPanel ? 'rgba(99, 102, 241, 0.1)' : undefined, color: showAiPanel ? '#6366f1' : undefined, border: showAiPanel ? '1.5px solid rgba(99, 102, 241, 0.3)' : undefined }}>
                        <Wand2 size={14} /> AI Assist
                      </Button>
                      <Button onClick={handleGetFeedback} variant="secondary" size="sm" disabled={feedbackLoading || wordCount < 20} style={{ background: 'rgba(168, 85, 247, 0.06)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                        {feedbackLoading ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} Review
                      </Button>
                      <Button onClick={handleSave} disabled={saving} size="sm">
                        {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Simpan
                      </Button>
                    </div>
                  </div>

                  {/* Stats bar */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
                    <Card style={{ padding: '14px 16px', borderRadius: 14 }}>
                      <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>📝 Kata</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#6366f1' }}>{wordCount.toLocaleString()}</div>
                      {wordPct !== null && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ height: 4, borderRadius: 2, background: 'var(--input-bg)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${wordPct}%`, background: wordPct >= 100 ? '#22c55e' : '#6366f1', borderRadius: 2, transition: 'width 0.5s' }} />
                          </div>
                          <div style={{ fontSize: 10, opacity: 0.4, marginTop: 2 }}>{wordPct}% dari {chapter.targetWords}</div>
                        </div>
                      )}
                    </Card>
                    <Card style={{ padding: '14px 16px', borderRadius: 14 }}>
                      <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>📄 Halaman</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#8b5cf6' }}>{pageEstimate}</div>
                      {pagePct !== null && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ height: 4, borderRadius: 2, background: 'var(--input-bg)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pagePct}%`, background: pagePct >= 100 ? '#22c55e' : '#8b5cf6', borderRadius: 2, transition: 'width 0.5s' }} />
                          </div>
                          <div style={{ fontSize: 10, opacity: 0.4, marginTop: 2 }}>{pagePct}% dari {targetPages}</div>
                        </div>
                      )}
                    </Card>
                    <Card style={{ padding: '14px 16px', borderRadius: 14 }}>
                      <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>¶ Paragraf</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#22c55e' }}>{paragraphCount}</div>
                      {paraPct !== null && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ height: 4, borderRadius: 2, background: 'var(--input-bg)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${paraPct}%`, background: paraPct >= 100 ? '#22c55e' : '#22c55e80', borderRadius: 2, transition: 'width 0.5s' }} />
                          </div>
                          <div style={{ fontSize: 10, opacity: 0.4, marginTop: 2 }}>{paraPct}% dari {targetParagraphs}</div>
                        </div>
                      )}
                    </Card>
                    <Card style={{ padding: '14px 16px', borderRadius: 14 }}>
                      <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>⚙️ Status</div>
                      <SelectOption value={status} onChange={setStatus} options={Object.entries(CHAPTER_STATUS).map(([k, v]) => ({ value: k, label: v.label }))} />
                    </Card>
                  </div>

                  {/* Target settings row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                    <TextInput label="Target Kata" value={targetWords} onChange={setTargetWords} placeholder="e.g. 3000" />
                    <TextInput label="Target Halaman" value={targetPages} onChange={setTargetPages} placeholder="e.g. 12" />
                    <TextInput label="Target Paragraf" value={targetParagraphs} onChange={setTargetParagraphs} placeholder="e.g. 30" />
                  </div>

                  {/* AI Writing Panel */}
                  {showAiPanel && (
                    <Card style={{ padding: '20px 24px', borderRadius: 18, marginBottom: 20, border: '1.5px solid rgba(99, 102, 241, 0.15)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.03), rgba(168, 85, 247, 0.02))' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                          <Wand2 size={16} style={{ color: '#6366f1' }} /> AI Writing Assistant
                        </h3>
                        <button onClick={() => { setShowAiPanel(false); setAiResult(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 4 }}><X size={16} /></button>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: 16 }}>
                        {AI_ACTIONS.map(a => (
                          <button key={a.key} onClick={() => handleAiAssist(a.key)} disabled={aiLoading}
                            style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border-default)', background: aiAction === a.key ? 'rgba(99, 102, 241, 0.08)' : 'var(--card-bg)', cursor: aiLoading ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'all 0.2s', opacity: aiLoading && aiAction !== a.key ? 0.5 : 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                              <span>{a.icon}</span> {a.label}
                            </div>
                            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 3 }}>{a.desc}</div>
                          </button>
                        ))}
                      </div>

                      {/* Selected text / custom prompt */}
                      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                        <div style={{ flex: 1 }}>
                          <TextArea value={selectedText} onChange={setSelectedText} placeholder="Paste teks yang ingin di-expand/rewrite di sini (untuk aksi Kembangkan/Tulis Ulang)..." rows={2} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && customPrompt.trim()) { e.preventDefault(); handleAiAssist('custom'); } }}>
                        <div style={{ flex: 1 }}>
                          <TextInput value={customPrompt} onChange={setCustomPrompt} placeholder="Atau tulis instruksi custom ke AI... (Enter untuk submit)" />
                        </div>
                        <Button onClick={() => handleAiAssist('custom')} disabled={aiLoading || !customPrompt.trim()} size="sm">
                          {aiLoading && aiAction === 'custom' ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                        </Button>
                      </div>

                      {/* Loading indicator */}
                      {aiLoading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0 8px' }}>
                          <Loader2 size={16} className="spin" style={{ color: '#6366f1' }} />
                          <span style={{ fontSize: 13, opacity: 0.6 }}>AI sedang menulis{aiAction ? ` (${AI_ACTIONS.find(a => a.key === aiAction)?.label || aiAction})` : ''}...</span>
                        </div>
                      )}

                      {/* AI Result */}
                      {aiResult && (
                        <div style={{ marginTop: 16, borderRadius: 14, border: '1px solid rgba(99, 102, 241, 0.15)', overflow: 'hidden' }}>
                          <div style={{ padding: '10px 16px', background: 'rgba(99, 102, 241, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(99, 102, 241, 0.1)' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>✨ Hasil AI</span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {(aiAction === 'expand' || aiAction === 'rewrite') && selectedText && (
                                <Button size="sm" onClick={handleReplaceWithAi} style={{ fontSize: 11, borderRadius: 8, padding: '4px 10px', background: '#f59e0b', border: 'none', color: '#fff' }}>
                                  🔄 Ganti Teks
                                </Button>
                              )}
                              <Button size="sm" onClick={handleInsertAiResult} style={{ fontSize: 11, borderRadius: 8, padding: '4px 10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: '#fff' }}>
                                ➕ Tambahkan ke Konten
                              </Button>
                              <button onClick={() => { setAiResult(null); setAiAction(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 4 }}><X size={14} /></button>
                            </div>
                          </div>
                          <div style={{ padding: '16px 20px', maxHeight: 300, overflowY: 'auto', fontSize: 13, lineHeight: 1.8 }}>
                            <HtmlRenderer content={aiResult} compact />
                          </div>
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Editor */}
                  <Card style={{ padding: 0, borderRadius: 18, overflow: 'hidden', marginBottom: 20 }}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--input-bg)' }}>
                      <FileText size={14} style={{ opacity: 0.5 }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Editor Konten</span>
                      {!showAiPanel && (
                        <button onClick={() => setShowAiPanel(true)} style={{ marginLeft: 8, padding: '3px 10px', borderRadius: 8, border: '1px solid rgba(99, 102, 241, 0.2)', background: 'rgba(99, 102, 241, 0.04)', cursor: 'pointer', fontSize: 11, color: '#6366f1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Wand2 size={11} /> AI Assist
                        </button>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.4 }}>Auto-save dalam 30 detik</span>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                      <RichTextEditor content={content} onChange={handleContentChange} placeholder="Mulai menulis konten bab..." minHeight={500} />
                    </div>
                  </Card>

                  {/* AI Feedback */}
                  {chapter.aiSuggestion && showFeedback && (
                    <Card style={{ padding: '20px 24px', borderRadius: 18, border: '1px solid rgba(168, 85, 247, 0.15)', background: 'rgba(168, 85, 247, 0.02)', marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Sparkles size={16} style={{ color: '#a855f7' }} /> Feedback AI
                        </h3>
                        <button onClick={() => setShowFeedback(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.5 }}>Tutup</button>
                      </div>
                      <MarkdownRenderer content={chapter.aiSuggestion} compact />
                    </Card>
                  )}

                  {/* Notes */}
                  {chapter.notes && (
                    <Card style={{ padding: '16px 20px', borderRadius: 14, opacity: 0.7 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>📌 Catatan:</div>
                      <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{chapter.notes}</p>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
