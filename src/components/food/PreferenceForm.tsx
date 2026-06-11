'use client';

import React, { useState } from 'react';
import { Button, CurrencyInput, parseCurrency } from '@/components/ui';
import { FoodPreference } from '@/services/foodService';

const SPICY = [
  { level: 0, emoji: '🚫', label: 'Tidak Pedas' },
  { level: 1, emoji: '🌶️', label: 'Sedikit' },
  { level: 2, emoji: '🌶️🌶️', label: 'Sedang' },
  { level: 3, emoji: '🌶️🌶️🌶️', label: 'Pedas' },
];

const DIETS = [
  { value: 'none', label: 'Tanpa diet', emoji: '🍽️' },
  { value: 'vegetarian', label: 'Vegetarian', emoji: '🥬' },
  { value: 'vegan', label: 'Vegan', emoji: '🌱' },
  { value: 'halal', label: 'Halal', emoji: '☪️' },
  { value: 'no-pork', label: 'No-Pork', emoji: '🚫🐖' },
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Spicy level */}
      <div>
        <label style={labelStyle}>🔥 Level Pedas</label>
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
                <span style={{ fontSize: 18, lineHeight: 1 }}>{s.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))' }}>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Diet chips */}
      <div>
        <label style={labelStyle}>🥗 Diet</label>
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
                <span>{d.emoji}</span> {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Budget */}
      <div>
        <label style={labelStyle}>💰 Budget per makan <span style={{ fontWeight: 400, color: 'rgb(var(--text-muted))' }}>(opsional)</span></label>
        <CurrencyInput placeholder="25.000" value={avgBudget} onChange={setAvgBudget} style={{ width: '100%' }} />
      </div>

      {/* Disliked ingredients */}
      <div>
        <label style={labelStyle}>🙅 Bahan yang tidak disukai</label>
        <input
          className="input"
          placeholder="Pisahkan dengan koma: terong, petai"
          value={disliked}
          onChange={e => setDisliked(e.target.value)}
          style={{ width: '100%', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}
        />
      </div>

      <Button
        onClick={() => onSave({
          spicyLevel,
          dietType,
          avgMealBudget: avgBudget ? parseCurrency(avgBudget) : undefined,
          dislikedIngredients: disliked ? disliked.split(',').map(s => s.trim()).filter(Boolean) : [],
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
