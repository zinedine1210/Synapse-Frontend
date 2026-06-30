'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui';
import { ChevronRight, X } from 'lucide-react';

// --- Interfaces ---

export interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  allowInteraction?: boolean;
}

export interface TourGuideProps {
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
}

// --- Helpers ---

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const TOOLTIP_GAP = 12;
const TOOLTIP_WIDTH = 300;

/**
 * Calculate tooltip position and clamp to viewport edges.
 */
function getTooltipStyle(
  targetRect: TargetRect,
  position: TourStep['position']
): React.CSSProperties {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 700;
  const isMobile = vw < 640;
  const tooltipW = isMobile ? vw - 32 : Math.min(TOOLTIP_WIDTH, vw - 32);

  const padded = {
    top: targetRect.top - PADDING,
    left: targetRect.left - PADDING,
    width: targetRect.width + PADDING * 2,
    height: targetRect.height + PADDING * 2,
  };

  const base: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10002,
    width: tooltipW,
    maxWidth: '90vw',
  };

  // On mobile, always position below or above, centered horizontally
  if (isMobile) {
    const spaceBelow = vh - (padded.top + padded.height + TOOLTIP_GAP);
    const placeBelow = spaceBelow > 180;
    return {
      ...base,
      left: 16,
      right: 16,
      width: 'auto',
      ...(placeBelow
        ? { top: Math.min(padded.top + padded.height + TOOLTIP_GAP, vh - 200) }
        : { bottom: Math.max(vh - padded.top + TOOLTIP_GAP, 16) }),
    };
  }

  // Desktop: preferred position with viewport clamping
  let style: React.CSSProperties = { ...base };

  switch (position) {
    case 'bottom': {
      let top = padded.top + padded.height + TOOLTIP_GAP;
      let left = padded.left + padded.width / 2 - tooltipW / 2;
      // Clamp to viewport
      if (top + 200 > vh) top = padded.top - TOOLTIP_GAP - 200; // flip to top
      left = Math.max(16, Math.min(left, vw - tooltipW - 16));
      style = { ...style, top, left };
      break;
    }
    case 'top': {
      let bottom = vh - padded.top + TOOLTIP_GAP;
      let left = padded.left + padded.width / 2 - tooltipW / 2;
      if (padded.top < 200) { // Not enough space on top, flip to bottom
        style = { ...style, top: padded.top + padded.height + TOOLTIP_GAP, left: Math.max(16, Math.min(left, vw - tooltipW - 16)) };
      } else {
        left = Math.max(16, Math.min(left, vw - tooltipW - 16));
        style = { ...style, bottom, left };
      }
      break;
    }
    case 'right': {
      let top = padded.top + padded.height / 2 - 60;
      let left = padded.left + padded.width + TOOLTIP_GAP;
      if (left + tooltipW > vw - 16) { // Not enough space right, flip to bottom
        top = padded.top + padded.height + TOOLTIP_GAP;
        left = Math.max(16, Math.min(padded.left, vw - tooltipW - 16));
      }
      top = Math.max(16, Math.min(top, vh - 200));
      style = { ...style, top, left };
      break;
    }
    case 'left': {
      let top = padded.top + padded.height / 2 - 60;
      let left = padded.left - TOOLTIP_GAP - tooltipW;
      if (left < 16) { // Not enough space left, flip to bottom
        top = padded.top + padded.height + TOOLTIP_GAP;
        left = Math.max(16, Math.min(padded.left, vw - tooltipW - 16));
      }
      top = Math.max(16, Math.min(top, vh - 200));
      style = { ...style, top, left };
      break;
    }
  }

  return style;
}

// --- Component ---

export function TourGuide({ steps, onComplete, onSkip }: TourGuideProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [validStepIndex, setValidStepIndex] = useState<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const findNextValidStep = useCallback(
    (fromIndex: number): number | null => {
      for (let i = fromIndex; i < steps.length; i++) {
        const el = document.querySelector(steps[i].targetSelector);
        if (el) return i;
      }
      return null;
    },
    [steps]
  );

  const resolveStep = useCallback(
    (fromIndex: number) => {
      const idx = findNextValidStep(fromIndex);
      if (idx === null) {
        onComplete();
        return;
      }

      setCurrentIndex(idx);
      setValidStepIndex(idx);

      const el = document.querySelector(steps[idx].targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },
    [findNextValidStep, steps, onComplete]
  );

  useEffect(() => {
    resolveStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (validStepIndex === null) return;

    const handleReposition = () => {
      const el = document.querySelector(steps[validStepIndex].targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
      }
    };

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [validStepIndex, steps]);

  const handleNext = useCallback(() => {
    resolveStep(currentIndex + 1);
  }, [currentIndex, resolveStep]);

  useEffect(() => {
    if (validStepIndex === null) return;
    const step = steps[validStepIndex];
    if (!step.allowInteraction) return;

    const el = document.querySelector(step.targetSelector);
    if (!el) return;

    const handleClick = () => {
      setTimeout(() => resolveStep(currentIndex + 1), 200);
    };

    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, [validStepIndex, steps, currentIndex, resolveStep]);

  if (validStepIndex === null || targetRect === null) return null;

  const currentStep = steps[validStepIndex];
  const totalValidSteps = steps.length;

  const cutout = {
    top: targetRect.top - PADDING,
    left: targetRect.left - PADDING,
    width: targetRect.width + PADDING * 2,
    height: targetRect.height + PADDING * 2,
  };

  return (
    <>
      {/* Overlay with cutout */}
      <div ref={overlayRef} style={{ position: 'fixed', inset: 0, zIndex: 10000, pointerEvents: 'none' }}>
        <div style={{
          position: 'fixed', top: cutout.top, left: cutout.left, width: cutout.width, height: cutout.height,
          borderRadius: 8, boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)', zIndex: 10000, pointerEvents: 'none',
        }} />
      </div>

      {/* Highlight glow */}
      <div style={{
        position: 'fixed', top: cutout.top, left: cutout.left, width: cutout.width, height: cutout.height,
        borderRadius: 8, border: '2px solid rgb(var(--color-primary))',
        boxShadow: '0 0 12px rgba(var(--color-primary) / 0.4)', zIndex: 10001,
        pointerEvents: currentStep.allowInteraction ? 'none' : 'auto', transition: 'all 0.3s ease',
      }} />

      {/* Overlay click-blocker */}
      {!currentStep.allowInteraction && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, cursor: 'default' }} onClick={e => e.stopPropagation()} />
      )}

      {/* Tooltip */}
      <div style={{
        ...getTooltipStyle(targetRect, currentStep.position),
        background: 'rgb(var(--bg-surface))', border: '1px solid var(--border-default)',
        borderRadius: 14, padding: '16px 18px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)', animation: 'fadeSlideIn 0.25s ease',
      }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === currentIndex ? 16 : 6, height: 6, borderRadius: 3,
              background: i <= currentIndex ? 'rgb(var(--color-primary))' : 'var(--border-default)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'rgb(var(--text-primary))' }}>
            {currentStep.title}
          </h3>
          <button onClick={onSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))', padding: 2, lineHeight: 0, flexShrink: 0 }} aria-label="Skip tour">
            <X size={16} />
          </button>
        </div>

        {/* Description */}
        <p style={{ fontSize: 13, color: 'rgb(var(--text-secondary))', lineHeight: 1.5, margin: '0 0 14px 0' }}>
          {currentStep.description}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onSkip} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))',
            fontSize: 12, fontFamily: 'inherit', padding: '4px 0',
          }}>
            Lewati
          </button>
          <Button size="sm" onClick={handleNext} rightIcon={<ChevronRight size={14} />}>
            {currentIndex >= totalValidSteps - 1 ? 'Selesai!' : 'Lanjut'}
          </Button>
        </div>
      </div>
    </>
  );
}
