'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────────

type ConfettiTrigger =
  | 'saving-tree-100'
  | 'achievement-unlock'
  | 'streak-milestone'
  | 'level-up';

interface UndoToastData {
  id: string;
  message: string;
  onUndo: () => void;
}

interface CelebrationContextType {
  /** Trigger confetti animation for milestones */
  triggerConfetti: (reason?: ConfettiTrigger) => void;
  /** Show undo toast after destructive action */
  showUndoToast: (message: string, onUndo: () => void) => void;
}

const CelebrationContext = createContext<CelebrationContextType | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────────

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [undoToasts, setUndoToasts] = useState<UndoToastData[]>([]);
  const reducedMotionRef = useRef(false);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Check prefers-reduced-motion
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mql.matches;
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const triggerConfetti = useCallback(async (reason?: ConfettiTrigger) => {
    // Skip animations when reduced motion is preferred
    if (reducedMotionRef.current) return;

    // Dynamic import to avoid SSR issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const confettiModule = await import('canvas-confetti');
    const confetti = (confettiModule as any).default || confettiModule;

    switch (reason) {
      case 'level-up':
        // Big celebration — fireworks style
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#00D4FF', '#FF6B35', '#FFD700', '#9B59B6', '#2ECC71'],
        });
        setTimeout(() => {
          confetti({
            particleCount: 60,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
          });
          confetti({
            particleCount: 60,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
          });
        }, 250);
        break;

      case 'saving-tree-100':
        // Nature theme — green confetti
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.5 },
          colors: ['#2ECC71', '#27AE60', '#1ABC9C', '#16A085', '#A8E6CF'],
        });
        break;

      case 'streak-milestone':
        // Fire colors for streak
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FF6B35', '#FF4500', '#FFD700', '#FF8C00', '#FFA500'],
        });
        break;

      case 'achievement-unlock':
      default:
        // Standard celebration
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00D4FF', '#FFD700', '#FF6B35', '#9B59B6'],
        });
        break;
    }
  }, []);

  const showUndoToast = useCallback((message: string, onUndo: () => void) => {
    const id = Math.random().toString(36).substring(2, 9);
    setUndoToasts((prev) => [...prev, { id, message, onUndo }]);

    // Auto dismiss after 5s
    const timeout = setTimeout(() => {
      setUndoToasts((prev) => prev.filter((t) => t.id !== id));
      timeoutRefs.current.delete(id);
    }, 5000);
    timeoutRefs.current.set(id, timeout);
  }, []);

  const handleUndo = useCallback((toast: UndoToastData) => {
    toast.onUndo();
    setUndoToasts((prev) => prev.filter((t) => t.id !== toast.id));
    const timeout = timeoutRefs.current.get(toast.id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(toast.id);
    }
  }, []);

  const dismissUndoToast = useCallback((id: string) => {
    setUndoToasts((prev) => prev.filter((t) => t.id !== id));
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }
  }, []);

  return (
    <CelebrationContext.Provider value={{ triggerConfetti, showUndoToast }}>
      {children}

      {/* Undo toast container */}
      {undoToasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            maxWidth: '360px',
            width: 'calc(100% - 2rem)',
          }}
        >
          {undoToasts.map((toast) => (
            <div
              key={toast.id}
              className="celebration-undo-toast"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                borderRadius: '12px',
                background: 'var(--modal-bg)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-lg)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                color: 'rgb(var(--text-primary))',
                fontSize: 'var(--font-sm)',
                animation: 'undo-toast-enter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              }}
            >
              <span style={{ flex: 1, fontWeight: 500 }}>{toast.message}</span>
              <button
                onClick={() => handleUndo(toast)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgb(var(--color-primary))',
                  fontWeight: 700,
                  fontSize: 'var(--font-sm)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--color-primary), 0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                Batal
              </button>
              <button
                onClick={() => dismissUndoToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgb(var(--text-muted))',
                  padding: '2px',
                  fontSize: '16px',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes undo-toast-enter {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* ─── Fire Emoji Animation for Active Streaks ────────────────────── */
        .streak-fire {
          display: inline-block;
          animation: streak-fire-pulse 1.2s ease-in-out infinite;
        }

        @keyframes streak-fire-pulse {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            filter: brightness(1);
          }
          25% {
            transform: scale(1.15) rotate(-3deg);
            filter: brightness(1.2);
          }
          50% {
            transform: scale(1.05) rotate(2deg);
            filter: brightness(1.1);
          }
          75% {
            transform: scale(1.12) rotate(-1deg);
            filter: brightness(1.15);
          }
        }

        /* ─── Todo Checkbox Scale-Bounce + Strikethrough ─────────────────── */
        .todo-check-bounce {
          animation: todo-scale-bounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes todo-scale-bounce {
          0% {
            transform: scale(1);
          }
          40% {
            transform: scale(1.3);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
          }
        }

        .todo-text-strikethrough {
          position: relative;
          transition: color 0.3s ease;
        }

        .todo-text-strikethrough::after {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          width: 0;
          height: 2px;
          background: rgb(var(--text-muted));
          animation: strikethrough-draw 0.4s 0.1s ease-out forwards;
        }

        @keyframes strikethrough-draw {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }

        .todo-text-done {
          color: rgb(var(--text-muted));
          text-decoration: line-through;
        }

        /* ─── Reduced Motion Overrides ───────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          .streak-fire {
            animation: none;
          }
          .todo-check-bounce {
            animation: none;
          }
          .todo-text-strikethrough::after {
            animation: none;
            width: 100%;
          }
          .celebration-undo-toast {
            animation: none !important;
          }
        }
      `}</style>
    </CelebrationContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useCelebration() {
  const context = useContext(CelebrationContext);
  if (context === undefined) {
    throw new Error('useCelebration harus digunakan di dalam CelebrationProvider');
  }
  return context;
}
