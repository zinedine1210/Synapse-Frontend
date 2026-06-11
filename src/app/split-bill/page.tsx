'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Modal, useToast, useConfirm, CurrencyInput, parseCurrency } from '@/components/ui';
import { splitBillService, SplitBill, ReceiptScanResult } from '@/services/splitBillService';
import { Receipt, Plus, Loader2, Camera, Check, X, Send, Trash2, ChevronLeft, Users } from 'lucide-react';

export default function SplitBillPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bills, setBills] = useState<SplitBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
  const [selectedBill, setSelectedBill] = useState<SplitBill | null>(null);

  // Create form
  const [eventName, setEventName] = useState('');
  const [items, setItems] = useState<{ name: string; price: string; quantity: string }[]>([{ name: '', price: '', quantity: '1' }]);
  const [participants, setParticipants] = useState<string[]>(['']);
  const [scanning, setScanning] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try { setBills(await splitBillService.getAll()); }
    catch (e: any) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const handleScanReceipt = async (file: File) => {
    setScanning(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const result = await splitBillService.scanReceipt(base64, file.type);
      if (result.error) {
        showToast(result.error, 'error');
      } else if (result.items) {
        setItems(result.items.map(i => ({
          name: i.name,
          price: String(i.price),
          quantity: String(i.quantity),
        })));
        if (result.storeName) setEventName(result.storeName);
        showToast(`${result.items.length} item terdeteksi dari struk!`, 'success');
      }
    } catch (e: any) {
      showToast(e.message || 'Gagal scan struk.', 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleCreate = async () => {
    const validItems = items.filter(i => i.name && i.price);
    const validParticipants = participants.filter(p => p.trim());
    if (validItems.length === 0) { showToast('Tambah minimal 1 item.', 'error'); return; }
    if (validParticipants.length === 0) { showToast('Tambah minimal 1 peserta.', 'error'); return; }

    setCreating(true);
    try {
      const bill = await splitBillService.create({
        eventName: eventName || undefined,
        items: validItems.map(i => ({ name: i.name, price: parseCurrency(i.price), quantity: parseInt(i.quantity) || 1 })),
        participants: validParticipants,
      });
      showToast('Split bill dibuat! 🎉', 'success');
      setView('detail');
      setSelectedBill(bill);
      fetchBills();
      resetForm();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setEventName('');
    setItems([{ name: '', price: '', quantity: '1' }]);
    setParticipants(['']);
  };

  const openDetail = async (id: string) => {
    try {
      const bill = await splitBillService.getById(id);
      setSelectedBill(bill);
      setView('detail');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleAssign = async (itemId: string, participantId: string, currentlyAssigned: string[]) => {
    const newAssigned = currentlyAssigned.includes(participantId)
      ? currentlyAssigned.filter(id => id !== participantId)
      : [...currentlyAssigned, participantId];
    try {
      const updated = await splitBillService.assignItem(itemId, newAssigned);
      setSelectedBill(updated);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleMarkPaid = async (participantId: string) => {
    try {
      const updated = await splitBillService.markPaid(participantId);
      setSelectedBill(updated);
      fetchBills();
      showToast('Ditandai sudah bayar! ✅', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleSendWA = async (participantId: string) => {
    if (!selectedBill) return;
    try {
      const result = await splitBillService.getWhatsAppMessage(selectedBill.id, participantId);
      window.open(result.whatsappUrl, '_blank');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleDelete = async (billId: string) => {
    const ok = await confirm({ title: 'Hapus split bill ini?', message: 'Tindakan ini tidak dapat dibatalkan.', variant: 'danger' });
    if (!ok) return;
    try {
      await splitBillService.delete(billId);
      showToast('Bill dihapus.', 'success');
      setView('list');
      fetchBills();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const fmt = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content page-transition">
            <div style={{ maxWidth: 800, margin: '0 auto' }}>

              {/* LIST VIEW */}
              {view === 'list' && (
                <div className="animate-fade-in">
                  <div className="feature-header">
                    <h1><Receipt size={26} style={{ color: 'rgb(var(--color-primary))' }} /> Split Bill</h1>
                    <Button onClick={() => setView('create')} size="sm"><Plus size={15} /> Buat Split</Button>
                  </div>

                  {loading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'rgb(var(--color-primary))' }} /></div>
                  ) : bills.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">🧾</span>
                      <h3>Belum ada split bill</h3>
                      <p>Foto struk, tambah teman, bagi rata!</p>
                    </div>
                  ) : (
                    <div className="stagger-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {bills.map(bill => (
                        <div key={bill.id} className="qna-card" onClick={() => openDetail(bill.id)} style={{ cursor: 'pointer' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <strong>{bill.eventName || 'Split Bill'}</strong>
                            <span className={`status-badge ${bill.status === 'done' ? 'answered' : 'open'}`}>{bill.status === 'done' ? 'Selesai' : 'Berlangsung'}</span>
                          </div>
                          <div style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', display: 'flex', gap: 14 }}>
                            <span style={{ fontWeight: 700, color: 'rgb(var(--color-primary))' }}>{fmt(bill.totalAmount)}</span>
                            <span><Users size={12} /> {bill.participants?.length ?? 0} orang</span>
                            <span>{new Date(bill.createdAt).toLocaleDateString('id-ID')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CREATE VIEW */}
              {view === 'create' && (
                <div className="animate-fade-in">
                  <button onClick={() => { setView('list'); resetForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20, color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)', fontFamily: 'inherit' }}>
                    <ChevronLeft size={16} /> Kembali
                  </button>
                  <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, marginBottom: 20 }}>🧾 Buat Split Bill</h2>

                  {/* Scan receipt */}
                  <Card style={{ textAlign: 'center', padding: '1.5rem', marginBottom: 16 }}>
                    <label style={{ cursor: 'pointer' }}>
                      <span><Button variant="outline" disabled={scanning}>
                        {scanning ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Scanning...</> : <><Camera size={15} /> Scan Struk (opsional)</>}
                      </Button></span>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleScanReceipt(f); e.target.value = ''; }} />
                    </label>
                  </Card>

                  <input className="input" placeholder="Nama acara (opsional)" value={eventName} onChange={e => setEventName(e.target.value)} style={{ width: '100%', marginBottom: 16, borderRadius: 10, padding: '10px 14px' }} />

                  {/* Items */}
                  <Card style={{ marginBottom: 16 }}>
                    <h4 style={{ fontWeight: 700, marginBottom: 12 }}>📝 Item</h4>
                    {items.map((item, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 60px 30px', gap: 8, marginBottom: 8 }}>
                        <input className="input" placeholder="Nama item" value={item.name} onChange={e => { const n = [...items]; n[i].name = e.target.value; setItems(n); }} style={{ borderRadius: 10, padding: '8px 12px' }} />
                        <CurrencyInput placeholder="Harga" value={item.price} onChange={v => { const n = [...items]; n[i].price = v; setItems(n); }} />
                        <input className="input" placeholder="Qty" type="number" min="1" value={item.quantity} onChange={e => { const n = [...items]; n[i].quantity = e.target.value; setItems(n); }} style={{ borderRadius: 10, padding: '8px 12px', textAlign: 'center' }} />
                        <button onClick={() => setItems(items.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-error))' }}><X size={16} /></button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => setItems([...items, { name: '', price: '', quantity: '1' }])}><Plus size={14} /> Tambah Item</Button>
                  </Card>

                  {/* Participants */}
                  <Card style={{ marginBottom: 16 }}>
                    <h4 style={{ fontWeight: 700, marginBottom: 12 }}>👥 Peserta</h4>
                    {participants.map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <input className="input" placeholder="Nama peserta" value={p} onChange={e => { const n = [...participants]; n[i] = e.target.value; setParticipants(n); }} style={{ flex: 1, borderRadius: 10, padding: '8px 12px' }} />
                        <button onClick={() => setParticipants(participants.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-error))' }}><X size={16} /></button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => setParticipants([...participants, ''])}><Plus size={14} /> Tambah Peserta</Button>
                  </Card>

                  <Button onClick={handleCreate} disabled={creating} style={{ width: '100%' }}>
                    {creating ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : 'Buat Split Bill'}
                  </Button>
                </div>
              )}

              {/* DETAIL VIEW */}
              {view === 'detail' && selectedBill && (
                <div className="animate-fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <button onClick={() => { setView('list'); setSelectedBill(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)', fontFamily: 'inherit' }}>
                      <ChevronLeft size={16} /> Kembali
                    </button>
                    <button onClick={() => handleDelete(selectedBill.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-error))' }}><Trash2 size={16} /></button>
                  </div>

                  <Card className="gradient-border" style={{ marginBottom: 20 }}>
                    <h2 style={{ fontWeight: 800, marginBottom: 4 }}>{selectedBill.eventName || 'Split Bill'}</h2>
                    <div style={{ display: 'flex', gap: 14, fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                      <span style={{ fontWeight: 700, fontSize: 'var(--font-lg)', color: 'rgb(var(--color-primary))' }}>{fmt(selectedBill.totalAmount)}</span>
                      <span className={`status-badge ${selectedBill.status === 'done' ? 'answered' : 'open'}`}>{selectedBill.status === 'done' ? 'Selesai' : 'Berlangsung'}</span>
                    </div>
                  </Card>

                  {/* Items with assignment */}
                  <h3 style={{ fontWeight: 700, marginBottom: 10 }}>📝 Item & Pembagian</h3>
                  <div className="stagger-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {selectedBill.items.map(item => (
                      <Card key={item.id} style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontWeight: 600 }}>{item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}</span>
                          <span style={{ fontWeight: 700 }}>{fmt(item.price * item.quantity)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {selectedBill.participants.map(p => (
                            <button
                              key={p.id}
                              onClick={() => handleAssign(item.id, p.id, item.assignedTo)}
                              style={{
                                padding: '4px 10px', borderRadius: 20, fontSize: 'var(--font-xs)', cursor: 'pointer',
                                border: item.assignedTo.includes(p.id) ? '2px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                                background: item.assignedTo.includes(p.id) ? 'rgba(var(--color-primary) / 0.1)' : 'rgb(var(--bg-surface))',
                                color: item.assignedTo.includes(p.id) ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
                                fontWeight: item.assignedTo.includes(p.id) ? 600 : 400,
                                fontFamily: 'inherit',
                              }}
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Participants summary */}
                  <h3 style={{ fontWeight: 700, marginBottom: 10 }}>👥 Ringkasan per Orang</h3>
                  <div className="stagger-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedBill.participants.map(p => (
                      <Card key={p.id} style={{ padding: '12px 16px', borderLeft: p.isPaid ? '4px solid rgb(var(--color-success))' : '4px solid rgb(var(--color-warning))' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 700 }}>{p.name}</span>
                            <span style={{ fontWeight: 800, color: 'rgb(var(--color-primary))', marginLeft: 10 }}>{fmt(p.totalOwed)}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {!p.isPaid && (
                              <>
                                <button onClick={() => handleSendWA(p.id)} className="icon-btn" title="Kirim tagihan via WA"><Send size={14} /></button>
                                <button onClick={() => handleMarkPaid(p.id)} className="icon-btn" title="Tandai sudah bayar" style={{ color: 'rgb(var(--color-success))' }}><Check size={14} /></button>
                              </>
                            )}
                            {p.isPaid && <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--color-success))', fontWeight: 700 }}>✅ Lunas</span>}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
