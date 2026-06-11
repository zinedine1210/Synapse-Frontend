/**
 * Unit tests for BottomNav component
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BottomNav } from '@/components/layout/BottomNav';

// Mock next/navigation
const mockUsePathname = vi.fn(() => '/dashboard');
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock next/link to render as <a>
vi.mock('next/link', () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.documentElement.style.removeProperty('--bottom-nav-height');
    document.documentElement.style.removeProperty('--bottom-nav-visible');
  });

  it('renders 5 tabs: Dashboard, Duit, Todo, Q&A, More', () => {
    const { container } = render(<BottomNav />);

    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Duit')).toBeDefined();
    expect(screen.getByText('Todo')).toBeDefined();
    expect(screen.getByText('Q&A')).toBeDefined();
    expect(screen.getByText('More')).toBeDefined();

    // 4 links + 1 button (More)
    const links = container.querySelectorAll('a.bottom-nav__link');
    const buttons = container.querySelectorAll('button.bottom-nav__link');
    expect(links.length).toBe(4);
    expect(buttons.length).toBe(1);
  });

  it('renders correct paths for each tab', () => {
    const { container } = render(<BottomNav />);
    const links = container.querySelectorAll('a.bottom-nav__link');

    const hrefs = Array.from(links).map(l => l.getAttribute('href'));
    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/duit-tracker');
    expect(hrefs).toContain('/todos');
    expect(hrefs).toContain('/qna');
  });

  it('shows active state for current path', () => {
    mockUsePathname.mockReturnValue('/todos');

    const { container } = render(<BottomNav />);
    const activeTabs = container.querySelectorAll('.bottom-nav__tab--active');
    expect(activeTabs.length).toBe(1);

    // The active tab should contain "Todo" label
    const activeLabel = activeTabs[0].querySelector('.bottom-nav__label');
    expect(activeLabel?.textContent).toBe('Todo');
  });

  it('renders active indicator on active tab', () => {
    mockUsePathname.mockReturnValue('/dashboard');

    const { container } = render(<BottomNav />);
    const indicators = container.querySelectorAll('.bottom-nav__indicator');
    expect(indicators.length).toBe(1);
  });

  it('displays badge for Q&A unread count', () => {
    render(<BottomNav unreadQnaCount={5} />);
    const badge = screen.getByText('5');
    expect(badge).toBeDefined();
    expect(badge.classList.contains('bottom-nav__badge')).toBe(true);
  });

  it('displays badge for pending todo count', () => {
    render(<BottomNav pendingTodoCount={12} />);
    const badge = screen.getByText('12');
    expect(badge).toBeDefined();
    expect(badge.classList.contains('bottom-nav__badge')).toBe(true);
  });

  it('caps badge display at 99+', () => {
    render(<BottomNav unreadQnaCount={150} />);
    expect(screen.getByText('99+')).toBeDefined();
  });

  it('does not show badge when count is 0', () => {
    const { container } = render(<BottomNav unreadQnaCount={0} pendingTodoCount={0} />);
    const badges = container.querySelectorAll('.bottom-nav__badge');
    expect(badges.length).toBe(0);
  });

  it('calls onMoreTap when More button is clicked', () => {
    const onMoreTap = vi.fn();
    render(<BottomNav onMoreTap={onMoreTap} />);

    const moreButton = screen.getByLabelText('More options');
    fireEvent.click(moreButton);
    expect(onMoreTap).toHaveBeenCalledTimes(1);
  });

  it('sets CSS custom property for bottom-nav-height', () => {
    render(<BottomNav />);
    const heightVar = document.documentElement.style.getPropertyValue('--bottom-nav-height');
    expect(heightVar).toBe('60px');
  });

  it('sets CSS custom property for bottom-nav-visible', () => {
    render(<BottomNav />);
    const visibleVar = document.documentElement.style.getPropertyValue('--bottom-nav-visible');
    expect(visibleVar).toBe('1');
  });

  it('has correct aria-label for accessibility', () => {
    const { container } = render(<BottomNav />);
    const nav = container.querySelector('nav[aria-label="Mobile navigation"]');
    expect(nav).not.toBeNull();
  });

  it('renders nav element with bottom-nav class', () => {
    const { container } = render(<BottomNav />);
    const nav = container.querySelector('nav.bottom-nav');
    expect(nav).not.toBeNull();
  });

  it('marks data-visible as true by default (before any scroll)', () => {
    const { container } = render(<BottomNav />);
    const nav = container.querySelector('.bottom-nav');
    expect(nav?.getAttribute('data-visible')).toBe('true');
  });
});
