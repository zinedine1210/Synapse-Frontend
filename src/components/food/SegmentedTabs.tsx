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

  return (
    <div
      role="tablist"
      aria-label="Mode rekomendasi"
      className="seg-tabs-container"
      style={{
        position: 'relative',
        display: 'flex',
        padding: 4,
        gap: 2,
        background: 'rgb(var(--bg-elevated))',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 20,
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        ...style,
      }}
    >
      {tabs.map(tab => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className="seg-tab-btn"
            style={{
              position: 'relative',
              zIndex: 1,
              flex: '0 0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 14px',
              border: 'none',
              background: active
                ? 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))'
                : 'transparent',
              borderRadius: active ? 'calc(var(--radius-lg) - 4px)' : 'calc(var(--radius-lg) - 4px)',
              boxShadow: active ? '0 4px 14px rgba(var(--color-primary) / 0.35)' : 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'var(--font-sm)',
              fontWeight: active ? 700 : 500,
              whiteSpace: 'nowrap',
              color: active ? 'rgb(var(--bg-base))' : 'rgb(var(--text-secondary))',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span style={{ display: 'inline-flex' }}>{tab.icon}</span>
            <span className="seg-tab-label">{tab.label}</span>
          </button>
        );
      })}

      <style jsx>{`
        .seg-tabs-container::-webkit-scrollbar {
          display: none;
        }
        @media (max-width: 600px) {
          .seg-tab-btn {
            padding: 8px 12px !important;
            font-size: 12px !important;
          }
        }
        @media (max-width: 420px) {
          .seg-tab-label {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
