'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, Modal, useToast, CurrencyInput, parseCurrency } from '@/components/ui';
import { foodService, FoodPreference, FridgeResult, MenuResult } from '@/services/foodService';
import { UtensilsCrossed, Camera, Loader2, ChefHat, Settings2, Flame } from 'lucide-react';

const SPICY_LABELS = ['Tidak Pedas', 'Sedikit', 'Sedang', 'Pedas'];
const DIET_OPTIONS = ['none', 'vegetarian', 'vegan', 'halal', 'no-pork'];
const FILTER_OPTIONS = [
  { label: 'Hemat', value: 'hemat' },
  { label: 'Sehat', value: 'sehat' },
  { label: 'Mengenyangkan', value: 'mengenyangkan' },
  { label: 'Tidak Pedas', value: 'tidak pedas' },
];

export default function MakanApaPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mode, setMode] = useState<'fridge' | 'menu'>('fridge');
  const [pref, setPref] = useState<FoodPreference | null>(null);
  const [showPrefModal, setShowPrefModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fridgeResult, setFridgeResult] = useState<FridgeResult | null>(null);
  const [menuResult, setMenuResult] = useState<MenuResult | null>(null);
  const [menuFilter, setMenuFilter] = useState('hemat');

  useEffect(() => {
    foodService.getPreference().then(setPref).catch(() => {});
  }, []);

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

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content page-transition">
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <div className="feature-header">
                <h1><UtensilsCrossed size={26} style={{ color: 'rgb(var(--color-primary))' }} /> Makan Apa</h1>
                <div className="feature-actions">
                  <Button onClick={() => setShowPrefModal(true)} variant="ghost" size="sm"><Settings2 size={15} /> Preferensi</Button>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="tab-bar" style={{ marginBottom: 20 }}>
                <button className={`tab-pill ${mode === 'fridge' ? 'active' : ''}`} onClick={() => { setMode('fridge'); setFridgeResult(null); setMenuResult(null); }}>📷 Foto Kulkas</button>
                <button className={`tab-pill ${mode === 'menu' ? 'active' : ''}`} onClick={() => { setMode('menu'); setFridgeResult(null); setMenuResult(null); }}>📋 Foto Menu</button>
              </div>

              {/* Filter for menu mode */}
              {mode === 'menu' && (
                <div className="filter-row" style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {FILTER_OPTIONS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setMenuFilter(f.value)}
                      className={`tag-chip ${menuFilter === f.value ? 'active' : ''}`}
                      style={{
                        cursor: 'pointer',
                        background: menuFilter === f.value ? 'rgba(var(--color-primary) / 0.1)' : 'rgb(var(--bg-elevated))',
                        border: menuFilter === f.value ? '1px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                        color: menuFilter === f.value ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
                        fontWeight: menuFilter === f.value ? 600 : 400,
                      }}
                    >{f.label}</button>
                  ))}
                </div>
              )}

              {/* Upload Area */}
              <Card style={{ textAlign: 'center', padding: '2rem', marginBottom: 20 }}>
                <Camera size={36} style={{ color: 'rgb(var(--text-muted))', marginBottom: 12 }} />
                <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: 16 }}>
                  {mode === 'fridge' ? 'Foto isi kulkasmu, AI akan rekomendasikan resep!' : 'Foto menu restoran, AI pilihkan yang terbaik!'}
                </p>
                <label style={{ cursor: 'pointer' }}>
                  <span><Button disabled={loading}>
                    {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Memproses...</> : '📸 Upload Foto'}
                  </Button></span>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </Card>

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

                  <h3 style={{ fontWeight: 700, marginBottom: 12 }}>🍳 Resep Rekomendasi</h3>
                  <div className="stagger-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {fridgeResult.recipes.map((recipe, i) => (
                      <Card key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <h4 style={{ fontWeight: 800, fontSize: 'var(--font-md)' }}><ChefHat size={16} style={{ display: 'inline', marginRight: 6 }} />{recipe.name}</h4>
                          <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--color-primary))', fontWeight: 600 }}>~{fmt(recipe.estimatedCost)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                          <span>⏱️ {recipe.cookTime}</span>
                          <span>📊 {recipe.difficulty}</span>
                          {recipe.tags.map(t => <span key={t} className="tag-chip" style={{ fontSize: '10px' }}>{t}</span>)}
                        </div>
                        <details>
                          <summary style={{ cursor: 'pointer', fontSize: 'var(--font-sm)', fontWeight: 600, color: 'rgb(var(--color-primary))' }}>Lihat langkah masak</summary>
                          <div style={{ marginTop: 10 }}>
                            <p style={{ fontSize: 'var(--font-xs)', fontWeight: 600, marginBottom: 6 }}>Bahan:</p>
                            <ul style={{ fontSize: 'var(--font-xs)', paddingLeft: 16, marginBottom: 10 }}>
                              {recipe.ingredients.map((ing, j) => <li key={j}>{ing}</li>)}
                            </ul>
                            <p style={{ fontSize: 'var(--font-xs)', fontWeight: 600, marginBottom: 6 }}>Langkah:</p>
                            <ol style={{ fontSize: 'var(--font-xs)', paddingLeft: 16 }}>
                              {recipe.steps.map((step, j) => <li key={j} style={{ marginBottom: 4 }}>{step}</li>)}
                            </ol>
                          </div>
                        </details>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Menu Results */}
              {menuResult && (
                <div className="animate-fade-in">
                  <h3 style={{ fontWeight: 700, marginBottom: 12 }}>⭐ Rekomendasi</h3>
                  <div className="stagger-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {menuResult.recommendations.map((rec, i) => (
                      <Card key={i} style={{ borderLeft: '4px solid rgb(var(--color-primary))' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <h4 style={{ fontWeight: 700 }}>{rec.name}</h4>
                          <span style={{ fontWeight: 700, color: 'rgb(var(--color-primary))' }}>{fmt(rec.price)}</span>
                        </div>
                        <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', marginBottom: 6 }}>{rec.reason}</p>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {rec.tags.map(t => <span key={t} className="tag-chip" style={{ fontSize: '10px' }}>{t}</span>)}
                        </div>
                      </Card>
                    ))}
                  </div>

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
            </div>

            {/* Preference Modal */}
            <Modal isOpen={showPrefModal} onClose={() => setShowPrefModal(false)} title="⚙️ Preferensi Makan">
              <PrefForm pref={pref} onSave={handleSavePref} />
            </Modal>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

function PrefForm({ pref, onSave }: { pref: FoodPreference | null; onSave: (data: Partial<FoodPreference>) => void }) {
  const [spicyLevel, setSpicyLevel] = useState(pref?.spicyLevel ?? 1);
  const [dietType, setDietType] = useState(pref?.dietType ?? 'none');
  const [avgBudget, setAvgBudget] = useState(pref?.avgMealBudget ? new Intl.NumberFormat('id-ID').format(pref.avgMealBudget) : '');
  const [disliked, setDisliked] = useState(pref?.dislikedIngredients?.join(', ') ?? '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Level Pedas</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {SPICY_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => setSpicyLevel(i)}
              style={{
                padding: '6px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                border: spicyLevel === i ? '2px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                background: spicyLevel === i ? 'rgba(var(--color-primary) / 0.1)' : 'rgb(var(--bg-surface))',
                fontSize: 'var(--font-xs)', fontFamily: 'inherit',
                color: 'rgb(var(--text-primary))',
              }}
            >{'🌶️'.repeat(i) || '🚫'} {label}</button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, display: 'block', marginBottom: 8 }}>Diet</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {DIET_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => setDietType(d)}
              style={{
                padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: dietType === d ? 600 : 400,
                background: dietType === d ? 'rgba(var(--color-primary), 0.1)' : 'var(--input-bg)',
                color: dietType === d ? 'rgb(var(--color-primary))' : 'inherit',
                outline: dietType === d ? '2px solid rgb(var(--color-primary))' : 'none',
                outlineOffset: -1, transition: 'all 0.2s', fontFamily: 'inherit',
              }}
            >{d === 'none' ? '🍽️ Tanpa diet' : d === 'vegetarian' ? '🥬 Vegetarian' : d === 'vegan' ? '🌱 Vegan' : d === 'halal' ? '☪️ Halal' : '🚫 No-Pork'}</button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Budget per makan (opsional)</label>
        <CurrencyInput placeholder="25.000" value={avgBudget} onChange={setAvgBudget} style={{ width: '100%' }} />
      </div>
      <div>
        <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Bahan yang tidak disukai</label>
        <input className="input" placeholder="Pisahkan dengan koma: terong, petai" value={disliked} onChange={e => setDisliked(e.target.value)} style={{ width: '100%', borderRadius: 10, padding: '10px 14px' }} />
      </div>
      <Button onClick={() => onSave({
        spicyLevel,
        dietType,
        avgMealBudget: avgBudget ? parseCurrency(avgBudget) : undefined,
        dislikedIngredients: disliked ? disliked.split(',').map(s => s.trim()).filter(Boolean) : [],
      })} style={{ width: '100%' }}>Simpan</Button>
    </div>
  );
}
