'use client';

import React from 'react';

export interface SegmentTab<T extends string> {
  value: T;
  label: string;
  icon: React.ReactNode;
}

interface SegmentedTabsProps<T extends string> {
  tabs: SegmentTab<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: React.CSSProperties;
}

/**
 * Modern segmented control with a sliding pill indicator.
 * Horizontally scrollable on small screens. Relies on the global
 * prefers-reduced-motion handler to neutralise the slide transition.
 */
export function SegmentedTabs<T extends string>({ tabs, value, onChange, style }: SegmentedTabsProps<T>) {
  const activeIndex = Math.max(0, tabs.findIndex(t => t.value === value));
  const widthPct = 100 / tabs.length;

  return (
    <div
      role="tablist"
      aria-label="Mode rekomendasi"
      style={{
        position: 'relative',
        display: 'flex',
        padding: 4,
        gap: 2,
        background: 'rgb(var(--bg-elevated))',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 20,
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Sliding indicator */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: `calc(${activeIndex * widthPct}% + 4px)`,
          width: `calc(${widthPct}% - 6px)`,
          background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
          borderRadius: 'calc(var(--radius-lg) - 4px)',
          boxShadow: '0 4px 14px rgba(var(--color-primary) / 0.35)',
          transition: 'left 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 0,
        }}
      />
      {tabs.map(tab => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            style={{
              position: 'relative',
              zIndex: 1,
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 6px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'var(--font-sm)',
              fontWeight: active ? 700 : 500,
              whiteSpace: 'nowrap',
              color: active ? 'rgb(var(--bg-base))' : 'rgb(var(--text-secondary))',
              transition: 'color 0.2s ease',
            }}
          >
            <span style={{ display: 'inline-flex' }}>{tab.icon}</span>
            <span className="seg-tab-label">{tab.label}</span>
          </button>
        );
      })}

      <style jsx>{`
        @media (max-width: 420px) {
          .seg-tab-label {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
