'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button, DateTimePicker, CategoryPicker } from '@/components/ui';
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
}

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
export function TodoForm({ form, setForm, subtasks, setSubtasks, categories, submitting, editing, onSubmit }: TodoFormProps) {
  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Big title */}
      <div>
        <input
          className="input"
          placeholder="Apa yang mau kamu selesaikan? ✨"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          required
          autoFocus
          style={{ fontSize: 18, fontWeight: 600, padding: '14px 16px', borderRadius: 14 }}
        />
      </div>

      {/* Description */}
      <div>
        <label style={fieldLabel}>Catatan (opsional)</label>
        <textarea
          className="input"
          placeholder="Detail tambahan, link, atau konteks..."
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          rows={2}
          style={{ borderRadius: 12, padding: '11px 14px', resize: 'none', fontSize: 14, width: '100%' }}
        />
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <label style={fieldLabel}>Waktu</label>
          <DateTimePicker mode="time" value={form.dueTime} onChange={v => setForm({ ...form, dueTime: v })} placeholder="Pilih waktu" />
        </div>
      </div>

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
      <RecurrenceSelector value={form.recurrence} onChange={val => setForm({ ...form, recurrence: val })} />

      {/* Subtasks */}
      <SubtaskEditor value={subtasks} onChange={setSubtasks} />

      <Button type="submit" disabled={submitting} style={{ borderRadius: 12, padding: '13px 0', marginTop: 2, justifyContent: 'center', fontSize: 15 }}>
        {submitting ? <Loader2 className="spin" size={16} /> : (editing ? '💾 Simpan Perubahan' : '✅ Tambah Tugas')}
      </Button>
    </form>
  );
}
