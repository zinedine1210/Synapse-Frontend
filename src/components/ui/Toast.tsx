'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto remove after 4s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Icon mapping
  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} style={{ color: 'rgb(var(--color-success))' }} />;
      case 'error':
        return <AlertCircle size={16} style={{ color: 'rgb(var(--color-error))' }} />;
      case 'warning':
        return <AlertTriangle size={16} style={{ color: 'rgb(var(--color-warning))' }} />;
      case 'info':
      default:
        return <Info size={16} style={{ color: 'rgb(var(--color-info))' }} />;
    }
  };

  const getStyle = (type: ToastType) => {
    const base = {
      background: 'var(--modal-bg)',
      boxShadow: 'var(--shadow-lg)',
    };
    switch (type) {
      case 'success':
        return { ...base, border: '1px solid rgba(var(--color-success) / 0.25)' };
      case 'error':
        return { ...base, border: '1px solid rgba(var(--color-error) / 0.25)' };
      case 'warning':
        return { ...base, border: '1px solid rgba(var(--color-warning) / 0.25)' };
      case 'info':
      default:
        return { ...base, border: '1px solid rgba(var(--color-info) / 0.25)' };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div
        style={{
          position: 'fixed',
          top: '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxWidth: '360px',
          width: 'calc(100% - 2rem)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-slide-in"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '1rem',
              borderRadius: '12px',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              color: 'rgb(var(--text-primary))',
              fontSize: 'var(--font-sm)',
              pointerEvents: 'auto',
              ...getStyle(toast.type),
              animation: 'toast-enter 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
          >
            <div style={{ flexShrink: 0, marginTop: '1px' }}>{getIcon(toast.type)}</div>
            <div style={{ flex: 1, fontWeight: 500, lineHeight: 1.4 }}>{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgb(var(--text-muted)),',
                padding: '2px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '0.5rem',
                flexShrink: 0,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgb(var(--text-primary))')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgb(var(--text-muted))')}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes toast-enter {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast harus digunakan di dalam ToastProvider');
  }
  return context;
}
