'use client';

import React, { useState } from 'react';
import { Loader2, Plus, X, Tag, Bell, BookmarkPlus, MapPin, Clock } from 'lucide-react';
import { Button, DateTimePicker, CategoryPicker, TextInput, TextArea } from '@/components/ui';
import { useFeatureAccess } from '@/lib/feature-access';
import { RecurrenceSelector } from '@/components/todo/RecurrenceSelector';
import { SubtaskEditor, DraftSubtask } from '@/components/todo/SubtaskEditor';

export interface TodoFormState {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  priority: string;
  category: string;
  recurrence: 'daily' | 'weekly' | 'monthly' | null;
  tags: string[];
  reminderAt: string;
  // Event/Jadwal fields
  type: 'todo' | 'event';
  startTime: string;
  endTime: string;
  location: string;
  eventType: string;
  reminderMinutes: number[];
}

interface CategoryOption { id: string; label: string; emoji?: string; color?: string; }

interface TodoFormProps {
  form: TodoFormState;
  setForm: (next: TodoFormState) => void;
  subtasks: DraftSubtask[];
  setSubtasks: (next: DraftSubtask[]) => void;
  categories: CategoryOption[];
  submitting: boolean;
  editing: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSaveTemplate?: (name: string, form: TodoFormState, subtasks: DraftSubtask[]) => void;
  onRequestTemplateName?: () => void;
}

const EVENT_TYPES: { id: string; label: string; emoji: string; color: string }[] = [
  { id: 'meeting', label: 'Meeting', emoji: '💼', color: '#f59e0b' },
  { id: 'kuliah', label: 'Kuliah', emoji: '🎓', color: '#6366f1' },
  { id: 'ujian', label: 'Ujian', emoji: '📝', color: '#ef4444' },
  { id: 'penting', label: 'Penting', emoji: '⭐', color: '#ec4899' },
  { id: 'lainnya', label: 'Lainnya', emoji: '📌', color: '#6b7280' },
];

const REMINDER_OPTIONS: { value: number; label: string }[] = [
  { value: 5, label: '5 menit' },
  { value: 15, label: '15 menit' },
  { value: 30, label: '30 menit' },
  { value: 60, label: '1 jam' },
  { value: 1440, label: '1 hari' },
];

const PRIORITIES: { id: string; label: string; emoji: string; token: string }[] = [
  { id: 'high', label: 'Tinggi', emoji: '🔥', token: '--color-error' },
  { id: 'medium', label: 'Sedang', emoji: '⚡', token: '--color-warning' },
  { id: 'low', label: 'Santai', emoji: '🌿', token: '--color-success' },
];

const fieldLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.6,
};

/**
 * TodoForm — the body of the add/edit task sheet. Big title input,
 * colorful priority segments, category chips, date/time pickers,
 * recurrence selector and a draft subtask editor.
 */
export function TodoForm({ form, setForm, subtasks, setSubtasks, categories, submitting, editing, onSubmit, onSaveTemplate, onRequestTemplateName }: TodoFormProps) {
  const { hasFeature } = useFeatureAccess();
  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !(form.tags || []).includes(tag)) {
      setForm({ ...form, tags: [...(form.tags || []), tag] });
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setForm({ ...form, tags: (form.tags || []).filter(t => t !== tag) });
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Type toggle: Todo vs Event */}
      <div>
        <label style={fieldLabel}>Tipe</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { id: 'todo' as const, label: '✅ Todo', desc: 'Tugas/hal yang harus dikerjakan' },
            { id: 'event' as const, label: '📅 Jadwal', desc: 'Event/acara dengan waktu tertentu' },
          ].map(t => {
            const active = form.type === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setForm({ ...form, type: t.id })}
                style={{
                  flex: 1, padding: '12px 10px', borderRadius: 12, cursor: 'pointer',
                  fontSize: 13, fontWeight: active ? 700 : 500, textAlign: 'center',
                  background: active ? 'rgba(var(--color-primary), 0.12)' : 'var(--input-bg)',
                  color: active ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
                  border: active ? '2px solid rgb(var(--color-primary))' : '2px solid transparent',
                  transition: 'all 0.18s',
                }}
              >
                <div>{t.label}</div>
                <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.6, marginTop: 2 }}>{t.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Big title */}
      <div>
        <TextInput
          placeholder={form.type === 'event' ? 'Nama acara/jadwal ✨' : 'Apa yang mau kamu selesaikan? ✨'}
          value={form.title}
          onChange={v => setForm({ ...form, title: v })}
          required
          autoFocus
        />
      </div>

      {/* Event type selector (only for events) */}
      {form.type === 'event' && (
        <div>
          <label style={fieldLabel}>Jenis Jadwal</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {EVENT_TYPES.map(et => {
              const active = form.eventType === et.id;
              return (
                <button
                  key={et.id}
                  type="button"
                  onClick={() => setForm({ ...form, eventType: et.id })}
                  style={{
                    padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                    fontSize: 12, fontWeight: active ? 700 : 500,
                    background: active ? `${et.color}1a` : 'var(--input-bg)',
                    color: active ? et.color : 'rgb(var(--text-secondary))',
                    border: active ? `2px solid ${et.color}55` : '2px solid transparent',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <span>{et.emoji}</span> {et.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <TextArea label="Catatan (opsional)" placeholder="Detail tambahan, link, atau konteks..." value={form.description} onChange={v => setForm({ ...form, description: v })} rows={2} resize="none" />
      </div>

      {/* Priority — colorful segmented buttons */}
      <div>
        <label style={fieldLabel}>Prioritas</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {PRIORITIES.map(p => {
            const active = form.priority === p.id;
            const solid = `rgb(var(${p.token}))`;
            const soft = `rgba(var(${p.token}), 0.12)`;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setForm({ ...form, priority: p.id })}
                style={{
                  flex: 1, padding: '11px 8px', borderRadius: 12, cursor: 'pointer',
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: active ? soft : 'var(--input-bg)',
                  color: active ? solid : 'rgb(var(--text-secondary))',
                  border: active ? `2px solid ${solid}` : '2px solid transparent',
                  transition: 'all 0.18s',
                }}
              >
                <span style={{ fontSize: 15 }}>{p.emoji}</span> {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date & time */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <label style={fieldLabel}>Tanggal</label>
          <DateTimePicker mode="date" value={form.dueDate} onChange={v => setForm({ ...form, dueDate: v })} placeholder="Pilih tanggal" />
        </div>
        {form.type === 'todo' ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={fieldLabel}>Waktu</label>
            <DateTimePicker mode="time" value={form.dueTime} onChange={v => setForm({ ...form, dueTime: v })} placeholder="Pilih waktu" />
          </div>
        ) : (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={fieldLabel}>Mulai</label>
              <DateTimePicker mode="time" value={form.startTime} onChange={v => setForm({ ...form, startTime: v })} placeholder="Jam mulai" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={fieldLabel}>Selesai</label>
              <DateTimePicker mode="time" value={form.endTime} onChange={v => setForm({ ...form, endTime: v })} placeholder="Jam selesai" />
            </div>
          </>
        )}
      </div>

      {/* Location (events only) */}
      {form.type === 'event' && (
        <div>
          <label style={fieldLabel}><MapPin size={12} style={{ display: 'inline', verticalAlign: -1 }} /> Lokasi</label>
          <TextInput
            placeholder="Gedung A, Ruang 301..."
            value={form.location}
            onChange={v => setForm({ ...form, location: v })}
          />
        </div>
      )}

      {/* Smart reminder (events) */}
      {form.type === 'event' && (
        <div>
          <label style={fieldLabel}><Bell size={12} style={{ display: 'inline', verticalAlign: -1 }} /> Ingatkan Sebelum</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {REMINDER_OPTIONS.map(opt => {
              const active = (form.reminderMinutes || []).includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const current = form.reminderMinutes || [];
                    const next = active ? current.filter(v => v !== opt.value) : [...current, opt.value];
                    setForm({ ...form, reminderMinutes: next });
                  }}
                  style={{
                    padding: '7px 12px', borderRadius: 10, cursor: 'pointer',
                    fontSize: 12, fontWeight: active ? 700 : 500,
                    background: active ? 'rgba(var(--color-primary), 0.15)' : 'var(--input-bg)',
                    color: active ? 'rgb(var(--color-primary))' : 'rgb(var(--text-secondary))',
                    border: active ? '2px solid rgba(var(--color-primary), 0.4)' : '2px solid transparent',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Clock size={11} /> {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category */}
      <div>
        <label style={fieldLabel}>Kategori</label>
        <CategoryPicker
          options={[{ id: '', label: 'Tanpa Kategori', emoji: '📝' }, ...categories]}
          value={form.category}
          onChange={v => setForm({ ...form, category: v })}
        />
      </div>

      {/* Recurrence */}
      {hasFeature('todo_recurring') && <RecurrenceSelector value={form.recurrence} onChange={val => setForm({ ...form, recurrence: val })} />}

      {/* Subtasks */}
      {hasFeature('todo_subtasks') && <SubtaskEditor value={subtasks} onChange={setSubtasks} />}

      {/* Tags */}
      <div>
        <label style={fieldLabel}><Tag size={12} style={{ display: 'inline', verticalAlign: -1 }} /> Tags</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {(form.tags || []).map(tag => (
            <span key={tag} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
              borderRadius: 999, background: 'rgba(var(--color-secondary), 0.12)',
              color: 'rgb(var(--color-secondary))', fontSize: 12, fontWeight: 600,
            }}>
              {tag}
              <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', lineHeight: 0 }}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            placeholder="Tambah tag..."
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: 12,
              border: '1px solid var(--border-default)', background: 'var(--input-bg)',
              color: 'rgb(var(--text-primary))', fontSize: 13, outline: 'none',
            }}
          />
          <Button type="button" variant="ghost" onClick={addTag} style={{ padding: '8px 12px' }}>
            <Plus size={14} />
          </Button>
        </div>
      </div>

      {/* Reminder */}
      {form.type === 'todo' && (
        <div>
          <label style={fieldLabel}><Bell size={12} style={{ display: 'inline', verticalAlign: -1 }} /> Pengingat</label>
          <DateTimePicker
            mode="datetime-local"
            value={form.reminderAt || ''}
            onChange={v => setForm({ ...form, reminderAt: v })}
            placeholder="Pilih waktu pengingat"
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <Button type="submit" disabled={submitting} style={{ flex: 1, borderRadius: 12, padding: '13px 0', marginTop: 2, justifyContent: 'center', fontSize: 15 }}>
          {submitting ? <Loader2 className="spin" size={16} /> : (editing ? '💾 Simpan Perubahan' : form.type === 'event' ? '📅 Tambah Jadwal' : '✅ Tambah Tugas')}
        </Button>
        {onSaveTemplate && form.title && onRequestTemplateName && (
          <Button type="button" variant="ghost" onClick={onRequestTemplateName} title="Simpan sebagai template" style={{ borderRadius: 12, padding: '13px', marginTop: 2 }}>
            <BookmarkPlus size={16} />
          </Button>
        )}
      </div>
    </form>
  );
}
