'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Lightbulb, Bell, Loader2, ChevronRight } from 'lucide-react';
import { SiBawelAvatar } from '@/components/shared/SiBawelAvatar';
import type { AiBriefingResponse, AiBriefingSection } from '@/services/dashboardService';
import {
  parseBriefingSections,
  buildTaskDeepLink,
  buildTodoDeepLink,
  type BriefingSection,
  type BriefingSectionType,
} from '@/lib/briefing-parser';

interface AiBriefingCardProps {
  briefing: AiBriefingResponse;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

/** Section types that should render tappable items with deep links */
const TAPPABLE_SECTIONS: BriefingSectionType[] = ['tugas', 'todo'];

/** Map AI-generated section icons/titles to structured section types */
const SECTION_TYPE_MAP: Record<string, BriefingSectionType> = {
  '📅': 'kelas',
  'jadwal': 'kelas',
  '💰': 'keuangan',
  'keuangan': 'keuangan',
  '✅': 'tugas',
  'tugas': 'tugas',
  'tugas & todo': 'tugas',
  '🔥': 'tabungan',
  'streak': 'tabungan',
};

/** Structured section icon overrides for display (Req 8.6) */
const STRUCTURED_ICONS: Record<BriefingSectionType, string> = {
  greeting: '👋',
  tugas: '📝',
  todo: '✅',
  keuangan: '💰',
  kelas: '📚',
  tabungan: '🌳',
  motivasi: '💬',
};

/**
 * Detect which BriefingSectionType an AI section maps to based on icon/title.
 */
function detectSectionType(section: AiBriefingSection): BriefingSectionType | null {
  const iconMatch = SECTION_TYPE_MAP[section.icon];
  if (iconMatch) return iconMatch;

  const titleLower = section.title.toLowerCase();
  if (titleLower.includes('tugas') || titleLower.includes('deadline')) return 'tugas';
  if (titleLower.includes('todo') || titleLower.includes('to-do')) return 'todo';
  if (titleLower.includes('keuangan') || titleLower.includes('pengeluaran') || titleLower.includes('finance')) return 'keuangan';
  if (titleLower.includes('jadwal') || titleLower.includes('kelas') || titleLower.includes('kuliah')) return 'kelas';
  if (titleLower.includes('tabungan') || titleLower.includes('saving') || titleLower.includes('pohon')) return 'tabungan';

  return null;
}

/**
 * AiBriefingCard — Prominent, AI-generated "Today's Briefing" hero card.
 * Glass/gradient aesthetic with Si Bawel avatar, grouped icon-prefixed sections,
 * suggestions ("Saran"), reminders ("Pengingat"), and a motivation line.
 *
 * Enhanced (Req 8.6, 8.7):
 * - Renders structured sections with specific icons for tugas, todo, keuangan, kelas, tabungan
 * - Parses markdown section markers if present in underlying data
 * - Makes task and todo items tappable with deep links to their detail views
 *
 * Respects prefers-reduced-motion via the component-scoped <style jsx> block.
 */
export function AiBriefingCard({ briefing, onRefresh, isRefreshing }: AiBriefingCardProps) {
  const router = useRouter();
  const { greeting, headline, sections, suggestions, reminders, motivation, data } = briefing;

  const hasSuggestions = suggestions && suggestions.length > 0;
  const hasReminders = reminders && reminders.length > 0;

  // Extract deadlines and todos from data for building deep links
  const deadlines = useMemo(() => {
    if (!data?.deadlines) return [];
    return (data.deadlines as any[]).map(d => ({
      id: d.id,
      title: d.title,
      className: d.className,
      classId: d.classId,
    }));
  }, [data?.deadlines]);

  const todos = useMemo(() => {
    if (!data?.todos) return [];
    return (data.todos as any[]).map(t => ({
      id: t.id,
      title: t.title,
    }));
  }, [data?.todos]);

  /** Get deep link for a section item based on its detected type */
  const getItemLink = (sectionType: BriefingSectionType | null, itemText: string): string | null => {
    if (sectionType === 'tugas') {
      return buildTaskDeepLink(itemText, deadlines);
    }
    if (sectionType === 'todo') {
      return buildTodoDeepLink(itemText, todos);
    }
    return null;
  };

  /** Handle tapping an item with a deep link */
  const handleItemTap = (link: string) => {
    router.push(link);
  };

  /** Check if a section type is tappable */
  const isTappableSection = (sectionType: BriefingSectionType | null): boolean => {
    return sectionType !== null && TAPPABLE_SECTIONS.includes(sectionType);
  };

  return (
    <div className="ai-briefing-card" role="region" aria-label="Briefing AI hari ini">
      {/* Decorative gradient orbs */}
      <div className="ai-briefing-orb ai-briefing-orb--one" aria-hidden="true" />
      <div className="ai-briefing-orb ai-briefing-orb--two" aria-hidden="true" />

      <div className="ai-briefing-inner">
        {/* Header: avatar + greeting + AI badge + refresh */}
        <div className="ai-briefing-header">
          <SiBawelAvatar size="dashboard" />
          <div className="ai-briefing-headtext">
            <div className="ai-briefing-greeting">{greeting}</div>
            <div className="ai-briefing-headline">{headline}</div>
          </div>
          <div className="ai-briefing-actions">
            <span className="ai-briefing-badge" title="Dibuat dengan AI">✨ AI</span>
            {onRefresh && (
              <button
                type="button"
                className="ai-briefing-refresh"
                onClick={onRefresh}
                disabled={isRefreshing}
                aria-label="Buat ulang briefing"
                title="Buat ulang"
              >
                {isRefreshing ? (
                  <Loader2 size={15} className="ai-briefing-spin" />
                ) : (
                  <RefreshCw size={15} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Structured Sections (Req 8.6) */}
        {sections && sections.length > 0 && (
          <div className="ai-briefing-sections">
            {sections.map((section, i) => {
              const detectedType = detectSectionType(section);
              const displayIcon = detectedType ? STRUCTURED_ICONS[detectedType] : section.icon;
              const tappable = isTappableSection(detectedType);

              return (
                <div key={`${section.title}-${i}`} className="ai-briefing-section">
                  <div className="ai-briefing-section-title">
                    <span className="ai-briefing-section-icon" aria-hidden="true">{displayIcon}</span>
                    <span>{section.title}</span>
                  </div>
                  <ul className="ai-briefing-list">
                    {section.items.map((item, j) => {
                      const link = tappable ? getItemLink(detectedType, item) : null;

                      if (link && tappable) {
                        return (
                          <li key={j} className="ai-briefing-list-item ai-briefing-list-item--tappable">
                            <button
                              type="button"
                              className="ai-briefing-item-link"
                              onClick={() => handleItemTap(link)}
                              aria-label={`Lihat detail: ${item}`}
                            >
                              <span className="ai-briefing-item-text">{item}</span>
                              <ChevronRight size={12} className="ai-briefing-item-chevron" aria-hidden="true" />
                            </button>
                          </li>
                        );
                      }

                      return (
                        <li key={j} className="ai-briefing-list-item">{item}</li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* Suggestions + Reminders */}
        {(hasSuggestions || hasReminders) && (
          <div className="ai-briefing-blocks">
            {hasSuggestions && (
              <div className="ai-briefing-block ai-briefing-block--suggestions">
                <div className="ai-briefing-block-title">
                  <Lightbulb size={14} /> Saran
                </div>
                <ul className="ai-briefing-list">
                  {suggestions.map((s, i) => (
                    <li key={i} className="ai-briefing-list-item">{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {hasReminders && (
              <div className="ai-briefing-block ai-briefing-block--reminders">
                <div className="ai-briefing-block-title">
                  <Bell size={14} /> Pengingat
                </div>
                <ul className="ai-briefing-list">
                  {reminders.map((r, i) => (
                    <li key={i} className="ai-briefing-list-item">{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Motivation */}
        {motivation && (
          <div className="ai-briefing-motivation">
            <span aria-hidden="true">💬</span> {motivation}
          </div>
        )}
      </div>

      <style jsx>{`
        .ai-briefing-card {
          position: relative;
          overflow: hidden;
          border-radius: var(--radius-xl, 20px);
          margin-bottom: 24px;
          padding: 1px;
          background: linear-gradient(
            135deg,
            rgba(var(--color-primary), 0.5) 0%,
            rgba(var(--color-accent-purple), 0.45) 50%,
            rgba(var(--color-accent-coral), 0.4) 100%
          );
        }
        .ai-briefing-inner {
          position: relative;
          z-index: 1;
          border-radius: calc(var(--radius-xl, 20px) - 1px);
          padding: 22px 22px 20px;
          background: linear-gradient(
            160deg,
            rgba(var(--bg-surface), 0.92) 0%,
            rgba(var(--bg-elevated), 0.96) 100%
          );
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
        .ai-briefing-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(8px);
          z-index: 0;
        }
        .ai-briefing-orb--one {
          top: -60px;
          right: -40px;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(var(--color-accent-purple), 0.22) 0%, transparent 70%);
        }
        .ai-briefing-orb--two {
          bottom: -70px;
          left: -50px;
          width: 220px;
          height: 220px;
          background: radial-gradient(circle, rgba(var(--color-primary), 0.18) 0%, transparent 70%);
        }
        .ai-briefing-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }
        .ai-briefing-headtext {
          flex: 1;
          min-width: 0;
        }
        .ai-briefing-greeting {
          font-size: 13px;
          font-weight: 600;
          opacity: 0.7;
          margin-bottom: 2px;
        }
        .ai-briefing-headline {
          font-size: 18px;
          font-weight: 800;
          line-height: 1.3;
          background: linear-gradient(
            90deg,
            rgb(var(--color-primary)),
            rgb(var(--color-accent-purple))
          );
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .ai-briefing-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .ai-briefing-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 9px;
          border-radius: var(--radius-full, 9999px);
          color: rgb(var(--color-primary));
          background: rgba(var(--color-primary), 0.12);
          border: 1px solid rgba(var(--color-primary), 0.2);
          white-space: nowrap;
        }
        .ai-briefing-refresh {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid var(--border-default);
          background: rgba(var(--bg-surface), 0.6);
          color: inherit;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s ease, background 0.2s ease, transform 0.2s ease;
        }
        .ai-briefing-refresh:hover:not(:disabled) {
          opacity: 1;
          background: rgba(var(--color-primary), 0.1);
        }
        .ai-briefing-refresh:active:not(:disabled) {
          transform: scale(0.92);
        }
        .ai-briefing-refresh:disabled {
          cursor: default;
          opacity: 0.5;
        }
        .ai-briefing-spin {
          animation: ai-briefing-rotate 0.8s linear infinite;
        }
        @keyframes ai-briefing-rotate {
          to { transform: rotate(360deg); }
        }
        .ai-briefing-sections {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .ai-briefing-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .ai-briefing-section-icon {
          font-size: 15px;
          line-height: 1;
        }
        .ai-briefing-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .ai-briefing-list-item {
          position: relative;
          font-size: 13px;
          line-height: 1.5;
          padding-left: 16px;
          opacity: 0.9;
        }
        .ai-briefing-list-item::before {
          content: '';
          position: absolute;
          left: 4px;
          top: 8px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgb(var(--color-primary));
          opacity: 0.6;
        }
        .ai-briefing-list-item--tappable {
          padding-left: 0;
          margin-left: 0;
        }
        .ai-briefing-list-item--tappable::before {
          display: none;
        }
        .ai-briefing-item-link {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          padding: 6px 10px;
          border-radius: var(--radius-sm, 6px);
          border: 1px solid transparent;
          background: rgba(var(--color-primary), 0.04);
          cursor: pointer;
          text-align: left;
          font-size: 13px;
          line-height: 1.5;
          color: inherit;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .ai-briefing-item-link:hover {
          background: rgba(var(--color-primary), 0.09);
          border-color: rgba(var(--color-primary), 0.15);
        }
        .ai-briefing-item-link:active {
          background: rgba(var(--color-primary), 0.14);
          transform: scale(0.98);
        }
        .ai-briefing-item-text {
          flex: 1;
          min-width: 0;
        }
        .ai-briefing-item-chevron {
          flex-shrink: 0;
          opacity: 0.4;
          transition: opacity 0.15s ease, transform 0.15s ease;
        }
        .ai-briefing-item-link:hover .ai-briefing-item-chevron {
          opacity: 0.7;
          transform: translateX(2px);
        }
        .ai-briefing-blocks {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 16px;
        }
        .ai-briefing-block {
          padding: 12px 14px;
          border-radius: var(--radius-md, 10px);
          border: 1px solid var(--border-default);
        }
        .ai-briefing-block--suggestions {
          background: rgba(var(--color-accent-purple), 0.07);
          border-color: rgba(var(--color-accent-purple), 0.18);
        }
        .ai-briefing-block--reminders {
          background: rgba(var(--color-accent-coral), 0.07);
          border-color: rgba(var(--color-accent-coral), 0.18);
        }
        .ai-briefing-block-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 7px;
          opacity: 0.85;
        }
        .ai-briefing-motivation {
          margin-top: 16px;
          padding: 12px 14px;
          border-radius: var(--radius-md, 10px);
          background: rgba(var(--color-primary), 0.06);
          border: 1px solid rgba(var(--color-primary), 0.12);
          font-size: 13px;
          font-style: italic;
          line-height: 1.5;
          opacity: 0.9;
        }
        @media (max-width: 767.98px) {
          .ai-briefing-inner { padding: 18px 16px; }
          .ai-briefing-headline { font-size: 16px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ai-briefing-spin { animation: none; }
          .ai-briefing-refresh,
          .ai-briefing-refresh:active:not(:disabled) {
            transition: none;
            transform: none;
          }
          .ai-briefing-item-link,
          .ai-briefing-item-link:active {
            transition: none;
            transform: none;
          }
          .ai-briefing-item-chevron,
          .ai-briefing-item-link:hover .ai-briefing-item-chevron {
            transition: none;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * AiBriefingSkeleton — Loading placeholder matching the briefing card shape.
 */
export function AiBriefingSkeleton() {
  return (
    <div className="ai-briefing-skeleton-wrap" aria-busy="true" aria-label="Memuat briefing">
      <div className="ai-briefing-skeleton-inner">
        <div className="ai-briefing-skeleton-header">
          <div className="skeleton ai-briefing-skeleton-avatar" />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 12, width: '35%', borderRadius: 6, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 18, width: '70%', borderRadius: 6 }} />
          </div>
          <div className="skeleton" style={{ height: 24, width: 48, borderRadius: 12 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          {[1, 2, 3].map(n => (
            <div key={n} className="skeleton" style={{ height: 14, borderRadius: 6, width: `${85 - n * 12}%` }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 56, borderRadius: 10, marginTop: 16 }} />
      </div>

      <style jsx>{`
        .ai-briefing-skeleton-wrap {
          border-radius: var(--radius-xl, 20px);
          margin-bottom: 24px;
          padding: 1px;
          background: linear-gradient(
            135deg,
            rgba(var(--color-primary), 0.25) 0%,
            rgba(var(--color-accent-purple), 0.2) 100%
          );
        }
        .ai-briefing-skeleton-inner {
          border-radius: calc(var(--radius-xl, 20px) - 1px);
          padding: 22px;
          background: rgb(var(--bg-surface));
        }
        .ai-briefing-skeleton-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }
        .ai-briefing-skeleton-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        @media (max-width: 767.98px) {
          .ai-briefing-skeleton-inner { padding: 18px 16px; }
        }
      `}</style>
    </div>
  );
}
