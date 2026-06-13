'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Trash2, HelpCircle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirmFn = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({ ...options, resolve });
    });
  }, []);

  const handleConfirm = () => {
    dialog?.resolve(true);
    setDialog(null);
  };

  const handleCancel = () => {
    dialog?.resolve(false);
    setDialog(null);
  };

  const getIcon = (variant: string) => {
    switch (variant) {
      case 'danger': return <Trash2 size={22} />;
      case 'warning': return <AlertTriangle size={22} />;
      default: return <HelpCircle size={22} />;
    }
  };

  const getIconColor = (variant: string) => {
    switch (variant) {
      case 'danger': return 'rgb(var(--color-error))';
      case 'warning': return 'rgb(var(--color-warning))';
      default: return 'rgb(var(--color-primary))';
    }
  };

  const getIconBg = (variant: string) => {
    switch (variant) {
      case 'danger': return 'rgba(var(--color-error) / 0.1)';
      case 'warning': return 'rgba(var(--color-warning) / 0.1)';
      default: return 'rgba(var(--color-primary) / 0.1)';
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm: confirmFn }}>
      {children}
      {dialog && (
        <div
          className="confirm-overlay"
          onClick={handleCancel}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            animation: 'confirmOverlayIn 0.2s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="confirm-dialog"
            style={{
              background: 'var(--modal-bg)',
              borderRadius: '20px 20px 0 0',
              width: '100%',
              maxWidth: 480,
              padding: '6px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'confirmSlideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
              overflow: 'hidden',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 4, background: 'rgba(128,128,128,0.25)' }} />
            </div>

            <div style={{ padding: '12px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              {/* Icon with animated ring */}
              <div style={{ position: 'relative', width: 56, height: 56 }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: getIconBg(dialog.variant || 'info'),
                  animation: 'confirmIconPulse 2s ease-in-out infinite',
                }} />
                <div style={{
                  position: 'relative', width: 56, height: 56, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: getIconColor(dialog.variant || 'info'),
                }}>
                  {getIcon(dialog.variant || 'info')}
                </div>
              </div>

              {dialog.title && (
                <h3 style={{
                  fontSize: '1.1rem', fontWeight: 700, margin: 0,
                  color: 'rgb(var(--text-primary))',
                  letterSpacing: '-0.01em',
                }}>
                  {dialog.title}
                </h3>
              )}

              <p style={{
                fontSize: '0.85rem', color: 'rgb(var(--text-secondary))',
                margin: 0, lineHeight: 1.6, maxWidth: 320,
              }}>
                {dialog.message}
              </p>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginTop: 8 }}>
                <button
                  onClick={handleConfirm}
                  className="confirm-action-btn"
                  style={{
                    width: '100%',
                    padding: '13px 20px',
                    borderRadius: 14,
                    border: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    color: '#fff',
                    background: dialog.variant === 'danger'
                      ? 'rgb(var(--color-error))'
                      : dialog.variant === 'warning'
                        ? 'rgb(var(--color-warning))'
                        : 'rgb(var(--color-primary))',
                  }}
                >
                  {dialog.confirmText || 'Ya, Lanjutkan'}
                </button>
                <button
                  onClick={handleCancel}
                  className="confirm-cancel-btn"
                  style={{
                    width: '100%',
                    padding: '13px 20px',
                    borderRadius: 14,
                    border: '1px solid var(--border-default)',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    color: 'rgb(var(--text-secondary))',
                    background: 'transparent',
                  }}
                >
                  {dialog.cancelText || 'Batal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
