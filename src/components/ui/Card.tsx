import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hoverable = false, onClick, style, ...props }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`card ${hoverable ? 'card-hoverable' : ''} ${className}`}
      style={{
        background: 'rgb(var(--bg-surface))',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        transition: 'var(--transition-smooth)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
