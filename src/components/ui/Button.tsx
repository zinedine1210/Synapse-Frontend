import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
    color: 'rgb(var(--bg-base))',
    border: 'none',
    fontWeight: 600,
  },
  secondary: {
    background: 'rgba(var(--color-primary) / 0.12)',
    color: 'rgb(var(--color-primary))',
    border: '1px solid rgba(var(--color-primary) / 0.25)',
  },
  ghost: {
    background: 'var(--input-bg)',
    color: 'rgb(var(--text-primary))',
    border: '1px solid var(--border-default)',
  },
  danger: {
    background: 'rgba(var(--color-error) / 0.1)',
    color: 'rgb(var(--color-error))',
    border: '1px solid rgba(var(--color-error) / 0.25)',
  },
  outline: {
    background: 'transparent',
    color: 'rgb(var(--text-primary))',
    border: '1px solid var(--border-default)',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '0.45rem 0.9rem', fontSize: 'var(--font-sm)', borderRadius: 'var(--radius-sm)' },
  md: { padding: '0.55rem 1.15rem', fontSize: 'var(--font-base)', borderRadius: 'var(--radius-md)' },
  lg: { padding: '0.7rem 1.5rem', fontSize: 'var(--font-md)', borderRadius: 'var(--radius-md)' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontWeight: 500,
        fontFamily: 'inherit',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        transition: 'var(--transition-fast)',
        opacity: disabled || isLoading ? 0.5 : 1,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
    >
      {isLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
