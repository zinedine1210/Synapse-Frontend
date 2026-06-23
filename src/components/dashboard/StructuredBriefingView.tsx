'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import {
  parseBriefingSections,
  buildTaskDeepLink,
  buildTodoDeepLink,
  type BriefingSectionType,
} from '@/lib/briefing-parser';

interface StructuredBriefingViewProps {
  /** Raw markdown content from briefing API with <!-- SECTION:type --> markers */
  content: string;
  /** Optional deadline data for building deep links to tasks */
  deadlines?: { id: string; title: string; className?: string; classId?: string }[];
  /** Optional todo data for building deep links to todos */
  todos?: { id: string; title: string }[];
}

/** Section types that support tappable items (Req 8.7) */
const TAPPABLE_TYPES: BriefingSectionType[] = ['tugas', 'todo'];

/**
 * StructuredBriefingView — Renders briefing content parsed from markdown section markers.
 * Requirement 8.6: Renders structured sections with icons (tugas, to-do, keuangan, kelas, tabungan)
 * Requirement 8.7: Makes task and todo items tappable with deep links to detail views
 */
export function StructuredBriefingView({ content, deadlines, todos }: StructuredBriefingViewProps) {
  const router = useRouter();
  const sections = parseBriefingSections(content);

  if (sections.length === 0) {
    // Fallback: render as plain text if no section markers found
    return (
      <div className="structured-briefing-fallback">
        <p style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.85, whiteSpace: 'pre-wrap' }}>
          {content}
        </p>
      </div>
    );
  }

  // Separate greeting and motivation from body sections
  const greetingSection = sections.find(s => s.type === 'greeting');
  const motivationSection = sections.find(s => s.type === 'motivasi');
  const bodySections = sections.filter(s => s.type !== 'greeting' && s.type !== 'motivasi');

  const isTappable = (type: BriefingSectionType) => TAPPABLE_TYPES.includes(type);

  const getLink = (type: BriefingSectionType, text: string): string | null => {
    if (type === 'tugas') return buildTaskDeepLink(text, deadlines);
    if (type === 'todo') return buildTodoDeepLink(text, todos);
    return null;
  };

  const handleNavigate = (link: string) => {
    router.push(link);
  };

  return (
    <div className="structured-briefing" role="region" aria-label="Daily Briefing">
      {/* Greeting */}
      {greetingSection && (
        <div className="structured-briefing-greeting">
          {greetingSection.items.map((item, i) => (
            <p key={i}>{item.text}</p>
          ))}
        </div>
      )}

      {/* Body sections */}
      {bodySections.length > 0 && (
        <div className="structured-briefing-body">
          {bodySections.map((section, i) => (
            <div key={`${section.type}-${i}`} className="structured-briefing-section">
              <div className="structured-briefing-section-header">
                <span className="structured-briefing-section-icon" aria-hidden="true">
                  {section.icon}
                </span>
                <span className="structured-briefing-section-title">{section.title}</span>
              </div>
              <ul className="structured-briefing-list">
                {section.items.map((item, j) => {
                  const tappable = isTappable(section.type);
                  const link = tappable ? getLink(section.type, item.text) : null;

                  if (link && tappable) {
                    return (
                      <li key={j} className="structured-briefing-item structured-briefing-item--tappable">
                        <button
                          type="button"
                          className="structured-briefing-item-btn"
                          onClick={() => handleNavigate(link)}
                          aria-label={`Lihat detail: ${item.text}`}
                        >
                          <span className="structured-briefing-item-text">{item.text}</span>
                          <ChevronRight size={12} className="structured-briefing-item-chevron" aria-hidden="true" />
                        </button>
                      </li>
                    );
                  }

                  return (
                    <li key={j} className="structured-briefing-item">
                      <span>{item.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Motivation */}
      {motivationSection && (
        <div className="structured-briefing-motivation">
          <span aria-hidden="true">💬</span>
          {motivationSection.items.map((item, i) => (
            <span key={i}>{item.text}</span>
          ))}
        </div>
      )}

      <style jsx>{`
        .structured-briefing {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .structured-briefing-greeting {
          font-size: 13px;
          line-height: 1.5;
          opacity: 0.8;
          margin-bottom: 14px;
        }
        .structured-briefing-greeting p {
          margin: 0;
        }
        .structured-briefing-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .structured-briefing-section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .structured-briefing-section-icon {
          font-size: 15px;
          line-height: 1;
        }
        .structured-briefing-section-title {
          font-size: 13px;
          font-weight: 700;
        }
        .structured-briefing-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .structured-briefing-item {
          position: relative;
          font-size: 13px;
          line-height: 1.5;
          padding-left: 16px;
          opacity: 0.9;
        }
        .structured-briefing-item::before {
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
        .structured-briefing-item--tappable {
          padding-left: 0;
        }
        .structured-briefing-item--tappable::before {
          display: none;
        }
        .structured-briefing-item-btn {
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
        .structured-briefing-item-btn:hover {
          background: rgba(var(--color-primary), 0.09);
          border-color: rgba(var(--color-primary), 0.15);
        }
        .structured-briefing-item-btn:active {
          background: rgba(var(--color-primary), 0.14);
          transform: scale(0.98);
        }
        .structured-briefing-item-text {
          flex: 1;
          min-width: 0;
        }
        .structured-briefing-item-chevron {
          flex-shrink: 0;
          opacity: 0.4;
          transition: opacity 0.15s ease, transform 0.15s ease;
        }
        .structured-briefing-item-btn:hover .structured-briefing-item-chevron {
          opacity: 0.7;
          transform: translateX(2px);
        }
        .structured-briefing-motivation {
          margin-top: 14px;
          padding: 10px 12px;
          border-radius: var(--radius-md, 10px);
          background: rgba(var(--color-primary), 0.06);
          border: 1px solid rgba(var(--color-primary), 0.12);
          font-size: 13px;
          font-style: italic;
          line-height: 1.5;
          opacity: 0.9;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        @media (prefers-reduced-motion: reduce) {
          .structured-briefing-item-btn,
          .structured-briefing-item-btn:active {
            transition: none;
            transform: none;
          }
          .structured-briefing-item-chevron,
          .structured-briefing-item-btn:hover .structured-briefing-item-chevron {
            transition: none;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
