'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Modal, useToast, TextInput } from '@/components/ui';
import { duitTrackerService } from '@/services/duitTrackerService';
import { foodService } from '@/services/foodService';
import { useFeatureAccess } from '@/lib/feature-access';
import { Plus, X, Loader2, Wallet, CheckSquare, UtensilsCrossed, Sparkles, ArrowLeft, Camera, ImageIcon, CreditCard, Receipt, ShoppingBag, HandCoins } from 'lucide-react';
import { SmartInputModal, ScannedItem, AiParseResult } from '@/components/duit-tracker/SmartInputModal';

type MainMenu = 'duit' | 'todo' | 'makan';
type DuitSub = 'ai' | 'transaksi' | 'hutang' | 'tagihan' | 'wishlist';
type TodoSub = 'ai' | 'manual';
type MakanSub = 'kulkas' | 'menu';

export function QuickActionFAB() {
  const router = useRouter();
  const { showToast } = useToast();
  const { hasFeature } = useFeatureAccess();
  const [expanded, setExpanded] = useState(false);
  const [subMenu, setSubMenu] = useState<MainMenu | null>(null);

  // Duit tracker states
  const [showSmartInput, setShowSmartInput] = useState(false);

  // Todo states
  const [todoInput, setTodoInput] = useState('');
  const [todoMode, setTodoMode] = useState<TodoSub | null>(null);
  const [todoSubmitting, setTodoSubmitting] = useState(false);

  // Makan states
  const makanCameraRef = useRef<HTMLInputElement>(null);
  const makanFileRef = useRef<HTMLInputElement>(null);
  const [makanTarget, setMakanTarget] = useState<MakanSub | null>(null);
  const [makanProcessing, setMakanProcessing] = useState(false);

  const FAB_MAIN = [
    { key: 'duit' as MainMenu, label: '💰 Duit Tracker', color: 'var(--color-primary)', feature: 'duit_tracker' },
    { key: 'todo' as MainMenu, label: '✅ Todo List', color: 'var(--color-success)', feature: 'todo_list' },
    { key: 'makan' as MainMenu, label: '🍽️ Makan Apa', color: 'var(--color-warning)', feature: 'food_recommend' },
  ].filter(i => hasFeature(i.feature));

  const closeAll = () => {
    setExpanded(false);
    setSubMenu(null);
  };

  // ── Duit Tracker handlers ──
  const handleDuitSub = (sub: DuitSub) => {
    closeAll();
    if (sub === 'ai') {
      setShowSmartInput(true);
    } else {
      // Navigate to duit-tracker page with the correct tab/modal
      router.push(`/duit-tracker?action=${sub}`);
    }
  };

  const handleSmartParsed = (p: AiParseResult, rawText: string) => {
    // Route to duit-tracker with prefilled data
    if (p.isDebt) {
      router.push(`/duit-tracker?action=hutang&prefill=${encodeURIComponent(JSON.stringify(p))}`);
    } else if (p.isBill) {
      router.push(`/duit-tracker?action=tagihan&prefill=${encodeURIComponent(JSON.stringify(p))}`);
    } else if (p.isWishlist) {
      router.push(`/duit-tracker?action=wishlist&prefill=${encodeURIComponent(JSON.stringify(p))}`);
    } else {
      router.push(`/duit-tracker?action=transaksi&prefill=${encodeURIComponent(JSON.stringify(p))}`);
    }
  };

  const handleBulkCreate = async (items: ScannedItem[]) => {
    const batchId = crypto.randomUUID();
    for (const item of items) {
      await duitTrackerService.createTransaction({
        amount: item.amount,
        type: item.type as 'expense' | 'income',
        category: item.category,
        label: item.label,
        inputMethod: 'receipt_scan',
        receiptBatchId: batchId,
      });
    }
    showToast(`${items.length} transaksi dari struk berhasil disimpan!`, 'success');
  };

  // ── Todo handlers ──
  const handleTodoSub = (sub: TodoSub) => {
    closeAll();
    if (sub === 'manual') {
      router.push('/todos?action=add');
    } else {
      setTodoMode(sub);
      setTodoInput('');
    }
  };

  const handleTodoAiSubmit = async () => {
    if (!todoInput.trim() || todoSubmitting) return;
    setTodoSubmitting(true);
    try {
      const { apiFetch } = await import('@/lib/api');
      const parsed: any = await apiFetch('/todos/parse', { method: 'POST', body: JSON.stringify({ text: todoInput }) });
      await apiFetch('/todos', {
        method: 'POST',
        body: JSON.stringify({
          title: parsed.title || todoInput,
          dueDate: parsed.dueDate,
          dueTime: parsed.dueTime,
          priority: parsed.priority || 'medium',
          category: parsed.category,
          type: parsed.type || 'todo',
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          location: parsed.location,
          eventType: parsed.eventType,
        }),
      });
      showToast('Todo masuk bos! ✅', 'success');
      setTodoMode(null);
    } catch (e: any) {
      showToast(e.message || 'Gagal menambahkan todo', 'error');
    } finally {
      setTodoSubmitting(false);
    }
  };

  // ── Makan handlers ──
  const handleMakanSub = (sub: MakanSub) => {
    setMakanTarget(sub);
    setSubMenu(null);
    // Don't close expanded — show file choice inline
  };

  const handleMakanFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Upload gambar ya! 📷', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Maks 5MB ya fotonya! 📏', 'error');
      return;
    }
    setMakanProcessing(true);
    setExpanded(false);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (makanTarget === 'kulkas') {
        await foodService.fromFridge(base64, file.type);
        showToast('AI sedang analisis isi kulkasmu! 🧠', 'success');
        router.push('/makan?tab=fridge');
      } else {
        await foodService.fromMenu(base64, file.type);
        showToast('AI sedang baca menu-nya! 🧠', 'success');
        router.push('/makan?tab=menu');
      }
    } catch (e: any) {
      showToast(e.message || 'Gagal memproses foto', 'error');
    } finally {
      setMakanProcessing(false);
      setMakanTarget(null);
    }
  };

  return (
    <>
      {/* SmartInputModal for Duit Tracker AI */}
      <SmartInputModal
        isOpen={showSmartInput}
        onClose={() => setShowSmartInput(false)}
        onParsed={handleSmartParsed}
        onBulkCreate={handleBulkCreate}
      />

      {/* Hidden file inputs for Makan Apa */}
      <input ref={makanCameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleMakanFile(f); e.target.value = ''; }} />
      <input ref={makanFileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleMakanFile(f); e.target.value = ''; }} />

      {/* Overlay */}
      {expanded && <div className="fab-overlay" onClick={closeAll} />}

      {/* Processing overlay */}
      {makanProcessing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <Loader2 className="spin" size={40} style={{ color: 'rgb(var(--color-primary))' }} />
          <p style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>AI sedang memproses foto...</p>
        </div>
      )}

      <div className="fab-container" data-expanded={expanded}>
        {/* Menu items */}
        <div className={`fab-menu ${expanded ? 'fab-menu--open' : ''}`}>
          {/* Main menu */}
          {!subMenu && !makanTarget && FAB_MAIN.map((item, i) => (
            <button
              key={item.key}
              onClick={() => setSubMenu(item.key)}
              className="fab-menu-item"
              style={{ transitionDelay: expanded ? `${i * 40}ms` : '0ms' }}
            >
              <span className="fab-menu-dot" style={{ background: item.color }} />
              {item.label}
            </button>
          ))}

          {/* Sub-menu: Duit Tracker */}
          {subMenu === 'duit' && (
            <>
              <button onClick={() => setSubMenu(null)} className="fab-menu-item" style={{ opacity: 0.6 }}>
                <ArrowLeft size={12} /> Kembali
              </button>
              <button onClick={() => handleDuitSub('ai')} className="fab-menu-item">
                <span className="fab-menu-dot" style={{ background: 'var(--color-primary)' }} />
                ✨ Input Cerdas AI
              </button>
              <button onClick={() => handleDuitSub('transaksi')} className="fab-menu-item">
                <span className="fab-menu-dot" style={{ background: 'var(--color-primary)' }} />
                💸 Transaksi
              </button>
              <button onClick={() => handleDuitSub('hutang')} className="fab-menu-item">
                <span className="fab-menu-dot" style={{ background: 'var(--color-error)' }} />
                🤝 Hutang
              </button>
              <button onClick={() => handleDuitSub('tagihan')} className="fab-menu-item">
                <span className="fab-menu-dot" style={{ background: 'var(--color-warning)' }} />
                💳 Tagihan
              </button>
              <button onClick={() => handleDuitSub('wishlist')} className="fab-menu-item">
                <span className="fab-menu-dot" style={{ background: 'var(--color-secondary)' }} />
                🛒 Wishlist
              </button>
            </>
          )}

          {/* Sub-menu: Todo List */}
          {subMenu === 'todo' && (
            <>
              <button onClick={() => setSubMenu(null)} className="fab-menu-item" style={{ opacity: 0.6 }}>
                <ArrowLeft size={12} /> Kembali
              </button>
              <button onClick={() => handleTodoSub('ai')} className="fab-menu-item">
                <span className="fab-menu-dot" style={{ background: 'var(--color-primary)' }} />
                ✨ Input AI
              </button>
              <button onClick={() => handleTodoSub('manual')} className="fab-menu-item">
                <span className="fab-menu-dot" style={{ background: 'var(--color-success)' }} />
                ✏️ Input Manual
              </button>
            </>
          )}

          {/* Sub-menu: Makan Apa */}
          {subMenu === 'makan' && !makanTarget && (
            <>
              <button onClick={() => setSubMenu(null)} className="fab-menu-item" style={{ opacity: 0.6 }}>
                <ArrowLeft size={12} /> Kembali
              </button>
              <button onClick={() => handleMakanSub('kulkas')} className="fab-menu-item">
                <span className="fab-menu-dot" style={{ background: 'var(--color-success)' }} />
                🧊 Foto Kulkas
              </button>
              <button onClick={() => handleMakanSub('menu')} className="fab-menu-item">
                <span className="fab-menu-dot" style={{ background: 'var(--color-warning)' }} />
                📋 Foto Menu
              </button>
            </>
          )}

          {/* Sub-sub: Makan — Camera/Gallery choice */}
          {makanTarget && (
            <>
              <button onClick={() => { setMakanTarget(null); setSubMenu('makan'); }} className="fab-menu-item" style={{ opacity: 0.6 }}>
                <ArrowLeft size={12} /> Kembali
              </button>
              <button onClick={() => { closeAll(); makanCameraRef.current?.click(); }} className="fab-menu-item">
                <span className="fab-menu-dot" style={{ background: 'var(--color-primary)' }} />
                📸 Buka Kamera
              </button>
              <button onClick={() => { closeAll(); makanFileRef.current?.click(); }} className="fab-menu-item">
                <span className="fab-menu-dot" style={{ background: 'var(--color-secondary)' }} />
                🖼️ Upload File
              </button>
            </>
          )}
        </div>

        {/* FAB button */}
        <button
          className="fab-btn"
          onClick={() => { if (expanded) closeAll(); else setExpanded(true); }}
          aria-label={expanded ? 'Tutup menu' : 'Buka menu cepat'}
        >
          {expanded ? <X size={14} color="white" strokeWidth={2.5} /> : <Plus size={14} color="white" strokeWidth={2.5} />}
        </button>
      </div>

      {/* Todo AI Modal */}
      <Modal isOpen={todoMode === 'ai'} onClose={() => setTodoMode(null)} title="✨ Todo Cepat AI" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'rgb(var(--text-muted))', margin: 0 }}>
            Ketik kayak ngobrol: &ldquo;meeting senin jam 10-12&rdquo;, &ldquo;kerjakan PR besok&rdquo;
          </p>
          <TextInput
            placeholder="kerjakan PR besok, rapat jam 2 siang..."
            value={todoInput}
            onChange={v => setTodoInput(v)}
            autoFocus
          />
          <Button onClick={handleTodoAiSubmit} disabled={todoSubmitting || !todoInput.trim()} style={{ width: '100%' }}>
            {todoSubmitting ? <Loader2 size={15} className="spin" /> : 'Gas Simpan 🔥'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
