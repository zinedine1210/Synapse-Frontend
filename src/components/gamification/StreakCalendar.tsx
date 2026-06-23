'use client';

import React, { useMemo } from 'react';
import { Card } from '@/components/ui';
import { Flame } from 'lucide-react';

interface StreakCalendarProps {
  /** Map of date string (YYYY-MM-DD) → activity count (or boolean-like) */
  activityMap: Record<string, number>;
  /** Current streak days */
  currentStreak: number;
  /** Longest streak ever */
  longestStreak: number;
}

// const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function getIntensityColor(count: number): string {
  if (count === 0) return 'var(--input-bg)';
  if (count === 1) return 'rgba(var(--color-success), 0.25)';
  if (count <= 3) return 'rgba(var(--color-success), 0.5)';
  if (count <= 5) return 'rgba(var(--color-success), 0.75)';
  return 'rgb(var(--color-success))';
}

export function StreakCalendar({ activityMap, currentStreak, longestStreak }: StreakCalendarProps) {
  // Generate last 90 days grid (13 weeks)
  const weeks = useMemo(() => {
    const result: { date: string; count: number; isToday: boolean }[][] = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 89); // 90 days back
    // Align to start of week (Sunday)
    startDate.setDate(startDate.getDate() - startDate.getDay());

    let currentWeek: { date: string; count: number; isToday: boolean }[] = [];
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // end of this week

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const isToday = dateStr === today.toISOString().split('T')[0];
      currentWeek.push({
        date: dateStr,
        count: activityMap[dateStr] || 0,
        isToday,
      });
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) result.push(currentWeek);
    return result;
  }, [activityMap]);

  const totalDaysActive = Object.values(activityMap).filter(v => v > 0).length;

  return (
    <Card style={{ padding: 18, marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flame size={16} style={{ color: '#ff6400' }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Streak Calendar</h3>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Flame size={12} style={{ color: '#ff6400' }} />
            <span style={{ fontWeight: 700 }}>{currentStreak}</span> hari
          </span>
          <span style={{ opacity: 0.5 }}>Best: {longestStreak}</span>
        </div>
      </div>

      {/* Day labels */}
      <div style={{ display: 'flex', gap: 2 }}>
        <div style={{ width: 28, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, marginRight: 4 }}>
          {DAYS_ID.map((d, i) => (
            <div key={d} style={{ height: 14, fontSize: 9, opacity: i % 2 === 1 ? 0.5 : 0, lineHeight: '14px' }}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'flex', gap: 2, flex: 1, overflow: 'hidden' }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              {week.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count} aktivitas`}
                  style={{
                    width: '100%',
                    paddingTop: '100%', // square
                    borderRadius: 3,
                    background: getIntensityColor(day.count),
                    position: 'relative',
                    border: day.isToday ? '2px solid rgb(var(--color-primary))' : 'none',
                    boxSizing: 'border-box',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <span style={{ fontSize: 11, opacity: 0.5 }}>{totalDaysActive} hari aktif (90 hari terakhir)</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, opacity: 0.6 }}>
          <span>Sedikit</span>
          {[0, 1, 3, 5, 7].map(n => (
            <div key={n} style={{ width: 10, height: 10, borderRadius: 2, background: getIntensityColor(n) }} />
          ))}
          <span>Banyak</span>
        </div>
      </div>
    </Card>
  );
}
