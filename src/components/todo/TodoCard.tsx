'use client';

import React from 'react';
import {
  CheckCircle2, Circle, Calendar, AlertTriangle, RefreshCw, ListChecks, MapPin, Clock,
} from 'lucide-react';
import { PersonalTodo } from '@/services/todoService';
import { SwipeableRow } from '@/components/ui';

const PRIORITY_META: Record<string, { token: string; label: string; color: string }> = {
  high: { token: '--color-error', label: 'Tinggi', color: '#ef4444' },
  medium: { token: '--color-warning', label: 'Sedang', color: '#f59e0b' },
  low: { token: '--color-success', label: 'Rendah', color: '#10b981' },
};

const RECURRENCE_LABEL: Record<string, string> = { daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan' };

const EVENT_TYPE_META: Record<string, { emoji: string; label: string; color: string }> = {
  meeting: { emoji: '💼', label: 'Meeting', color: '#f59e0b' },
  kuliah: { emoji: '🎓', label: 'Kuliah', color: '#6366f1' },
  ujian: { emoji: '📝', label: 'Ujian', color: '#ef4444' },
  penting: { emoji: '⭐', label: 'Penting', color: '#ec4899' },
  lainnya: { emoji: '📌', label: 'Lainnya', color: '#6b7280' },
};

interface CatInfo { id: string; label: string; emoji?: string; color: string; }

interface TodoCardProps {
  todo: PersonalTodo;
  catInfo: CatInfo;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFocus?: () => void;
  selectMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onAddSubtask: (title: string) => Promise<void>;
  onToggleSubtask: (subId: string, isDone: boolean) => Promise<void>;
  onDeleteSubtask?: (subId: string) => Promise<void>;
  onShare?: () => void;
  onCardClick?: () => void;
  sharedUsers?: { fullName?: string; avatarUrl?: string }[];
}

export function TodoCard({
  todo, catInfo, onToggle, onDelete, onCardClick, selectMode, isSelected, onSelect, sharedUsers,
}: TodoCardProps) {
  const done = todo.status === 'done';
  const isEvent = todo.type === 'event';
  const priority = PRIORITY_META[todo.priority] || PRIORITY_META.medium;
  const prioritySolid = `rgb(var(${priority.token}))`;
  const isOverdue = !!todo.dueDate && todo.status === 'pending' && new Date(todo.dueDate) < new Date();
  const subtasks = todo.subtasks || [];
  const hasSubtasks = subtasks.length > 0;
  const doneSubs = subtasks.filter(s => s.isDone).length;
  const eventMeta = isEvent && todo.eventType ? EVENT_TYPE_META[todo.eventType] : null;
  const accentColor = isEvent && eventMeta ? eventMeta.color : priority.color;

  return (
    <SwipeableRow
      onSwipeRight={onToggle}
      onSwipeLeft={onDelete}
      rightLabel={done ? '↩️ Aktifkan' : '✅ Selesai'}
      leftLabel="🗑️ Hapus"
      rightColor="rgb(var(--color-success))"
      leftColor="rgb(var(--color-error))"
    >
      <div
        className="todo-card-v2"
        onClick={() => {
          if (selectMode && onSelect) { onSelect(); return; }
          onCardClick?.();
        }}
        style={{
          position: 'relative',
          padding: '12px 14px 12px 18px',
          borderRadius: 16,
          background: isEvent
            ? `linear-gradient(135deg, ${accentColor}08, transparent)`
            : 'rgb(var(--bg-surface))',
          border: `1px solid ${isOverdue ? 'rgba(var(--color-error), 0.35)' : isEvent ? `${accentColor}30` : 'var(--border-default)'}`,
          opacity: done ? 0.6 : 1,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'transform 0.1s, box-shadow 0.15s',
        }}
      >
        {/* Accent strip left */}
        <span
          aria-hidden
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
            background: accentColor,
            opacity: done ? 0.4 : 1,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Select mode checkbox */}
          {selectMode && (
            <button
              onClick={e => { e.stopPropagation(); onSelect?.(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0, lineHeight: 0 }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 7, border: `2px solid ${isSelected ? 'rgb(var(--color-primary))' : 'var(--border-default)'}`,
                background: isSelected ? 'rgb(var(--color-primary))' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                {isSelected && <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>✓</span>}
              </div>
            </button>
          )}

          {/* Checkbox / Status */}
          {!selectMode && (
            <button
              data-todo-check={todo.id}
              onClick={e => { e.stopPropagation(); onToggle(); }}
              aria-label={done ? 'Tandai belum selesai' : 'Tandai selesai'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0, lineHeight: 0 }}
            >
              {done
                ? <CheckCircle2 size={22} style={{ color: 'rgb(var(--color-success))' }} />
                : <Circle size={22} style={{ color: prioritySolid, opacity: 0.5 }} />}
            </button>
          )}

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {/* Title */}
              <span
                data-todo-text={todo.id}
                className={done ? 'todo-text-done' : ''}
                style={{
                  fontWeight: 650, fontSize: 14, letterSpacing: -0.2,
                  textDecoration: done ? 'line-through' : 'none',
                  color: done ? 'rgb(var(--text-muted))' : undefined,
                }}
              >
                {todo.title}
              </span>
              {isOverdue && <AlertTriangle size={12} style={{ color: 'rgb(var(--color-error))' }} />}
            </div>

            {/* Compact meta line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              {/* Event type pill */}
              {isEvent && eventMeta && (
                <span style={{
                  fontSize: 10, padding: '1px 7px', borderRadius: 999,
                  background: `${eventMeta.color}18`, color: eventMeta.color,
                  fontWeight: 700,
                }}>
                  {eventMeta.emoji} {eventMeta.label}
                </span>
              )}
              {/* Priority for todos (not events) */}
              {!isEvent && (
                <span style={{
                  fontSize: 10, padding: '1px 7px', borderRadius: 999,
                  background: `${priority.color}18`, color: priority.color,
                  fontWeight: 700,
                }}>
                  {priority.label}
                </span>
              )}
              {/* Time */}
              {isEvent && todo.startTime && (
                <span style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3, color: 'rgb(var(--text-muted))', fontWeight: 500 }}>
                  <Clock size={10} /> {todo.startTime.slice(0, 5)}{todo.endTime ? `-${todo.endTime.slice(0, 5)}` : ''}
                </span>
              )}
              {/* Due date */}
              {todo.dueDate && !isEvent && (
                <span style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3, color: isOverdue ? 'rgb(var(--color-error))' : 'rgb(var(--text-muted))', fontWeight: 500 }}>
                  <Calendar size={10} />
                  {new Date(todo.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  {todo.dueTime && <> {todo.dueTime.slice(0, 5)}</>}
                </span>
              )}
              {/* Location */}
              {todo.location && (
                <span style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3, color: 'rgb(var(--text-muted))', fontWeight: 500 }}>
                  <MapPin size={10} /> {todo.location.length > 15 ? todo.location.slice(0, 15) + '…' : todo.location}
                </span>
              )}
              {/* Recurrence */}
              {todo.recurrence && (
                <span style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 2, color: 'rgb(var(--color-primary))', fontWeight: 600 }}>
                  <RefreshCw size={9} /> {RECURRENCE_LABEL[todo.recurrence]}
                </span>
              )}
              {/* Subtask count */}
              {hasSubtasks && (
                <span style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3, color: 'rgb(var(--text-muted))', fontWeight: 500 }}>
                  <ListChecks size={11} /> {doneSubs}/{subtasks.length}
                </span>
              )}
            </div>
          </div>

          {/* Right side: shared avatars */}
          {sharedUsers && sharedUsers.length > 0 && (
            <div style={{ display: 'flex', flexShrink: 0, marginLeft: 4 }}>
              {sharedUsers.slice(0, 3).map((u, idx) => (
                <div
                  key={idx}
                  title={u.fullName || ''}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', marginLeft: idx > 0 ? -8 : 0,
                    background: u.avatarUrl ? `url(${u.avatarUrl}) center/cover` : 'rgba(var(--color-primary), 0.15)',
                    border: '2px solid rgb(var(--bg-surface))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: 'rgb(var(--color-primary))',
                  }}
                >
                  {!u.avatarUrl && (u.fullName || '?')[0].toUpperCase()}
                </div>
              ))}
              {sharedUsers.length > 3 && (
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', marginLeft: -8,
                  background: 'var(--input-bg)', border: '2px solid rgb(var(--bg-surface))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: 'rgb(var(--text-muted))',
                }}>
                  +{sharedUsers.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SwipeableRow>
  );
}
