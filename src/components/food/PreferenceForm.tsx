'use client';

import React, { useState } from 'react';
import { Button, CurrencyInput, parseCurrency, TextInput } from '@/components/ui';
import { FoodPreference } from '@/services/foodService';

const SPICY = [
  { level: 0, label: 'Tidak Pedas' },
  { level: 1, label: 'Sedikit' },
  { level: 2, label: 'Sedang' },
  { level: 3, label: 'Pedas' },
];

const DIETS = [
  { value: 'none', label: 'Tanpa diet' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'halal', label: 'Halal' },
  { value: 'no-pork', label: 'No-Pork' },
];

const HEALTH_GOALS = [
  { value: 'lose_weight', label: 'Turun berat badan' },
  { value: 'gain_weight', label: 'Naik berat badan' },
  { value: 'build_muscle', label: 'Bangun otot' },
  { value: 'eat_healthier', label: 'Makan lebih sehat' },
  { value: 'save_money', label: 'Hemat budget' },
  { value: 'more_energy', label: 'Lebih berenergi' },
];

interface PreferenceFormProps {
  pref: FoodPreference | null;
  onSave: (data: Partial<FoodPreference>) => void;
}

export function PreferenceForm({ pref, onSave }: PreferenceFormProps) {
  const [spicyLevel, setSpicyLevel] = useState(pref?.spicyLevel ?? 1);
  const [dietType, setDietType] = useState(pref?.dietType ?? 'none');
  const [avgBudget, setAvgBudget] = useState(
    pref?.avgMealBudget ? new Intl.NumberFormat('id-ID').format(pref.avgMealBudget) : ''
  );
  const [disliked, setDisliked] = useState(pref?.dislikedIngredients?.join(', ') ?? '');
  const [allergies, setAllergies] = useState(pref?.allergies?.join(', ') ?? '');
  const [calorieLimit, setCalorieLimit] = useState(pref?.calorieLimit?.toString() ?? '');
  const [proteinTarget, setProteinTarget] = useState(pref?.proteinTarget?.toString() ?? '');
  const [healthGoals, setHealthGoals] = useState<string[]>(pref?.healthGoals ?? []);
  const [breakfastHabit, setBreakfastHabit] = useState(pref?.breakfastHabit ?? '');
  const [lunchHabit, setLunchHabit] = useState(pref?.lunchHabit ?? '');
  const [dinnerHabit, setDinnerHabit] = useState(pref?.dinnerHabit ?? '');
  const [snackHabit, setSnackHabit] = useState(pref?.snackHabit ?? '');

  const toggleGoal = (goal: string) => {
    setHealthGoals(prev => prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Spicy level */}
      <div>
        <label style={labelStyle}>Level Pedas</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {SPICY.map(s => {
            const active = spicyLevel === s.level;
            return (
              <button
                key={s.level}
                type="button"
                onClick={() => setSpicyLevel(s.level)}
                aria-pressed={active}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '10px 4px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  border: active ? '2px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                  background: active ? 'rgba(var(--color-primary) / 0.1)' : 'rgb(var(--bg-elevated))',
                  transition: 'all 0.18s ease',
                  transform: active ? 'translateY(-2px)' : 'none',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))' }}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Diet chips */}
      <div>
        <label style={labelStyle}>Diet</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {DIETS.map(d => {
            const active = dietType === d.value;
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => setDietType(d.value)}
                aria-pressed={active}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  border: active ? '1px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                  background: active ? 'rgba(var(--color-primary) / 0.1)' : 'rgb(var(--bg-elevated))',
                  color: active ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
                  transition: 'all 0.18s ease',
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Budget */}
      <div>
        <label style={labelStyle}>Budget per makan <span style={{ fontWeight: 400, color: 'rgb(var(--text-muted))' }}>(opsional)</span></label>
        <CurrencyInput placeholder="25.000" value={avgBudget} onChange={setAvgBudget} style={{ width: '100%' }} />
      </div>

      {/* Health Goals */}
      <div>
        <label style={labelStyle}>Tujuan Kesehatan <span style={{ fontWeight: 400, color: 'rgb(var(--text-muted))' }}>(pilih sesuai kamu)</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {HEALTH_GOALS.map(g => {
            const active = healthGoals.includes(g.value);
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => toggleGoal(g.value)}
                aria-pressed={active}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '8px 14px',
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  border: active ? '1px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
                  background: active ? 'rgba(var(--color-primary) / 0.1)' : 'rgb(var(--bg-elevated))',
                  color: active ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
                  transition: 'all 0.18s ease',
                }}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calorie & Protein targets (side by side) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Batas Kalori/hari <span style={{ fontWeight: 400, color: 'rgb(var(--text-muted))' }}>(opsional)</span></label>
          <TextInput placeholder="2000" value={calorieLimit} onChange={setCalorieLimit} />
          <span style={hintStyle}>kkal</span>
        </div>
        <div>
          <label style={labelStyle}>Target Protein/hari <span style={{ fontWeight: 400, color: 'rgb(var(--text-muted))' }}>(opsional)</span></label>
          <TextInput placeholder="60" value={proteinTarget} onChange={setProteinTarget} />
          <span style={hintStyle}>gram</span>
        </div>
      </div>

      {/* Allergies */}
      <div>
        <label style={labelStyle}>Alergi Makanan</label>
        <TextInput placeholder="Pisahkan dengan koma: kacang, seafood, gluten" value={allergies} onChange={setAllergies} />
      </div>

      {/* Disliked ingredients */}
      <div>
        <label style={labelStyle}>Bahan yang Tidak Disukai</label>
        <TextInput placeholder="Pisahkan dengan koma: terong, petai" value={disliked} onChange={setDisliked} />
      </div>

      {/* Eating Habits */}
      <div>
        <label style={labelStyle}>Kebiasaan Makan <span style={{ fontWeight: 400, color: 'rgb(var(--text-muted))' }}>(opsional, bantu AI lebih personal)</span></label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={subLabelStyle}>Sarapan</label>
            <TextInput placeholder="Contoh: nasi goreng, roti bakar, atau skip sarapan" value={breakfastHabit} onChange={setBreakfastHabit} />
          </div>
          <div>
            <label style={subLabelStyle}>Makan Siang</label>
            <TextInput placeholder="Contoh: nasi warteg, beli di kantin" value={lunchHabit} onChange={setLunchHabit} />
          </div>
          <div>
            <label style={subLabelStyle}>Makan Malam</label>
            <TextInput placeholder="Contoh: mie instan, masak sendiri" value={dinnerHabit} onChange={setDinnerHabit} />
          </div>
          <div>
            <label style={subLabelStyle}>Camilan</label>
            <TextInput placeholder="Contoh: keripik, buah, kopi" value={snackHabit} onChange={setSnackHabit} />
          </div>
        </div>
      </div>

      <Button
        onClick={() => onSave({
          spicyLevel,
          dietType,
          avgMealBudget: avgBudget ? parseCurrency(avgBudget) : undefined,
          dislikedIngredients: disliked ? disliked.split(',').map(s => s.trim()).filter(Boolean) : [],
          allergies: allergies ? allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
          calorieLimit: calorieLimit ? parseInt(calorieLimit) : undefined,
          proteinTarget: proteinTarget ? parseInt(proteinTarget) : undefined,
          healthGoals,
          breakfastHabit: breakfastHabit || undefined,
          lunchHabit: lunchHabit || undefined,
          dinnerHabit: dinnerHabit || undefined,
          snackHabit: snackHabit || undefined,
        })}
        style={{ width: '100%', justifyContent: 'center' }}
        size="lg"
      >
        Simpan Preferensi
      </Button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--font-sm)',
  fontWeight: 700,
  display: 'block',
  marginBottom: 10,
};

const subLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  display: 'block',
  marginBottom: 4,
  color: 'rgb(var(--text-muted))',
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'rgb(var(--text-muted))',
  marginTop: 2,
};
