import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  type: AlertType;
  title?: string;
  message: string;
  onClose?: () => void;
}

const alertConfig: Record<AlertType, { icon: React.ElementType; color: string; bg: string }> = {
  success: { icon: CheckCircle, color: 'rgb(var(--color-success))', bg: 'rgba(var(--color-success) / 0.08)' },
  error: { icon: AlertCircle, color: 'rgb(var(--color-error))', bg: 'rgba(var(--color-error) / 0.08)' },
  warning: { icon: AlertTriangle, color: 'rgb(var(--color-warning))', bg: 'rgba(var(--color-warning) / 0.08)' },
  info: { icon: Info, color: 'rgb(var(--color-info))', bg: 'rgba(var(--color-info) / 0.08)' },
};

export function Alert({ type, title, message, onClose }: AlertProps) {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div
      className="animate-slide-up"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-md)',
        background: config.bg,
        border: `1px solid ${config.color}22`,
      }}
    >
      <Icon size={16} style={{ color: config.color, flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        {title && (
          <p style={{ fontWeight: 600, color: config.color, marginBottom: '0.15rem', fontSize: 'var(--font-sm)' }}>
            {title}
          </p>
        )}
        <p style={{ color: 'rgb(var(--text-primary))', fontSize: 'var(--font-sm)', margin: 0, opacity: 0.85 }}>{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: config.color, padding: 0 }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
