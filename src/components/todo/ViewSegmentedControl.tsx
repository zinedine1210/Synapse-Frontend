'use client';

import React from 'react';
import { Clock, LayoutList, CalendarDays, GitMerge, LucideIcon } from 'lucide-react';

export type TodoViewMode = 'time' | 'category' | 'calendar' | 'timeline';

interface ViewSegmentedControlProps {
  value: TodoViewMode;
  onChange: (mode: TodoViewMode) => void;
}

const VIEWS: { key: TodoViewMode; icon: LucideIcon; label: string }[] = [
  { key: 'time', icon: Clock, label: 'Waktu' },
  { key: 'category', icon: LayoutList, label: 'Kategori' },
  { key: 'calendar', icon: CalendarDays, label: 'Kalender' },
  { key: 'timeline', icon: GitMerge, label: 'Timeline' },
];

/**
 * ViewSegmentedControl — a clean icon segmented control for switching
 * between the To-Do page view modes. The active segment slides via an
 * animated highlight (disabled under prefers-reduced-motion).
 */
export function ViewSegmentedControl({ value, onChange }: ViewSegmentedControlProps) {
  const activeIndex = VIEWS.findIndex(v => v.key === value);

  return (
    <div
      role="tablist"
      aria-label="Mode tampilan"
      className="todo-segmented"
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${VIEWS.length}, 1fr)`,
        gap: 2,
        padding: 4,
        borderRadius: 12,
        background: 'var(--input-bg)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Sliding highlight */}
      <span
        aria-hidden
        className="todo-segmented-thumb"
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: `calc(${(activeIndex / VIEWS.length) * 100}% + 4px)`,
          width: `calc(${100 / VIEWS.length}% - 8px)`,
          borderRadius: 9,
          background: 'rgb(var(--bg-surface))',
          boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.12))',
          border: '1px solid var(--border-default)',
        }}
      />
      {VIEWS.map(v => {
        const active = v.key === value;
        return (
          <button
            key={v.key}
            role="tab"
            aria-selected={active}
            aria-label={v.label}
            title={v.label}
            onClick={() => onChange(v.key)}
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 6px',
              borderRadius: 9,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: active ? 700 : 500,
              color: active ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
              transition: 'color 0.2s',
            }}
          >
            <v.icon size={15} />
            <span className="todo-segmented-label">{v.label}</span>
          </button>
        );
      })}

      <style jsx>{`
        .todo-segmented-thumb {
          transition: left 0.28s cubic-bezier(0.22, 1, 0.36, 1), width 0.28s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (max-width: 520px) {
          .todo-segmented-label {
            display: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .todo-segmented-thumb {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
