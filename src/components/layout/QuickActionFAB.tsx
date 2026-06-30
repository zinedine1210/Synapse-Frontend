'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui';
import { foodService } from '@/services/foodService';
import { todoService } from '@/services/todoService';
import { useFeatureAccess } from '@/lib/feature-access';
import { Plus, X, Loader2, ArrowLeft, Camera, ImageIcon } from 'lucide-react';

type MainMenu = 'duit' | 'todo' | 'makan';
type PhotoTarget = 'makan_kulkas' | 'makan_menu' | 'todo_scan';

export function QuickActionFAB() {
  const router = useRouter();
  const { showToast } = useToast();
  const { hasFeature } = useFeatureAccess();
  const [expanded, setExpanded] = useState(false);
  const [subMenu, setSubMenu] = useState<MainMenu | null>(null);

  // Photo handling (shared for makan + todo)
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoTarget, setPhotoTarget] = useState<PhotoTarget | null>(null);
  const [showPhotoChoice, setShowPhotoChoice] = useState(false);
  const [processing, setProcessing] = useState(false);

  const FAB_MAIN: { key: MainMenu; label: string; emoji: string; gradient: string; feature: string }[] = [
    { key: 'duit', label: 'Duit Tracker', emoji: '💰', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', feature: 'duit_tracker' },
    { key: 'todo', label: 'Todo List', emoji: '✅', gradient: 'linear-gradient(135deg, #10b981, #06d6a0)', feature: 'todo_list' },
    { key: 'makan', label: 'Makan Apa', emoji: '🍽️', gradient: 'linear-gradient(135deg, #f59e0b, #f97316)', feature: 'food_recommend' },
  ];
  const filteredMain = FAB_MAIN.filter(i => hasFeature(i.feature));

  const closeAll = () => {
    setExpanded(false);
    setSubMenu(null);
    setShowPhotoChoice(false);
  };

  const goTo = (path: string) => {
    closeAll();
    router.push(path);
  };

  // ── Photo choice (shared for makan + todo) ──
  const openPhotoChoice = (target: PhotoTarget) => {
    setPhotoTarget(target);
    setShowPhotoChoice(true);
    setSubMenu(null);
  };

  const handlePhotoFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Upload gambar ya! 📷', 'error'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Maks 5MB ya fotonya! 📏', 'error'); return;
    }
    setProcessing(true);
    closeAll();
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (photoTarget === 'makan_kulkas') {
        await foodService.fromFridge(base64, file.type);
        showToast('AI sedang analisis isi kulkasmu! 🧠', 'success');
        router.push('/makan?tab=fridge');
      } else if (photoTarget === 'makan_menu') {
        await foodService.fromMenu(base64, file.type);
        showToast('AI sedang baca menu-nya! 🧠', 'success');
        router.push('/makan?tab=menu');
      } else if (photoTarget === 'todo_scan') {
        const parsed = await todoService.parseImage(base64, file.type);
        if (parsed && (parsed as any).title) {
          await todoService.create({
            title: (parsed as any).title,
            dueDate: (parsed as any).dueDate,
            dueTime: (parsed as any).dueTime,
            priority: (parsed as any).priority || 'medium',
            category: (parsed as any).category,
            type: (parsed as any).type || 'todo',
          } as any);
          showToast('Todo dari foto berhasil ditambahkan! 📸✅', 'success');
          router.push('/todos');
        } else {
          showToast('Hmm nggak nemu todo dari foto ini', 'error');
        }
      }
    } catch (e: any) {
      showToast(e.message || 'Gagal memproses foto', 'error');
    } finally {
      setProcessing(false);
      setPhotoTarget(null);
    }
  };

  // Sub-menu items config
  const DUIT_ITEMS = [
    { label: 'Input Cerdas AI', emoji: '✨', gradient: 'linear-gradient(135deg, #6366f1, #a855f7)', path: '/duit-tracker?fab=ai' },
    { label: 'Transaksi', emoji: '💸', gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)', path: '/duit-tracker?fab=transaksi' },
    { label: 'Hutang', emoji: '🤝', gradient: 'linear-gradient(135deg, #ef4444, #f97316)', path: '/duit-tracker?fab=hutang' },
    { label: 'Tagihan', emoji: '💳', gradient: 'linear-gradient(135deg, #f59e0b, #eab308)', path: '/duit-tracker?fab=tagihan' },
    { label: 'Wishlist', emoji: '🛒', gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)', path: '/duit-tracker?fab=wishlist' },
  ];

  const TODO_ITEMS = [
    { label: 'Input AI', emoji: '✨', gradient: 'linear-gradient(135deg, #6366f1, #a855f7)', path: '/todos?fab=ai' },
    { label: 'Input Manual', emoji: '✏️', gradient: 'linear-gradient(135deg, #10b981, #06d6a0)', path: '/todos?fab=manual' },
    { label: 'Scan Foto', emoji: '📸', gradient: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', action: 'todo_scan' as PhotoTarget },
  ];

  const MAKAN_ITEMS = [
    { label: 'Foto Kulkas', emoji: '🧊', gradient: 'linear-gradient(135deg, #06b6d4, #10b981)', action: 'makan_kulkas' as PhotoTarget },
    { label: 'Foto Menu', emoji: '📋', gradient: 'linear-gradient(135deg, #f59e0b, #f97316)', action: 'makan_menu' as PhotoTarget },
  ];

  return (
    <>
      {/* Hidden file inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); e.target.value = ''; }} />
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); e.target.value = ''; }} />

      {/* Overlay */}
      {expanded && <div className="fab-overlay" onClick={closeAll} />}

      {/* Processing overlay */}
      {processing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <Loader2 className="spin" size={40} style={{ color: '#fff' }} />
          <p style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>AI sedang memproses foto...</p>
        </div>
      )}

      <div className="fab-container" data-expanded={expanded}>
        <div className={`fab-menu ${expanded ? 'fab-menu--open' : ''}`}>

          {/* ═══ Main menu ═══ */}
          {!subMenu && !showPhotoChoice && filteredMain.map((item, i) => (
            <button
              key={item.key}
              onClick={() => setSubMenu(item.key)}
              className="fab-menu-item fab-menu-item--color"
              style={{ transitionDelay: expanded ? `${i * 50}ms` : '0ms' }}
            >
              <span className="fab-item-icon" style={{ background: item.gradient }}>{item.emoji}</span>
              <span className="fab-item-label">{item.label}</span>
            </button>
          ))}

          {/* ═══ Sub-menu: Duit Tracker ═══ */}
          {subMenu === 'duit' && !showPhotoChoice && (
            <>
              <button onClick={() => setSubMenu(null)} className="fab-menu-item fab-menu-item--back">
                <ArrowLeft size={14} /> Kembali
              </button>
              {DUIT_ITEMS.map((item, i) => (
                <button key={item.label} onClick={() => goTo(item.path)} className="fab-menu-item fab-menu-item--color"
                  style={{ transitionDelay: `${(i + 1) * 40}ms` }}>
                  <span className="fab-item-icon" style={{ background: item.gradient }}>{item.emoji}</span>
                  <span className="fab-item-label">{item.label}</span>
                </button>
              ))}
            </>
          )}

          {/* ═══ Sub-menu: Todo List ═══ */}
          {subMenu === 'todo' && !showPhotoChoice && (
            <>
              <button onClick={() => setSubMenu(null)} className="fab-menu-item fab-menu-item--back">
                <ArrowLeft size={14} /> Kembali
              </button>
              {TODO_ITEMS.map((item, i) => (
                <button key={item.label}
                  onClick={() => item.action ? openPhotoChoice(item.action) : goTo(item.path!)}
                  className="fab-menu-item fab-menu-item--color"
                  style={{ transitionDelay: `${(i + 1) * 40}ms` }}>
                  <span className="fab-item-icon" style={{ background: item.gradient }}>{item.emoji}</span>
                  <span className="fab-item-label">{item.label}</span>
                </button>
              ))}
            </>
          )}

          {/* ═══ Sub-menu: Makan Apa ═══ */}
          {subMenu === 'makan' && !showPhotoChoice && (
            <>
              <button onClick={() => setSubMenu(null)} className="fab-menu-item fab-menu-item--back">
                <ArrowLeft size={14} /> Kembali
              </button>
              {MAKAN_ITEMS.map((item, i) => (
                <button key={item.label} onClick={() => openPhotoChoice(item.action)} className="fab-menu-item fab-menu-item--color"
                  style={{ transitionDelay: `${(i + 1) * 40}ms` }}>
                  <span className="fab-item-icon" style={{ background: item.gradient }}>{item.emoji}</span>
                  <span className="fab-item-label">{item.label}</span>
                </button>
              ))}
            </>
          )}

          {/* ═══ Photo choice: Camera vs Gallery ═══ */}
          {showPhotoChoice && (
            <>
              <button onClick={() => { setShowPhotoChoice(false); setSubMenu(photoTarget?.startsWith('makan') ? 'makan' : 'todo'); }} className="fab-menu-item fab-menu-item--back">
                <ArrowLeft size={14} /> Kembali
              </button>
              <button onClick={() => { closeAll(); cameraRef.current?.click(); }} className="fab-menu-item fab-menu-item--color">
                <span className="fab-item-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                  <Camera size={16} color="#fff" />
                </span>
                <span className="fab-item-label">Buka Kamera</span>
              </button>
              <button onClick={() => { closeAll(); fileRef.current?.click(); }} className="fab-menu-item fab-menu-item--color">
                <span className="fab-item-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
                  <ImageIcon size={16} color="#fff" />
                </span>
                <span className="fab-item-label">Upload File</span>
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
    </>
  );
}
