'use client';

import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, Check, Tag, DollarSign, Calendar, FileText } from 'lucide-react';
import { duitTrackerService } from '@/services/duitTrackerService';

interface ParsedField {
  value: string | number | null;
  confident: boolean;
}

interface ParseResult {
  label: ParsedField;
  category: ParsedField;
  amount: ParsedField;
  date: ParsedField;
  type: ParsedField;
}

interface ParsePreviewProps {
  /** The input text to parse */
  inputText: string;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Called when parse completes, so parent can use parsed data */
  onParseResult?: (result: any) => void;
}

/**
 * ParsePreview — Live parse result display with 300ms debounce.
 * Shows detected fields (description, category, amount, date) from AI parser.
 * Uncertain fields are displayed with a gray/question mark indicator.
 */
export function ParsePreview({
  inputText,
  debounceMs = 300,
  onParseResult,
}: ParsePreviewProps) {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't parse empty input
    if (!inputText.trim()) {
      setResult(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      // Abort previous request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      try {
        const parsed = await duitTrackerService.parseNaturalInput(inputText.trim());

        // Transform API response into ParseResult with confidence indicators
        const parseResult: ParseResult = {
          label: {
            value: parsed.label || null,
            confident: !!parsed.label && parsed.label !== inputText.trim(),
          },
          category: {
            value: parsed.category || null,
            confident: !!parsed.category && parsed.category !== 'lainnya',
          },
          amount: {
            value: parsed.amount || null,
            confident: !!parsed.amount && parsed.amount > 0,
          },
          date: {
            value: parsed.date || null,
            confident: !!parsed.date,
          },
          type: {
            value: parsed.type || 'expense',
            confident: !!parsed.type,
          },
        };

        setResult(parseResult);
        setLoading(false);
        onParseResult?.(parsed);
      } catch (err: any) {
        // Ignore aborted requests
        if (err?.name === 'AbortError') return;
        setResult(null);
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputText, debounceMs, onParseResult]);

  // Don't render if no input
  if (!inputText.trim()) return null;

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 12,
          background: 'var(--input-bg)',
          border: '1px solid var(--border-default)',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          className="spin"
          style={{
            width: 14,
            height: 14,
            border: '2px solid var(--border-default)',
            borderTopColor: 'rgb(var(--color-primary))',
            borderRadius: '50%',
          }}
        />
        <span style={{ fontSize: 12, opacity: 0.5 }}>Menganalisis input...</span>
      </div>
    );
  }

  // No result yet
  if (!result) return null;

  const fields = [
    {
      icon: <FileText size={12} />,
      label: 'Deskripsi',
      value: result.label.value,
      confident: result.label.confident,
    },
    {
      icon: <Tag size={12} />,
      label: 'Kategori',
      value: result.category.value,
      confident: result.category.confident,
    },
    {
      icon: <DollarSign size={12} />,
      label: 'Jumlah',
      value: result.amount.value
        ? `Rp ${Number(result.amount.value).toLocaleString('id-ID')}`
        : null,
      confident: result.amount.confident,
    },
    {
      icon: <Calendar size={12} />,
      label: 'Tanggal',
      value: result.date.value
        ? new Date(result.date.value as string).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
          })
        : 'Hari ini',
      confident: result.date.confident,
    },
  ];

  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 12,
        background: 'var(--input-bg)',
        border: '1px solid var(--border-default)',
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 10,
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          opacity: 0.5,
        }}
      >
        <Check size={10} />
        Preview Parsing
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {fields.map((field) => (
          <div
            key={field.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 8,
              background: field.confident
                ? 'rgba(var(--color-primary), 0.06)'
                : 'rgba(128, 128, 128, 0.06)',
              border: `1px solid ${
                field.confident
                  ? 'rgba(var(--color-primary), 0.15)'
                  : 'rgba(128, 128, 128, 0.15)'
              }`,
              fontSize: 12,
              color: field.confident ? 'inherit' : 'rgba(128, 128, 128, 0.7)',
            }}
          >
            <span style={{ opacity: field.confident ? 0.7 : 0.4 }}>
              {field.icon}
            </span>
            <span style={{ fontWeight: 500, opacity: 0.5, fontSize: 10 }}>
              {field.label}:
            </span>
            <span
              style={{
                fontWeight: 600,
                color: field.confident ? 'inherit' : 'rgba(128, 128, 128, 0.6)',
                fontStyle: field.confident ? 'normal' : 'italic',
              }}
            >
              {field.value || '—'}
            </span>
            {!field.confident && field.value && (
              <HelpCircle
                size={11}
                style={{ opacity: 0.5, color: 'var(--color-warning)' }}
                aria-label="Field ini tidak yakin / perlu dikonfirmasi"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
