'use client';

import React, { useState } from 'react';
import { CheckCircle2, Circle, Plus, ListChecks, Trash2 } from 'lucide-react';
import { TextInput } from '@/components/ui';

export interface DraftSubtask {
  /** Present when the subtask already exists on the server */
  id?: string;
  title: string;
  isDone: boolean;
}

interface SubtaskEditorProps {
  value: DraftSubtask[];
  onChange: (next: DraftSubtask[]) => void;
}

/**
 * SubtaskEditor — draft subtask list used inside the add/edit form.
 * Works before a todo exists (no id required); the page reconciles the
 * drafts with the API on save (create new ones, toggle changed ones).
 */
export function SubtaskEditor({ value, onChange }: SubtaskEditorProps) {
  const [title, setTitle] = useState('');

  const add = () => {
    const t = title.trim();
    if (!t) return;
    onChange([...value, { title: t, isDone: false }]);
    setTitle('');
  };

  const toggle = (idx: number) => {
    onChange(value.map((s, i) => (i === idx ? { ...s, isDone: !s.isDone } : s)));
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const done = value.filter(s => s.isDone).length;

  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, opacity: 0.6 }}>
        <ListChecks size={13} /> Sub-task {value.length > 0 && <span style={{ opacity: 0.7 }}>({done}/{value.length})</span>}
      </label>

      {value.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
          {value.map((s, idx) => (
            <button
              key={s.id ?? `draft-${idx}`}
              type="button"
              onClick={() => toggle(idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9,
                background: 'var(--input-bg)', border: '1px solid var(--border-default)', cursor: 'pointer',
                textAlign: 'left', width: '100%',
              }}
            >
              {s.isDone
                ? <CheckCircle2 size={15} style={{ color: 'rgb(var(--color-success))', flexShrink: 0 }} />
                : <Circle size={15} style={{ opacity: 0.4, flexShrink: 0 }} />}
              <span style={{ fontSize: 12.5, flex: 1, textDecoration: s.isDone ? 'line-through' : 'none', opacity: s.isDone ? 0.55 : 1 }}>
                {s.title}
              </span>
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); remove(idx); }}
                style={{ opacity: 0.3, cursor: 'pointer', flexShrink: 0, padding: 2 }}
              >
                <Trash2 size={12} />
              </span>
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1 }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}>
          <TextInput placeholder="Tambah langkah / sub-task..." value={title} onChange={setTitle} />
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!title.trim()}
          aria-label="Tambah sub-task"
          style={{
            background: 'rgb(var(--color-primary))', color: 'rgb(var(--bg-base))', border: 'none', borderRadius: 10,
            padding: '0 14px', cursor: title.trim() ? 'pointer' : 'not-allowed', opacity: title.trim() ? 1 : 0.5,
            display: 'flex', alignItems: 'center',
          }}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
