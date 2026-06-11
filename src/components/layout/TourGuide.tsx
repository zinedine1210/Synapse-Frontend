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

const PADDING = 8; // padding around highlighted element
const TOOLTIP_GAP = 12; // gap between highlight and tooltip

function getTooltipStyle(
  targetRect: TargetRect,
  position: TourStep['position']
): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10002,
    maxWidth: 320,
    width: '90vw',
  };

  const padded = {
    top: targetRect.top - PADDING,
    left: targetRect.left - PADDING,
    width: targetRect.width + PADDING * 2,
    height: targetRect.height + PADDING * 2,
  };

  switch (position) {
    case 'bottom':
      return {
        ...base,
        top: padded.top + padded.height + TOOLTIP_GAP,
        left: padded.left + padded.width / 2,
        transform: 'translateX(-50%)',
      };
    case 'top':
      return {
        ...base,
        bottom: `calc(100vh - ${padded.top - TOOLTIP_GAP}px)`,
        left: padded.left + padded.width / 2,
        transform: 'translateX(-50%)',
      };
    case 'left':
      return {
        ...base,
        top: padded.top + padded.height / 2,
        right: `calc(100vw - ${padded.left - TOOLTIP_GAP}px)`,
        transform: 'translateY(-50%)',
      };
    case 'right':
      return {
        ...base,
        top: padded.top + padded.height / 2,
        left: padded.left + padded.width + TOOLTIP_GAP,
        transform: 'translateY(-50%)',
      };
    default:
      return {
        ...base,
        top: padded.top + padded.height + TOOLTIP_GAP,
        left: padded.left + padded.width / 2,
        transform: 'translateX(-50%)',
      };
  }
}

// --- Component ---

export function TourGuide({ steps, onComplete, onSkip }: TourGuideProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [validStepIndex, setValidStepIndex] = useState<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Find the next step with a valid DOM target starting from `fromIndex`
  const findNextValidStep = useCallback(
    (fromIndex: number): number | null => {
      for (let i = fromIndex; i < steps.length; i++) {
        const el = document.querySelector(steps[i].targetSelector);
        if (el) return i;
      }
      return null; // No more valid steps
    },
    [steps]
  );

  // Resolve the current valid step and measure target rect
  const resolveStep = useCallback(
    (fromIndex: number) => {
      const idx = findNextValidStep(fromIndex);
      if (idx === null) {
        // All remaining steps have missing targets — complete the tour
        onComplete();
        return;
      }

      setCurrentIndex(idx);
      setValidStepIndex(idx);

      const el = document.querySelector(steps[idx].targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });

        // Scroll element into view if not visible
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },
    [findNextValidStep, steps, onComplete]
  );

  // Initialize on mount
  useEffect(() => {
    resolveStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-measure on window resize/scroll
  useEffect(() => {
    if (validStepIndex === null) return;

    const handleReposition = () => {
      const el = document.querySelector(steps[validStepIndex].targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [validStepIndex, steps]);

  // Handle advancing to the next step
  const handleNext = useCallback(() => {
    resolveStep(currentIndex + 1);
  }, [currentIndex, resolveStep]);

  // Handle click on highlighted interactive element
  useEffect(() => {
    if (validStepIndex === null) return;
    const step = steps[validStepIndex];
    if (!step.allowInteraction) return;

    const el = document.querySelector(step.targetSelector);
    if (!el) return;

    const handleClick = () => {
      // Allow the click to propagate, then advance
      setTimeout(() => {
        resolveStep(currentIndex + 1);
      }, 200);
    };

    el.addEventListener('click', handleClick);
    return () => {
      el.removeEventListener('click', handleClick);
    };
  }, [validStepIndex, steps, currentIndex, resolveStep]);

  // If no valid step resolved, don't render anything
  if (validStepIndex === null || targetRect === null) return null;

  const currentStep = steps[validStepIndex];
  const totalValidSteps = steps.length;

  // Cutout dimensions with padding
  const cutout = {
    top: targetRect.top - PADDING,
    left: targetRect.left - PADDING,
    width: targetRect.width + PADDING * 2,
    height: targetRect.height + PADDING * 2,
  };

  return (
    <>
      {/* Dark overlay with cutout using box-shadow technique */}
      <div
        ref={overlayRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          pointerEvents: 'none',
        }}
      >
        {/* Overlay using box-shadow to create cutout */}
        <div
          style={{
            position: 'fixed',
            top: cutout.top,
            left: cutout.left,
            width: cutout.width,
            height: cutout.height,
            borderRadius: 'var(--radius-md, 8px)',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
            zIndex: 10000,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Highlight glow around target */}
      <div
        style={{
          position: 'fixed',
          top: cutout.top,
          left: cutout.left,
          width: cutout.width,
          height: cutout.height,
          borderRadius: 'var(--radius-md, 8px)',
          border: '2px solid rgb(var(--color-primary))',
          boxShadow: '0 0 12px rgba(var(--color-primary) / 0.4), 0 0 24px rgba(var(--color-primary) / 0.2)',
          zIndex: 10001,
          pointerEvents: currentStep.allowInteraction ? 'none' : 'auto',
          transition: 'all 0.3s ease',
        }}
      />

      {/* Clickable overlay areas (blocks clicks outside highlight) */}
      {!currentStep.allowInteraction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            cursor: 'default',
          }}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Tooltip */}
      <div
        style={{
          ...getTooltipStyle(targetRect, currentStep.position),
          background: 'rgb(var(--bg-surface))',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '1.25rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        {/* Step counter */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 'var(--font-xs)',
              color: 'rgb(var(--text-muted))',
              fontWeight: 500,
            }}
          >
            {currentIndex + 1} / {totalValidSteps}
          </span>
          <button
            onClick={onSkip}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgb(var(--text-muted))',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
              fontFamily: 'inherit',
            }}
            aria-label="Skip tour"
          >
            <X size={16} />
          </button>
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: 'var(--font-md)',
            fontWeight: 700,
            color: 'rgb(var(--text-primary))',
            margin: '0 0 6px 0',
          }}
        >
          {currentStep.title}
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: 'var(--font-sm)',
            color: 'rgb(var(--text-secondary))',
            lineHeight: 1.5,
            margin: '0 0 1rem 0',
          }}
        >
          {currentStep.description}
        </p>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            onClick={onSkip}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgb(var(--text-muted))',
              fontSize: 'var(--font-sm)',
              fontFamily: 'inherit',
              padding: '0.25rem 0',
            }}
          >
            Skip Tour
          </button>

          <Button
            size="sm"
            onClick={handleNext}
            rightIcon={<ChevronRight size={14} />}
          >
            {currentIndex >= totalValidSteps - 1 ? 'Selesai' : 'Next'}
          </Button>
        </div>
      </div>
    </>
  );
}
