'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, BottomSheet, useToast } from '@/components/ui';
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
  Wallet, Clock, Refrigerator, ScrollText, Sparkles,
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
  const [mode, setMode] = useState<TabMode>('fridge');
  const [pref, setPref] = useState<FoodPreference | null>(null);
  const [showPrefModal, setShowPrefModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fridgeResult, setFridgeResult] = useState<FridgeResult | null>(null);
  const [menuResult, setMenuResult] = useState<MenuResult | null>(null);
  const [menuFilter, setMenuFilter] = useState('hemat');

  // Budget integration state
  const [budgetInfo, setBudgetInfo] = useState<FoodBudgetInfo | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(true);

  // Favorites state
  const [favorites, setFavorites] = useState<FoodFavorite[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  // History state
  const [history, setHistory] = useState<FoodHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    foodService.getPreference().then(setPref).catch(() => {});
    loadBudget();
  }, []);

  const loadBudget = async () => {
    setBudgetLoading(true);
    try {
      const info = await foodService.getRemainingBudget();
      setBudgetInfo(info);
    } catch {
      // Budget not set — that's fine
      setBudgetInfo(null);
    } finally {
      setBudgetLoading(false);
    }
  };

  const loadFavorites = async () => {
    setFavoritesLoading(true);
    try {
      const favs = await foodService.getFavorites();
      setFavorites(favs);
    } catch {
      showToast('Gagal memuat favorit.', 'error');
    } finally {
      setFavoritesLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const hist = await foodService.getHistory(30);
      setHistory(hist);
    } catch {
      showToast('Gagal memuat riwayat.', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'favorites') loadFavorites();
    if (mode === 'history') loadHistory();
  }, [mode]);

  // Favorites are needed to show heart state on fridge results too
  useEffect(() => {
    if (mode === 'fridge' && favorites.length === 0) {
      foodService.getFavorites().then(setFavorites).catch(() => {});
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

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
      loadBudget();
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
        setFavorites(prev => prev.filter(f => f.id !== existing.id));
        showToast('Dihapus dari favorit.', 'info');
      } catch {
        showToast('Gagal menghapus favorit.', 'error');
      }
    } else {
      try {
        const fav = await foodService.addFavorite(recipe.name, JSON.stringify(recipe));
        setFavorites(prev => [fav, ...prev]);
        showToast('Ditambahkan ke favorit! ❤️', 'success');
      } catch {
        showToast('Gagal menyimpan favorit.', 'error');
      }
    }
  };

  const handleRemoveFavorite = async (id: string) => {
    try {
      await foodService.removeFavorite(id);
      setFavorites(prev => prev.filter(f => f.id !== id));
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

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content page-transition">
            <div className="feature-container" style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 'calc(var(--bottom-nav-height, 60px) + 16px)' }}>
              <div className="feature-header">
                <h1><UtensilsCrossed size={26} style={{ color: 'rgb(var(--color-primary))' }} /> Makan Apa</h1>
                <div className="feature-actions">
                  <Button onClick={() => setShowPrefModal(true)} variant="ghost" size="sm"><Settings2 size={15} /> Preferensi</Button>
                </div>
              </div>

              {/* Budget Card with progress ring */}
              {!budgetLoading && budgetInfo && budgetInfo.budget > 0 && (
                <Card
                  style={{
                    marginBottom: 20,
                    padding: '18px 20px',
                    background: 'linear-gradient(135deg, rgba(var(--color-primary) / 0.12), rgba(var(--color-secondary) / 0.07))',
                    border: '1px solid rgba(var(--color-primary) / 0.25)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    {budgetInfo.remaining !== null ? (
                      <BudgetRing
                        fraction={spentFraction}
                        danger={overBudget}
                        centerTop={`${remainingPct}%`}
                        centerBottom="sisa"
                      />
                    ) : (
                      <div style={{ width: 76, height: 76, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(var(--color-primary) / 0.1)', flexShrink: 0 }}>
                        <Wallet size={26} style={{ color: 'rgb(var(--color-primary))' }} />
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', fontWeight: 600, marginBottom: 2 }}>
                        Sisa budget makan bulan ini
                      </p>
                      <p style={{
                        fontSize: 'var(--font-xl, 1.5rem)',
                        fontWeight: 800,
                        lineHeight: 1.15,
                        color: overBudget ? 'rgb(var(--color-error))' : 'rgb(var(--color-primary))',
                      }}>
                        {budgetInfo.remaining !== null ? fmt(budgetInfo.remaining) : 'Tidak ada budget'}
                      </p>
                      <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                          Budget <b style={{ color: 'rgb(var(--text-secondary))' }}>{fmt(budgetInfo.budget)}</b>
                        </span>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                          Terpakai <b style={{ color: 'rgb(var(--text-secondary))' }}>{fmt(budgetInfo.spent)}</b>
                        </span>
                      </div>
                    </div>
                  </div>
                  {overBudget && budgetInfo.remaining !== null && (
                    <p style={{ marginTop: 12, fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--color-error))' }}>
                      ⚠️ Budget makanmu hampir habis, pilih menu yang lebih hemat ya!
                    </p>
                  )}
                </Card>
              )}

              {/* Segmented tab control */}
              <SegmentedTabs
                tabs={TABS}
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  if (m === 'fridge' || m === 'menu') {
                    setFridgeResult(null);
                    setMenuResult(null);
                  }
                }}
              />

              {/* Fridge/Menu mode content */}
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
                    <div className="stagger-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {history.map(item => (
                        <Card key={item.id} style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(var(--color-primary) / 0.1)', flexShrink: 0 }}>
                                <Clock size={15} style={{ color: 'rgb(var(--color-primary))' }} />
                              </div>
                              <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{item.recipeName}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              {item.budget !== null && (
                                <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--color-primary))', fontWeight: 600 }}>
                                  Budget: {fmt(item.budget)}
                                </span>
                              )}
                              <p style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>
                                {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Preference editor — BottomSheet (slides up on mobile, centered modal on desktop) */}
            <BottomSheet isOpen={showPrefModal} onClose={() => setShowPrefModal(false)} title="⚙️ Preferensi Makan">
              <PreferenceForm pref={pref} onSave={handleSavePref} />
            </BottomSheet>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
