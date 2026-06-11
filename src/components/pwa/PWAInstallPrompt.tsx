'use client';

import { usePWAInstall } from '@/lib/usePWAInstall';

/**
 * PWA Install Prompt Banner
 * Shows a subtle install prompt after 3 visits.
 * Uses the deferred beforeinstallprompt event.
 */
export function PWAInstallPrompt() {
  const { showPrompt, installApp, dismissPrompt } = usePWAInstall();

  if (!showPrompt) return null;

  return (
    <div className="pwa-install-prompt" role="alert" aria-live="polite">
      <div className="pwa-install-prompt__content">
        <div className="pwa-install-prompt__icon">📱</div>
        <div className="pwa-install-prompt__text">
          <strong>Install Synapse</strong>
          <p>Akses lebih cepat dari home screen!</p>
        </div>
        <div className="pwa-install-prompt__actions">
          <button
            className="pwa-install-prompt__btn pwa-install-prompt__btn--install"
            onClick={installApp}
            aria-label="Install Synapse app"
          >
            Install
          </button>
          <button
            className="pwa-install-prompt__btn pwa-install-prompt__btn--dismiss"
            onClick={dismissPrompt}
            aria-label="Dismiss install prompt"
          >
            Nanti
          </button>
        </div>
      </div>

      <style jsx>{`
        .pwa-install-prompt {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          width: calc(100% - 2rem);
          max-width: 400px;
          background: rgb(var(--bg-elevated));
          border: 1px solid var(--border-default);
          border-radius: 12px;
          padding: 1rem;
          box-shadow: var(--shadow-lg);
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pwa-install-prompt {
            animation: none;
          }
        }

        .pwa-install-prompt__content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .pwa-install-prompt__icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .pwa-install-prompt__text {
          flex: 1;
        }

        .pwa-install-prompt__text strong {
          color: rgb(var(--text-primary));
          font-size: 0.9rem;
        }

        .pwa-install-prompt__text p {
          color: rgb(var(--text-secondary));
          font-size: 0.8rem;
          margin: 0.125rem 0 0 0;
        }

        .pwa-install-prompt__actions {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .pwa-install-prompt__btn {
          border: none;
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
        }

        .pwa-install-prompt__btn:hover {
          opacity: 0.85;
        }

        .pwa-install-prompt__btn--install {
          background: rgb(var(--color-primary));
          color: #000;
        }

        .pwa-install-prompt__btn--dismiss {
          background: transparent;
          color: rgb(var(--text-secondary));
        }
      `}</style>
    </div>
  );
}
