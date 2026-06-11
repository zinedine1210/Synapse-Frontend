'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui';
import { Heart, Clock, Gauge, Wallet, ChevronDown, ChefHat } from 'lucide-react';
import { FridgeRecipe } from '@/services/foodService';

interface RecipeCardProps {
  recipe: FridgeRecipe;
  favorited: boolean;
  onToggleFavorite: () => void;
  /** Optional footer note, e.g. saved date on the favorites tab */
  footnote?: string;
}

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

function difficultyColor(difficulty: string): string {
  const d = (difficulty || '').toLowerCase();
  if (d.includes('mudah') || d.includes('easy')) return 'var(--color-success)';
  if (d.includes('sulit') || d.includes('hard') || d.includes('susah')) return 'var(--color-error)';
  return 'var(--color-warning)';
}

/**
 * Appetizing, scannable recipe card with cost, cook time, difficulty,
 * tags, a favorite heart toggle, and expandable ingredients + steps.
 */
export function RecipeCard({ recipe, favorited, onToggleFavorite, footnote }: RecipeCardProps) {
  const [open, setOpen] = useState(false);
  const diffColor = difficultyColor(recipe.difficulty);

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {/* Appetising header band */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '14px 16px',
          background: 'linear-gradient(135deg, rgba(var(--color-primary) / 0.10), rgba(var(--color-secondary) / 0.06))',
        }}
      >
        <div
          aria-hidden
          style={{
            width: 42,
            height: 42,
            flexShrink: 0,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
            color: 'rgb(var(--bg-base))',
          }}
        >
          <ChefHat size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontWeight: 800, fontSize: 'var(--font-md)', lineHeight: 1.25 }}>{recipe.name}</h4>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 'var(--font-sm)', fontWeight: 700, color: 'rgb(var(--color-primary))' }}>
            <Wallet size={13} /> ~{fmt(recipe.estimatedCost)}
          </span>
        </div>
        <button
          onClick={onToggleFavorite}
          aria-label={favorited ? 'Hapus dari favorit' : 'Simpan ke favorit'}
          aria-pressed={favorited}
          title={favorited ? 'Hapus dari favorit' : 'Simpan ke favorit'}
          style={{
            background: favorited ? 'rgba(var(--color-error) / 0.12)' : 'rgb(var(--bg-surface))',
            border: '1px solid var(--border-default)',
            borderRadius: '50%',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background 0.2s ease, transform 0.15s ease',
          }}
        >
          <Heart
            size={18}
            fill={favorited ? 'rgb(var(--color-error))' : 'none'}
            color={favorited ? 'rgb(var(--color-error))' : 'rgb(var(--text-muted))'}
          />
        </button>
      </div>

      <div style={{ padding: '12px 16px 14px' }}>
        {/* Meta chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          <span style={metaChip}>
            <Clock size={12} /> {recipe.cookTime}
          </span>
          <span style={{ ...metaChip, color: `rgb(${diffColor})`, background: `rgba(${diffColor} / 0.12)`, borderColor: `rgba(${diffColor} / 0.3)` }}>
            <Gauge size={12} /> {recipe.difficulty}
          </span>
          {recipe.tags?.map(t => (
            <span key={t} style={metaChip}>#{t}</span>
          ))}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            background: 'rgb(var(--bg-elevated))',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 'var(--font-sm)',
            fontWeight: 700,
            color: 'rgb(var(--color-primary))',
          }}
        >
          {open ? 'Sembunyikan resep' : 'Lihat cara masak'}
          <ChevronDown
            size={16}
            style={{ transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        {open && (
          <div style={{ marginTop: 12 }}>
            {recipe.ingredients?.length > 0 && (
              <>
                <p style={sectionLabel}>🧺 Bahan</p>
                <ul style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', paddingLeft: 18, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {recipe.ingredients.map((ing, j) => <li key={j}>{ing}</li>)}
                </ul>
              </>
            )}
            {recipe.steps?.length > 0 && (
              <>
                <p style={sectionLabel}>👩‍🍳 Langkah</p>
                <ol style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {recipe.steps.map((step, j) => <li key={j}>{step}</li>)}
                </ol>
              </>
            )}
          </div>
        )}

        {footnote && (
          <p style={{ fontSize: '11px', color: 'rgb(var(--text-muted))', marginTop: 10 }}>{footnote}</p>
        )}
      </div>
    </Card>
  );
}

const metaChip: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 9px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  color: 'rgb(var(--text-secondary))',
  background: 'rgb(var(--bg-elevated))',
  border: '1px solid var(--border-default)',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 'var(--font-xs)',
  fontWeight: 800,
  marginBottom: 6,
  color: 'rgb(var(--text-primary))',
};
