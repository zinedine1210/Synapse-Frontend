'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Modal, useToast } from '@/components/ui';
import { duitTrackerService } from '@/services/duitTrackerService';
import { Plus, X, Camera, Wallet, CheckSquare, HelpCircle, Loader2, Sparkles, Check, ImageIcon } from 'lucide-react';

const FAB_ITEMS = [
  { key: 'scan', icon: Camera, label: 'Scan Struk', color: 'var(--color-warning)' },
  { key: 'catat', icon: Wallet, label: 'Catat Cepat', color: 'var(--color-primary)' },
  { key: 'todo', icon: CheckSquare, label: 'Todo Cepat', color: 'var(--color-success)' },
  { key: 'tanya', icon: HelpCircle, label: 'Tanya', color: 'var(--color-secondary)' },
] as const;

type ActionType = typeof FAB_ITEMS[number]['key'] | null;

interface ScanItem { name: string; price: number; quantity: number; subtotal: number; category: string; selected: boolean }

const CATEGORY_OPTIONS = ['Makanan', 'Minuman & Kafe', 'Belanja Online', 'Transportasi', 'Hiburan & Hobi', 'Tagihan & Utilitas', 'Kesehatan', 'Lainnya'];

export function QuickActionFAB() {
  const router = useRouter();
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);

  // Scan struk state
  const [showScanChoice, setShowScanChoice] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ storeName?: string; date?: string; items: ScanItem[]; total?: number } | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleAction = (key: ActionType) => {
    setExpanded(false);
    if (key === 'scan') {
      setShowScanChoice(true);
      return;
    }
    setActiveAction(key);
    setInput('');
    setParseResult(null);
  };

  const handleScanChoice = (mode: 'camera' | 'gallery') => {
    setShowScanChoice(false);
    if (mode === 'camera') {
      cameraRef.current?.click();
    } else {
      galleryRef.current?.click();
    }
  };

  const handleScanFile = async (file: File) => {
    setScanning(true);
    setScanResult(null);
    setActiveAction('scan');
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const result = await duitTrackerService.scanReceipt(base64, file.type);
      if (result.error) {
        showToast(result.error, 'error');
        setActiveAction(null);
      } else {
        setScanResult({
          storeName: result.storeName,
          date: result.date,
          total: result.total,
          items: (result.items || []).map((i: any) => ({
            name: i.name,
            price: i.price,
            quantity: i.quantity || 1,
            subtotal: i.subtotal || i.price * (i.quantity || 1),
            category: 'Makanan',
            selected: true,
          })),
        });
      }
    } catch (e: any) {
      showToast(e.message || 'Gagal scan struk', 'error');
      setActiveAction(null);
    } finally {
      setScanning(false);
    }
  };

  const handleSaveScanItems = async () => {
    if (!scanResult) return;
    const selectedItems = scanResult.items.filter(i => i.selected);
    if (selectedItems.length === 0) { showToast('Pilih minimal 1 item', 'error'); return; }
    setSubmitting(true);
    try {
      const batchId = crypto.randomUUID();
      for (const item of selectedItems) {
        await duitTrackerService.createTransaction({
          amount: item.subtotal,
          type: 'expense',
          category: item.category,
          label: item.name,
          inputMethod: 'receipt_scan',
          receiptBatchId: batchId,
          date: scanResult.date,
        });
      }
      showToast(`${selectedItems.length} transaksi berhasil disimpan dari struk! 🧾`, 'success');
      setActiveAction(null);
      setScanResult(null);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || submitting) return;
    setSubmitting(true);
    try {
      if (activeAction === 'catat') {
        const p = await duitTrackerService.parseNaturalInput(input);
        if (p.amount) {
          await duitTrackerService.createTransaction({
            amount: p.amount,
            type: p.type || 'expense',
            category: p.category || 'Lainnya',
            label: p.label || input,
          });
          showToast('Transaksi dicatat! ⚡', 'success');
          setActiveAction(null);
        } else {
          showToast('Gagal parse. Coba format lain.', 'error');
        }
      } else if (activeAction === 'todo') {
        const { apiFetch } = await import('@/lib/api');
        await apiFetch('/todos/parse', { method: 'POST', body: JSON.stringify({ text: input }) })
          .then(async (parsed: any) => {
            await apiFetch('/todos', {
              method: 'POST',
              body: JSON.stringify({
                title: parsed.title || input,
                dueDate: parsed.dueDate,
                priority: parsed.priority || 'medium',
                category: parsed.category,
                inputMethod: 'text',
              }),
            });
            showToast('Todo ditambahkan! ✅', 'success');
            setActiveAction(null);
          });
      } else if (activeAction === 'tanya') {
        router.push('/qna');
        setActiveAction(null);
      }
    } catch (e: any) {
      showToast(e.message || 'Terjadi kesalahan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle = activeAction === 'scan' ? '🧾 Scan Struk' : activeAction === 'catat' ? '💸 Catat Cepat' : activeAction === 'todo' ? '✅ Todo Cepat' : activeAction === 'tanya' ? '❓ Tanya' : '';
  const placeholder = activeAction === 'catat' ? 'kopi 25rb' : activeAction === 'todo' ? 'kerjakan PR besok' : 'Ketik pertanyaan...';

  return (
    <>
      {/* Hidden file inputs: camera (capture) and gallery (no capture) */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleScanFile(f); e.target.value = ''; }} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleScanFile(f); e.target.value = ''; }} />

      {/* Scan choice modal: Camera or Gallery */}
      <Modal isOpen={showScanChoice} onClose={() => setShowScanChoice(false)} title="📸 Scan Struk" size="sm">
        <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: 16 }}>Pilih sumber gambar struk:</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => handleScanChoice('camera')}
            style={{
              flex: 1, padding: '20px 12px', borderRadius: 'var(--radius-md)',
              border: '2px solid var(--border-default)', background: 'rgb(var(--bg-surface))',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              fontFamily: 'inherit', transition: 'var(--transition-fast)',
            }}
          >
            <Camera size={28} style={{ color: 'rgb(var(--color-primary))' }} />
            <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>Buka Kamera</span>
            <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Foto struk langsung</span>
          </button>
          <button
            onClick={() => handleScanChoice('gallery')}
            style={{
              flex: 1, padding: '20px 12px', borderRadius: 'var(--radius-md)',
              border: '2px solid var(--border-default)', background: 'rgb(var(--bg-surface))',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              fontFamily: 'inherit', transition: 'var(--transition-fast)',
            }}
          >
            <ImageIcon size={28} style={{ color: 'rgb(var(--color-secondary))' }} />
            <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>Pilih dari Galeri</span>
            <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>Upload foto struk</span>
          </button>
        </div>
      </Modal>

      <div className="fab-container" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
        {/* Menu items */}
        {expanded && (
          <div style={{ position: 'absolute', bottom: 56, right: 0, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
            {FAB_ITEMS.map((item, i) => (
              <button
                key={item.key}
                onClick={() => handleAction(item.key)}
                className="fab-menu-item"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', borderRadius: 'var(--radius-full)',
                  background: 'rgb(var(--bg-elevated))',
                  border: '1px solid var(--border-default)',
                  cursor: 'pointer', boxShadow: 'var(--shadow-md)',
                  animationDelay: `${i * 0.05}s`,
                  whiteSpace: 'nowrap', fontSize: 'var(--font-sm)', fontWeight: 600,
                  color: 'rgb(var(--text-primary))',
                }}
              >
                <item.icon size={16} style={{ color: `rgb(${item.color})` }} />
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* FAB button */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(var(--color-primary) / 0.3)',
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: expanded ? 'rotate(45deg)' : 'rotate(0)',
          }}
        >
          {expanded ? <X size={22} color="white" /> : <Plus size={22} color="white" />}
        </button>
      </div>

      {/* Overlay to close */}
      {expanded && <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setExpanded(false)} />}

      {/* Mini modal for quick actions */}
      <Modal isOpen={!!activeAction} onClose={() => { setActiveAction(null); setScanResult(null); }} title={modalTitle} size={activeAction === 'scan' ? 'md' : 'sm'}>
        {activeAction === 'scan' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {scanning ? (
              <div style={{ textAlign: 'center', padding: 30 }}>
                <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'rgb(var(--color-primary))' }} />
                <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginTop: 10 }}>Sedang membaca struk...</p>
              </div>
            ) : scanResult ? (
              <>
                {scanResult.storeName && <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>🏪 {scanResult.storeName} {scanResult.date ? `• ${scanResult.date}` : ''}</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                  {scanResult.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: item.selected ? 'rgb(var(--bg-surface))' : 'rgba(var(--text-muted) / 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
                      <input type="checkbox" checked={item.selected} onChange={() => { const n = [...scanResult.items]; n[i].selected = !n[i].selected; setScanResult({ ...scanResult, items: n }); }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>{item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}</div>
                        <select className="themed-input" value={item.category} onChange={e => { const n = [...scanResult.items]; n[i].category = e.target.value; setScanResult({ ...scanResult, items: n }); }} style={{ fontSize: '11px', padding: '2px 6px', marginTop: 4 }}>
                          {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 'var(--font-sm)', whiteSpace: 'nowrap' }}>Rp {item.subtotal.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border-default)' }}>
                  <span style={{ fontWeight: 700 }}>Total: Rp {scanResult.items.filter(i => i.selected).reduce((s, i) => s + i.subtotal, 0).toLocaleString('id-ID')}</span>
                  <Button onClick={handleSaveScanItems} disabled={submitting}>
                    {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <><Check size={15} /> Simpan Semua</>}
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="themed-input"
              placeholder={placeholder}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoFocus
              style={{ width: '100%' }}
            />
            <Button onClick={handleSubmit} disabled={submitting || !input.trim()} style={{ width: '100%' }}>
              {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <><Sparkles size={15} /> Simpan</>}
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
