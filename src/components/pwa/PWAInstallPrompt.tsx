'use client';

import { usePWAInstall } from '@/lib/usePWAInstall';

/**
 * PWA Install Prompt — Mobile-only popup.
 * Detection uses standalone mode (not localStorage):
 * - If user opens in browser → show popup
 * - If user opens as installed PWA → hide popup
 * - If user removes app from home screen → next browser visit shows popup again
 */
export function PWAInstallPrompt() {
  const { showPrompt, isIOS, canNativeInstall, installApp, dismissPrompt } = usePWAInstall();

  if (!showPrompt) return null;

  return (
    <div className="pwa-install-prompt" role="alert" aria-live="polite">
      <div className="pwa-install-prompt__content">
        <div className="pwa-install-prompt__header">
          <div className="pwa-install-prompt__icon">📲</div>
          <div className="pwa-install-prompt__text">
            <strong>Install Synapse App</strong>
            <p>Akses lebih cepat langsung dari home screen!</p>
          </div>
          <button
            className="pwa-install-prompt__close"
            onClick={dismissPrompt}
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {isIOS ? (
          <div className="pwa-install-prompt__ios-steps">
            <p className="pwa-install-prompt__ios-label">Cara install di iPhone/iPad:</p>
            <ol>
              <li>Tap tombol <strong>Share</strong> <span className="pwa-install-prompt__share-icon">⎋</span> di bawah</li>
              <li>Scroll dan pilih <strong>&quot;Add to Home Screen&quot;</strong></li>
              <li>Tap <strong>&quot;Add&quot;</strong></li>
            </ol>
          </div>
        ) : canNativeInstall ? (
          <div className="pwa-install-prompt__actions">
            <button
              className="pwa-install-prompt__btn pwa-install-prompt__btn--install"
              onClick={installApp}
            >
              Install Sekarang
            </button>
            <button
              className="pwa-install-prompt__btn pwa-install-prompt__btn--dismiss"
              onClick={dismissPrompt}
            >
              Nanti aja
            </button>
          </div>
        ) : (
          <div className="pwa-install-prompt__ios-steps">
            <p className="pwa-install-prompt__ios-label">Cara install di Android:</p>
            <ol>
              <li>Tap menu <strong>⋮</strong> (titik tiga) di kanan atas browser</li>
              <li>Pilih <strong>&quot;Install app&quot;</strong> atau <strong>&quot;Add to Home screen&quot;</strong></li>
              <li>Tap <strong>&quot;Install&quot;</strong></li>
            </ol>
          </div>
        )}
      </div>

      <style jsx>{`
        .pwa-install-prompt {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          background: rgb(var(--bg-elevated));
          border-top: 1px solid var(--border-default);
          border-radius: 16px 16px 0 0;
          padding: 1.25rem 1rem 1.5rem;
          box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pwa-install-prompt {
            animation: none;
          }
        }

        .pwa-install-prompt__content {
          max-width: 420px;
          margin: 0 auto;
        }

        .pwa-install-prompt__header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .pwa-install-prompt__icon {
          font-size: 2rem;
          flex-shrink: 0;
          line-height: 1;
        }

        .pwa-install-prompt__text {
          flex: 1;
        }

        .pwa-install-prompt__text strong {
          color: rgb(var(--text-primary));
          font-size: 1rem;
          display: block;
        }

        .pwa-install-prompt__text p {
          color: rgb(var(--text-secondary));
          font-size: 0.85rem;
          margin: 0.25rem 0 0 0;
        }

        .pwa-install-prompt__close {
          background: none;
          border: none;
          color: rgb(var(--text-secondary));
          font-size: 1.1rem;
          cursor: pointer;
          padding: 0.25rem;
          line-height: 1;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .pwa-install-prompt__close:hover {
          color: rgb(var(--text-primary));
          background: rgba(var(--text-secondary) / 0.1);
        }

        .pwa-install-prompt__ios-steps {
          margin-top: 0.75rem;
          padding: 0.75rem;
          background: rgba(var(--color-primary) / 0.05);
          border-radius: 10px;
        }

        .pwa-install-prompt__ios-label {
          font-size: 0.8rem;
          color: rgb(var(--text-secondary));
          margin: 0 0 0.5rem;
        }

        .pwa-install-prompt__ios-steps ol {
          margin: 0;
          padding-left: 1.25rem;
          font-size: 0.85rem;
          color: rgb(var(--text-primary));
        }

        .pwa-install-prompt__ios-steps li {
          margin-bottom: 0.35rem;
        }

        .pwa-install-prompt__share-icon {
          display: inline-block;
          font-size: 0.9rem;
        }

        .pwa-install-prompt__actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .pwa-install-prompt__btn {
          flex: 1;
          border: none;
          border-radius: 10px;
          padding: 0.7rem 1rem;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
        }

        .pwa-install-prompt__btn:active {
          transform: scale(0.97);
        }

        .pwa-install-prompt__btn--install {
          background: rgb(var(--color-primary));
          color: #000;
        }

        .pwa-install-prompt__btn--install:hover {
          opacity: 0.9;
        }

        .pwa-install-prompt__btn--dismiss {
          background: rgba(var(--text-secondary) / 0.1);
          color: rgb(var(--text-secondary));
        }

        .pwa-install-prompt__btn--dismiss:hover {
          background: rgba(var(--text-secondary) / 0.15);
        }

        /* Only show on mobile viewports */
        @media (min-width: 768px) {
          .pwa-install-prompt {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
