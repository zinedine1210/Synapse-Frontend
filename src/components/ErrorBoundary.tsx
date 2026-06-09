'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '200px', padding: '2rem', textAlign: 'center',
          background: 'var(--bg-secondary, #1a1a2e)', borderRadius: '12px', margin: '1rem',
          border: '1px solid var(--border-default, #333)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
          <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary, #fff)' }}>
            Terjadi Kesalahan
          </h3>
          <p style={{ margin: '0 0 1rem', color: 'var(--text-secondary, #aaa)', fontSize: '0.875rem' }}>
            Komponen ini mengalami error. Coba muat ulang halaman.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none',
              background: 'var(--accent, #6366f1)', color: '#fff', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 500,
            }}
          >
            Muat Ulang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
