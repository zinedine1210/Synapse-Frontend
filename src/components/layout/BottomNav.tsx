'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, CheckSquare, HelpCircle, MoreHorizontal } from 'lucide-react';
import { useFeatureAccess } from '@/lib/feature-access';

/**
 * BottomNav — Fixed bottom tab bar for mobile viewports (<768px)
 *
 * Requirements:
 * - 3.1: Renders 5 tabs: Dashboard, Duit Tracker, Todo, Q&A, More
 * - 3.2: Hidden on viewports >= 768px (CSS media query)
 * - 3.3: Active state with CSS animation indicator
 * - 3.4: FAB positioned above BottomNav (via CSS custom property)
 * - 3.5: Hides on scroll down, shows on scroll up (slide animation)
 * - 3.6: Badge indicators for Q&A (unread) and Todo (pending)
 */

interface BottomNavProps {
  /** Number of unread Q&A notifications */
  unreadQnaCount?: number;
  /** Number of pending todos */
  pendingTodoCount?: number;
  /** Callback when "More" tab is tapped */
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
  { key: 'qna', label: 'Q&A', path: '/qna', icon: HelpCircle, requiredFeature: 'qna_public' },
  { key: 'more', label: 'More', path: '#more', icon: MoreHorizontal },
];

/** Height of the bottom nav in pixels */
const BOTTOM_NAV_HEIGHT = 60;
/** Scroll threshold (px) before triggering hide/show */
const SCROLL_THRESHOLD = 10;

export function BottomNav({ unreadQnaCount = 0, pendingTodoCount = 0, onMoreTap }: BottomNavProps) {
  const pathname = usePathname();
  const { hasFeature } = useFeatureAccess();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  // Filter tabs based on feature access
  const filteredTabs = TABS.filter(
    (tab) => !tab.requiredFeature || hasFeature(tab.requiredFeature)
  );

  // Scroll-direction detection with requestAnimationFrame
  const handleScroll = useCallback(() => {
    if (ticking.current) return;

    ticking.current = true;
    requestAnimationFrame(() => {
      const currentScrollY = window.scrollY;
      const diff = currentScrollY - lastScrollY.current;

      if (diff > SCROLL_THRESHOLD) {
        // Scrolling down — hide
        setIsVisible(false);
      } else if (diff < -SCROLL_THRESHOLD) {
        // Scrolling up — show
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
      ticking.current = false;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Set CSS custom property for FAB positioning
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--bottom-nav-height',
      `${BOTTOM_NAV_HEIGHT}px`
    );
    document.documentElement.style.setProperty(
      '--bottom-nav-visible',
      isVisible ? '1' : '0'
    );
    return () => {
      document.documentElement.style.removeProperty('--bottom-nav-height');
      document.documentElement.style.removeProperty('--bottom-nav-visible');
    };
  }, [isVisible]);

  const isActive = (tab: BottomNavTab) => {
    if (tab.key === 'more') return false;
    return pathname === tab.path || pathname?.startsWith(tab.path + '/');
  };

  const getBadge = (tab: BottomNavTab): number => {
    if (tab.key === 'qna') return unreadQnaCount;
    if (tab.key === 'todos') return pendingTodoCount;
    return 0;
  };

  return (
    <>
      <style>{bottomNavStyles}</style>
      <nav className="bottom-nav" data-visible={isVisible} aria-label="Mobile navigation">
        {filteredTabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);
          const badge = getBadge(tab);
          const isMore = tab.key === 'more';

          const content = (
            <div className={`bottom-nav__tab ${active ? 'bottom-nav__tab--active' : ''}`}>
              <div className="bottom-nav__icon-wrapper">
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
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
                onClick={onMoreTap}
                aria-label="More options"
                type="button"
              >
                {content}
              </button>
            );
          }

          return (
            <Link key={tab.key} href={tab.path} className="bottom-nav__link">
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
    background: rgb(var(--bg-surface));
    border-top: 1px solid var(--border-default);
    z-index: 900;
    padding: 0 4px;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    transform: translateY(0);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .bottom-nav[data-visible="false"] {
    transform: translateY(100%);
  }

  /* Only show on mobile viewports below 768px (Req 3.1, 3.2) */
  @media (max-width: 767.98px) {
    .bottom-nav {
      display: flex;
    }

    /* Move FAB above BottomNav when visible (Req 3.4) */
    .fab-container {
      transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      bottom: calc(${BOTTOM_NAV_HEIGHT}px + 16px + env(safe-area-inset-bottom, 0px)) !important;
    }

    .bottom-nav[data-visible="false"] ~ .fab-container,
    body:has(.bottom-nav[data-visible="false"]) .fab-container {
      bottom: 24px !important;
    }
  }

  /* Respect prefers-reduced-motion */
  @media (prefers-reduced-motion: reduce) {
    .bottom-nav {
      transition: none;
    }
    .bottom-nav__indicator {
      animation: none !important;
    }
    .bottom-nav__tab--active .bottom-nav__icon-wrapper {
      animation: none !important;
      transform: scale(1) !important;
    }
  }

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
  }

  .bottom-nav__tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 6px 0;
    position: relative;
    min-width: 48px;
  }

  .bottom-nav__icon-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgb(var(--text-muted));
    transition: color 0.2s ease, transform 0.2s ease;
  }

  .bottom-nav__tab--active .bottom-nav__icon-wrapper {
    color: rgb(var(--color-primary));
    animation: bottomNavPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .bottom-nav__label {
    font-size: 10px;
    font-weight: 500;
    color: rgb(var(--text-muted));
    transition: color 0.2s ease;
    white-space: nowrap;
  }

  .bottom-nav__tab--active .bottom-nav__label {
    color: rgb(var(--color-primary));
    font-weight: 600;
  }

  /* Active indicator dot/bar (Req 3.3) */
  .bottom-nav__indicator {
    position: absolute;
    top: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 3px;
    border-radius: 2px;
    background: rgb(var(--color-primary));
    animation: bottomNavIndicator 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  /* Badge (Req 3.6) */
  .bottom-nav__badge {
    position: absolute;
    top: -4px;
    right: -8px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: var(--radius-full);
    background: rgb(var(--color-error));
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    border: 2px solid rgb(var(--bg-surface));
  }

  /* Animations */
  @keyframes bottomNavPop {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1.05); }
  }

  @keyframes bottomNavIndicator {
    0% { width: 0; opacity: 0; }
    100% { width: 20px; opacity: 1; }
  }
`;
