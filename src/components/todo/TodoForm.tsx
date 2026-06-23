'use client';

import React, { useState } from 'react';
import { Loader2, Plus, X, Tag, Bell, BookmarkPlus } from 'lucide-react';
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
export function TodoForm({ form, setForm, subtasks, setSubtasks, categories, submitting, editing, onSubmit, onSaveTemplate }: TodoFormProps) {
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
      {/* Big title */}
      <div>
        <TextInput
          placeholder="Apa yang mau kamu selesaikan? ✨"
          value={form.title}
          onChange={v => setForm({ ...form, title: v })}
          required
          autoFocus
        />
      </div>

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
      <div>
        <label style={fieldLabel}><Bell size={12} style={{ display: 'inline', verticalAlign: -1 }} /> Pengingat</label>
        <input
          type="datetime-local"
          value={form.reminderAt || ''}
          onChange={e => setForm({ ...form, reminderAt: e.target.value })}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 12,
            border: '1px solid var(--border-default)', background: 'var(--input-bg)',
            color: 'rgb(var(--text-primary))', fontSize: 13,
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button type="submit" disabled={submitting} style={{ flex: 1, borderRadius: 12, padding: '13px 0', marginTop: 2, justifyContent: 'center', fontSize: 15 }}>
          {submitting ? <Loader2 className="spin" size={16} /> : (editing ? '💾 Simpan Perubahan' : '✅ Tambah Tugas')}
        </Button>
        {onSaveTemplate && form.title && (
          <Button type="button" variant="ghost" onClick={() => {
            const name = prompt('Nama template:');
            if (name) onSaveTemplate(name, form, subtasks);
          }} title="Simpan sebagai template" style={{ borderRadius: 12, padding: '13px', marginTop: 2 }}>
            <BookmarkPlus size={16} />
          </Button>
        )}
      </div>
    </form>
  );
}
