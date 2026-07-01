'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sun, Moon, LogOut, X, CreditCard } from 'lucide-react';
import {
  primaryNavItems,
  secondaryNavItems,
  superadminNavItems,
  settingsNavItem,
  NavItem,
} from '@/config/navigation';
import { useTheme } from '@/lib/ThemeContext';
import { useAuth } from '@/lib/AuthContext';
import { useFeatureAccess } from '@/lib/feature-access';
import { XpBar } from './XpBar';

interface MobileNavSheetProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Callback to close the sheet */
  onClose: () => void;
}

/**
 * MobileNavSheet — bottom sheet listing all navigation destinations.
 *
 * Opened from the BottomNav "More" tab on mobile viewports (<768px).
 * Lists primary + secondary nav (or superadmin nav), settings, a theme toggle
 * and a sign-out action. Slides up from the bottom with a backdrop overlay and
 * respects `prefers-reduced-motion`.
 */
export function MobileNavSheet({ open, onClose }: MobileNavSheetProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { hasFeature } = useFeatureAccess();

  const isSuperadmin = user?.role === 'SUPERADMIN';

  const navItems = isSuperadmin
    ? superadminNavItems
    : [...primaryNavItems, ...secondaryNavItems].filter(
        (item) => !item.requiredFeature || hasFeature(item.requiredFeature)
      );

  // Lock body scroll while the sheet is open + close on Escape
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const isActive = (item: NavItem) =>
    pathname === item.path || pathname?.startsWith(item.path + '/');

  const handleSignOut = async () => {
    onClose();
    await signOut();
    router.push('/auth');
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item);
    return (
      <li key={item.path}>
        <Link
          href={item.path}
          onClick={onClose}
          className="mobile-nav-sheet__item"
          data-active={active ? 'true' : 'false'}
        >
          <Icon size={20} style={{ flexShrink: 0 }} />
          <span className="mobile-nav-sheet__item-label">{item.label}</span>
          {item.badge && (
            <span className="badge badge-pro" style={{ marginLeft: 'auto' }}>
              {item.badge}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <>
      <style>{mobileNavSheetStyles}</style>
      <div
        className="mobile-nav-sheet"
        data-open={open ? 'true' : 'false'}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          className="mobile-nav-sheet__backdrop"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Sheet */}
        <div
          className="mobile-nav-sheet__panel"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
        >
          {/* Drag handle */}
          <div className="mobile-nav-sheet__handle" aria-hidden="true" />

          {/* Header */}
          <div className="mobile-nav-sheet__header">
            <span className="mobile-nav-sheet__title">Menu</span>
            <button
              type="button"
              onClick={onClose}
              className="mobile-nav-sheet__close"
              aria-label="Tutup menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* XP / level summary */}
          <div className="mobile-nav-sheet__xp">
            <XpBar />
          </div>

          {/* Navigation items */}
          <nav className="mobile-nav-sheet__nav" aria-label="Navigasi">
            <ul className="mobile-nav-sheet__list">
              {navItems.map(renderItem)}
              {!isSuperadmin && renderItem(settingsNavItem)}
              {!isSuperadmin && renderItem({ label: 'Billing', path: '/billing', icon: CreditCard })}
            </ul>
          </nav>

          {/* Footer actions */}
          <div className="mobile-nav-sheet__footer">
            <button
              type="button"
              onClick={toggleTheme}
              className="mobile-nav-sheet__item"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              <span className="mobile-nav-sheet__item-label">
                {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
              </span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="mobile-nav-sheet__item mobile-nav-sheet__item--danger"
            >
              <LogOut size={20} />
              <span className="mobile-nav-sheet__item-label">Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const mobileNavSheetStyles = `
  .mobile-nav-sheet {
    position: fixed;
    inset: 0;
    z-index: 1100;
    visibility: hidden;
    pointer-events: none;
  }

  .mobile-nav-sheet[data-open="true"] {
    visibility: visible;
    pointer-events: auto;
  }

  .mobile-nav-sheet__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .mobile-nav-sheet[data-open="true"] .mobile-nav-sheet__backdrop {
    opacity: 1;
  }

  .mobile-nav-sheet__panel {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    background: rgb(var(--bg-surface));
    border-top: 1px solid var(--border-default);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    box-shadow: var(--shadow-lg);
    padding: 0 0 calc(0.75rem + env(safe-area-inset-bottom, 0px));
    transform: translateY(100%);
    transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .mobile-nav-sheet[data-open="true"] .mobile-nav-sheet__panel {
    transform: translateY(0);
  }

  .mobile-nav-sheet__handle {
    width: 36px;
    height: 4px;
    border-radius: var(--radius-full);
    background: var(--border-default);
    margin: 0.6rem auto 0.25rem;
    flex-shrink: 0;
  }

  .mobile-nav-sheet__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.25rem 1rem 0.5rem;
    flex-shrink: 0;
  }

  .mobile-nav-sheet__title {
    font-size: var(--font-md);
    font-weight: 700;
    color: rgb(var(--text-primary));
  }

  .mobile-nav-sheet__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: var(--input-bg);
    border: 1px solid var(--border-default);
    color: rgb(var(--text-secondary));
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .mobile-nav-sheet__xp {
    padding: 0 1rem;
    flex-shrink: 0;
  }

  .mobile-nav-sheet__nav {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .mobile-nav-sheet__list {
    list-style: none;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    margin: 0;
    padding: 0;
  }

  .mobile-nav-sheet__footer {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0.5rem;
    border-top: 1px solid var(--border-subtle);
    flex-shrink: 0;
  }

  .mobile-nav-sheet__item {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    width: 100%;
    padding: 0.7rem 0.75rem;
    border-radius: var(--radius-sm);
    text-decoration: none;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: var(--font-sm);
    color: rgb(var(--text-secondary));
    transition: var(--transition-fast);
    -webkit-tap-highlight-color: transparent;
  }

  .mobile-nav-sheet__item[data-active="true"] {
    background: rgba(var(--color-primary) / 0.1);
    color: rgb(var(--color-primary));
    font-weight: 600;
  }

  .mobile-nav-sheet__item--danger {
    color: rgb(var(--color-error));
  }

  .mobile-nav-sheet__item-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (prefers-reduced-motion: reduce) {
    .mobile-nav-sheet__backdrop,
    .mobile-nav-sheet__panel {
      transition: none;
    }
  }
`;
