'use client';

import React, { useState, useEffect } from 'react';
import {
  X, CheckCircle2, Circle, Trash2, RefreshCw,
  Timer, Tag, Share2, AlertTriangle, ListChecks,
  Loader2, Save, Bell, Users,
} from 'lucide-react';
import { PersonalTodo } from '@/services/todoService';
import { Button, TextInput, TextArea, SelectOption, DateTimePicker, CategoryPicker } from '@/components/ui';
import { SubtaskList } from '@/components/todo/SubtaskList';
import { RecurrenceSelector } from '@/components/todo/RecurrenceSelector';

const PRIORITY_OPTIONS = [
  { id: 'high', label: 'Tinggi', emoji: '🔥', color: '#ef4444' },
  { id: 'medium', label: 'Sedang', emoji: '⚡', color: '#f59e0b' },
  { id: 'low', label: 'Rendah', emoji: '🌿', color: '#10b981' },
];

const EVENT_TYPE_OPTIONS = [
  { id: 'meeting', label: 'Meeting', emoji: '💼', color: '#f59e0b' },
  { id: 'kuliah', label: 'Kuliah', emoji: '🎓', color: '#6366f1' },
  { id: 'ujian', label: 'Ujian', emoji: '📝', color: '#ef4444' },
  { id: 'penting', label: 'Penting', emoji: '⭐', color: '#ec4899' },
  { id: 'lainnya', label: 'Lainnya', emoji: '📌', color: '#6b7280' },
];

const REMINDER_OPTIONS = [
  { value: 5, label: '5 menit' },
  { value: 15, label: '15 menit' },
  { value: 30, label: '30 menit' },
  { value: 60, label: '1 jam' },
  { value: 1440, label: '1 hari' },
];

interface CatInfo { id: string; label: string; emoji?: string; color: string; }
interface CategoryOption { id: string; label: string; emoji?: string; color?: string; }

interface TodoDetailModalProps {
  todo: PersonalTodo;
  categories: CategoryOption[];
  catInfo: CatInfo;
  onClose: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onFocus?: () => void;
  onSave: (updates: Partial<PersonalTodo>) => Promise<void>;
  onAddSubtask: (title: string) => Promise<void>;
  onToggleSubtask: (subId: string, isDone: boolean) => Promise<void>;
  onDeleteSubtask?: (subId: string) => Promise<void>;
  onShare: (email: string, role: string) => Promise<void>;
  onUnshare: (userId: string) => Promise<void>;
  sharedUsers: any[];
  sharingLoading?: boolean;
}

export function TodoDetailModal({
  todo, categories, catInfo, onClose, onToggle, onDelete, onFocus, onSave,
  onAddSubtask, onToggleSubtask, onDeleteSubtask,
  onShare, onUnshare, sharedUsers, sharingLoading,
}: TodoDetailModalProps) {
  const done = todo.status === 'done';
  const isEvent = todo.type === 'event';
  const isOverdue = !!todo.dueDate && todo.status === 'pending' && new Date(todo.dueDate) < new Date();
  const subtasks = todo.subtasks || [];
  const hasSubtasks = subtasks.length > 0;
  const doneSubs = subtasks.filter(s => s.isDone).length;

  // Editable state
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description || '');
  const [priority, setPriority] = useState(todo.priority);
  const [category, setCategory] = useState(todo.category || '');
  const [dueDate, setDueDate] = useState(todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '');
  const [dueTime, setDueTime] = useState(todo.dueTime || '');
  const [startTime, setStartTime] = useState(todo.startTime || '');
  const [endTime, setEndTime] = useState(todo.endTime || '');
  const [location, setLocation] = useState(todo.location || '');
  const [eventType, setEventType] = useState(todo.eventType || '');
  const [recurrence, setRecurrence] = useState<'daily' | 'weekly' | 'monthly' | null>(todo.recurrence || null);
  const [reminderMinutes, setReminderMinutes] = useState<number[]>(todo.reminderMinutes || []);
  const [tags, setTags] = useState<string[]>(todo.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Share state
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('viewer');
  const [shareLoading, setShareLoading] = useState(false);

  // Track changes
  useEffect(() => {
    const changed = title !== todo.title || description !== (todo.description || '') ||
      priority !== todo.priority || category !== (todo.category || '') ||
      dueDate !== (todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : '') ||
      dueTime !== (todo.dueTime || '') || startTime !== (todo.startTime || '') ||
      endTime !== (todo.endTime || '') || location !== (todo.location || '') ||
      eventType !== (todo.eventType || '') || recurrence !== (todo.recurrence || null) ||
      JSON.stringify(reminderMinutes) !== JSON.stringify(todo.reminderMinutes || []) ||
      JSON.stringify(tags) !== JSON.stringify(todo.tags || []);
    setDirty(changed);
  }, [title, description, priority, category, dueDate, dueTime, startTime, endTime, location, eventType, recurrence, reminderMinutes, tags, todo]);

  const handleSave = async () => {
    if (!dirty || !title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        category: category || undefined,
        dueDate: dueDate || undefined,
        dueTime: dueTime || undefined,
        startTime: isEvent ? startTime || undefined : undefined,
        endTime: isEvent ? endTime || undefined : undefined,
        location: isEvent ? location || undefined : undefined,
        eventType: isEvent ? eventType || undefined : undefined,
        recurrence: recurrence || null,
        reminderMinutes,
        tags,
      } as any);
    } finally { setSaving(false); }
  };

  const handleShareSubmit = async () => {
    if (!shareEmail.trim()) return;
    setShareLoading(true);
    try {
      await onShare(shareEmail.trim(), shareRole);
      setShareEmail('');
    } finally { setShareLoading(false); }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(tags.filter(x => x !== tag));

  const priorityInfo = PRIORITY_OPTIONS.find(p => p.id === priority) || PRIORITY_OPTIONS[1];
  const eventTypeInfo = EVENT_TYPE_OPTIONS.find(e => e.id === eventType);

  return (
    <div
      className="todo-detail-overlay"
      style={{
        position: 'fixed', inset: 0, zIndex: 9300, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="todo-detail-panel"
        style={{
          background: 'rgb(var(--bg-base))', borderRadius: 20, padding: 0,
          width: '75vw', maxHeight: '90vh', overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
          animation: 'fadeSlideIn 0.2s ease-out',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Accent bar */}
        <div style={{
          height: 5, flexShrink: 0, borderRadius: '20px 20px 0 0',
          background: isEvent && eventTypeInfo ? eventTypeInfo.color : priorityInfo.color,
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onToggle}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}
              title={done ? 'Aktifkan kembali' : 'Tandai selesai'}
            >
              {done
                ? <CheckCircle2 size={26} style={{ color: 'rgb(var(--color-success))' }} />
                : <Circle size={26} style={{ color: priorityInfo.color, opacity: 0.6 }} />}
            </button>
            {done && (
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(var(--color-success), 0.12)', color: 'rgb(var(--color-success))', fontWeight: 700 }}>
                Selesai
              </span>
            )}
            {isOverdue && (
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'rgba(var(--color-error), 0.12)', color: 'rgb(var(--color-error))', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <AlertTriangle size={11} /> Terlambat
              </span>
            )}
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 999, fontWeight: 700,
              background: isEvent ? 'rgba(99, 102, 241, 0.1)' : 'rgba(var(--color-primary), 0.1)',
              color: isEvent ? '#6366f1' : 'rgb(var(--color-primary))',
            }}>
              {isEvent ? '📅 Jadwal' : '✅ Todo'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'var(--input-bg)', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, lineHeight: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Two-column body */}
        <div className="todo-detail-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* ─── LEFT: Form fields (like create form) ─── */}
          <div className="todo-detail-left" style={{ flex: 1, padding: '18px 22px 22px', overflowY: 'auto', borderRight: '1px solid var(--border-default)' }}>
            {/* Title */}
            <TextInput
              value={title}
              onChange={setTitle}
              placeholder="Judul task..."
              label="Judul"
              autoFocus
            />

            {/* Description */}
            <div style={{ marginTop: 14 }}>
              <TextArea
                value={description}
                onChange={setDescription}
                placeholder="Tambah deskripsi atau catatan..."
                label="Deskripsi"
                rows={5}
                minHeight={120}
                resize="vertical"
              />
            </div>

            {/* Priority */}
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.6 }}>Prioritas</label>
              <CategoryPicker
                options={PRIORITY_OPTIONS}
                value={priority}
                onChange={(v) => setPriority(v as 'high' | 'medium' | 'low')}
              />
            </div>

            {/* Category */}
            {categories.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.6 }}>Kategori</label>
                <CategoryPicker
                  options={categories}
                  value={category}
                  onChange={setCategory}
                />
              </div>
            )}

            {/* Event type (events only) */}
            {isEvent && (
              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.6 }}>Tipe Jadwal</label>
                <CategoryPicker
                  options={EVENT_TYPE_OPTIONS}
                  value={eventType}
                  onChange={setEventType}
                />
              </div>
            )}

            {/* Date & Time */}
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.6 }}>Tanggal</label>
                <DateTimePicker
                  mode="date"
                  value={dueDate}
                  onChange={setDueDate}
                  placeholder="Pilih tanggal"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.6 }}>
                  {isEvent ? 'Jam Mulai' : 'Waktu'}
                </label>
                <DateTimePicker
                  mode="time"
                  value={isEvent ? startTime : dueTime}
                  onChange={v => isEvent ? setStartTime(v) : setDueTime(v)}
                  placeholder="Pilih waktu"
                />
              </div>
            </div>

            {/* End time + location (events only) */}
            {isEvent && (
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.6 }}>Jam Selesai</label>
                  <DateTimePicker
                    mode="time"
                    value={endTime}
                    onChange={setEndTime}
                    placeholder="Selesai"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.6 }}>Lokasi</label>
                  <TextInput
                    value={location}
                    onChange={setLocation}
                    placeholder="Lokasi..."
                  />
                </div>
              </div>
            )}

            {/* Recurrence */}
            <div style={{ marginTop: 14 }}>
              <RecurrenceSelector
                value={recurrence}
                onChange={setRecurrence}
              />
            </div>

            {/* Reminder */}
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5, opacity: 0.6 }}>
                <Bell size={12} /> Pengingat
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {REMINDER_OPTIONS.map(opt => {
                  const active = reminderMinutes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setReminderMinutes(active ? reminderMinutes.filter(v => v !== opt.value) : [...reminderMinutes, opt.value])}
                      style={{
                        fontSize: 12, padding: '6px 12px', borderRadius: 10,
                        border: 'none', cursor: 'pointer',
                        background: active ? 'rgba(var(--color-primary), 0.15)' : 'var(--input-bg)',
                        color: active ? 'rgb(var(--color-primary))' : 'rgb(var(--text-muted))',
                        fontWeight: active ? 700 : 500, transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Tags, Subtasks, Share ─── */}
          <div className="todo-detail-right" style={{ width: 340, padding: '18px 22px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Tags */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5, opacity: 0.6 }}>
                <Tag size={12} /> Tags
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {tags.map(t => (
                  <span key={t} style={{
                    fontSize: 12, padding: '4px 10px', borderRadius: 10,
                    background: 'rgba(var(--color-secondary), 0.1)', color: 'rgb(var(--color-secondary))',
                    fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    {t}
                    <button onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.5, lineHeight: 0 }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Tambah tag..."
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 10,
                    border: '1px solid var(--border-default)', background: 'var(--input-bg)',
                    fontSize: 13, color: 'rgb(var(--text-primary))', outline: 'none',
                  }}
                />
                <Button onClick={addTag} variant="ghost" style={{ borderRadius: 10, flexShrink: 0, padding: '8px 12px' }}>
                  <Tag size={14} />
                </Button>
              </div>
            </div>

            {/* Subtasks */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <ListChecks size={13} style={{ opacity: 0.5 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgb(var(--text-muted))' }}>
                  Sub-task {hasSubtasks ? `(${doneSubs}/${subtasks.length})` : ''}
                </span>
              </div>
              <div style={{ background: 'var(--input-bg)', borderRadius: 12, padding: '12px 14px' }}>
                <SubtaskList
                  subtasks={subtasks}
                  todoId={todo.id}
                  onAdd={onAddSubtask}
                  onToggle={onToggleSubtask}
                  onDelete={onDeleteSubtask}
                />
              </div>
            </div>

            {/* Share */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Share2 size={13} style={{ opacity: 0.5 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgb(var(--text-muted))' }}>Bagikan</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <input
                  value={shareEmail}
                  onChange={e => setShareEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleShareSubmit(); }}
                  placeholder="Email teman..."
                  type="email"
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 10,
                    border: '1px solid var(--border-default)', background: 'var(--input-bg)',
                    fontSize: 13, color: 'rgb(var(--text-primary))', outline: 'none',
                  }}
                />
                <SelectOption
                  value={shareRole}
                  onChange={setShareRole}
                  options={[{ value: 'viewer', label: '👁 View' }, { value: 'editor', label: '✏️ Edit' }]}
                />
              </div>
              <Button
                onClick={handleShareSubmit}
                disabled={shareLoading || !shareEmail.trim()}
                style={{ width: '100%', borderRadius: 10, justifyContent: 'center', marginBottom: 10 }}
              >
                {shareLoading ? <Loader2 size={14} className="spin" /> : 'Kirim Undangan'}
              </Button>

              {/* Shared users list */}
              {sharedUsers.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <Users size={12} style={{ opacity: 0.4 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgb(var(--text-muted))' }}>
                      Dibagikan ke ({sharedUsers.length})
                    </span>
                  </div>
                  {sharedUsers.map((s: any) => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      borderRadius: 10, background: 'var(--input-bg)',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: s.user?.avatarUrl ? `url(${s.user.avatarUrl}) center/cover` : 'rgba(var(--color-primary), 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: 'rgb(var(--color-primary))',
                        flexShrink: 0,
                      }}>
                        {!s.user?.avatarUrl && (s.user?.fullName || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.user?.fullName || s.user?.email}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'rgb(var(--text-muted))' }}>
                          {s.role === 'editor' ? '✏️ Editor' : '👁 Viewer'}
                          {!s.accepted && <span style={{ color: 'rgb(var(--color-warning))', marginLeft: 4 }}>⏳ Pending</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => onUnshare(s.user?.id || s.userId)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, padding: 4, lineHeight: 0 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer action bar */}
        <div style={{
          display: 'flex', gap: 8, padding: '12px 22px', borderTop: '1px solid var(--border-default)',
          background: 'rgb(var(--bg-surface))', flexShrink: 0, alignItems: 'center',
        }}>
          {dirty && (
            <Button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              variant="primary"
              style={{ borderRadius: 12, justifyContent: 'center', minWidth: 120 }}
            >
              {saving ? <Loader2 size={14} className="spin" /> : <><Save size={14} /> Simpan Perubahan</>}
            </Button>
          )}
          {!dirty && (
            <span style={{ fontSize: 12, color: 'rgb(var(--text-muted))', opacity: 0.6 }}>
              Tidak ada perubahan
            </span>
          )}
          <div style={{ flex: 1 }} />
          {onFocus && !done && (
            <Button onClick={() => { onFocus(); onClose(); }} variant="ghost" style={{ borderRadius: 10 }}>
              <Timer size={14} /> Fokus
            </Button>
          )}
          <Button
            onClick={() => { onDelete(); onClose(); }}
            variant="danger"
            style={{ borderRadius: 10 }}
          >
            <Trash2 size={14} /> Hapus
          </Button>
        </div>
      </div>
    </div>
  );
}
