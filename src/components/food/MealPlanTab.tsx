'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Button, Modal, useToast, TextInput, SelectOption } from '@/components/ui';
import { useAiJob } from '@/lib/useAiJob';
import {
  foodService,
  MealPlanResult,
  MealPlanDay,
  SavedMealPlan,
  MealPlanEntry,
  UserMealCatalogItem,
} from '@/services/foodService';
import {
  CalendarDays, Sparkles, Check, X, Plus, Trash2, ChevronLeft, ChevronRight,
  UtensilsCrossed, Coffee, Sun, Moon, SkipForward, Loader2, Edit2, MapPin, Tag,
} from 'lucide-react';

const DAY_LABELS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const MEAL_TYPES = [
  { value: 'breakfast', label: 'Sarapan', icon: Coffee, color: 'var(--color-info)' },
  { value: 'lunch', label: 'Makan Siang', icon: Sun, color: 'var(--color-warning)' },
  { value: 'dinner', label: 'Makan Malam', icon: Moon, color: 'var(--color-primary)' },
];

function fmt(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function getWeekStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

interface MealPlanTabProps {
  loading: boolean;
}

export function MealPlanTab({ loading: externalLoading }: MealPlanTabProps) {
  const { showToast } = useToast();

  // States
  const [mealPlanResult, setMealPlanResult] = useState<MealPlanResult | null>(null);
  const [savedPlan, setSavedPlan] = useState<SavedMealPlan | null>(null);
  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [catalog, setCatalog] = useState<UserMealCatalogItem[]>([]);
  const [selectedDay, setSelectedDay] = useState(0); // 0-6 index
  const [view, setView] = useState<'calendar' | 'catalog'>('calendar');
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<UserMealCatalogItem | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add meal form
  const [newMealName, setNewMealName] = useState('');
  const [newMealType, setNewMealType] = useState('lunch');
  const [newMealPrice, setNewMealPrice] = useState('');
  const [newMealCalories, setNewMealCalories] = useState('');
  const [newMealProtein, setNewMealProtein] = useState('');
  const [newMealSource, setNewMealSource] = useState('');
  const [newMealTags, setNewMealTags] = useState('');

  // AI Job
  const mealPlanJob = useAiJob<MealPlanResult>('food_meal_plan', {
    onComplete: (result) => {
      setMealPlanResult(result);
      // Auto-save when generated
      handleSavePlan(result);
    },
    onError: (err) => showToast(err || 'Gagal membuat meal plan.', 'error'),
  });

  const loading = externalLoading || mealPlanJob.isProcessing;

  // Load active plan + catalog on mount
  useEffect(() => {
    Promise.all([
      foodService.getActiveMealPlan().then(plan => {
        if (plan) {
          setSavedPlan(plan);
          setEntries(plan.entries || []);
          try { setMealPlanResult(JSON.parse(plan.planData)); } catch {}
        }
      }).catch(() => {}),
      foodService.getMealCatalog().then(setCatalog).catch(() => {}),
    ]).finally(() => setCatalogLoading(false));
  }, []);

  // Set today as default selected day
  useEffect(() => {
    const today = new Date().getDay();
    // Convert Sunday=0 to index 6, Monday=1 to index 0, etc.
    setSelectedDay(today === 0 ? 6 : today - 1);
  }, []);

  const handleGenerateMealPlan = async () => {
    if (loading) return;
    if (catalog.length === 0) {
      showToast('Tambahkan minimal beberapa makanan ke catalog dulu ya! AI butuh tahu makanan apa yang biasa kamu makan.', 'error');
      setView('catalog');
      return;
    }
    setMealPlanResult(null);
    try {
      await mealPlanJob.trigger(() => foodService.generateMealPlan(7));
    } catch (e: any) {
      showToast(e.message || 'Gagal membuat meal plan.', 'error');
    }
  };

  const handleSavePlan = async (plan: MealPlanResult) => {
    setSaving(true);
    try {
      const weekStart = getWeekStart();
      const saved = await foodService.saveMealPlan(JSON.stringify(plan), weekStart);
      setSavedPlan(saved);
      setEntries(saved.entries || []);
    } catch {}
    finally { setSaving(false); }
  };

  const handleToggleMeal = async (day: number, mealType: string, completed: boolean) => {
    if (!savedPlan) return;
    // Optimistic update
    setEntries(prev => prev.map(e =>
      e.day === day && e.mealType === mealType
        ? { ...e, completed, completedAt: completed ? new Date().toISOString() : null }
        : e
    ));
    try {
      await foodService.updateMealEntry({ planId: savedPlan.id, day, mealType, completed });
    } catch {
      // Revert
      setEntries(prev => prev.map(e =>
        e.day === day && e.mealType === mealType
          ? { ...e, completed: !completed, completedAt: null }
          : e
      ));
    }
  };

  const handleSkipMeal = async (day: number, mealType: string) => {
    if (!savedPlan) return;
    setEntries(prev => prev.map(e =>
      e.day === day && e.mealType === mealType ? { ...e, skipped: true } : e
    ));
    try {
      await foodService.updateMealEntry({ planId: savedPlan.id, day, mealType, skipped: true });
    } catch {}
  };

  // Catalog CRUD
  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMealName.trim() || !newMealPrice) return;
    try {
      const meal = await foodService.addMealToCatalog({
        name: newMealName.trim(),
        mealType: newMealType,
        price: Number(newMealPrice),
        calories: newMealCalories ? Number(newMealCalories) : undefined,
        protein: newMealProtein ? Number(newMealProtein) : undefined,
        source: newMealSource.trim() || undefined,
        tags: newMealTags ? newMealTags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      });
      setCatalog(prev => [meal, ...prev]);
      resetMealForm();
      setShowAddMealModal(false);
      showToast('Makanan ditambahkan! 🍽️', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan.', 'error');
    }
  };

  const handleUpdateMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeal || !newMealName.trim() || !newMealPrice) return;
    try {
      const updated = await foodService.updateCatalogMeal(editingMeal.id, {
        name: newMealName.trim(),
        mealType: newMealType,
        price: Number(newMealPrice),
        calories: newMealCalories ? Number(newMealCalories) : null,
        protein: newMealProtein ? Number(newMealProtein) : null,
        source: newMealSource.trim() || null,
        tags: newMealTags ? newMealTags.split(',').map(t => t.trim()).filter(Boolean) : [],
      } as any);
      setCatalog(prev => prev.map(m => m.id === editingMeal.id ? updated : m));
      resetMealForm();
      setEditingMeal(null);
      showToast('Makanan diupdate! ✅', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal update.', 'error');
    }
  };

  const handleDeleteMeal = async (id: string) => {
    try {
      await foodService.deleteCatalogMeal(id);
      setCatalog(prev => prev.filter(m => m.id !== id));
      showToast('Dihapus.', 'success');
    } catch {}
  };

  const openEditMeal = (meal: UserMealCatalogItem) => {
    setNewMealName(meal.name);
    setNewMealType(meal.mealType);
    setNewMealPrice(String(meal.price));
    setNewMealCalories(meal.calories ? String(meal.calories) : '');
    setNewMealProtein(meal.protein ? String(meal.protein) : '');
    setNewMealSource(meal.source || '');
    setNewMealTags(meal.tags.join(', '));
    setEditingMeal(meal);
  };

  const resetMealForm = () => {
    setNewMealName('');
    setNewMealType('lunch');
    setNewMealPrice('');
    setNewMealCalories('');
    setNewMealProtein('');
    setNewMealSource('');
    setNewMealTags('');
  };

  // Computed
  const todayMeals = useMemo(() => {
    if (!mealPlanResult?.days) return null;
    return mealPlanResult.days[selectedDay] || null;
  }, [mealPlanResult, selectedDay]);

  const completionStats = useMemo(() => {
    if (!entries.length) return { completed: 0, total: 0, percentage: 0 };
    const total = entries.filter(e => !e.skipped).length;
    const completed = entries.filter(e => e.completed).length;
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [entries]);

  const getEntryStatus = (day: number, mealType: string) => {
    return entries.find(e => e.day === day && e.mealType === mealType);
  };

  // ─── RENDER ───

  if (catalogLoading) {
    return (
      <Card style={{ padding: '2rem', textAlign: 'center' }}>
        <Loader2 size={24} className="spin" style={{ color: 'rgb(var(--color-primary))' }} />
      </Card>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* View Toggle */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setView('calendar')} style={{
          flex: 1, padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
          background: view === 'calendar' ? 'rgba(var(--color-primary) / 0.08)' : 'rgb(var(--bg-surface))',
          color: view === 'calendar' ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
          fontWeight: view === 'calendar' ? 700 : 500, fontSize: 'var(--font-sm)', fontFamily: 'inherit', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <CalendarDays size={14} /> Meal Plan
        </button>
        <button onClick={() => setView('catalog')} style={{
          flex: 1, padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
          background: view === 'catalog' ? 'rgba(var(--color-primary) / 0.08)' : 'rgb(var(--bg-surface))',
          color: view === 'catalog' ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
          fontWeight: view === 'catalog' ? 700 : 500, fontSize: 'var(--font-sm)', fontFamily: 'inherit', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <UtensilsCrossed size={14} /> Makanan Saya ({catalog.length})
        </button>
      </div>

      {/* ═══ CALENDAR VIEW ═══ */}
      {view === 'calendar' && (
        <>
          {/* No plan yet */}
          {!mealPlanResult && !loading && (
            <Card style={{ padding: '2rem', textAlign: 'center' }}>
              <CalendarDays size={40} style={{ color: 'rgb(var(--color-primary))', marginBottom: 12 }} />
              <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 'var(--font-md)' }}>Meal Plan Pintar</h3>
              <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: 4, maxWidth: 380, margin: '0 auto 4px' }}>
                AI akan susun jadwal makan seminggu dari <strong>makanan yang kamu biasa makan</strong>.
              </p>
              <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginBottom: 16, maxWidth: 380, margin: '0 auto 16px' }}>
                {catalog.length === 0
                  ? '⚠️ Tambahkan dulu makanan-makanan yang biasa kamu makan di tab "Makanan Saya"'
                  : `✅ ${catalog.length} makanan di catalog — siap generate!`}
              </p>
              <Button onClick={handleGenerateMealPlan} disabled={catalog.length === 0} style={{ borderRadius: 'var(--radius-md)', padding: '12px 24px', fontWeight: 700 }}>
                <Sparkles size={16} /> Generate Meal Plan
              </Button>
            </Card>
          )}

          {/* Loading */}
          {loading && (
            <Card className="animate-pulse" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(var(--color-primary) / 0.08), rgba(var(--color-secondary) / 0.05))', border: '1px dashed rgb(var(--color-primary))', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, borderRadius: 'var(--radius-lg)' }}>
              <Sparkles size={24} style={{ color: 'rgb(var(--color-primary))', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))' }}>AI lagi nyusun jadwal makan dari makanan favoritmu... 🗓️</p>
            </Card>
          )}

          {/* Plan Results */}
          {!loading && mealPlanResult && mealPlanResult.days?.length > 0 && (
            <>
              {/* Progress Bar */}
              {entries.length > 0 && (
                <Card style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-secondary))' }}>Progress Minggu Ini</span>
                    <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--color-primary))' }}>{completionStats.completed}/{completionStats.total} ({completionStats.percentage}%)</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--border-default)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${completionStats.percentage}%`, background: 'rgb(var(--color-primary))', borderRadius: 3, transition: 'width 0.3s ease' }} />
                  </div>
                </Card>
              )}

              {/* Day Selector (Calendar Strip) */}
              <div style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none', padding: '2px 0' }}>
                {DAY_LABELS.map((label, i) => {
                  const dayData = mealPlanResult.days[i];
                  const dayEntries = entries.filter(e => e.day === i + 1);
                  const allDone = dayEntries.length > 0 && dayEntries.every(e => e.completed || e.skipped);
                  const isToday = i === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
                  return (
                    <button key={i} onClick={() => setSelectedDay(i)} style={{
                      flex: '1 0 0', minWidth: 44, padding: '8px 4px', borderRadius: 'var(--radius-md)',
                      border: selectedDay === i ? '2px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                      background: selectedDay === i ? 'rgba(var(--color-primary) / 0.08)' : allDone ? 'rgba(var(--color-success) / 0.05)' : 'rgb(var(--bg-surface))',
                      cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      position: 'relative',
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: selectedDay === i ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))' }}>
                        {label.slice(0, 3)}
                      </span>
                      {isToday && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgb(var(--color-primary))' }} />}
                      {allDone && <Check size={10} style={{ color: 'rgb(var(--color-success))' }} />}
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Detail */}
              {todayMeals && (
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Day Header */}
                  <div style={{ padding: '12px 16px', background: 'rgba(var(--color-primary) / 0.04)', borderBottom: '1px solid var(--border-default)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontWeight: 800, fontSize: 'var(--font-sm)', margin: 0 }}>
                          {todayMeals.dayLabel || DAY_LABELS[selectedDay]}
                        </h4>
                        {todayMeals.dayTheme && (
                          <span style={{ fontSize: '10px', color: 'rgb(var(--color-primary))', fontWeight: 600 }}>{todayMeals.dayTheme}</span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {todayMeals.totalCalories && <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>{todayMeals.totalCalories} kkal</span>}
                        <div style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--color-primary))' }}>
                          {fmt(todayMeals.meals.reduce((sum, m) => sum + m.estimatedCost, 0))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Meals */}
                  <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {todayMeals.meals.map((meal, mi) => {
                      const entry = getEntryStatus(selectedDay + 1, meal.type);
                      const mealConfig = MEAL_TYPES.find(m => m.value === meal.type);
                      const Icon = mealConfig?.icon || Sun;
                      const isDone = entry?.completed;
                      const isSkipped = entry?.skipped;

                      return (
                        <div key={mi} style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                          borderBottom: mi < todayMeals.meals.length - 1 ? '1px solid var(--border-default)' : 'none',
                          opacity: isSkipped ? 0.4 : 1, textDecoration: isSkipped ? 'line-through' : 'none',
                        }}>
                          {/* Check button */}
                          <button
                            onClick={() => !isSkipped && handleToggleMeal(selectedDay + 1, meal.type, !isDone)}
                            style={{
                              width: 32, height: 32, borderRadius: '50%', border: `2px solid ${isDone ? 'rgb(var(--color-success))' : 'var(--border-default)'}`,
                              background: isDone ? 'rgba(var(--color-success) / 0.1)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                            }}
                          >
                            {isDone && <Check size={14} style={{ color: 'rgb(var(--color-success))' }} />}
                          </button>

                          {/* Meal info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <Icon size={12} style={{ color: `rgb(${mealConfig?.color})` }} />
                              <span style={{ fontSize: '10px', fontWeight: 700, color: `rgb(${mealConfig?.color})`, textTransform: 'uppercase' }}>
                                {mealConfig?.label}
                              </span>
                            </div>
                            <h5 style={{ fontWeight: 700, fontSize: 'var(--font-sm)', margin: 0, lineHeight: 1.3 }}>{meal.name}</h5>
                            {meal.source && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                <MapPin size={9} style={{ color: 'rgb(var(--text-muted))' }} />
                                <span style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>{meal.source}</span>
                              </div>
                            )}
                            {meal.healthNote && (
                              <p style={{ fontSize: '10px', color: 'rgb(var(--color-success))', margin: '2px 0 0', fontStyle: 'italic' }}>{meal.healthNote}</p>
                            )}
                            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                              {meal.calories && <span style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>{meal.calories} kkal</span>}
                              {meal.protein && <span style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>{meal.protein}g protein</span>}
                            </div>
                          </div>

                          {/* Price + Skip */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                            <span style={{ fontWeight: 800, fontSize: 'var(--font-sm)', color: 'rgb(var(--color-primary))' }}>{fmt(meal.estimatedCost)}</span>
                            {!isDone && !isSkipped && (
                              <button onClick={() => handleSkipMeal(selectedDay + 1, meal.type)} title="Skip" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: 2 }}>
                                <SkipForward size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Summary */}
              <Card style={{ padding: '12px 16px', background: 'linear-gradient(135deg, rgba(var(--color-primary) / 0.04), rgba(var(--color-secondary) / 0.02))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-secondary))' }}>Total Minggu</span>
                  <span style={{ fontSize: 'var(--font-sm)', fontWeight: 800, color: 'rgb(var(--color-primary))' }}>{fmt(mealPlanResult.totalEstimatedCost || 0)}</span>
                </div>
                <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', margin: '4px 0 0' }}>
                  ~{fmt(mealPlanResult.dailyBudget || 0)}/hari
                  {mealPlanResult.dailyCalorieTarget ? ` · ${mealPlanResult.dailyCalorieTarget} kkal/hari` : ''}
                </p>
              </Card>

              {/* Regenerate */}
              <div style={{ textAlign: 'center' }}>
                <Button onClick={handleGenerateMealPlan} variant="outline" size="sm" style={{ borderRadius: 'var(--radius-md)' }}>
                  <Sparkles size={14} /> Generate Ulang
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {/* ═══ CATALOG VIEW ═══ */}
      {view === 'catalog' && (
        <>
          <Card style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: 'var(--font-sm)', margin: 0 }}>Daftar Makanan Kamu</h4>
                <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', margin: '2px 0 0' }}>
                  Makanan yang biasa kamu makan + harga aslinya. AI akan pakai ini untuk bikin meal plan.
                </p>
              </div>
              <Button size="sm" onClick={() => { resetMealForm(); setShowAddMealModal(true); }} leftIcon={<Plus size={12} />}>
                Tambah
              </Button>
            </div>
          </Card>

          {catalog.length === 0 ? (
            <Card style={{ padding: '2rem', textAlign: 'center' }}>
              <UtensilsCrossed size={32} style={{ color: 'rgb(var(--text-muted))', marginBottom: 8 }} />
              <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', marginBottom: 12 }}>
                Belum ada makanan. Tambahkan makanan yang biasa kamu beli/makan!
              </p>
              <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                Contoh: "Nasi Padang — Rp 20.000 — Kantin Kantor"
              </p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MEAL_TYPES.map(mt => {
                const items = catalog.filter(m => m.mealType === mt.value);
                if (items.length === 0) return null;
                const Icon = mt.icon;
                return (
                  <div key={mt.value}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, paddingLeft: 4 }}>
                      <Icon size={12} style={{ color: `rgb(${mt.color})` }} />
                      <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: `rgb(${mt.color})`, textTransform: 'uppercase' }}>{mt.label}</span>
                      <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>({items.length})</span>
                    </div>
                    {items.map(meal => (
                      <Card key={meal.id} style={{ padding: '10px 14px', marginBottom: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h5 style={{ fontWeight: 700, fontSize: 'var(--font-sm)', margin: 0 }}>{meal.name}</h5>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--color-primary))' }}>{fmt(meal.price)}</span>
                              {meal.source && <span style={{ fontSize: '10px', color: 'rgb(var(--text-muted))', display: 'flex', alignItems: 'center', gap: 2 }}><MapPin size={9} />{meal.source}</span>}
                              {meal.calories && <span style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>{meal.calories} kkal</span>}
                              {meal.tags.length > 0 && meal.tags.map(t => (
                                <span key={t} style={{ fontSize: '9px', padding: '1px 5px', borderRadius: 999, background: 'rgba(var(--color-primary) / 0.06)', color: 'rgb(var(--color-primary))', fontWeight: 600 }}>{t}</span>
                              ))}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button onClick={() => openEditMeal(meal)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: 4 }}><Edit2 size={13} /></button>
                            <button onClick={() => handleDeleteMeal(meal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-danger))', padding: 4 }}><Trash2 size={13} /></button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                );
              })}
              {/* Show uncategorized (snack etc) */}
              {catalog.filter(m => !MEAL_TYPES.some(mt => mt.value === m.mealType)).length > 0 && (
                <div>
                  <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--text-muted))', paddingLeft: 4 }}>Lainnya</span>
                  {catalog.filter(m => !MEAL_TYPES.some(mt => mt.value === m.mealType)).map(meal => (
                    <Card key={meal.id} style={{ padding: '10px 14px', marginTop: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h5 style={{ fontWeight: 700, fontSize: 'var(--font-sm)', margin: 0 }}>{meal.name}</h5>
                          <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'rgb(var(--color-primary))' }}>{fmt(meal.price)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => openEditMeal(meal)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: 4 }}><Edit2 size={13} /></button>
                          <button onClick={() => handleDeleteMeal(meal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--color-danger))', padding: 4 }}><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Meal Modal */}
      <Modal isOpen={showAddMealModal || !!editingMeal} onClose={() => { setShowAddMealModal(false); setEditingMeal(null); resetMealForm(); }} title={editingMeal ? 'Edit Item' : 'Tambah Item'}>
        <form onSubmit={editingMeal ? handleUpdateMeal : handleAddMeal} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <TextInput label="Nama Makanan/Minuman" value={newMealName} onChange={setNewMealName} placeholder="Nasi Padang, Es Teh, Kopi Susu, dll." required autoFocus />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <SelectOption label="Waktu Makan" value={newMealType} onChange={setNewMealType} options={[
              { value: 'breakfast', label: '☀️ Sarapan' },
              { value: 'lunch', label: '🌤️ Makan Siang' },
              { value: 'dinner', label: '🌙 Makan Malam' },
              { value: 'snack', label: '🍿 Camilan' },
              { value: 'drink', label: '🥤 Minuman' },
            ]} />
            <TextInput label="Harga" value={newMealPrice} onChange={(v) => setNewMealPrice(v.replace(/[^0-9]/g, ''))} placeholder="20000" required leftIcon={<span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgb(var(--text-muted))' }}>Rp</span>} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <TextInput label="Kalori (opsional)" value={newMealCalories} onChange={setNewMealCalories} placeholder="500" />
            <TextInput label="Protein gram (opsional)" value={newMealProtein} onChange={setNewMealProtein} placeholder="20" />
          </div>
          <TextInput label="Beli dimana? (opsional)" value={newMealSource} onChange={setNewMealSource} placeholder="Kantin kantor, warteg depan kos..." leftIcon={<MapPin size={14} />} />
          <TextInput label="Tags (pisah koma)" value={newMealTags} onChange={setNewMealTags} placeholder="enak, berat, hemat, sehat" leftIcon={<Tag size={14} />} />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAddMealModal(false); setEditingMeal(null); resetMealForm(); }}>Batal</Button>
            <Button type="submit" size="sm">{editingMeal ? 'Simpan' : 'Tambah'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
