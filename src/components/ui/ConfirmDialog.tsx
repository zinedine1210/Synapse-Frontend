'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Trash2, Info, HelpCircle } from 'lucide-react';
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
          onClick={handleCancel}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-scale-in confirm-dialog"
            style={{
              background: 'var(--modal-bg)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-xl)',
              width: '100%',
              maxWidth: 400,
              padding: '1.5rem',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              textAlign: 'center',
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: getIconBg(dialog.variant || 'info'),
              color: getIconColor(dialog.variant || 'info'),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {getIcon(dialog.variant || 'info')}
            </div>

            {dialog.title && (
              <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, margin: 0, color: 'rgb(var(--text-primary))' }}>
                {dialog.title}
              </h3>
            )}

            <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', margin: 0, lineHeight: 1.6 }}>
              {dialog.message}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
              <Button
                variant="ghost"
                onClick={handleCancel}
                style={{ flex: 1 }}
              >
                {dialog.cancelText || 'Batal'}
              </Button>
              <Button
                onClick={handleConfirm}
                style={{
                  flex: 1,
                  background: dialog.variant === 'danger'
                    ? 'rgb(var(--color-error))'
                    : dialog.variant === 'warning'
                      ? 'rgb(var(--color-warning))'
                      : 'rgb(var(--color-primary))',
                  color: '#fff',
                }}
              >
                {dialog.confirmText || 'Ya, Lanjutkan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
