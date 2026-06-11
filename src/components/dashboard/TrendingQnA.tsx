'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { TrendingQuestion } from '@/services/dashboardService';
import { TrendingUp, MessageCircle, Eye, ArrowRight } from 'lucide-react';

interface TrendingQnAProps {
  questions: TrendingQuestion[];
}

/**
 * Trending Q&A section showing 2-3 questions with highest answer upvotes in 7 days.
 * Requirement 21.4
 */
export function TrendingQnA({ questions }: TrendingQnAProps) {
  if (!questions || questions.length === 0) return null;

  return (
    <Card style={{ marginBottom: 16, padding: '18px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <TrendingUp size={16} style={{ color: '#f59e0b' }} /> Trending Q&A
        </h3>
        <Link href="/qna" style={{ fontSize: 12, color: 'rgb(var(--color-primary))', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, opacity: 0.8 }}>
          Lihat semua <ArrowRight size={12} />
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {questions.slice(0, 3).map((q, idx) => (
          <Link
            key={q.id}
            href={q.slug ? `/qna/${q.slug}` : '/qna'}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'var(--input-bg)',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
                border: '1px solid transparent',
              }}
              className="trending-qna-item"
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : '#cd7f32',
                  flexShrink: 0,
                  width: 18,
                  textAlign: 'center',
                }}>
                  #{idx + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {q.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    {q.category && (
                      <span style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'rgba(var(--color-primary), 0.08)',
                        color: 'rgb(var(--color-primary))',
                        fontWeight: 500,
                      }}>
                        {q.category}
                      </span>
                    )}
                    <span style={{ fontSize: 11, opacity: 0.4, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <MessageCircle size={10} /> {q._count.answers}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.4, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Eye size={10} /> {q.viewCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: 8, fontSize: 11, opacity: 0.35, textAlign: 'center' }}>
        Pertanyaan populer 7 hari terakhir
      </div>
    </Card>
  );
}
