'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';

// ─── Types ───
type PickerMode = 'date' | 'time' | 'datetime-local';

interface DateTimePickerProps {
  mode?: PickerMode;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
  min?: string;
  max?: string;
}

// ─── Helpers ───
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d} ${MONTHS_ID[m - 1]} ${y}`;
}

function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

function formatDateTimeDisplay(dtStr: string): string {
  if (!dtStr) return '';
  const [datePart, timePart] = dtStr.split('T');
  if (!datePart) return '';
  const dateF = formatDateDisplay(datePart);
  const timeF = timePart ? formatTimeDisplay(timePart) : '';
  return timeF ? `${dateF}, ${timeF}` : dateF;
}

// ─── Calendar Grid ───
function CalendarGrid({ year, month, selectedDate, onSelect, min, max }: {
  year: number; month: number; selectedDate: string;
  onSelect: (d: string) => void; min?: string; max?: string;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  const cells: { day: number; current: boolean; dateStr: string }[] = [];

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day: d, current: false, dateStr: `${y}-${pad(m + 1)}-${pad(d)}` });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true, dateStr: `${year}-${pad(month + 1)}-${pad(d)}` });
  }

  // Next month padding
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: d, current: false, dateStr: `${y}-${pad(m + 1)}-${pad(d)}` });
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  return (
    <div className="dtp-calendar-grid">
      {DAYS_ID.map(d => (
        <div key={d} className="dtp-day-header">{d}</div>
      ))}
      {cells.map((cell, i) => {
        const isSelected = cell.dateStr === selectedDate;
        const isToday = cell.dateStr === todayStr;
        const isDisabled = (min && cell.dateStr < min) || (max && cell.dateStr > max);
        return (
          <button
            key={i}
            type="button"
            className={[
              'dtp-day-cell',
              !cell.current && 'dtp-day-other',
              isSelected && 'dtp-day-selected',
              isToday && !isSelected && 'dtp-day-today',
              isDisabled && 'dtp-day-disabled',
            ].filter(Boolean).join(' ')}
            onClick={() => !isDisabled && onSelect(cell.dateStr)}
            disabled={!!isDisabled}
          >
            {cell.day}
          </button>
        );
      })}
    </div>
  );
}

// ─── Time Selector ───
function TimeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = (value || '00:00').split(':').map(Number);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 5), []);

  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll selected into view
    hourRef.current?.querySelector('.dtp-time-selected')?.scrollIntoView({ block: 'center', behavior: 'auto' });
    minRef.current?.querySelector('.dtp-time-selected')?.scrollIntoView({ block: 'center', behavior: 'auto' });
  }, []);

  const setHour = (newH: number) => onChange(`${pad(newH)}:${pad(m)}`);
  const setMinute = (newM: number) => onChange(`${pad(h)}:${pad(newM)}`);

  return (
    <div className="dtp-time-selector">
      <div className="dtp-time-col">
        <div className="dtp-time-col-label">Jam</div>
        <div className="dtp-time-scroll" ref={hourRef}>
          {hours.map(hr => (
            <button key={hr} type="button" className={`dtp-time-item ${hr === h ? 'dtp-time-selected' : ''}`} onClick={() => setHour(hr)}>
              {pad(hr)}
            </button>
          ))}
        </div>
      </div>
      <div className="dtp-time-divider">:</div>
      <div className="dtp-time-col">
        <div className="dtp-time-col-label">Menit</div>
        <div className="dtp-time-scroll" ref={minRef}>
          {minutes.map(mn => (
            <button key={mn} type="button" className={`dtp-time-item ${mn === m ? 'dtp-time-selected' : ''}`} onClick={() => setMinute(mn)}>
              {pad(mn)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───
export function DateTimePicker({
  mode = 'date',
  value,
  onChange,
  required,
  placeholder,
  style,
  className,
  min,
  max,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<'date' | 'time'>('date');
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropUp, setDropUp] = useState(false);

  // Parse current value
  const datePart = useMemo(() => {
    if (mode === 'time') return '';
    if (mode === 'datetime-local') return value?.split('T')[0] || '';
    return value || '';
  }, [value, mode]);

  const timePart = useMemo(() => {
    if (mode === 'date') return '';
    if (mode === 'datetime-local') return value?.split('T')[1] || '';
    return value || '';
  }, [value, mode]);

  // Calendar navigation
  const parsed = datePart ? datePart.split('-').map(Number) : null;
  const [viewYear, setViewYear] = useState(parsed?.[0] || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed[1] - 1 : new Date().getMonth());

  // Update view when value changes externally
  useEffect(() => {
    if (datePart) {
      const [y, m] = datePart.split('-').map(Number);
      if (y && m) { setViewYear(y); setViewMonth(m - 1); }
    }
  }, [datePart]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Determine drop direction
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setDropUp(spaceBelow < 360);
  }, [open]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setPanel(mode === 'time' ? 'time' : 'date');
  }, [mode]);

  const handleDateSelect = useCallback((d: string) => {
    if (mode === 'date') {
      onChange(d);
      setOpen(false);
    } else if (mode === 'datetime-local') {
      const t = timePart || '08:00';
      onChange(`${d}T${t}`);
      setPanel('time');
    }
  }, [mode, timePart, onChange]);

  const handleTimeChange = useCallback((t: string) => {
    if (mode === 'time') {
      onChange(t);
    } else if (mode === 'datetime-local') {
      const d = datePart || new Date().toISOString().split('T')[0];
      onChange(`${d}T${t}`);
    }
  }, [mode, datePart, onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  }, [onChange]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Display value
  const displayValue = mode === 'date'
    ? formatDateDisplay(value)
    : mode === 'time'
      ? formatTimeDisplay(value)
      : formatDateTimeDisplay(value);

  const placeholderText = placeholder || (
    mode === 'date' ? 'Pilih tanggal' : mode === 'time' ? 'Pilih waktu' : 'Pilih tanggal & waktu'
  );

  const Icon = mode === 'time' ? Clock : Calendar;

  const minDate = min?.split('T')[0];
  const maxDate = max?.split('T')[0];

  return (
    <div ref={containerRef} className={`dtp-container ${className || ''}`} style={style}>
      {/* Trigger */}
      <button type="button" className="dtp-trigger" onClick={handleOpen}>
        <Icon size={15} className="dtp-trigger-icon" />
        <span className={`dtp-trigger-text ${!displayValue ? 'dtp-placeholder' : ''}`}>
          {displayValue || placeholderText}
        </span>
        {value && !required && (
          <span className="dtp-clear" onClick={handleClear}><X size={13} /></span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`dtp-dropdown ${dropUp ? 'dtp-drop-up' : ''}`}>
          {/* Mode tabs for datetime-local */}
          {mode === 'datetime-local' && (
            <div className="dtp-tabs">
              <button type="button" className={`dtp-tab ${panel === 'date' ? 'dtp-tab-active' : ''}`} onClick={() => setPanel('date')}>
                <Calendar size={13} /> Tanggal
              </button>
              <button type="button" className={`dtp-tab ${panel === 'time' ? 'dtp-tab-active' : ''}`} onClick={() => setPanel('time')}>
                <Clock size={13} /> Waktu
              </button>
            </div>
          )}

          {/* Calendar panel */}
          {(panel === 'date' && mode !== 'time') && (
            <div className="dtp-panel">
              <div className="dtp-month-nav">
                <button type="button" className="dtp-nav-btn" onClick={prevMonth}><ChevronLeft size={16} /></button>
                <span className="dtp-month-label">{MONTHS_ID[viewMonth]} {viewYear}</span>
                <button type="button" className="dtp-nav-btn" onClick={nextMonth}><ChevronRight size={16} /></button>
              </div>
              <CalendarGrid
                year={viewYear}
                month={viewMonth}
                selectedDate={datePart}
                onSelect={handleDateSelect}
                min={minDate}
                max={maxDate}
              />
              {/* Quick buttons */}
              <div className="dtp-quick-actions">
                <button type="button" className="dtp-quick-btn" onClick={() => {
                  const t = new Date();
                  handleDateSelect(`${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`);
                }}>Hari Ini</button>
                <button type="button" className="dtp-quick-btn" onClick={() => {
                  const t = new Date(); t.setDate(t.getDate() + 1);
                  handleDateSelect(`${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`);
                }}>Besok</button>
                <button type="button" className="dtp-quick-btn" onClick={() => {
                  const t = new Date(); t.setDate(t.getDate() + 7);
                  handleDateSelect(`${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`);
                }}>+7 Hari</button>
              </div>
            </div>
          )}

          {/* Time panel */}
          {(panel === 'time' && mode !== 'date') && (
            <div className="dtp-panel">
              <TimeSelector value={timePart} onChange={handleTimeChange} />
              {mode === 'datetime-local' && (
                <div className="dtp-done-row">
                  <button type="button" className="dtp-done-btn" onClick={() => setOpen(false)}>Selesai</button>
                </div>
              )}
            </div>
          )}

          {/* Time-only done */}
          {mode === 'time' && (
            <div className="dtp-done-row">
              <button type="button" className="dtp-done-btn" onClick={() => setOpen(false)}>Selesai</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
