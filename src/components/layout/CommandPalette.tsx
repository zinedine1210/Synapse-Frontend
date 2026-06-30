'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search, Wallet, CheckSquare, HelpCircle, BookOpen,
  Settings, LayoutDashboard, CreditCard, Command, Calendar,
  Clock, Hash, CornerDownLeft, ArrowUpDown, UtensilsCrossed, Receipt, Lightbulb, GraduationCap,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { fuzzyMatch } from '@/lib/fuzzy-match';
import {
  groupResultsByCategory, flattenGroups,
  type CategorizedResult, type ResultGroup, type SearchCategoryId,
} from '@/lib/search-grouping';
import { useFeatureAccess } from '@/lib/feature-access';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SearchCategory { id: string; label: string; icon: React.ElementType; }
export interface SearchResult { id: string; category: SearchCategory['id']; title: string; description?: string; action: () => void; relevanceScore: number; }
interface SearchResponse { tasks: { id: string; title: string; className: string; deadline?: string }[]; todos: { id: string; title: string; dueDate?: string }[]; transactions: { id: string; label: string; amount: number; type: string }[]; qna: { id: string; title: string; slug: string }[]; sessions: { id: string; title: string; className: string; sequence: number }[]; }

export const SEARCH_CATEGORIES: SearchCategory[] = [
  { id: 'tugas', label: 'Tugas', icon: BookOpen },
  { id: 'todo', label: 'To-Do', icon: CheckSquare },
  { id: 'transaksi', label: 'Transaksi', icon: Wallet },
  { id: 'qna', label: 'Ruang Tanya', icon: HelpCircle },
  { id: 'pertemuan', label: 'Pertemuan', icon: Calendar },
  { id: 'navigasi', label: 'Navigasi', icon: LayoutDashboard },
];

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  tugas: BookOpen, todo: CheckSquare, transaksi: Wallet,
  qna: HelpCircle, pertemuan: Calendar, navigasi: LayoutDashboard,
};

interface NavItem { label: string; path: string; icon: React.ElementType; keywords: string[]; requiredFeature?: string; }

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, keywords: ['dashboard', 'home', 'beranda'] },
  { label: 'Duit Tracker', path: '/duit-tracker', icon: Wallet, keywords: ['duit', 'keuangan', 'uang', 'tracker', 'transaksi'], requiredFeature: 'duit_tracker' },
  { label: 'To-Do List', path: '/todos', icon: CheckSquare, keywords: ['todo', 'tugas', 'task', 'to-do'], requiredFeature: 'todo_list' },
  { label: 'Ruang Tanya', path: '/qna', icon: HelpCircle, keywords: ['qna', 'tanya', 'jawab', 'pertanyaan', 'ruang'], requiredFeature: 'qna_public' },
  { label: 'Kelas Saya', path: '/classes', icon: BookOpen, keywords: ['kelas', 'class', 'mata kuliah'], requiredFeature: 'class' },
  { label: 'Makan Apa', path: '/makan', icon: UtensilsCrossed, keywords: ['makan', 'food', 'rekomendasi'], requiredFeature: 'food_recommend' },
  { label: 'Split Bill', path: '/split-bill', icon: Receipt, keywords: ['split', 'bill', 'bagi', 'bayar'], requiredFeature: 'split_bill' },
  { label: 'Insight', path: '/insight', icon: Lightbulb, keywords: ['insight', 'analisis', 'laporan'], requiredFeature: 'ai_insight' },
  { label: 'Skripsweet', path: '/skripsweet', icon: GraduationCap, keywords: ['skripsi', 'thesis', 'skripsweet', 'bimbingan', 'jurnal', 'daftar pustaka'], requiredFeature: 'skripsweet' },
  { label: 'Billing', path: '/billing', icon: CreditCard, keywords: ['billing', 'bayar', 'paket', 'plan'] },
  { label: 'Pengaturan', path: '/settings', icon: Settings, keywords: ['setting', 'pengaturan', 'profil', 'akun'] },
];

const CATEGORY_FEATURE_MAP: Record<string, string> = { tugas: 'class', todo: 'todo_list', transaksi: 'duit_tracker', qna: 'qna_public', pertemuan: 'class' };

// ─── Events ─────────────────────────────────────────────────────────────────

export const COMMAND_PALETTE_OPEN_EVENT = 'command-palette:open';
export function openCommandPalette() { window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_OPEN_EVENT)); }

// ─── Backend ────────────────────────────────────────────────────────────────

async function fetchSearchResults(query: string): Promise<SearchResponse | null> {
  if (query.trim().length < 2) return null;
  try { return await apiFetch<SearchResponse>(`/search?q=${encodeURIComponent(query)}&limit=20`); } catch { return null; }
}

function mapBackendResults(data: SearchResponse, _router: ReturnType<typeof useRouter>): CategorizedResult[] {
  const results: CategorizedResult[] = [];
  for (const task of data.tasks) results.push({ id: `task-${task.id}`, category: 'tugas', title: task.title, description: task.className + (task.deadline ? ` • ${new Date(task.deadline).toLocaleDateString('id-ID')}` : ''), relevanceScore: 0.85 });
  for (const todo of data.todos) results.push({ id: `todo-${todo.id}`, category: 'todo', title: todo.title, description: todo.dueDate ? `Tenggat: ${new Date(todo.dueDate).toLocaleDateString('id-ID')}` : undefined, relevanceScore: 0.8 });
  for (const tx of data.transactions) { const f = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(tx.amount); results.push({ id: `tx-${tx.id}`, category: 'transaksi', title: tx.label, description: `${tx.type === 'EXPENSE' ? '-' : '+'}${f}`, relevanceScore: 0.75 }); }
  for (const q of data.qna) results.push({ id: `qna-${q.id}`, category: 'qna', title: q.title, relevanceScore: 0.8 });
  for (const s of data.sessions) results.push({ id: `session-${s.id}`, category: 'pertemuan', title: s.title, description: `${s.className} • Pertemuan ${s.sequence}`, relevanceScore: 0.75 });
  return results;
}

function buildActionMap(data: SearchResponse | null, navResults: CategorizedResult[], router: ReturnType<typeof useRouter>, navItems: NavItem[]): Map<string, () => void> {
  const map = new Map<string, () => void>();
  if (data) {
    for (const task of data.tasks) map.set(`task-${task.id}`, () => router.push('/classes'));
    for (const todo of data.todos) map.set(`todo-${todo.id}`, () => router.push('/todos'));
    for (const tx of data.transactions) map.set(`tx-${tx.id}`, () => router.push('/duit-tracker'));
    for (const q of data.qna) map.set(`qna-${q.id}`, () => router.push(`/qna/${q.slug}`));
    for (const s of data.sessions) map.set(`session-${s.id}`, () => router.push('/classes'));
  }
  for (const r of navResults) { const n = navItems.find(x => `nav-${x.path}` === r.id); if (n) map.set(r.id, () => router.push(n.path)); }
  return map;
}

// ─── Recent pages ────────────────────────────────────────────────────────────

const RECENTS_KEY = 'synapse_recent_pages';
const MAX_RECENTS = 5;

function getRecents(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]').slice(0, MAX_RECENTS); } catch { return []; }
}
function addRecent(path: string) {
  try {
    const arr = getRecents().filter(p => p !== path);
    arr.unshift(path);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(arr.slice(0, MAX_RECENTS)));
  } catch { /* noop */ }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const { hasFeature } = useFeatureAccess();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [groups, setGroups] = useState<ResultGroup[]>([]);
  const [flatResults, setFlatResults] = useState<CategorizedResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const actionMapRef = useRef<Map<string, () => void>>(new Map());

  const accessibleNavItems = useMemo(
    () => NAV_ITEMS.filter(item => !item.requiredFeature || hasFeature(item.requiredFeature)),
    [hasFeature],
  );

  // Track recent pages
  useEffect(() => { if (pathname) addRecent(pathname); }, [pathname]);

  // Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); if (hasFeature('command_palette')) setOpen(prev => !prev); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasFeature]);

  // External open event
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, handler);
    return () => window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, handler);
  }, []);

  // Reset on open
  useEffect(() => {
    if (open) { setQuery(''); setGroups([]); setFlatResults([]); setSelectedIndex(0); setLoading(false); setActiveFilter(null); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      const trimmed = query.trim();
      if (!trimmed) { setGroups([]); setFlatResults([]); setSelectedIndex(0); actionMapRef.current = new Map(); return; }
      setLoading(true);

      const navMatches = fuzzyMatch(trimmed, accessibleNavItems, (item) => [item.label, ...item.keywords], 0.3);
      const navResults: CategorizedResult[] = navMatches.map(({ item, score }) => ({
        id: `nav-${item.path}`, category: 'navigasi' as SearchCategoryId, title: item.label,
        description: `Navigasi ke ${item.label}`, relevanceScore: score,
      }));

      let backendResults: CategorizedResult[] = [];
      let backendData: SearchResponse | null = null;
      if (trimmed.length >= 2) {
        backendData = await fetchSearchResults(trimmed);
        if (backendData) {
          backendResults = mapBackendResults(backendData, router).filter(r => {
            const f = CATEGORY_FEATURE_MAP[r.category];
            return !f || hasFeature(f);
          });
        }
      }

      let allResults = [...backendResults, ...navResults];
      if (activeFilter) allResults = allResults.filter(r => r.category === activeFilter);

      const grouped = groupResultsByCategory(allResults);
      const flat = flattenGroups(grouped);
      actionMapRef.current = buildActionMap(backendData, navResults, router, accessibleNavItems);
      setGroups(grouped); setFlatResults(flat); setSelectedIndex(0); setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, open, router, accessibleNavItems, hasFeature, activeFilter]);

  useEffect(() => {
    if (resultsRef.current && flatResults.length > 0) {
      const el = resultsRef.current.querySelector(`[data-result-index="${selectedIndex}"]`) as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, flatResults.length]);

  const handleSelect = useCallback((result: CategorizedResult) => {
    const action = actionMapRef.current.get(result.id);
    if (action) action();
    setOpen(false);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && flatResults[selectedIndex]) { e.preventDefault(); handleSelect(flatResults[selectedIndex]); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'Tab') { e.preventDefault(); setActiveFilter(f => { const cats = ['tugas', 'todo', 'transaksi', 'qna', 'navigasi']; const idx = f ? cats.indexOf(f) : -1; return idx >= cats.length - 1 ? null : cats[idx + 1]; }); }
  };

  if (!open) return null;

  const hasQuery = query.trim().length > 0;
  const hasResults = flatResults.length > 0;

  // Recent pages for empty state
  const recents = getRecents();
  const recentNav = recents.map(p => accessibleNavItems.find(n => n.path === p)).filter(Boolean) as NavItem[];

  let globalIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div onClick={() => setOpen(false)} aria-hidden="true" style={{
        position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)', zIndex: 9998, animation: 'fadeIn 0.12s ease-out',
      }} />

      {/* Palette */}
      <div role="dialog" aria-modal="true" aria-label="Command Palette" style={{
        position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)',
        width: '94%', maxWidth: 580, zIndex: 9999, background: 'rgb(var(--bg-surface))',
        borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(var(--color-primary) / 0.08)',
        border: '1px solid var(--border-default)', overflow: 'hidden',
        animation: 'slideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border-default)' }}>
          <Search size={18} style={{ color: 'rgb(var(--color-primary))', flexShrink: 0, opacity: 0.7 }} />
          <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Cari tugas, todo, transaksi, atau navigasi..." aria-label="Search"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '0.9rem', color: 'rgb(var(--text-primary))', fontFamily: 'inherit' }} />
          {loading && <div style={{ width: 16, height: 16, border: '2px solid rgb(var(--text-muted))', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite', flexShrink: 0 }} />}
          <kbd style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, background: 'rgb(var(--bg-secondary))', color: 'rgb(var(--text-muted))', border: '1px solid var(--border-default)', fontFamily: 'inherit' }}>ESC</kbd>
        </div>

        {/* Category Filters */}
        {hasQuery && (
          <div style={{ display: 'flex', gap: 4, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle, var(--border-default))', overflowX: 'auto' }}>
            <button onClick={() => setActiveFilter(null)} style={{
              padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: !activeFilter ? 600 : 400,
              background: !activeFilter ? 'rgba(var(--color-primary) / 0.1)' : 'transparent',
              color: !activeFilter ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))', fontFamily: 'inherit', transition: 'all 0.15s',
            }}>Semua</button>
            {SEARCH_CATEGORIES.map(cat => {
              const CatIcon = cat.icon;
              return (
                <button key={cat.id} onClick={() => setActiveFilter(f => f === cat.id ? null : cat.id)} style={{
                  padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: activeFilter === cat.id ? 600 : 400,
                  background: activeFilter === cat.id ? 'rgba(var(--color-primary) / 0.1)' : 'transparent',
                  color: activeFilter === cat.id ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))', fontFamily: 'inherit', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                }}><CatIcon size={11} /> {cat.label}</button>
              );
            })}
          </div>
        )}

        {/* Results */}
        <div id="command-palette-results" ref={resultsRef} role="listbox" style={{ maxHeight: 360, overflowY: 'auto', padding: '4px 0' }}>
          {hasResults && groups.map((group) => {
            const CategoryIcon = CATEGORY_ICON_MAP[group.category] || Search;
            return (
              <div key={group.category}>
                <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 600, color: 'rgb(var(--text-muted))', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CategoryIcon size={12} /> {group.label}
                  <span style={{ fontSize: 10, opacity: 0.5, fontWeight: 400, marginLeft: 2 }}>{group.results.length}</span>
                </div>
                {group.results.map((result) => {
                  const idx = globalIndex++;
                  const isSelected = idx === selectedIndex;
                  const Icon = CATEGORY_ICON_MAP[result.category] || Search;
                  return (
                    <button key={result.id} role="option" aria-selected={isSelected} data-result-index={idx}
                      onClick={() => handleSelect(result)} onMouseEnter={() => setSelectedIndex(idx)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px',
                        background: isSelected ? 'rgba(var(--color-primary) / 0.06)' : 'transparent',
                        border: 'none', cursor: 'pointer', textAlign: 'left', color: 'rgb(var(--text-primary))',
                        transition: 'background 0.1s', fontFamily: 'inherit', borderRadius: 0,
                      }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isSelected ? 'rgba(var(--color-primary) / 0.1)' : 'rgb(var(--bg-secondary))', transition: 'background 0.1s',
                      }}>
                        <Icon size={14} style={{ color: isSelected ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.85rem', lineHeight: 1.3 }}>{result.title}</div>
                        {result.description && (
                          <div style={{ fontSize: '0.75rem', color: 'rgb(var(--text-muted))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                            {result.description}
                          </div>
                        )}
                      </div>
                      {isSelected && <CornerDownLeft size={13} style={{ color: 'rgb(var(--text-muted))', flexShrink: 0, opacity: 0.5 }} />}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Empty state */}
          {hasQuery && !hasResults && !loading && (
            <div style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Search size={32} style={{ color: 'rgb(var(--text-muted))', opacity: 0.3 }} />
              <p style={{ fontSize: '0.85rem', color: 'rgb(var(--text-muted))', margin: 0, fontWeight: 500 }}>
                Tidak ditemukan &quot;{query}&quot;
              </p>
              <p style={{ fontSize: '0.75rem', color: 'rgb(var(--text-muted))', margin: 0, opacity: 0.6 }}>
                Coba kata kunci lain
              </p>
            </div>
          )}

          {/* Default state: recent + suggestions */}
          {!hasQuery && (
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Recent pages */}
              {recentNav.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0 6px', fontSize: 11, fontWeight: 600, color: 'rgb(var(--text-muted))', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <Clock size={11} /> Baru dikunjungi
                  </div>
                  {recentNav.map(nav => {
                    const NavIcon = nav.icon;
                    return (
                      <button key={nav.path} onClick={() => { router.push(nav.path); setOpen(false); }} style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 8px',
                        background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                        color: 'rgb(var(--text-secondary))', borderRadius: 8, transition: 'background 0.1s', fontFamily: 'inherit',
                      }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--color-primary) / 0.04)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <NavIcon size={14} style={{ opacity: 0.5 }} />
                        <span style={{ fontSize: '0.85rem' }}>{nav.label}</span>
                      </button>
                    );
                  })}
                  <div style={{ height: 1, background: 'var(--border-default)', margin: '8px 0' }} />
                </>
              )}

              {/* Suggestions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0 6px', fontSize: 11, fontWeight: 600, color: 'rgb(var(--text-muted))', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <Hash size={11} /> Tips pencarian
              </div>
              {[
                { text: 'Nama tugas atau mata kuliah', example: '"Kalkulus II"' },
                { text: 'Todo', example: '"beli buku"' },
                { text: 'Transaksi', example: '"makan siang"' },
                { text: 'Halaman', example: '"pengaturan"' },
              ].map(s => (
                <div key={s.text} style={{ fontSize: '0.78rem', color: 'rgb(var(--text-secondary))', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'rgb(var(--text-muted))', opacity: 0.4 }}>•</span>
                  <span>{s.text}</span>
                  <span style={{ color: 'rgb(var(--text-muted))', opacity: 0.5 }}>{s.example}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '7px 16px', borderTop: '1px solid var(--border-default)', fontSize: 11, color: 'rgb(var(--text-muted))', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{ padding: '1px 5px', borderRadius: 4, background: 'rgb(var(--bg-secondary))', border: '1px solid var(--border-default)', fontSize: 10 }}><ArrowUpDown size={9} /></kbd> navigasi
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{ padding: '1px 5px', borderRadius: 4, background: 'rgb(var(--bg-secondary))', border: '1px solid var(--border-default)', fontSize: 10 }}><CornerDownLeft size={9} /></kbd> pilih
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{ padding: '1px 5px', borderRadius: 4, background: 'rgb(var(--bg-secondary))', border: '1px solid var(--border-default)', fontSize: 10 }}>Tab</kbd> filter
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', opacity: 0.6 }}>
            <Command size={10} /> K
          </span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(0.97); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
