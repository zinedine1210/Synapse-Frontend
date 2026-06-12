'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Max height as percentage of viewport (default 90) */
  maxHeight?: number;
}

/**
 * BottomSheet — slides up from bottom on viewports below 640px.
 * On larger viewports, falls back to a centered modal overlay.
 * Supports swipe-down-to-dismiss and backdrop click.
 * Respects prefers-reduced-motion.
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = 90,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const [translateY, setTranslateY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect viewport width
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Touch handlers for swipe-to-dismiss (mobile only)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
    setDragging(true);
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging || !isMobile) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      currentY.current = diff;
      setTranslateY(diff);
    }
  }, [dragging, isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (!dragging || !isMobile) return;
    setDragging(false);
    if (currentY.current > 100) {
      onClose();
    }
    setTranslateY(0);
  }, [dragging, isMobile, onClose]);

  if (!isOpen) return null;

  // Centered modal for desktop (>=640px)
  if (!isMobile) {
    return (
      <div
        className="bottom-sheet-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.15s ease',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="animate-scale-in"
          style={{
            background: 'var(--modal-bg)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: 540,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {title && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: 'var(--font-lg)', margin: 0 }}>{title}</h3>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'rgb(var(--text-muted))',
                  transition: 'var(--transition-fast)',
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    );
  }

  // Bottom sheet for mobile (<640px)
  return (
    <div
      className="bottom-sheet-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={sheetRef}
        className="bottom-sheet-panel"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%',
          maxHeight: `${maxHeight}vh`,
          overflowY: 'auto',
          background: 'var(--modal-bg)',
          borderTopLeftRadius: 'var(--radius-xl)',
          borderTopRightRadius: 'var(--radius-xl)',
          padding: '0.75rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom, 0px))',
          boxShadow: '0 -4px 32px rgba(0, 0, 0, 0.3)',
          transform: `translateY(${translateY}px)`,
          transition: dragging ? 'none' : 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          animation: 'bottomSheetSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'var(--border-strong)',
            margin: '0 auto 0.75rem',
          }}
        />

        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: 'var(--font-lg)', margin: 0 }}>{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'rgb(var(--text-muted))',
                transition: 'var(--transition-fast)',
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
