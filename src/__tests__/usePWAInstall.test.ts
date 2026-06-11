import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePWAInstall } from '@/lib/usePWAInstall';

describe('usePWAInstall', () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStorageMock[key] ?? null,
      setItem: (key: string, value: string) => { localStorageMock[key] = value; },
      removeItem: (key: string) => { delete localStorageMock[key]; },
      clear: () => { localStorageMock = {}; },
      length: 0,
      key: () => null,
    });

    // Mock matchMedia for display-mode: standalone check
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('should increment visit count on mount', () => {
    renderHook(() => usePWAInstall());
    expect(localStorageMock['synapse_pwa_visit_count']).toBe('1');
  });

  it('should not show prompt before 3 visits', () => {
    localStorageMock['synapse_pwa_visit_count'] = '1'; // will become 2
    const { result } = renderHook(() => usePWAInstall());
    expect(result.current.showPrompt).toBe(false);
  });

  it('should track isInstalled when in standalone mode', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => usePWAInstall());
    expect(result.current.isInstalled).toBe(true);
  });

  it('should not show prompt if previously dismissed', () => {
    localStorageMock['synapse_pwa_visit_count'] = '5';
    localStorageMock['synapse_pwa_install_dismissed'] = 'true';

    const { result } = renderHook(() => usePWAInstall());
    expect(result.current.showPrompt).toBe(false);
  });

  it('should set showPrompt=true when beforeinstallprompt fires after 3+ visits', () => {
    localStorageMock['synapse_pwa_visit_count'] = '2'; // will become 3

    const { result } = renderHook(() => usePWAInstall());

    // Simulate the beforeinstallprompt event
    const event = new Event('beforeinstallprompt');
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
    Object.defineProperty(event, 'prompt', { value: vi.fn().mockResolvedValue(undefined) });
    Object.defineProperty(event, 'userChoice', { value: Promise.resolve({ outcome: 'accepted' }) });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(result.current.showPrompt).toBe(true);
    expect(result.current.isInstallable).toBe(true);
  });

  it('should dismiss prompt and persist dismissal to localStorage', () => {
    localStorageMock['synapse_pwa_visit_count'] = '2'; // will become 3

    const { result } = renderHook(() => usePWAInstall());

    // Trigger beforeinstallprompt
    const event = new Event('beforeinstallprompt');
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
    Object.defineProperty(event, 'prompt', { value: vi.fn().mockResolvedValue(undefined) });
    Object.defineProperty(event, 'userChoice', { value: Promise.resolve({ outcome: 'dismissed' }) });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(result.current.showPrompt).toBe(true);

    // Dismiss
    act(() => {
      result.current.dismissPrompt();
    });

    expect(result.current.showPrompt).toBe(false);
    expect(localStorageMock['synapse_pwa_install_dismissed']).toBe('true');
  });

  it('should call prompt() and set isInstalled on acceptance', async () => {
    localStorageMock['synapse_pwa_visit_count'] = '2'; // will become 3

    const { result } = renderHook(() => usePWAInstall());

    const mockPrompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event('beforeinstallprompt');
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
    Object.defineProperty(event, 'prompt', { value: mockPrompt });
    Object.defineProperty(event, 'userChoice', { value: Promise.resolve({ outcome: 'accepted' }) });

    act(() => {
      window.dispatchEvent(event);
    });

    // Call installApp
    let installResult: boolean | undefined;
    await act(async () => {
      installResult = await result.current.installApp();
    });

    expect(mockPrompt).toHaveBeenCalled();
    expect(installResult).toBe(true);
    expect(result.current.isInstalled).toBe(true);
    expect(result.current.showPrompt).toBe(false);
  });
});
