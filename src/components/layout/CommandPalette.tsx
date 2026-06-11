'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui';
import { Search, ArrowRight, Wallet, CheckSquare, HelpCircle, BookOpen, Settings, LayoutDashboard, CreditCard } from 'lucide-react';

interface CommandResult {
  type: 'navigate' | 'transaction' | 'todo' | 'question' | 'search';
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  confidence: number;
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, keywords: ['dashboard', 'home', 'beranda'] },
  { label: 'Duit Tracker', path: '/duit-tracker', icon: Wallet, keywords: ['duit', 'keuangan', 'uang', 'tracker', 'transaksi'] },
  { label: 'To-Do List', path: '/todos', icon: CheckSquare, keywords: ['todo', 'tugas', 'task', 'to-do'] },
  { label: 'Q&A', path: '/qna', icon: HelpCircle, keywords: ['qna', 'tanya', 'jawab', 'pertanyaan'] },
  { label: 'Kelas Saya', path: '/classes', icon: BookOpen, keywords: ['kelas', 'class', 'mata kuliah'] },
  { label: 'Billing', path: '/billing', icon: CreditCard, keywords: ['billing', 'bayar', 'paket', 'plan'] },
  { label: 'Pengaturan', path: '/settings', icon: Settings, keywords: ['setting', 'pengaturan', 'profil', 'akun'] },
];

function classifyInput(text: string, router: ReturnType<typeof useRouter>): CommandResult[] {
  const lower = text.toLowerCase().trim();
  const results: CommandResult[] = [];

  // 1. Transaction detection (number + financial keywords)
  if (/\d/.test(lower) && /(rb|ribu|k|jt|juta)\b/i.test(lower)) {
    results.push({
      type: 'transaction',
      label: '💸 Catat Transaksi',
      description: `"${text}" sebagai transaksi`,
      icon: Wallet,
      action: () => router.push(`/duit-tracker`),
      confidence: 0.9,
    });
  }

  // 2. Navigation fuzzy match
  for (const nav of NAV_ITEMS) {
    const matches = nav.keywords.some(kw => lower.includes(kw)) || nav.label.toLowerCase().includes(lower);
    if (matches) {
      results.push({
        type: 'navigate',
        label: nav.label,
        description: `Navigasi ke ${nav.label}`,
        icon: nav.icon,
        action: () => router.push(nav.path),
        confidence: 0.85,
      });
    }
  }

  // 3. Todo detection
  if (/(besok|lusa|nanti|deadline|kerjakan|buat|tugas|pr\b)/i.test(lower)) {
    results.push({
      type: 'todo',
      label: '✅ Buat Todo',
      description: `"${text}" sebagai task`,
      icon: CheckSquare,
      action: () => router.push('/todos'),
      confidence: 0.7,
    });
  }

  // 4. Question detection
  if (/\?$|^(apa|bagaimana|kenapa|siapa|kapan|dimana|gimana)/i.test(lower)) {
    results.push({
      type: 'question',
      label: '❓ Tanya di Q&A',
      description: `Post "${text.slice(0, 50)}..." ke Q&A`,
      icon: HelpCircle,
      action: () => router.push('/qna'),
      confidence: 0.8,
    });
  }

  // Always show all nav items if no specific match
  if (results.length === 0) {
    for (const nav of NAV_ITEMS) {
      results.push({
        type: 'navigate',
        label: nav.label,
        icon: nav.icon,
        action: () => router.push(nav.path),
        confidence: 0.3,
      });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

export function CommandPalette() {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommandResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        setResults(classifyInput(query, router));
      } else {
        // Show all nav items as default
        setResults(NAV_ITEMS.map(nav => ({
          type: 'navigate' as const,
          label: nav.label,
          icon: nav.icon,
          action: () => router.push(nav.path),
          confidence: 0.5,
        })));
      }
      setSelectedIndex(0);
    }, 200); // Debounce 200ms
    return () => clearTimeout(timer);
  }, [query, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      results[selectedIndex].action();
      setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, backdropFilter: 'blur(4px)' }}
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 520, zIndex: 9999,
        background: 'rgb(var(--bg-primary))', borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '1px solid var(--border-default)',
        overflow: 'hidden', animation: 'page-enter 0.15s ease-out',
      }}>
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border-default)' }}>
          <Search size={18} style={{ color: 'rgb(var(--text-muted))', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik perintah, cari, atau catat..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 'var(--font-base)', color: 'rgb(var(--text-primary))',
            }}
          />
          <kbd style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 4, background: 'rgb(var(--bg-secondary))', color: 'rgb(var(--text-muted))', border: '1px solid var(--border-default)' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: '6px 0' }}>
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.label}-${i}`}
              onClick={() => { r.action(); setOpen(false); }}
              onMouseEnter={() => setSelectedIndex(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 16px',
                background: i === selectedIndex ? 'rgba(var(--color-primary) / 0.08)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                color: 'rgb(var(--text-primary))',
                transition: 'background 0.1s',
              }}
            >
              <r.icon size={16} style={{ color: 'rgb(var(--color-primary))', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{r.label}</div>
                {r.description && <div style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>}
              </div>
              {i === selectedIndex && <ArrowRight size={14} style={{ color: 'rgb(var(--text-muted))' }} />}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-default)', fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', display: 'flex', gap: 12 }}>
          <span><kbd style={{ padding: '1px 4px', borderRadius: 3, background: 'rgb(var(--bg-secondary))' }}>↑↓</kbd> navigasi</span>
          <span><kbd style={{ padding: '1px 4px', borderRadius: 3, background: 'rgb(var(--bg-secondary))' }}>Enter</kbd> pilih</span>
        </div>
      </div>
    </>
  );
}
