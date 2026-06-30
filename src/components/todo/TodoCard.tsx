'use client';

import React from 'react';
import {
  CheckCircle2, Circle, Trash2, Edit2, Calendar, AlertTriangle, RefreshCw, ListChecks, ChevronDown, Timer, Tag, MapPin, Clock, Share2,
} from 'lucide-react';
import { PersonalTodo } from '@/services/todoService';
import { SwipeableRow } from '@/components/ui';
import { SubtaskList } from '@/components/todo/SubtaskList';

const PRIORITY_META: Record<string, { token: string; label: string }> = {
  high: { token: '--color-error', label: 'Tinggi' },
  medium: { token: '--color-warning', label: 'Sedang' },
  low: { token: '--color-success', label: 'Rendah' },
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
}

export function TodoCard({
  todo, catInfo, isExpanded, onToggleExpand, onToggle, onEdit, onDelete, onFocus, onShare, selectMode, isSelected, onSelect, onAddSubtask, onToggleSubtask, onDeleteSubtask,
}: TodoCardProps) {
  const done = todo.status === 'done';
  const isEvent = todo.type === 'event';
  const priority = PRIORITY_META[todo.priority] || PRIORITY_META.medium;
  const prioritySolid = `rgb(var(${priority.token}))`;
  const prioritySoft = `rgba(var(${priority.token}), 0.13)`;
  const isOverdue = !!todo.dueDate && todo.status === 'pending' && new Date(todo.dueDate) < new Date();
  const subtasks = todo.subtasks || [];
  const hasSubtasks = subtasks.length > 0;
  const doneSubs = subtasks.filter(s => s.isDone).length;
  const subPct = hasSubtasks ? Math.round((doneSubs / subtasks.length) * 100) : 0;
  const eventMeta = isEvent && todo.eventType ? EVENT_TYPE_META[todo.eventType] : null;

  return (
    <SwipeableRow
      onSwipeRight={onToggle}
      onSwipeLeft={onDelete}
      rightLabel="✅ Selesai"
      leftLabel="🗑️ Hapus"
      rightColor="rgb(var(--color-success))"
      leftColor="rgb(var(--color-error))"
    >
      <div
        className="todo-card"
        style={{
          position: 'relative',
          padding: '12px 14px 12px 16px',
          borderRadius: 14,
          background: 'rgb(var(--bg-surface))',
          border: `1px solid ${isOverdue ? 'rgba(var(--color-error), 0.35)' : 'var(--border-default)'}`,
          opacity: done ? 0.62 : 1,
          overflow: 'hidden',
        }}
      >
        {/* Priority/event accent strip */}
        <span
          aria-hidden
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
            background: isEvent && eventMeta ? eventMeta.color : prioritySolid,
            opacity: done ? 0.4 : 1,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
          {/* Select mode checkbox */}
          {selectMode && (
            <button
              onClick={onSelect}
              style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0, marginTop: 1, lineHeight: 0 }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 6, border: `2px solid ${isSelected ? 'rgb(var(--color-primary))' : 'var(--border-default)'}`,
                background: isSelected ? 'rgb(var(--color-primary))' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                {isSelected && <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>✓</span>}
              </div>
            </button>
          )}

          {/* Checkbox with bounce animation hook */}
          <button
            data-todo-check={todo.id}
            onClick={onToggle}
            aria-label={done ? 'Tandai belum selesai' : 'Tandai selesai'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0, marginTop: 1, lineHeight: 0 }}
          >
            {done
              ? <CheckCircle2 size={22} style={{ color: 'rgb(var(--color-success))' }} />
              : <Circle size={22} style={{ color: prioritySolid, opacity: 0.55 }} />}
          </button>

          {/* Body */}
          <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onToggleExpand}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span
                data-todo-text={todo.id}
                className={done ? 'todo-text-done' : ''}
                style={{ fontWeight: 600, fontSize: 14.5, letterSpacing: -0.1 }}
              >
                {todo.title}
              </span>
              {isOverdue && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: 'rgb(var(--color-error))' }}>
                  <AlertTriangle size={11} /> Telat
                </span>
              )}
            </div>

            {todo.description && (
              <p style={{ fontSize: 12, color: 'rgb(var(--text-muted))', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {todo.description}
              </p>
            )}

            {/* Meta chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
              {/* Event type badge */}
              {isEvent && eventMeta && (
                <span style={{
                  fontSize: 10.5, padding: '2px 9px', borderRadius: 999,
                  background: `${eventMeta.color}1a`, color: eventMeta.color,
                  fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3,
                }}>
                  {eventMeta.emoji} {eventMeta.label}
                </span>
              )}
              {/* Time range for events */}
              {isEvent && todo.startTime && (
                <span style={{
                  fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3,
                  padding: '2px 8px', borderRadius: 999,
                  background: 'rgba(var(--color-primary), 0.08)',
                  color: 'rgb(var(--color-primary))', fontWeight: 600,
                }}>
                  <Clock size={10} /> {todo.startTime.slice(0, 5)}{todo.endTime ? ` - ${todo.endTime.slice(0, 5)}` : ''}
                </span>
              )}
              {/* Location */}
              {todo.location && (
                <span style={{
                  fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3,
                  color: 'rgb(var(--text-muted))', fontWeight: 500,
                }}>
                  <MapPin size={10} /> {todo.location}
                </span>
              )}
              {todo.category && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: `${catInfo.color}1a`, color: catInfo.color, fontWeight: 600 }}>
                  {catInfo.label}
                </span>
              )}
              {!isEvent && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: prioritySoft, color: prioritySolid, fontWeight: 600 }}>
                  {priority.label}
                </span>
              )}
              {todo.dueDate && (
                <span style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3, color: isOverdue ? 'rgb(var(--color-error))' : 'rgb(var(--text-muted))', fontWeight: 500 }}>
                  <Calendar size={11} />
                  {new Date(todo.dueDate).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {todo.dueTime && <> · {todo.dueTime.slice(0, 5)}</>}
                </span>
              )}
              {todo.recurrence && (
                <span style={{ fontSize: 10.5, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 999, background: 'rgba(var(--color-primary), 0.12)', color: 'rgb(var(--color-primary))', fontWeight: 600 }}>
                  <RefreshCw size={10} /> {RECURRENCE_LABEL[todo.recurrence]}
                </span>
              )}
              {hasSubtasks && (
                <span style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, color: 'rgb(var(--text-muted))', fontWeight: 500 }}>
                  <ListChecks size={12} /> {doneSubs}/{subtasks.length}
                </span>
              )}
              {todo.tags && todo.tags.length > 0 && todo.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 999,
                  background: 'rgba(var(--color-secondary), 0.12)', color: 'rgb(var(--color-secondary))',
                  fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3,
                }}>
                  <Tag size={9} /> {tag}
                </span>
              ))}
            </div>

            {/* Subtask mini progress bar */}
            {hasSubtasks && !isExpanded && (
              <div style={{ height: 3, borderRadius: 2, background: 'var(--border-default)', overflow: 'hidden', marginTop: 8 }}>
                <div style={{ height: '100%', width: `${subPct}%`, background: 'rgb(var(--color-success))', borderRadius: 2, transition: 'width 0.3s ease' }} />
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            {!done && onFocus && (
              <button onClick={onFocus} aria-label="Fokus" className="todo-card-action" title="Pomodoro Timer" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, color: 'rgb(var(--text-muted))', lineHeight: 0 }}>
                <Timer size={15} />
              </button>
            )}
            {hasSubtasks && (
              <button
                onClick={onToggleExpand}
                aria-label={isExpanded ? 'Tutup sub-task' : 'Lihat sub-task'}
                className="todo-card-action"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, color: 'rgb(var(--text-muted))', lineHeight: 0 }}
              >
                <ChevronDown size={16} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
            )}
            {onShare && (
              <button onClick={onShare} aria-label="Share" className="todo-card-action" title="Bagikan" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, color: 'rgb(var(--text-muted))', lineHeight: 0 }}>
                <Share2 size={15} />
              </button>
            )}
            <button onClick={onEdit} aria-label="Edit" className="todo-card-action" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, color: 'rgb(var(--text-muted))', lineHeight: 0 }}>
              <Edit2 size={15} />
            </button>
            <button onClick={onDelete} aria-label="Hapus" className="todo-card-action" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, color: 'rgb(var(--text-muted))', lineHeight: 0 }}>
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Expanded: subtasks */}
        {isExpanded && (
          <div style={{ marginTop: 10, paddingLeft: 33 }}>
            <SubtaskList
              subtasks={subtasks}
              todoId={todo.id}
              onAdd={onAddSubtask}
              onToggle={onToggleSubtask}
              onDelete={onDeleteSubtask}
            />
          </div>
        )}

        <style jsx>{`
          .todo-card-action { transition: color 0.2s, background 0.2s; border-radius: 8px; }
          .todo-card-action:hover { color: rgb(var(--text-primary)); background: var(--input-bg); }
        `}</style>
      </div>
    </SwipeableRow>
  );
}
