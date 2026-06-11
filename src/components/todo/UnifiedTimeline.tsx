'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, BookOpen, CheckSquare, Clock } from 'lucide-react';
import { todoService, UnifiedTimelineItem } from '@/services/todoService';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Hari Ini';
  if (d.toDateString() === tomorrow.toDateString()) return 'Besok';
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
}

function groupByDate(items: UnifiedTimelineItem[]): Record<string, UnifiedTimelineItem[]> {
  const groups: Record<string, UnifiedTimelineItem[]> = {};
  for (const item of items) {
    const key = item.dueDate ? new Date(item.dueDate).toDateString() : 'no-date';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export function UnifiedTimeline() {
  const [items, setItems] = useState<UnifiedTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await todoService.getUnifiedTimeline();
        setItems(data);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat timeline');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3].map(n => (
          <div key={n} className="skeleton" style={{ height: 48, borderRadius: 10 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 20, opacity: 0.5, fontSize: 13 }}>
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 24, opacity: 0.5 }}>
        <Calendar size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
        <p style={{ fontSize: 13 }}>Tidak ada deadline mendatang</p>
      </div>
    );
  }

  const grouped = groupByDate(items);
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === 'no-date') return 1;
    if (b === 'no-date') return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {sortedKeys.map(dateKey => {
        const dateItems = grouped[dateKey];
        const displayDate = dateKey === 'no-date'
          ? 'Tanpa Tanggal'
          : formatDate(dateItems[0].dueDate!);
        const isToday = dateKey === new Date().toDateString();

        return (
          <div key={dateKey}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isToday ? 'rgb(var(--color-primary))' : 'var(--border-default)',
              }} />
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: isToday ? 'rgb(var(--color-primary))' : 'inherit',
                letterSpacing: 0.3,
              }}>
                {displayDate}
              </span>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginLeft: 16,
              borderLeft: '2px solid var(--border-default)',
              paddingLeft: 12,
            }}>
              {dateItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  {/* Type icon */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: item.type === 'class' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    flexShrink: 0,
                  }}>
                    {item.type === 'class' ? (
                      <BookOpen size={14} style={{ color: '#6366f1' }} />
                    ) : (
                      <CheckSquare size={14} style={{ color: '#10b981' }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textDecoration: item.status === 'done' ? 'line-through' : 'none',
                      opacity: item.status === 'done' ? 0.5 : 1,
                    }}>
                      {item.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      {item.type === 'class' && item.className && (
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontWeight: 500 }}>
                          {item.className}
                        </span>
                      )}
                      {item.type === 'personal' && item.category && (
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--input-bg)', fontWeight: 500 }}>
                          {item.category}
                        </span>
                      )}
                      {item.dueTime && (
                        <span style={{ fontSize: 10, opacity: 0.5, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={9} /> {item.dueTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Priority indicator */}
                  {item.priority && (
                    <div style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: item.priority === 'high' ? 'var(--color-error)' : item.priority === 'medium' ? 'var(--color-warning)' : 'var(--color-success)',
                      flexShrink: 0,
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
