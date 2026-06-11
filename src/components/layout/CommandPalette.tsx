'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ArrowRight,
  Wallet,
  CheckSquare,
  HelpCircle,
  BookOpen,
  Settings,
  LayoutDashboard,
  CreditCard,
  Sparkles,
  Command,
  Calendar,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { fuzzyMatch } from '@/lib/fuzzy-match';
import {
  groupResultsByCategory,
  flattenGroups,
  type CategorizedResult,
  type ResultGroup,
  type SearchCategoryId,
} from '@/lib/search-grouping';
import { useFeatureAccess } from '@/lib/feature-access';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface SearchCategory {
  id: string;
  label: string;
  icon: React.ElementType;
}

export interface SearchResult {
  id: string;
  category: SearchCategory['id'];
  title: string;
  description?: string;
  action: () => void;
  relevanceScore: number;
}

/** Backend search response shape */
interface SearchResponse {
  tasks: { id: string; title: string; className: string; deadline?: string }[];
  todos: { id: string; title: string; dueDate?: string }[];
  transactions: { id: string; label: string; amount: number; type: string }[];
  qna: { id: string; title: string; slug: string }[];
  sessions: { id: string; title: string; className: string; sequence: number }[];
}

// ─── Constants ──────────────────────────────────────────────────────────────────

export const SEARCH_CATEGORIES: SearchCategory[] = [
  { id: 'tugas', label: 'Tugas', icon: BookOpen },
  { id: 'todo', label: 'To-Do', icon: CheckSquare },
  { id: 'transaksi', label: 'Transaksi', icon: Wallet },
  { id: 'qna', label: 'Q&A', icon: HelpCircle },
  { id: 'pertemuan', label: 'Pertemuan', icon: Calendar },
  { id: 'navigasi', label: 'Navigasi', icon: LayoutDashboard },
];

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  tugas: BookOpen,
  todo: CheckSquare,
  transaksi: Wallet,
  qna: HelpCircle,
  pertemuan: Calendar,
  navigasi: LayoutDashboard,
};

/** Navigation route item type */
interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  keywords: string[];
  requiredFeature?: string;
}

/** Local navigation routes for fuzzy matching */
const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, keywords: ['dashboard', 'home', 'beranda'] },
  { label: 'Duit Tracker', path: '/duit-tracker', icon: Wallet, keywords: ['duit', 'keuangan', 'uang', 'tracker', 'transaksi'], requiredFeature: 'duit_tracker' },
  { label: 'To-Do List', path: '/todos', icon: CheckSquare, keywords: ['todo', 'tugas', 'task', 'to-do'], requiredFeature: 'todo' },
  { label: 'Q&A', path: '/qna', icon: HelpCircle, keywords: ['qna', 'tanya', 'jawab', 'pertanyaan'], requiredFeature: 'qna' },
  { label: 'Kelas Saya', path: '/classes', icon: BookOpen, keywords: ['kelas', 'class', 'mata kuliah'], requiredFeature: 'class' },
  { label: 'Billing', path: '/billing', icon: CreditCard, keywords: ['billing', 'bayar', 'paket', 'plan'] },
  { label: 'Pengaturan', path: '/settings', icon: Settings, keywords: ['setting', 'pengaturan', 'profil', 'akun'] },
  { label: 'Daily Briefing', path: '/briefing', icon: Sparkles, keywords: ['briefing', 'harian', 'rangkuman'], requiredFeature: 'briefing' },
];

/**
 * Maps backend search result categories to their corresponding feature keys.
 * Results from these categories are hidden when the user lacks the feature.
 */
const CATEGORY_FEATURE_MAP: Record<string, string> = {
  tugas: 'class',
  todo: 'todo',
  transaksi: 'duit_tracker',
  qna: 'qna',
  pertemuan: 'class',
};

// ─── Custom event for opening command palette externally ─────────────────────────

export const COMMAND_PALETTE_OPEN_EVENT = 'command-palette:open';

/**
 * Call this function to open the Command Palette from anywhere
 * (e.g., from the Appbar search input click).
 */
export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_OPEN_EVENT));
}

// ─── Backend Search ─────────────────────────────────────────────────────────────

async function fetchSearchResults(query: string): Promise<SearchResponse | null> {
  if (query.trim().length < 2) return null;
  try {
    return await apiFetch<SearchResponse>(`/search?q=${encodeURIComponent(query)}&limit=20`);
  } catch {
    // On error (network, auth, etc.) return null — palette shows local results only
    return null;
  }
}

/**
 * Convert backend SearchResponse into CategorizedResult[] with route actions.
 */
function mapBackendResults(
  data: SearchResponse,
  router: ReturnType<typeof useRouter>,
): CategorizedResult[] {
  const results: CategorizedResult[] = [];

  // Tasks → category: tugas
  for (const task of data.tasks) {
    results.push({
      id: `task-${task.id}`,
      category: 'tugas',
      title: task.title,
      description: task.className + (task.deadline ? ` • ${new Date(task.deadline).toLocaleDateString('id-ID')}` : ''),
      relevanceScore: 0.85,
    });
  }

  // Todos → category: todo
  for (const todo of data.todos) {
    results.push({
      id: `todo-${todo.id}`,
      category: 'todo',
      title: todo.title,
      description: todo.dueDate ? `Tenggat: ${new Date(todo.dueDate).toLocaleDateString('id-ID')}` : undefined,
      relevanceScore: 0.8,
    });
  }

  // Transactions → category: transaksi
  for (const tx of data.transactions) {
    const amtFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(tx.amount);
    results.push({
      id: `tx-${tx.id}`,
      category: 'transaksi',
      title: tx.label,
      description: `${tx.type === 'EXPENSE' ? '-' : '+'}${amtFormatted}`,
      relevanceScore: 0.75,
    });
  }

  // Q&A → category: qna
  for (const q of data.qna) {
    results.push({
      id: `qna-${q.id}`,
      category: 'qna',
      title: q.title,
      description: undefined,
      relevanceScore: 0.8,
    });
  }

  // Sessions → category: pertemuan
  for (const session of data.sessions) {
    results.push({
      id: `session-${session.id}`,
      category: 'pertemuan',
      title: session.title,
      description: `${session.className} • Pertemuan ${session.sequence}`,
      relevanceScore: 0.75,
    });
  }

  return results;
}

/**
 * Build navigation actions map to resolve on selection.
 */
function buildActionMap(
  data: SearchResponse | null,
  navResults: CategorizedResult[],
  router: ReturnType<typeof useRouter>,
  navItems: NavItem[],
): Map<string, () => void> {
  const map = new Map<string, () => void>();

  // Backend data actions
  if (data) {
    for (const task of data.tasks) {
      // Navigate to task within its class
      map.set(`task-${task.id}`, () => router.push(`/classes`));
    }
    for (const todo of data.todos) {
      map.set(`todo-${todo.id}`, () => router.push('/todos'));
    }
    for (const tx of data.transactions) {
      map.set(`tx-${tx.id}`, () => router.push('/duit-tracker'));
    }
    for (const q of data.qna) {
      map.set(`qna-${q.id}`, () => router.push(`/qna/${q.slug}`));
    }
    for (const session of data.sessions) {
      map.set(`session-${session.id}`, () => router.push('/classes'));
    }
  }

  // Navigation route actions
  for (const navResult of navResults) {
    const navItem = navItems.find(n => `nav-${n.path}` === navResult.id);
    if (navItem) {
      map.set(navResult.id, () => router.push(navItem.path));
    }
  }

  return map;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const router = useRouter();
  const { hasFeature } = useFeatureAccess();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<ResultGroup[]>([]);
  const [flatResults, setFlatResults] = useState<CategorizedResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const actionMapRef = useRef<Map<string, () => void>>(new Map());

  // Filter NAV_ITEMS based on user's feature access
  const accessibleNavItems = useMemo(
    () => NAV_ITEMS.filter(item => !item.requiredFeature || hasFeature(item.requiredFeature)),
    [hasFeature],
  );

  // Listen for Ctrl+K / Cmd+K
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

  // Listen for external open event (e.g., appbar search click)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, handler);
    return () => window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, handler);
  }, []);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setGroups([]);
      setFlatResults([]);
      setSelectedIndex(0);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search (200ms) — combines backend API + local fuzzy navigation matching
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(async () => {
      const trimmed = query.trim();
      if (!trimmed) {
        setGroups([]);
        setFlatResults([]);
        setSelectedIndex(0);
        actionMapRef.current = new Map();
        return;
      }

      setLoading(true);

      // 1. Fuzzy match local navigation routes (filtered by feature access)
      const navMatches = fuzzyMatch(
        trimmed,
        accessibleNavItems,
        (item) => [item.label, ...item.keywords],
        0.3,
      );
      const navResults: CategorizedResult[] = navMatches.map(({ item, score }) => ({
        id: `nav-${item.path}`,
        category: 'navigasi' as SearchCategoryId,
        title: item.label,
        description: `Navigasi ke ${item.label}`,
        relevanceScore: score,
      }));

      // 2. Call backend search API (only for queries ≥ 2 chars)
      let backendResults: CategorizedResult[] = [];
      let backendData: SearchResponse | null = null;
      if (trimmed.length >= 2) {
        backendData = await fetchSearchResults(trimmed);
        if (backendData) {
          backendResults = mapBackendResults(backendData, router);
          // Filter backend results based on feature access
          backendResults = backendResults.filter(result => {
            const requiredFeature = CATEGORY_FEATURE_MAP[result.category];
            return !requiredFeature || hasFeature(requiredFeature);
          });
        }
      }

      // 3. Combine all results and group by category
      const allResults = [...backendResults, ...navResults];
      const grouped = groupResultsByCategory(allResults);
      const flat = flattenGroups(grouped);

      // 4. Build action map
      actionMapRef.current = buildActionMap(backendData, navResults, router, accessibleNavItems);

      setGroups(grouped);
      setFlatResults(flat);
      setSelectedIndex(0);
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, open, router, accessibleNavItems, hasFeature]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && flatResults.length > 0) {
      const selectedEl = resultsRef.current.querySelector(`[data-result-index="${selectedIndex}"]`) as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, flatResults.length]);

  const handleSelect = useCallback((result: CategorizedResult) => {
    const action = actionMapRef.current.get(result.id);
    if (action) {
      action();
    }
    setOpen(false);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(flatResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  if (!open) return null;

  const hasQuery = query.trim().length > 0;
  const hasResults = flatResults.length > 0;

  // Build a flat index counter for data-result-index
  let globalIndex = 0;

  return (
    <>
      {/* Blurred backdrop overlay */}
      <div
        className="command-palette-backdrop"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 9998,
          animation: 'fadeIn 0.12s ease-out',
        }}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Command Palette modal */}
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        style={{
          position: 'fixed',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 560,
          zIndex: 9999,
          background: 'rgb(var(--bg-primary))',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.35), 0 0 0 1px var(--border-default)',
          border: '1px solid var(--border-default)',
          overflow: 'hidden',
          animation: 'slideDown 0.15s ease-out',
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <Search size={18} style={{ color: 'rgb(var(--text-muted))', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari tugas, todo, transaksi, atau navigasi..."
            aria-label="Search command palette"
            aria-autocomplete="list"
            aria-expanded={hasResults}
            aria-controls="command-palette-results"
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: 'var(--font-base)',
              color: 'rgb(var(--text-primary))',
              fontFamily: 'inherit',
            }}
          />
          {loading && (
            <div
              style={{
                width: 16,
                height: 16,
                border: '2px solid rgb(var(--text-muted))',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
                flexShrink: 0,
              }}
            />
          )}
          <kbd
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgb(var(--bg-secondary))',
              color: 'rgb(var(--text-muted))',
              border: '1px solid var(--border-default)',
              fontFamily: 'inherit',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results area */}
        <div
          id="command-palette-results"
          ref={resultsRef}
          role="listbox"
          aria-label="Search results"
          style={{
            maxHeight: 380,
            overflowY: 'auto',
            padding: '4px 0',
          }}
        >
          {/* Grouped results */}
          {hasResults && groups.map((group) => {
            const CategoryIcon = CATEGORY_ICON_MAP[group.category] || Search;
            return (
              <div key={group.category}>
                {/* Category header */}
                <div
                  style={{
                    padding: '8px 16px 4px',
                    fontSize: 'var(--font-xs)',
                    fontWeight: 600,
                    color: 'rgb(var(--text-muted))',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <CategoryIcon size={12} />
                  {group.label}
                </div>

                {/* Results in this category */}
                {group.results.map((result) => {
                  const idx = globalIndex++;
                  const isSelected = idx === selectedIndex;
                  const Icon = CATEGORY_ICON_MAP[result.category] || Search;

                  return (
                    <button
                      key={result.id}
                      role="option"
                      aria-selected={isSelected}
                      data-result-index={idx}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        padding: '10px 16px',
                        background: isSelected ? 'rgba(var(--color-primary) / 0.08)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: 'rgb(var(--text-primary))',
                        transition: 'background 0.1s',
                        fontFamily: 'inherit',
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 'var(--radius-sm)',
                          background: isSelected
                            ? 'rgba(var(--color-primary) / 0.12)'
                            : 'rgb(var(--bg-secondary))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'background 0.1s',
                        }}
                      >
                        <Icon
                          size={14}
                          style={{ color: isSelected ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))' }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 'var(--font-sm)', lineHeight: 1.3 }}>
                          {result.title}
                        </div>
                        {result.description && (
                          <div
                            style={{
                              fontSize: 'var(--font-xs)',
                              color: 'rgb(var(--text-muted))',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginTop: 1,
                            }}
                          >
                            {result.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <ArrowRight size={14} style={{ color: 'rgb(var(--text-muted))', flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Empty state: query typed but no results */}
          {hasQuery && !hasResults && !loading && (
            <div
              style={{
                padding: '32px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Search
                size={32}
                style={{ color: 'rgb(var(--text-muted))', opacity: 0.4 }}
              />
              <p
                style={{
                  fontSize: 'var(--font-sm)',
                  color: 'rgb(var(--text-muted))',
                  margin: 0,
                  fontWeight: 500,
                }}
              >
                Tidak ada hasil untuk &quot;{query}&quot;
              </p>
              <p
                style={{
                  fontSize: 'var(--font-xs)',
                  color: 'rgb(var(--text-muted))',
                  margin: 0,
                  opacity: 0.7,
                }}
              >
                Coba kata kunci lain, misalnya nama tugas, todo, atau halaman
              </p>
            </div>
          )}

          {/* Default state: no query, show suggestions */}
          {!hasQuery && (
            <div
              style={{
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Sparkles size={14} style={{ color: 'rgb(var(--color-primary))' }} />
                <span
                  style={{
                    fontSize: 'var(--font-xs)',
                    color: 'rgb(var(--text-muted))',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Saran pencarian
                </span>
              </div>
              {[
                { text: 'Nama tugas atau mata kuliah', example: 'mis: "Kalkulus II"' },
                { text: 'Todo atau catatan', example: 'mis: "beli buku"' },
                { text: 'Nama halaman', example: 'mis: "pengaturan"' },
                { text: 'Transaksi keuangan', example: 'mis: "makan siang"' },
              ].map((suggestion) => (
                <div
                  key={suggestion.text}
                  style={{
                    fontSize: 'var(--font-xs)',
                    color: 'rgb(var(--text-secondary))',
                    padding: '4px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ color: 'rgb(var(--text-muted))', opacity: 0.5 }}>•</span>
                  <span>{suggestion.text}</span>
                  <span style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-xs)', opacity: 0.6 }}>
                    {suggestion.example}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--border-default)',
            fontSize: 'var(--font-xs)',
            color: 'rgb(var(--text-muted))',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{ padding: '1px 5px', borderRadius: 3, background: 'rgb(var(--bg-secondary))', border: '1px solid var(--border-default)', fontSize: '10px' }}>↑↓</kbd>
            navigasi
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <kbd style={{ padding: '1px 5px', borderRadius: 3, background: 'rgb(var(--bg-secondary))', border: '1px solid var(--border-default)', fontSize: '10px' }}>Enter</kbd>
            pilih
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
            <Command size={10} />
            <span>K untuk membuka</span>
          </span>
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
