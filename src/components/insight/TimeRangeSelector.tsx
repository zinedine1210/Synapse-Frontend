'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { TimeRange } from '@/services/financial.helpers';

interface TimeRangeSelectorProps {
  value: TimeRange;
  labels: Record<TimeRange, string>;
  onChange: (range: TimeRange) => void;
  /** Whether the custom date picker panel is visible */
  showCustomPicker: boolean;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
}

/**
 * A modern, mobile-friendly segmented control for picking a time range.
 * Renders the available ranges as pills; the active pill gets a gradient fill.
 * When "custom" is active, a date-range panel slides into view.
 */
export function TimeRangeSelector({
  value,
  labels,
  onChange,
  showCustomPicker,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}: TimeRangeSelectorProps) {
  const ranges = Object.keys(labels) as TimeRange[];

  return (
    <div className="trs">
      <div className="trs-track" role="tablist" aria-label="Pilih rentang waktu">
        {ranges.map((range) => {
          const active = value === range;
          return (
            <button
              key={range}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(range)}
              className={`trs-pill ${active ? 'trs-pill--active' : ''}`}
            >
              {range === 'custom' && (
                <Calendar size={13} style={{ verticalAlign: 'middle' }} />
              )}
              <span>{labels[range]}</span>
            </button>
          );
        })}
      </div>

      {showCustomPicker && value === 'custom' && (
        <div className="trs-custom animate-fade-in">
          <div className="trs-field">
            <label htmlFor="trs-start">Dari</label>
            <input
              id="trs-start"
              type="date"
              value={customStart}
              max={customEnd || undefined}
              onChange={(e) => onCustomStartChange(e.target.value)}
            />
          </div>
          <div className="trs-arrow" aria-hidden>→</div>
          <div className="trs-field">
            <label htmlFor="trs-end">Sampai</label>
            <input
              id="trs-end"
              type="date"
              value={customEnd}
              min={customStart || undefined}
              onChange={(e) => onCustomEndChange(e.target.value)}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .trs {
          margin-bottom: 20px;
        }
        .trs-track {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: rgb(var(--bg-elevated));
          border: 1px solid var(--border-default);
          border-radius: var(--radius-full);
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .trs-track::-webkit-scrollbar {
          display: none;
        }
        .trs-pill {
          flex: 1 1 auto;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 9px 14px;
          border: none;
          border-radius: var(--radius-full);
          background: transparent;
          color: rgb(var(--text-secondary));
          font-size: var(--font-sm);
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .trs-pill:hover {
          color: rgb(var(--text-primary));
        }
        .trs-pill--active {
          background: linear-gradient(
            135deg,
            rgb(var(--color-primary)),
            rgb(var(--color-secondary))
          );
          color: rgb(var(--bg-base));
          box-shadow: var(--shadow-glow-primary);
        }
        .trs-custom {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          margin-top: 12px;
          padding: 14px 16px;
          background: rgb(var(--bg-surface));
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
        }
        .trs-field {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .trs-field label {
          font-size: var(--font-xs);
          color: rgb(var(--text-muted));
          font-weight: 600;
        }
        .trs-field input {
          width: 100%;
          padding: 9px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-default);
          background: rgb(var(--bg-base));
          color: rgb(var(--text-primary));
          font-size: var(--font-sm);
          font-family: inherit;
          outline: none;
          transition: var(--transition-fast);
        }
        .trs-field input:focus {
          border-color: rgba(var(--color-primary) / 0.5);
          box-shadow: 0 0 0 3px rgba(var(--color-primary) / 0.1);
        }
        .trs-arrow {
          padding-bottom: 10px;
          color: rgb(var(--text-muted));
          font-weight: 700;
        }
        @media (max-width: 520px) {
          .trs-arrow {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
