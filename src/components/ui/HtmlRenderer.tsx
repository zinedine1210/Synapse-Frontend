'use client';

import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface HtmlRendererProps {
  content: string;
  className?: string;
  compact?: boolean;
}

/**
 * Renders HTML content safely (from Tiptap RichTextEditor).
 * Sanitizes HTML via DOMPurify to prevent XSS.
 */
export function HtmlRenderer({ content, className, compact = false }: HtmlRendererProps) {
  const sanitized = useMemo(() => {
    if (!content) return '';
    if (typeof window === 'undefined') return content;
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote',
        'pre', 'code', 'img', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'sup', 'sub', 'span', 'div',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'style', 'data-type'],
      ALLOW_DATA_ATTR: false,
    });
  }, [content]);

  const fontSize = compact ? 'var(--font-sm)' : 'var(--font-base)';

  return (
    <div
      className={`html-renderer ${className || ''}`}
      style={{ fontSize, lineHeight: 1.7, color: 'rgb(var(--text-primary))' }}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

/* HtmlRenderer img constraint — added via global style tag */
if (typeof document !== 'undefined' && !document.getElementById('html-renderer-styles')) {
  const style = document.createElement('style');
  style.id = 'html-renderer-styles';
  style.textContent = `.html-renderer img { max-width: 320px; width: 100%; height: auto; border-radius: 6px; margin: 0.4em 0; }`;
  document.head.appendChild(style);
}
