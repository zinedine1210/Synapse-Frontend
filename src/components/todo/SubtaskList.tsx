'use client';

import React, { useState } from 'react';
import { CheckSquare, Square, Plus, X } from 'lucide-react';
import { TodoSubtask } from '@/services/todoService';

interface SubtaskListProps {
  subtasks: TodoSubtask[];
  todoId: string;
  onAdd: (title: string) => Promise<void>;
  onToggle: (subId: string, isDone: boolean) => Promise<void>;
}

export function SubtaskList({ subtasks, todoId, onAdd, onToggle }: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const doneCount = subtasks.filter(s => s.isDone).length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await onAdd(newTitle.trim());
      setNewTitle('');
      setShowInput(false);
    } catch (err) {
      // silent
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      {/* Progress bar */}
      {totalCount > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, opacity: 0.5 }}>
              Sub-task: {doneCount}/{totalCount}
            </span>
            <span style={{ fontSize: 11, opacity: 0.4 }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--border-default)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'rgb(var(--color-success))',
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Subtask items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {subtasks.map(sub => (
          <div
            key={sub.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              borderRadius: 8,
              background: 'var(--input-bg)',
              cursor: 'pointer',
            }}
            onClick={() => onToggle(sub.id, !sub.isDone)}
          >
            {sub.isDone ? (
              <CheckSquare size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
            ) : (
              <Square size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
            )}
            <span style={{
              fontSize: 12,
              textDecoration: sub.isDone ? 'line-through' : 'none',
              opacity: sub.isDone ? 0.5 : 1,
              flex: 1,
            }}>
              {sub.title}
            </span>
          </div>
        ))}
      </div>

      {/* Add subtask */}
      {showInput ? (
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            className="input"
            placeholder="Sub-task baru..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            autoFocus
            style={{ flex: 1, fontSize: 12, padding: '6px 10px', borderRadius: 8 }}
          />
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            style={{
              background: 'rgb(var(--color-primary))',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: 12,
              opacity: adding || !newTitle.trim() ? 0.5 : 1,
            }}
          >
            <Plus size={12} />
          </button>
          <button
            type="button"
            onClick={() => { setShowInput(false); setNewTitle(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 4 }}
          >
            <X size={14} />
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 11,
            opacity: 0.5,
            padding: '4px 0',
          }}
        >
          <Plus size={12} /> Tambah sub-task
        </button>
      )}
    </div>
  );
}
