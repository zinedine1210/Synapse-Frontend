import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import { PullToRefresh } from '@/components/ui/PullToRefresh';

// Mock Loader2 from lucide-react
vi.mock('lucide-react', () => ({
  Loader2: ({ className, size, style, ...props }: any) => (
    <span data-testid="loader-icon" className={className} style={style} {...props}>
      loader
    </span>
  ),
}));

function mockMediaQuery(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mql = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: (_: string, handler: (e: MediaQueryListEvent) => void) => {
      listeners.push(handler);
    },
    removeEventListener: (_: string, handler: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    },
    dispatchEvent: () => true,
    addListener: () => {},
    removeListener: () => {},
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => {
      if (query === '(prefers-reduced-motion: reduce)') {
        return mql;
      }
      return { ...mql, matches: false, media: query };
    }),
  });

  return { mql, listeners };
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  window.dispatchEvent(new Event('resize'));
}

describe('PullToRefresh', () => {
  let rafCallback: FrameRequestCallback | null = null;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockMediaQuery(false);

    // Mock requestAnimationFrame to execute synchronously
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb;
      // Execute immediately for test predictability
      cb(performance.now());
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    setViewportWidth(375); // Mobile viewport
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders children', () => {
    render(
      <PullToRefresh onRefresh={async () => {}}>
        <div data-testid="child">Hello</div>
      </PullToRefresh>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows pull indicator text when pulling down on mobile', () => {
    render(
      <PullToRefresh onRefresh={async () => {}}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = document.querySelector('.pull-to-refresh-container')!;

    // Simulate touch pull
    fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container, { touches: [{ clientY: 50 }] }); // 50 * 0.4 = 20px > 10px

    expect(screen.getByText('Tarik ke bawah...')).toBeInTheDocument();
  });

  it('shows "Lepaskan untuk refresh" when pull exceeds threshold', () => {
    render(
      <PullToRefresh onRefresh={async () => {}} pullThreshold={70}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = document.querySelector('.pull-to-refresh-container')!;

    // Pull enough to exceed threshold: 200 * 0.4 = 80px > 70px threshold
    fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container, { touches: [{ clientY: 200 }] });

    expect(screen.getByText('Lepaskan untuk refresh')).toBeInTheDocument();
  });

  it('triggers onRefresh when released past threshold', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);

    render(
      <PullToRefresh onRefresh={onRefresh} pullThreshold={70}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = document.querySelector('.pull-to-refresh-container')!;

    // Pull past threshold and release
    fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container, { touches: [{ clientY: 200 }] }); // 200 * 0.4 = 80px > 70
    
    await act(async () => {
      fireEvent.touchEnd(container);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('does NOT trigger onRefresh when pull is below threshold', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);

    render(
      <PullToRefresh onRefresh={onRefresh} pullThreshold={70}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = document.querySelector('.pull-to-refresh-container')!;

    // Pull below threshold: 100 * 0.4 = 40px < 70px
    fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container, { touches: [{ clientY: 100 }] });
    
    await act(async () => {
      fireEvent.touchEnd(container);
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('does NOT activate pull-to-refresh on desktop viewport (>= 768px)', () => {
    setViewportWidth(1024); // Desktop

    render(
      <PullToRefresh onRefresh={async () => {}}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = document.querySelector('.pull-to-refresh-container')!;

    fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container, { touches: [{ clientY: 200 }] });

    // Should not show any pull indicator text
    expect(screen.queryByText('Tarik ke bawah...')).not.toBeInTheDocument();
    expect(screen.queryByText('Lepaskan untuk refresh')).not.toBeInTheDocument();
  });

  it('shows loading indicator during refresh', async () => {
    let resolveRefresh: () => void;
    const onRefresh = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => { resolveRefresh = resolve; })
    );

    render(
      <PullToRefresh onRefresh={onRefresh} pullThreshold={70}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = document.querySelector('.pull-to-refresh-container')!;

    // Trigger refresh
    fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container, { touches: [{ clientY: 200 }] });
    
    await act(async () => {
      fireEvent.touchEnd(container);
    });

    // Should show loading text
    expect(screen.getByText('Memperbarui...')).toBeInTheDocument();
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();

    // Resolve the refresh
    await act(async () => {
      resolveRefresh!();
    });

    // Loading indicator should be gone
    expect(screen.queryByText('Memperbarui...')).not.toBeInTheDocument();
  });

  it('respects prefers-reduced-motion by not applying spin class to loader', async () => {
    mockMediaQuery(true); // Reduced motion enabled

    let resolveRefresh: () => void;
    const onRefresh = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => { resolveRefresh = resolve; })
    );

    render(
      <PullToRefresh onRefresh={onRefresh} pullThreshold={70}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = document.querySelector('.pull-to-refresh-container')!;

    fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container, { touches: [{ clientY: 200 }] });
    
    await act(async () => {
      fireEvent.touchEnd(container);
    });

    // Loader should NOT have 'spin' class when reduced motion is enabled
    const loader = screen.getByTestId('loader-icon');
    expect(loader.className).not.toContain('spin');

    await act(async () => {
      resolveRefresh!();
    });
  });

  it('enforces cooldown between refreshes', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);

    render(
      <PullToRefresh onRefresh={onRefresh} pullThreshold={70} cooldown={3000}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = document.querySelector('.pull-to-refresh-container')!;

    // First refresh
    fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container, { touches: [{ clientY: 200 }] });
    await act(async () => {
      fireEvent.touchEnd(container);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);

    // Immediately try again (within cooldown)
    fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container, { touches: [{ clientY: 200 }] });
    await act(async () => {
      fireEvent.touchEnd(container);
    });

    // Should still be 1 (cooldown not passed)
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('uses requestAnimationFrame for pull updates', () => {
    render(
      <PullToRefresh onRefresh={async () => {}}>
        <div>Content</div>
      </PullToRefresh>
    );

    const container = document.querySelector('.pull-to-refresh-container')!;

    fireEvent.touchStart(container, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(container, { touches: [{ clientY: 50 }] });

    // requestAnimationFrame should have been called during pull
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('has aria-live region for accessibility', () => {
    render(
      <PullToRefresh onRefresh={async () => {}}>
        <div>Content</div>
      </PullToRefresh>
    );

    const indicator = document.querySelector('.pull-to-refresh-indicator');
    expect(indicator).toHaveAttribute('aria-live', 'polite');
    expect(indicator).toHaveAttribute('aria-atomic', 'true');
  });
});
