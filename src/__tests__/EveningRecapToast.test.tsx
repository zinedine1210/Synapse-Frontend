import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock SWR
const mockTransactions: any[] = [];
const mockTodos: any[] = [];
vi.mock('swr', () => ({
  default: (key: string) => {
    if (key === '/duit-tracker/transactions') return { data: mockTransactions };
    if (key === '/todos') return { data: mockTodos };
    return { data: undefined };
  },
}));

// Mock apiFetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { EveningRecapToast } from '@/components/shared/EveningRecapToast';

describe('EveningRecapToast', () => {
  let originalDateNow: typeof Date.now;

  beforeEach(() => {
    localStorage.clear();
    mockPush.mockClear();
    mockTransactions.length = 0;
    mockTodos.length = 0;
    originalDateNow = Date.now;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Date.now = originalDateNow;
  });

  function setTime(hour: number) {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(date);
  }

  function todayStr(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  it('does not render outside evening hours (before 18:00)', () => {
    setTime(12);
    mockTransactions.push({
      id: '1',
      type: 'expense',
      amount: 50000,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    mockTodos.push({
      id: '1',
      status: 'done',
      createdAt: new Date().toISOString(),
    });

    const { container } = render(<EveningRecapToast />);
    expect(container.innerHTML).toBe('');
    vi.useRealTimers();
  });

  it('renders during evening hours with activity', () => {
    setTime(20);
    const today = new Date().toISOString();
    mockTransactions.push({
      id: '1',
      type: 'expense',
      amount: 50000,
      date: today,
      createdAt: today,
    });
    mockTodos.push({
      id: '1',
      status: 'done',
      createdAt: today,
      dueDate: todayStr(),
    });
    mockTodos.push({
      id: '2',
      status: 'pending',
      createdAt: today,
      dueDate: todayStr(),
    });

    render(<EveningRecapToast />);
    expect(screen.getByText(/Hari ini: Rp 50\.000 keluar, 1\/2 todo selesai/)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('does not render if already shown today', () => {
    setTime(20);
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    localStorage.setItem(`recap_shown_${yyyy}-${mm}-${dd}`, 'true');

    mockTransactions.push({
      id: '1',
      type: 'expense',
      amount: 50000,
      date: today.toISOString(),
      createdAt: today.toISOString(),
    });

    const { container } = render(<EveningRecapToast />);
    expect(container.innerHTML).toBe('');
    vi.useRealTimers();
  });

  it('does not render if no activity today (Req 7.5)', () => {
    setTime(19);
    // No transactions, no todos today
    const { container } = render(<EveningRecapToast />);
    expect(container.innerHTML).toBe('');
    vi.useRealTimers();
  });

  it('dismiss button hides the toast and sets localStorage', () => {
    setTime(21);
    const today = new Date().toISOString();
    mockTransactions.push({
      id: '1',
      type: 'expense',
      amount: 25000,
      date: today,
      createdAt: today,
    });
    mockTodos.push({
      id: '1',
      status: 'done',
      createdAt: today,
      dueDate: todayStr(),
    });

    render(<EveningRecapToast />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    const dismissBtn = screen.getByLabelText('Tutup rekap');
    fireEvent.click(dismissBtn);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    const now = new Date();
    const key = `recap_shown_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(localStorage.getItem(key)).toBe('true');
    vi.useRealTimers();
  });

  it('insight link navigates to /insight', () => {
    setTime(18);
    const today = new Date().toISOString();
    mockTransactions.push({
      id: '1',
      type: 'expense',
      amount: 100000,
      date: today,
      createdAt: today,
    });
    mockTodos.push({
      id: '1',
      status: 'pending',
      createdAt: today,
      dueDate: todayStr(),
    });

    render(<EveningRecapToast />);
    const insightBtn = screen.getByText('Lihat Insight →');
    fireEvent.click(insightBtn);

    expect(mockPush).toHaveBeenCalledWith('/insight');
    vi.useRealTimers();
  });
});
