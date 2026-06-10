'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Alert, useToast } from '@/components/ui';
import { siBawelService, BawelSetting, WeeklyRoast, BawelComment } from '@/services/siBawelService';
import { Loader2, Send, Star, MessageCircleHeart, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface ChatMessage { role: 'user' | 'bawel'; text: string; }

export default function SiBawelPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tab, setTab] = useState<'chat' | 'riwayat' | 'roast' | 'settings'>('chat');
  const [setting, setSetting] = useState<BawelSetting | null>(null);
  const [roast, setRoast] = useState<WeeklyRoast | null>(null);
  const [comments, setComments] = useState<BawelComment[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsPage, setCommentsPage] = useState(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [roastLoading, setRoastLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { siBawelService.getSetting().then(setSetting).catch(() => {}); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await siBawelService.chat(msg);
      setMessages(prev => [...prev, { role: 'bawel', text: res.reply }]);
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const loadRoast = async () => {
    setRoastLoading(true);
    try { setRoast(await siBawelService.getWeeklyRoast()); }
    catch (e: any) { showToast(e.message, 'error'); }
    finally { setRoastLoading(false); }
  };

  const loadComments = async (page: number = 1) => {
    setCommentsLoading(true);
    try {
      const res = await siBawelService.getComments(page, 15);
      setComments(res.comments); setCommentsTotal(res.totalPages); setCommentsPage(page);
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setCommentsLoading(false); }
  };

  const updateLevel = async (level: string) => {
    try { setSetting(await siBawelService.updateSetting({ level: level as any })); showToast(`Level diubah ke ${level}`, 'success'); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const toggleEnabled = async () => {
    if (!setting) return;
    try { const res = await siBawelService.updateSetting({ isEnabled: !setting.isEnabled }); setSetting(res); showToast(res.isEnabled ? 'Si Bawel diaktifkan!' : 'Si Bawel dinonaktifkan.', 'success'); }
    catch (e: any) { showToast(e.message, 'error'); }
  };

  const fmt = (n: number) => `Rp${n.toLocaleString('id-ID')}`;
  const levelColor = (lvl: string) => lvl === 'warning' ? 'rgba(255,165,0,0.1)' : lvl === 'praise' ? 'rgba(0,200,0,0.1)' : 'var(--bg-secondary)';

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content">
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>🗣️ Si Bawel</h1>
              <p style={{ marginBottom: 20, opacity: 0.6, fontSize: 14 }}>Asisten keuangan yang nyinyir tapi sayang. Tanya soal keuanganmu!</p>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 8, overflowX: 'auto' }}>
                {[
                  { key: 'chat', label: '💬 Chat' },
                  { key: 'riwayat', label: '📜 Riwayat' },
                  { key: 'roast', label: '🔥 Weekly Roast' },
                  { key: 'settings', label: '⚙️ Setting' },
                ].map(t => (
                  <button key={t.key} onClick={() => {
                    setTab(t.key as any);
                    if (t.key === 'roast' && !roast) loadRoast();
                    if (t.key === 'riwayat' && comments.length === 0) loadComments();
                  }} style={{
                    padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: tab === t.key ? 600 : 400,
                    background: tab === t.key ? 'var(--color-primary)' : 'transparent', color: tab === t.key ? '#fff' : 'inherit', whiteSpace: 'nowrap', fontSize: 14,
                  }}>{t.label}</button>
                ))}
              </div>

              {/* Chat */}
              {tab === 'chat' && (
                <Card>
                  <div style={{ minHeight: 300, maxHeight: 500, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {messages.length === 0 && (
                      <div style={{ textAlign: 'center', opacity: 0.4, padding: 40 }}>
                        <MessageCircleHeart size={48} style={{ margin: '0 auto 12px' }} />
                        <p>Mulai percakapan dengan Si Bawel!</p>
                        <p style={{ fontSize: 13, marginTop: 4 }}>Contoh: &quot;Gimana keuanganku minggu ini?&quot;</p>
                        <p style={{ fontSize: 13 }}>&quot;Aku boros ga sih bulan ini?&quot;</p>
                        <p style={{ fontSize: 13 }}>&quot;Kasih tips hemat dong&quot;</p>
                      </div>
                    )}
                    {messages.map((m, i) => (
                      <div key={i} style={{
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        background: m.role === 'user' ? 'var(--color-primary)' : 'var(--bg-secondary)',
                        color: m.role === 'user' ? '#fff' : 'inherit',
                        padding: '10px 14px', borderRadius: 12, maxWidth: '80%', fontSize: 14, lineHeight: 1.5,
                      }}>{m.role === 'bawel' && '🗣️ '}{m.text}</div>
                    ))}
                    {loading && <div style={{ alignSelf: 'flex-start', padding: '8px 14px', opacity: 0.5, fontSize: 14 }}><Loader2 className="spin" size={14} /> Mikir...</div>}
                    <div ref={chatEndRef} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input" style={{ flex: 1 }} placeholder="Tanya Si Bawel..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} />
                    <Button onClick={handleSend} disabled={loading || !input.trim()}><Send size={16} /></Button>
                  </div>
                </Card>
              )}

              {/* Riwayat Komentar */}
              {tab === 'riwayat' && (
                <div>
                  <p style={{ fontSize: 14, opacity: 0.6, marginBottom: 16 }}>Timeline semua komentar Si Bawel dari transaksimu.</p>
                  {commentsLoading ? <div style={{ textAlign: 'center', padding: 40 }}><Loader2 className="spin" size={32} /></div> : comments.length === 0 ? (
                    <Card><p style={{ textAlign: 'center', opacity: 0.5, padding: 20 }}>Belum ada komentar. Si Bawel akan berkomentar setiap kamu catat transaksi.</p></Card>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {comments.map(c => (
                          <Card key={c.id}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              {c.type === 'income' ? <ArrowUpCircle size={16} style={{ color: 'var(--color-success)' }} /> : <ArrowDownCircle size={16} style={{ color: 'var(--color-error)' }} />}
                              <strong style={{ fontSize: 14 }}>{c.label}</strong>
                              <span style={{ fontSize: 12, opacity: 0.5, textTransform: 'capitalize' }}>{c.category}</span>
                              <span style={{ marginLeft: 'auto', fontWeight: 600, fontSize: 14, color: c.type === 'income' ? 'var(--color-success)' : 'var(--color-error)' }}>
                                {c.type === 'income' ? '+' : '-'}{fmt(c.amount)}
                              </span>
                            </div>
                            <div style={{ padding: '8px 12px', borderRadius: 8, background: levelColor(c.bawelLevel), fontSize: 14, fontStyle: 'italic', lineHeight: 1.5 }}>
                              🗣️ {c.bawelComment}
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.4, marginTop: 4 }}>{new Date(c.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          </Card>
                        ))}
                      </div>
                      {commentsTotal > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                          <Button disabled={commentsPage <= 1} onClick={() => loadComments(commentsPage - 1)} variant="secondary" size="sm">Prev</Button>
                          <span style={{ padding: '6px 12px', fontSize: 13 }}>{commentsPage} / {commentsTotal}</span>
                          <Button disabled={commentsPage >= commentsTotal} onClick={() => loadComments(commentsPage + 1)} variant="secondary" size="sm">Next</Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Weekly Roast */}
              {tab === 'roast' && (
                <div>
                  {roastLoading ? <div style={{ textAlign: 'center', padding: 40 }}><Loader2 className="spin" size={32} /><p style={{ marginTop: 8, opacity: 0.5, fontSize: 14 }}>Si Bawel lagi ngomel...</p></div> : roast ? (
                    <Card>
                      <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: 48, marginBottom: 8 }}>🔥</div>
                        <h2>Weekly Roast</h2>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, margin: '12px 0' }}>
                          {Array.from({ length: 10 }, (_, i) => <Star key={i} size={20} fill={i < roast.score ? 'gold' : 'none'} stroke={i < roast.score ? 'gold' : 'gray'} />)}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>Score: {roast.score}/10</div>
                      </div>
                      <p style={{ marginBottom: 12, lineHeight: 1.6, fontSize: 15 }}>{roast.roast}</p>
                      {roast.biggestSpend && <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 8, fontSize: 14 }}>💸 Pengeluaran terbesar: <strong style={{ textTransform: 'capitalize' }}>{roast.biggestSpend}</strong></div>}
                      {roast.tip && <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 14 }}>💡 Tips: {roast.tip}</div>}
                      <div style={{ marginTop: 16, textAlign: 'center' }}><Button onClick={loadRoast} variant="secondary" size="sm">🔄 Refresh Roast</Button></div>
                    </Card>
                  ) : <Card><p style={{ textAlign: 'center', opacity: 0.6 }}>Gagal memuat roast.</p></Card>}
                </div>
              )}

              {/* Settings */}
              {tab === 'settings' && setting && (
                <Card>
                  <h3 style={{ marginBottom: 16 }}>⚙️ Pengaturan Si Bawel</h3>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>Status</label>
                    <Button onClick={toggleEnabled} variant={setting.isEnabled ? 'primary' : 'secondary'}>{setting.isEnabled ? '✅ Aktif' : '❌ Nonaktif'}</Button>
                    <p style={{ fontSize: 13, opacity: 0.5, marginTop: 4 }}>Jika nonaktif, Si Bawel tidak akan berkomentar pada transaksimu.</p>
                  </div>
                  <div>
                    <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>Level Kecerewetan</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { key: 'SANTAI', emoji: '😌', desc: 'Komentar ringan, hanya untuk transaksi besar (> Rp100rb)' },
                        { key: 'NORMAL', emoji: '😐', desc: 'Komentar untuk semua transaksi, tone casual' },
                        { key: 'CEREWET', emoji: '😤', desc: 'Detail banget, cross-reference data, nyinyir level max' },
                      ].map(l => (
                        <div key={l.key} onClick={() => updateLevel(l.key)} style={{
                          flex: 1, padding: 12, borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                          border: setting.level === l.key ? '2px solid var(--color-primary)' : '2px solid var(--border-color)',
                          background: setting.level === l.key ? 'rgba(var(--color-primary-rgb, 59,130,246), 0.05)' : 'transparent',
                        }}>
                          <div style={{ fontSize: 28, marginBottom: 4 }}>{l.emoji}</div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{l.key}</div>
                          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{l.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
