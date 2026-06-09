'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** Compact style for chat bubbles */
  compact?: boolean;
}

/**
 * Shared markdown renderer with support for:
 * - Code blocks with syntax highlighting (```python, ```js, etc.)
 * - LaTeX math ($inline$ and $$block$$)
 * - GFM tables
 * - Proper list numbering (ordered/unordered, nested)
 * - Images, links, bold, italic, inline code
 * - Horizontal rules
 */
export function MarkdownRenderer({ content, className, compact = false }: MarkdownRendererProps) {
  // Pre-process: normalize line endings and fix common issues
  const processed = useMemo(() => {
    if (!content) return '';
    return content
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      // Ensure block LaTeX has proper spacing
      .replace(/([^\n])\$\$/g, '$1\n$$')
      .replace(/\$\$([^\n])/g, '$$\n$1');
  }, [content]);

  const fontSize = compact ? 'var(--font-sm)' : 'var(--font-base)';

  return (
    <div className={`md-renderer ${className || ''}`} style={{ fontSize, lineHeight: 1.7, color: 'rgb(var(--text-primary))' }}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'rgb(var(--color-primary))', marginTop: '1.5rem', marginBottom: '0.5rem', borderBottom: '2px solid var(--border-default)', paddingBottom: '0.4rem' }}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'rgb(var(--color-primary))', marginTop: '1.25rem', marginBottom: '0.4rem' }}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, color: 'rgb(var(--color-primary))', marginTop: '1rem', marginBottom: '0.3rem' }}>{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 style={{ fontSize: 'var(--font-base)', fontWeight: 600, color: 'rgb(var(--color-primary))', marginTop: '0.75rem', marginBottom: '0.25rem' }}>{children}</h4>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p style={{ marginBottom: '0.5rem', lineHeight: 1.7, color: 'rgb(var(--text-secondary))' }}>{children}</p>
          ),

          // Strong / Em
          strong: ({ children }) => (
            <strong style={{ fontWeight: 700, color: 'rgb(var(--text-primary))' }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ fontStyle: 'italic' }}>{children}</em>
          ),

          // Code blocks
          pre: ({ children }) => (
            <pre style={{
              background: '#1e1e2e',
              color: '#cdd6f4',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-xs)',
              fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", monospace',
              overflowX: 'auto',
              margin: '0.75rem 0',
              border: '1px solid rgba(255,255,255,0.08)',
              lineHeight: 1.5,
            }}>
              {children}
            </pre>
          ),

          // Inline code
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return (
                <code style={{
                  fontFamily: 'monospace',
                  fontSize: '0.85em',
                  padding: '0.15rem 0.4rem',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '4px',
                  color: 'rgb(var(--color-primary))',
                }} {...props}>
                  {children}
                </code>
              );
            }
            return <code className={codeClassName} {...props}>{children}</code>;
          },

          // Links
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" style={{
              color: 'rgb(var(--color-primary))',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              wordBreak: 'break-all',
            }}>
              {children}
            </a>
          ),

          // Images
          img: ({ src, alt }) => (
            <span style={{ display: 'block', margin: '1rem 0', textAlign: 'center' }}>
              <img src={src} alt={alt || ''} style={{
                maxWidth: '100%',
                maxHeight: '400px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-strong)',
                boxShadow: 'var(--shadow-md)',
              }} />
              {alt && (
                <span style={{ display: 'block', fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginTop: '0.4rem', fontStyle: 'italic' }}>
                  {alt}
                </span>
              )}
            </span>
          ),

          // Ordered lists - proper numbering reset
          ol: ({ children }) => (
            <ol style={{
              counterReset: 'list-counter',
              listStyleType: 'decimal',
              paddingLeft: '1.5rem',
              margin: '0.5rem 0',
            }}>
              {children}
            </ol>
          ),

          // Unordered lists
          ul: ({ children }) => (
            <ul style={{
              listStyleType: 'disc',
              paddingLeft: '1.5rem',
              margin: '0.5rem 0',
            }}>
              {children}
            </ul>
          ),

          // List items
          li: ({ children }) => (
            <li style={{
              marginBottom: '0.25rem',
              fontSize,
              lineHeight: 1.6,
              color: 'rgb(var(--text-secondary))',
            }}>
              {children}
            </li>
          ),

          // Tables
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '0.75rem 0', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-sm)' }}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead style={{ background: 'rgba(var(--color-primary) / 0.06)' }}>
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th style={{
              padding: '0.5rem 0.75rem',
              textAlign: 'left',
              fontWeight: 700,
              color: 'rgb(var(--text-primary))',
              borderBottom: '2px solid var(--border-default)',
              fontSize: 'var(--font-xs)',
            }}>
              {children}
            </th>
          ),
          tr: ({ children }) => (
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {children}
            </tr>
          ),
          td: ({ children }) => (
            <td style={{
              padding: '0.45rem 0.75rem',
              color: 'rgb(var(--text-secondary))',
              fontSize: 'var(--font-xs)',
            }}>
              {children}
            </td>
          ),

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote style={{
              borderLeft: '3px solid rgb(var(--color-primary))',
              paddingLeft: '1rem',
              margin: '0.75rem 0',
              color: 'rgb(var(--text-muted))',
              fontStyle: 'italic',
              background: 'rgba(var(--color-primary) / 0.03)',
              padding: '0.5rem 1rem',
              borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
            }}>
              {children}
            </blockquote>
          ),

          // Horizontal rule
          hr: () => (
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-default)', margin: '1rem 0' }} />
          ),
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}

/** Strip markdown formatting for plain text (editor / PDF export) */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/g, '').replace(/```/g, ''))
    .replace(/\$\$(.+?)\$\$/g, '$1')
    .replace(/\$(.+?)\$/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\|.*\|$/gm, '')
    .replace(/^[-|:\s]+$/gm, '');
}
