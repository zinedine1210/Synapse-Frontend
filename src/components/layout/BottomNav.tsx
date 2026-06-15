'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, CheckSquare, BookOpen, MoreHorizontal } from 'lucide-react';
import { useFeatureAccess } from '@/lib/feature-access';

interface BottomNavProps {
  unreadQnaCount?: number;
  pendingTodoCount?: number;
  onMoreTap?: () => void;
}

interface BottomNavTab {
  key: string;
  label: string;
  path: string;
  icon: React.ElementType;
  requiredFeature?: string;
}

const TABS: BottomNavTab[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { key: 'duit-tracker', label: 'Duit', path: '/duit-tracker', icon: Wallet, requiredFeature: 'duit_tracker' },
  { key: 'todos', label: 'Todo', path: '/todos', icon: CheckSquare, requiredFeature: 'todo_list' },
  { key: 'classes', label: 'Kelas', path: '/classes', icon: BookOpen, requiredFeature: 'class' },
  { key: 'more', label: 'More', path: '#more', icon: MoreHorizontal },
];

const BOTTOM_NAV_HEIGHT = 64;
const SCROLL_THRESHOLD = 10;

export function BottomNav({ unreadQnaCount = 0, pendingTodoCount = 0, onMoreTap }: BottomNavProps) {
  const pathname = usePathname();
  const { hasFeature } = useFeatureAccess();
  const [isVisible, setIsVisible] = useState(true);
  const [tappedKey, setTappedKey] = useState<string | null>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const filteredTabs = TABS.filter(
    (tab) => !tab.requiredFeature || hasFeature(tab.requiredFeature)
  );

  const handleScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      const currentScrollY = window.scrollY;
      const diff = currentScrollY - lastScrollY.current;
      if (diff > SCROLL_THRESHOLD) setIsVisible(false);
      else if (diff < -SCROLL_THRESHOLD) setIsVisible(true);
      lastScrollY.current = currentScrollY;
      ticking.current = false;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    document.documentElement.style.setProperty('--bottom-nav-height', `${BOTTOM_NAV_HEIGHT}px`);
    document.documentElement.style.setProperty('--bottom-nav-visible', isVisible ? '1' : '0');
    return () => {
      document.documentElement.style.removeProperty('--bottom-nav-height');
      document.documentElement.style.removeProperty('--bottom-nav-visible');
    };
  }, [isVisible]);

  // Clear tap ripple after animation
  useEffect(() => {
    if (!tappedKey) return;
    const t = setTimeout(() => setTappedKey(null), 400);
    return () => clearTimeout(t);
  }, [tappedKey]);

  const isActive = (tab: BottomNavTab) => {
    if (tab.key === 'more') return false;
    return pathname === tab.path || pathname?.startsWith(tab.path + '/');
  };

  const getBadge = (tab: BottomNavTab): number => {
    if (tab.key === 'qna') return unreadQnaCount;
    if (tab.key === 'todos') return pendingTodoCount;
    return 0;
  };

  const handleTap = (key: string) => setTappedKey(key);

  return (
    <>
      <style>{bottomNavStyles}</style>
      <nav className="bottom-nav" data-visible={isVisible} aria-label="Mobile navigation">
        {filteredTabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);
          const badge = getBadge(tab);
          const isMore = tab.key === 'more';
          const isTapped = tappedKey === tab.key;

          const content = (
            <div className={`bottom-nav__tab ${active ? 'bottom-nav__tab--active' : ''} ${isTapped ? 'bottom-nav__tab--tapped' : ''}`}>
              {/* Glow background pill for active tab */}
              <div className="bottom-nav__glow" />
              <div className="bottom-nav__icon-wrapper">
                <Icon size={21} strokeWidth={active ? 2.3 : 1.6} />
                {badge > 0 && (
                  <span className="bottom-nav__badge" aria-label={`${badge} unread`}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span className="bottom-nav__label">{tab.label}</span>
              {active && <span className="bottom-nav__indicator" />}
            </div>
          );

          if (isMore) {
            return (
              <button
                key={tab.key}
                className="bottom-nav__link"
                onClick={() => { handleTap(tab.key); onMoreTap?.(); }}
                aria-label="More options"
                type="button"
              >
                {content}
              </button>
            );
          }

          return (
            <Link key={tab.key} href={tab.path} className="bottom-nav__link" onClick={() => handleTap(tab.key)}>
              {content}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

const bottomNavStyles = `
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: ${BOTTOM_NAV_HEIGHT}px;
    display: none;
    align-items: center;
    justify-content: space-around;
    z-index: 900;
    padding: 0 6px;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    transform: translateY(0);
    transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);

    /* Glassmorphism */
    background: rgba(var(--bg-surface) / 0.72);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    backdrop-filter: saturate(180%) blur(20px);
    border-top: 1px solid rgba(var(--text-primary) / 0.06);
    box-shadow:
      0 -1px 3px rgba(0, 0, 0, 0.04),
      0 -8px 24px rgba(0, 0, 0, 0.06);
  }

  .bottom-nav[data-visible="false"] {
    transform: translateY(calc(100% + 8px));
  }

  @media (max-width: 767.98px) {
    .bottom-nav { display: flex; }
    .fab-container {
      transition: bottom 0.35s cubic-bezier(0.32, 0.72, 0, 1);
      bottom: calc(${BOTTOM_NAV_HEIGHT}px + 16px + env(safe-area-inset-bottom, 0px)) !important;
    }
    .bottom-nav[data-visible="false"] ~ .fab-container,
    body:has(.bottom-nav[data-visible="false"]) .fab-container {
      bottom: 24px !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bottom-nav,
    .bottom-nav__indicator,
    .bottom-nav__glow,
    .bottom-nav__icon-wrapper,
    .bottom-nav__label,
    .bottom-nav__badge {
      animation: none !important;
      transition: none !important;
    }
  }

  /* ── Link / button reset ── */
  .bottom-nav__link {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
    outline: none;
  }

  /* ── Tab container ── */
  .bottom-nav__tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 6px 0;
    position: relative;
    min-width: 52px;
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* Tap press-down effect */
  .bottom-nav__tab--tapped {
    animation: bnTapPress 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* ── Glow pill (behind active icon) ── */
  .bottom-nav__glow {
    position: absolute;
    top: 2px;
    width: 44px;
    height: 28px;
    border-radius: 14px;
    background: transparent;
    transition: background 0.3s ease, box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform: scale(0.6);
    opacity: 0;
    pointer-events: none;
  }

  .bottom-nav__tab--active .bottom-nav__glow {
    background: rgba(var(--color-primary) / 0.12);
    box-shadow: 0 0 12px rgba(var(--color-primary) / 0.15);
    transform: scale(1);
    opacity: 1;
  }

  /* ── Icon ── */
  .bottom-nav__icon-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    color: rgb(var(--text-muted));
    transition: color 0.25s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 1;
  }

  .bottom-nav__tab--active .bottom-nav__icon-wrapper {
    color: rgb(var(--color-primary));
    transform: translateY(-2px) scale(1.1);
  }

  /* ── Label ── */
  .bottom-nav__label {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.01em;
    color: rgb(var(--text-muted));
    transition: color 0.25s ease, transform 0.3s ease, opacity 0.3s ease;
    white-space: nowrap;
    opacity: 0.7;
    z-index: 1;
  }

  .bottom-nav__tab--active .bottom-nav__label {
    color: rgb(var(--color-primary));
    font-weight: 700;
    opacity: 1;
    transform: translateY(-1px);
  }

  /* ── Active indicator bar ── */
  .bottom-nav__indicator {
    position: absolute;
    top: -1px;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 3px;
    border-radius: 3px;
    background: linear-gradient(90deg, rgb(var(--color-primary)), rgb(var(--color-secondary)));
    box-shadow: 0 0 8px rgba(var(--color-primary) / 0.4);
    animation: bnIndicatorIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  /* ── Badge ── */
  .bottom-nav__badge {
    position: absolute;
    top: -3px;
    right: -9px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: rgb(var(--color-error));
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    border: 2px solid rgba(var(--bg-surface) / 0.9);
    animation: bnBadgePulse 2s ease-in-out infinite;
    z-index: 2;
  }

  /* ── Animations ── */

  /* Tap press */
  @keyframes bnTapPress {
    0%   { transform: scale(1); }
    30%  { transform: scale(0.88); }
    60%  { transform: scale(1.04); }
    100% { transform: scale(1); }
  }

  /* Indicator slide-in with glow */
  @keyframes bnIndicatorIn {
    0%   { width: 0; opacity: 0; box-shadow: 0 0 0 rgba(var(--color-primary) / 0); }
    60%  { width: 28px; opacity: 1; }
    100% { width: 24px; opacity: 1; box-shadow: 0 0 8px rgba(var(--color-primary) / 0.4); }
  }

  /* Badge pulse */
  @keyframes bnBadgePulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(var(--color-error) / 0.4); }
    50%      { transform: scale(1.08); box-shadow: 0 0 0 4px rgba(var(--color-error) / 0); }
  }
`;
