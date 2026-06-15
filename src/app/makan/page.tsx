'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, BottomSheet, useToast } from '@/components/ui';
import { useCache } from '@/lib/cache';
import {
  foodService,
  FoodPreference,
  FridgeResult,
  FridgeRecipe,
  MenuResult,
  FoodBudgetInfo,
  FoodFavorite,
  FoodHistoryItem,
} from '@/services/foodService';
import {
  UtensilsCrossed, Loader2, Settings2, Heart, History,
  Wallet, Clock, Refrigerator, ScrollText, Sparkles, ChevronDown, Gauge,
} from 'lucide-react';
import { SegmentedTabs } from '@/components/food/SegmentedTabs';
import { BudgetRing } from '@/components/food/BudgetRing';
import { PhotoDropzone } from '@/components/food/PhotoDropzone';
import { RecipeCard } from '@/components/food/RecipeCard';
import { PreferenceForm } from '@/components/food/PreferenceForm';

const FILTER_OPTIONS = [
  { label: '💸 Hemat', value: 'hemat' },
  { label: '🥗 Sehat', value: 'sehat' },
  { label: '🍛 Mengenyangkan', value: 'mengenyangkan' },
  { label: '😌 Tidak Pedas', value: 'tidak pedas' },
];

function useSessionStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue] as const;
}

type TabMode = 'fridge' | 'menu' | 'favorites' | 'history';

const TABS = [
  { value: 'fridge' as const, label: 'Foto Kulkas', icon: <Refrigerator size={16} /> },
  { value: 'menu' as const, label: 'Foto Menu', icon: <ScrollText size={16} /> },
  { value: 'favorites' as const, label: 'Favorit', icon: <Heart size={16} /> },
  { value: 'history' as const, label: 'Riwayat', icon: <History size={16} /> },
];

export default function MakanApaPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mode, setMode] = useSessionStorage<TabMode>('makan_mode', 'fridge');
  const [pref, setPref] = useState<FoodPreference | null>(null);
  const [showPrefModal, setShowPrefModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [fridgeResult, setFridgeResult] = useSessionStorage<FridgeResult | null>('makan_fridgeResult', null);
  const [menuResult, setMenuResult] = useSessionStorage<MenuResult | null>('makan_menuResult', null);
  const [menuFilter, setMenuFilter] = useSessionStorage('makan_menuFilter', 'hemat');

  // Cached data fetching
  const budgetFetcher = useCallback(() => foodService.getRemainingBudget().catch(() => null), []);
  const { data: budgetInfo, loading: budgetLoading, revalidate: refetchBudget } = useCache<FoodBudgetInfo | null>('food:budget', budgetFetcher);

  const { data: prefData } = useCache<FoodPreference>('food:preference', () => foodService.getPreference());
  useEffect(() => { if (prefData) setPref(prefData); }, [prefData]);

  // Favorites state — cached
  const favFetcher = useCallback(() => foodService.getFavorites(), []);
  const { data: favorites = [], loading: favoritesLoading, revalidate: refetchFavorites, mutate: mutateFavorites } = useCache<FoodFavorite[]>(
    mode === 'favorites' || mode === 'fridge' ? 'food:favorites' : null,
    favFetcher
  );

  // History state — cached
  const histFetcher = useCallback(() => foodService.getHistory(30), []);
  const { data: history = [], loading: historyLoading } = useCache<FoodHistoryItem[]>(
    mode === 'history' ? 'food:history' : null,
    histFetcher
  );

  const handleImageUpload = async (file: File) => {
    setLoading(true);
    setFridgeResult(null);
    setMenuResult(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const mimeType = file.type;

      if (mode === 'fridge') {
        const result = await foodService.fromFridge(base64, mimeType);
        setFridgeResult(result);
      } else {
        const result = await foodService.fromMenu(base64, mimeType, menuFilter);
        setMenuResult(result);
      }
      // Refresh budget after getting recommendations
      refetchBudget();
    } catch (e: any) {
      showToast(e.message || 'Gagal memproses foto.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePref = async (data: Partial<FoodPreference>) => {
    try {
      const updated = await foodService.updatePreference(data);
      setPref(updated);
      setShowPrefModal(false);
      showToast('Preferensi disimpan!', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleToggleFavorite = async (recipe: FridgeRecipe) => {
    const existing = favorites.find(f => f.recipeName === recipe.name);
    if (existing) {
      try {
        await foodService.removeFavorite(existing.id);
        mutateFavorites(prev => (prev || []).filter(f => f.id !== existing.id));
        showToast('Dihapus dari favorit.', 'info');
      } catch {
        showToast('Gagal menghapus favorit.', 'error');
      }
    } else {
      try {
        const fav = await foodService.addFavorite(recipe.name, JSON.stringify(recipe));
        mutateFavorites(prev => [fav, ...(prev || [])]);
        showToast('Ditambahkan ke favorit! ❤️', 'success');
      } catch {
        showToast('Gagal menyimpan favorit.', 'error');
      }
    }
  };

  const handleRemoveFavorite = async (id: string) => {
    try {
      await foodService.removeFavorite(id);
      mutateFavorites(prev => (prev || []).filter(f => f.id !== id));
      showToast('Dihapus dari favorit.', 'info');
    } catch {
      showToast('Gagal menghapus favorit.', 'error');
    }
  };

  // Filter fridge recipes by remaining budget
  const filteredFridgeRecipes = useMemo(() => {
    if (!fridgeResult?.recipes) return [];
    if (!budgetInfo?.remaining || budgetInfo.remaining <= 0) return fridgeResult.recipes;
    return fridgeResult.recipes.filter(r => r.estimatedCost <= budgetInfo.remaining!);
  }, [fridgeResult, budgetInfo]);

  // Filter menu recommendations by remaining budget
  const filteredMenuRecs = useMemo(() => {
    if (!menuResult?.recommendations) return [];
    if (!budgetInfo?.remaining || budgetInfo.remaining <= 0) return menuResult.recommendations;
    return menuResult.recommendations.filter(r => r.price <= budgetInfo.remaining!);
  }, [menuResult, budgetInfo]);

  const isFavorited = (recipeName: string) => favorites.some(f => f.recipeName === recipeName);

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  // Budget derived values
  const spentFraction = budgetInfo && budgetInfo.budget > 0 ? budgetInfo.spent / budgetInfo.budget : 0;
  const remainingPct = budgetInfo && budgetInfo.budget > 0
    ? Math.max(0, Math.round((1 - spentFraction) * 100))
    : 0;
  const overBudget = spentFraction > 0.85;

  const getDifficultyColor = (difficulty: string): string => {
    const d = (difficulty || '').toLowerCase();
    if (d.includes('mudah') || d.includes('easy')) return 'var(--color-success)';
    if (d.includes('sulit') || d.includes('hard') || d.includes('susah')) return 'var(--color-error)';
    return 'var(--color-warning)';
  };

  const renderHistoryItem = (item: FoodHistoryItem) => {
    const isExpanded = expandedHistoryId === item.id;
    let recipe: any = null;
    if (item.recipeData) {
      try { recipe = JSON.parse(item.recipeData); } catch {}
    }
    
    const toggleExpand = () => {
      setExpandedHistoryId(isExpanded ? null : item.id);
    };

    const isFridge = item.sourceType !== 'menu' && (!recipe || recipe.steps || recipe.ingredients);

    return (
      <Card
        key={item.id}
        style={{
          padding: 0,
          overflow: 'hidden',
          border: isExpanded ? '1px solid rgba(var(--color-primary) / 0.3)' : '1px solid var(--border-default)',
          background: isExpanded ? 'linear-gradient(180deg, rgb(var(--bg-elevated)), rgba(var(--color-primary) / 0.02))' : 'rgb(var(--bg-elevated))',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isExpanded ? 'scale(1.005)' : 'scale(1)',
          boxShadow: isExpanded ? 'var(--shadow-md)' : 'none',
        }}
      >
        <div
          onClick={toggleExpand}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isFridge ? 'rgba(var(--color-success) / 0.1)' : 'rgba(var(--color-primary) / 0.1)',
                color: isFridge ? 'rgb(var(--color-success))' : 'rgb(var(--color-primary))',
                flexShrink: 0,
              }}
            >
              {isFridge ? <Refrigerator size={16} /> : <ScrollText size={16} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <h4 style={{ fontWeight: 800, fontSize: 'var(--font-sm)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.recipeName}
              </h4>
              <span style={{ fontSize: '10px', color: 'rgb(var(--text-muted))', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Clock size={11} />
                {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              {item.budget !== null && (
                <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--color-primary))', fontWeight: 700 }}>
                  {isFridge ? `Sisa: ${fmt(item.budget)}` : fmt(item.budget)}
                </span>
              )}
              <p style={{ fontSize: '9px', color: 'rgb(var(--text-muted))', margin: 0, marginTop: 2 }}>
                {isFridge ? 'Resep Kulkas' : 'Rekomendasi Menu'}
              </p>
            </div>
            <ChevronDown
              size={16}
              style={{
                color: 'rgb(var(--text-muted))',
                transition: 'transform 0.25s',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </div>
        </div>

        {isExpanded && (
          <div
            style={{
              padding: '0 18px 18px',
              borderTop: '1px solid var(--border-default)',
              background: 'rgba(0,0,0,0.01)',
              animation: 'slideDown 0.2s ease-out',
            }}
          >
            {recipe ? (
              isFridge ? (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {recipe.cookTime && (
                      <span style={historyMetaChip}>
                        <Clock size={12} /> {recipe.cookTime}
                      </span>
                    )}
                    {recipe.difficulty && (
                      <span
                        style={{
                          ...historyMetaChip,
                          color: getDifficultyColor(recipe.difficulty),
                          background: `${getDifficultyColor(recipe.difficulty)}1a`,
                          borderColor: `${getDifficultyColor(recipe.difficulty)}4d`,
                        }}
                      >
                        <Gauge size={12} /> {recipe.difficulty}
                      </span>
                    )}
                    {recipe.estimatedCost && (
                      <span style={{ ...historyMetaChip, color: 'rgb(var(--color-primary))' }}>
                        <Wallet size={12} /> {fmt(recipe.estimatedCost)}
                      </span>
                    )}
                    {recipe.tags?.map((t: string) => (
                      <span key={t} style={historyMetaChip}>#{t}</span>
                    ))}
                  </div>

                  {recipe.ingredients?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={historySectionLabel}>🧺 Bahan-bahan</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                        {recipe.ingredients.map((ing: string, idx: number) => (
                          <label
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: 'var(--font-sm)',
                              color: 'rgb(var(--text-secondary))',
                              cursor: 'pointer',
                            }}
                          >
                            <input
                              type="checkbox"
                              style={{
                                accentColor: 'rgb(var(--color-primary))',
                                width: 14,
                                height: 14,
                              }}
                            />
                            <span>{ing}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {recipe.steps?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={historySectionLabel}>👩‍🍳 Langkah Memasak</p>
                      <ol style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', paddingLeft: 18, margin: 0, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recipe.steps.map((step: string, idx: number) => (
                          <li key={idx} style={{ lineHeight: 1.4 }}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                    <Button
                      onClick={(e) => { e.stopPropagation(); handleToggleFavorite(recipe); }}
                      variant="ghost"
                      size="sm"
                      style={{
                        color: isFavorited(recipe.name) ? 'rgb(var(--color-error))' : 'rgb(var(--text-muted))',
                        fontWeight: 700,
                        gap: 6,
                        padding: '6px 12px',
                      }}
                    >
                      <Heart
                        size={15}
                        fill={isFavorited(recipe.name) ? 'rgb(var(--color-error))' : 'none'}
                        color={isFavorited(recipe.name) ? 'rgb(var(--color-error))' : 'currentColor'}
                      />
                      {isFavorited(recipe.name) ? 'Tersimpan di Favorit' : 'Tambah ke Favorit'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 14 }}>
                  <p style={{ ...historySectionLabel, marginBottom: 4 }}>💡 Alasan Rekomendasi</p>
                  <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', lineHeight: 1.4, margin: 0 }}>
                    {recipe.reason || 'Sesuai dengan filter budget dan seleramu.'}
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-default)' }}>
                     <div style={{ display: 'flex', gap: 6 }}>
                       {recipe.tags?.map((t: string) => (
                         <span key={t} style={historyMetaChip}>#{t}</span>
                       ))}
                     </div>
                     <span style={{ fontWeight: 800, color: 'rgb(var(--color-primary))', fontSize: 'var(--font-sm)' }}>
                       {fmt(recipe.price || item.budget || 0)}
                     </span>
                  </div>
                </div>
              )
            ) : (
              <div style={{ marginTop: 10, fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>
                Nama resep/menu: <strong style={{ color: 'rgb(var(--text-primary))' }}>{item.recipeName}</strong>.
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  const historyMetaChip: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 600,
    color: 'rgb(var(--text-secondary))',
    background: 'rgb(var(--bg-elevated))',
    border: '1px solid var(--border-default)',
  };

  const historySectionLabel: React.CSSProperties = {
    fontSize: 'var(--font-xs)',
    fontWeight: 800,
    margin: 0,
    color: 'rgb(var(--text-primary))',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  };

  return (
    <AuthGuard requiredFeature="food_recommend">
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content page-transition">
            <div className="feature-container" style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 'calc(var(--bottom-nav-height, 60px) + 16px)' }}>
              
              {/* Feature Header with Relocated Preference Button */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, rgba(var(--color-primary) / 0.15), rgba(var(--color-secondary) / 0.15))',
                    color: 'rgb(var(--color-primary))',
                  }}>
                    <UtensilsCrossed size={22} />
                  </div>
                  <div>
                    <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      Makan Apa
                    </h1>
                    <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', margin: 0 }}>
                      Rekomendasi makanan cerdas berbasis sisa budget & seleramu
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => setShowPrefModal(true)}
                  variant="outline"
                  size="sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 14px',
                    fontSize: 'var(--font-xs)',
                    fontWeight: 700,
                  }}
                >
                  <Settings2 size={15} />
                  <span>Preferensi Makan</span>
                </Button>
              </div>

              {/* Budget Card with progress ring */}
              {!budgetLoading && budgetInfo && budgetInfo.budget > 0 && (
                <Card
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    marginBottom: 24,
                    padding: '20px 24px',
                    background: 'linear-gradient(135deg, rgba(var(--bg-surface), 0.7), rgba(var(--bg-elevated), 0.8))',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: 'var(--shadow-lg), var(--shadow-glow-primary)',
                  }}
                >
                  {/* Background decorative glows */}
                  <div style={{
                    position: 'absolute',
                    top: '-40px',
                    right: '-40px',
                    width: 120,
                    height: 120,
                    background: 'radial-gradient(circle, rgba(var(--color-primary) / 0.15) 0%, transparent 70%)',
                    zIndex: 0,
                    pointerEvents: 'none'
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '-40px',
                    left: '-40px',
                    width: 120,
                    height: 120,
                    background: 'radial-gradient(circle, rgba(var(--color-secondary) / 0.15) 0%, transparent 70%)',
                    zIndex: 0,
                    pointerEvents: 'none'
                  }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative', zIndex: 1 }}>
                    {budgetInfo.remaining !== null ? (
                      <BudgetRing
                        fraction={spentFraction}
                        danger={overBudget}
                        centerTop={`${remainingPct}%`}
                        centerBottom="sisa"
                        size={80}
                      />
                    ) : (
                      <div style={{ width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(var(--color-primary) / 0.1)', flexShrink: 0 }}>
                        <Wallet size={28} style={{ color: 'rgb(var(--color-primary))' }} />
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Wallet size={14} style={{ color: 'rgb(var(--color-primary))' }} />
                        <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', fontWeight: 600, margin: 0 }}>
                          Sisa Budget Makan Bulan Ini
                        </p>
                      </div>
                      
                      <p style={{
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        lineHeight: 1.1,
                        margin: 0,
                        color: overBudget ? 'rgb(var(--color-error))' : 'rgb(var(--color-primary))',
                        letterSpacing: '-0.5px'
                      }}>
                        {budgetInfo.remaining !== null ? fmt(budgetInfo.remaining) : 'Tidak ada budget'}
                      </p>

                      <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '10px', color: 'rgb(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Budget Awal</span>
                          <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>{fmt(budgetInfo.budget)}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '10px', color: 'rgb(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Terpakai</span>
                          <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-secondary))' }}>{fmt(budgetInfo.spent)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {overBudget && budgetInfo.remaining !== null && (
                    <div style={{
                      marginTop: 14,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(var(--color-error) / 0.1)',
                      border: '1px solid rgba(var(--color-error) / 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      position: 'relative',
                      zIndex: 1
                    }}>
                      <span style={{ fontSize: '14px' }}>⚠️</span>
                      <p style={{ margin: 0, fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--color-error))' }}>
                        Budget makanmu hampir habis! Pilih menu atau resep hemat di bawah ini.
                      </p>
                    </div>
                  )}
                </Card>
              )}

              {/* Segmented tab control (Full Width) */}
              <div style={{ marginBottom: 20 }}>
                <SegmentedTabs
                  tabs={TABS}
                  value={mode}
                  style={{ marginBottom: 0 }}
                  onChange={(m) => {
                    setMode(m);
                  }}
                />
              </div>

              {/* Fridge/Menu mode content */}      {/* Fridge/Menu mode content */}
              {(mode === 'fridge' || mode === 'menu') && (
                <>
                  {/* Filter for menu mode */}
                  {mode === 'menu' && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-muted))', marginBottom: 8 }}>Apa yang kamu cari?</p>
                      <div className="filter-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {FILTER_OPTIONS.map(f => {
                          const active = menuFilter === f.value;
                          return (
                            <button
                              key={f.value}
                              onClick={() => setMenuFilter(f.value)}
                              aria-pressed={active}
                              style={{
                                cursor: 'pointer',
                                padding: '8px 14px',
                                borderRadius: 999,
                                fontFamily: 'inherit',
                                fontSize: 13,
                                background: active ? 'rgba(var(--color-primary) / 0.1)' : 'rgb(var(--bg-elevated))',
                                border: active ? '1px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                                color: active ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
                                fontWeight: active ? 700 : 500,
                                transition: 'all 0.18s ease',
                              }}
                            >{f.label}</button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Inviting upload dropzone */}
                  <PhotoDropzone
                    loading={loading}
                    title={mode === 'fridge' ? 'Foto isi kulkasmu' : 'Foto menu restoran'}
                    hint={mode === 'fridge'
                      ? 'AI akan deteksi bahan & rekomendasikan resep enak. Tarik foto ke sini atau klik untuk memilih.'
                      : 'AI pilihkan menu terbaik sesuai budget & seleramu. Tarik foto ke sini atau klik untuk memilih.'}
                    onFile={handleImageUpload}
                  />

                  {/* Processing / Loading Info Banner */}
                  {loading && (
                    <Card
                      className="animate-pulse"
                      style={{
                        marginTop: 16,
                        padding: '20px',
                        background: 'linear-gradient(135deg, rgba(var(--color-primary) / 0.08), rgba(var(--color-secondary) / 0.05))',
                        border: '1px dashed rgb(var(--color-primary))',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        gap: 12,
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: '0 8px 30px rgba(var(--color-primary) / 0.06)',
                      }}
                    >
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44 }}>
                        <div style={{ position: 'absolute', width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(var(--color-primary), 0.1)', borderTopColor: 'rgb(var(--color-primary))', animation: 'spin 1s linear infinite' }} />
                        <Sparkles size={18} style={{ color: 'rgb(var(--color-primary))', animation: 'pulse 1.5s ease-in-out infinite' }} />
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 800, fontSize: 'var(--font-md)', color: 'rgb(var(--text-primary))', marginBottom: 6 }}>
                          Sedang Menganalisis Gambar...
                        </h4>
                        <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', maxWidth: 520, margin: '0 auto', lineHeight: 1.45 }}>
                          Gemini AI sedang membaca foto {mode === 'fridge' ? 'isi kulkas' : 'menu restoran'} Anda untuk menyusun rekomendasi terbaik sesuai selera & sisa budget makanmu. Mohon tunggu sekitar 5-10 detik. ✨
                        </p>
                      </div>
                    </Card>
                  )}

                  {/* Fridge Results */}
                  {fridgeResult && (
                    <div className="animate-fade-in">
                      {fridgeResult.detectedIngredients.length > 0 && (
                        <Card style={{ marginBottom: 16 }}>
                          <h3 style={{ fontWeight: 700, marginBottom: 10 }}>🥕 Bahan Terdeteksi</h3>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {fridgeResult.detectedIngredients.map(ing => (
                              <span key={ing} className="tag-chip">{ing}</span>
                            ))}
                          </div>
                        </Card>
                      )}

                      {/* Budget filter notice */}
                      {budgetInfo?.remaining && budgetInfo.remaining > 0 && filteredFridgeRecipes.length < fridgeResult.recipes.length && (
                        <Card style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(var(--color-warning) / 0.08)', borderLeft: '3px solid rgb(var(--color-warning))' }}>
                          <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-secondary))' }}>
                            ⚡ Menampilkan {filteredFridgeRecipes.length} dari {fridgeResult.recipes.length} resep yang sesuai budget ({fmt(budgetInfo.remaining)})
                          </p>
                        </Card>
                      )}

                      <h3 style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sparkles size={18} style={{ color: 'rgb(var(--color-primary))' }} /> Resep Rekomendasi
                      </h3>
                      {filteredFridgeRecipes.length === 0 && fridgeResult.recipes.length > 0 ? (
                        <Card style={{ padding: '1.5rem', textAlign: 'center' }}>
                          <p style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)' }}>
                            Semua resep melebihi sisa budget ({fmt(budgetInfo?.remaining ?? 0)}). Coba tambah budget atau kurangi pengeluaran.
                          </p>
                        </Card>
                      ) : (
                        <div className="stagger-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {filteredFridgeRecipes.map((recipe, i) => (
                            <RecipeCard
                              key={i}
                              recipe={recipe}
                              favorited={isFavorited(recipe.name)}
                              onToggleFavorite={() => handleToggleFavorite(recipe)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Menu Results */}
                  {menuResult && (
                    <div className="animate-fade-in">
                      {/* Budget filter notice */}
                      {budgetInfo?.remaining && budgetInfo.remaining > 0 && filteredMenuRecs.length < menuResult.recommendations.length && (
                        <Card style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(var(--color-warning) / 0.08)', borderLeft: '3px solid rgb(var(--color-warning))' }}>
                          <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-secondary))' }}>
                            ⚡ Menampilkan {filteredMenuRecs.length} dari {menuResult.recommendations.length} rekomendasi yang sesuai budget ({fmt(budgetInfo.remaining)})
                          </p>
                        </Card>
                      )}

                      <h3 style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sparkles size={18} style={{ color: 'rgb(var(--color-primary))' }} /> Rekomendasi
                      </h3>
                      {filteredMenuRecs.length === 0 && menuResult.recommendations.length > 0 ? (
                        <Card style={{ padding: '1.5rem', textAlign: 'center' }}>
                          <p style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)' }}>
                            Semua menu melebihi sisa budget ({fmt(budgetInfo?.remaining ?? 0)}).
                          </p>
                        </Card>
                      ) : (
                        <div className="stagger-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {filteredMenuRecs.map((rec, i) => (
                            <Card key={i} style={{ padding: 0, overflow: 'hidden' }}>
                              <div style={{ display: 'flex', borderLeft: '4px solid rgb(var(--color-primary))' }}>
                                <div style={{ flex: 1, padding: '14px 16px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                                    <h4 style={{ fontWeight: 800, fontSize: 'var(--font-md)' }}>{rec.name}</h4>
                                    <span style={{ fontWeight: 800, color: 'rgb(var(--color-primary))', whiteSpace: 'nowrap' }}>{fmt(rec.price)}</span>
                                  </div>
                                  <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', marginBottom: 8 }}>{rec.reason}</p>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {rec.tags.map(t => <span key={t} className="tag-chip" style={{ fontSize: '10px' }}>#{t}</span>)}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}

                      {menuResult.menuItems.length > 0 && (
                        <details style={{ marginTop: 20 }}>
                          <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'rgb(var(--text-muted))' }}>Semua menu ({menuResult.menuItems.length} item)</summary>
                          <div className="stagger-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                            {menuResult.menuItems.map((item, i) => (
                              <div key={i} className="item-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px' }}>
                                <span style={{ fontSize: 'var(--font-sm)' }}>{item.name}</span>
                                <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>{fmt(item.price)}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Favorites Tab */}
              {mode === 'favorites' && (
                <div className="animate-fade-in">
                  {favoritesLoading ? (
                    <Card style={{ padding: '2rem', textAlign: 'center' }}>
                      <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'rgb(var(--text-muted))' }} />
                      <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginTop: 8 }}>Memuat favorit...</p>
                    </Card>
                  ) : favorites.length === 0 ? (
                    <Card style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
                      <Heart size={40} style={{ color: 'rgb(var(--text-muted))', marginBottom: 12 }} />
                      <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>Belum ada resep favorit. Simpan resep dari hasil rekomendasi dengan menekan ikon hati ❤️</p>
                    </Card>
                  ) : (
                    <div className="stagger-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {favorites.map(fav => {
                        let recipe: FridgeRecipe | null = null;
                        try { recipe = JSON.parse(fav.recipeData); } catch {}
                        const savedNote = `Disimpan ${new Date(fav.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                        if (recipe) {
                          return (
                            <RecipeCard
                              key={fav.id}
                              recipe={recipe}
                              favorited
                              onToggleFavorite={() => handleRemoveFavorite(fav.id)}
                              footnote={savedNote}
                            />
                          );
                        }
                        return (
                          <Card key={fav.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700 }}>{fav.recipeName}</span>
                            <button
                              onClick={() => handleRemoveFavorite(fav.id)}
                              aria-label="Hapus dari favorit"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                            >
                              <Heart size={18} fill="rgb(var(--color-error))" color="rgb(var(--color-error))" />
                            </button>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* History Tab */}
              {mode === 'history' && (
                <div className="animate-fade-in">
                  {historyLoading ? (
                    <Card style={{ padding: '2rem', textAlign: 'center' }}>
                      <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'rgb(var(--text-muted))' }} />
                      <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginTop: 8 }}>Memuat riwayat...</p>
                    </Card>
                  ) : history.length === 0 ? (
                    <Card style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
                      <History size={40} style={{ color: 'rgb(var(--text-muted))', marginBottom: 12 }} />
                      <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>Belum ada riwayat rekomendasi. Upload foto untuk mulai!</p>
                    </Card>
                  ) : (
                    <div className="stagger-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {history.map(item => renderHistoryItem(item))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Preference editor — BottomSheet (slides up on mobile, centered modal on desktop) */}
            <BottomSheet isOpen={showPrefModal} onClose={() => setShowPrefModal(false)} title="⚙️ Preferensi Makan">
              <PreferenceForm pref={pref} onSave={handleSavePref} />
            </BottomSheet>
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes slideDown {
                from { opacity: 0; transform: translateY(-8px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.6; transform: scale(0.97); }
              }
              .animate-pulse {
                animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
              }
              .tag-chip {
                transition: all 0.2s ease;
              }
              .tag-chip:hover {
                background: rgba(var(--color-primary) / 0.15) !important;
                color: rgb(var(--color-primary)) !important;
                transform: translateY(-1px);
              }
            `}} />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
