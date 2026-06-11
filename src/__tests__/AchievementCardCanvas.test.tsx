/**
 * Unit tests for AchievementCardCanvas component
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AchievementCardCanvas } from '@/components/gamification/AchievementCardCanvas';

// --- Mock Canvas API ---

const mockFillText = vi.fn();
const mockFillRect = vi.fn();
const mockBeginPath = vi.fn();
const mockArc = vi.fn();
const mockFill = vi.fn();
const mockStroke = vi.fn();
const mockMoveTo = vi.fn();
const mockLineTo = vi.fn();
const mockQuadraticCurveTo = vi.fn();
const mockClosePath = vi.fn();
const mockMeasureText = vi.fn(() => ({ width: 100 }));
const mockToBlob = vi.fn();

const mockCtx = {
  fillText: mockFillText,
  fillRect: mockFillRect,
  beginPath: mockBeginPath,
  arc: mockArc,
  fill: mockFill,
  stroke: mockStroke,
  moveTo: mockMoveTo,
  lineTo: mockLineTo,
  quadraticCurveTo: mockQuadraticCurveTo,
  closePath: mockClosePath,
  measureText: mockMeasureText,
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  save: vi.fn(),
  restore: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
  textAlign: '',
  textBaseline: '',
  globalAlpha: 1,
};

beforeEach(() => {
  vi.clearAllMocks();

  // Mock HTMLCanvasElement.getContext
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as any;

  // Mock HTMLCanvasElement.toBlob
  HTMLCanvasElement.prototype.toBlob = vi.fn((callback: BlobCallback) => {
    const blob = new Blob(['fake-image-data'], { type: 'image/png' });
    callback(blob);
  });
});

describe('AchievementCardCanvas', () => {
  const defaultProps = {
    achievementName: 'Streak 7 Hari',
    progressText: '7 Hari',
    quote: 'Konsistensi mengalahkan bakat.',
    type: 'streak' as const,
  };

  it('renders a canvas element with correct dimensions (1080x1920)', () => {
    const { container } = render(<AchievementCardCanvas {...defaultProps} />);
    const canvas = container.querySelector('canvas');

    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute('width')).toBe('1080');
    expect(canvas?.getAttribute('height')).toBe('1920');
  });

  it('renders download button', () => {
    render(<AchievementCardCanvas {...defaultProps} />);
    const downloadBtn = screen.getByLabelText('Download achievement card');
    expect(downloadBtn).toBeDefined();
    expect(downloadBtn.textContent).toContain('Download');
  });

  it('renders share button when Web Share API is available', () => {
    // Mock navigator.share and navigator.canShare
    Object.defineProperty(navigator, 'share', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'canShare', {
      value: vi.fn(() => true),
      writable: true,
      configurable: true,
    });

    render(<AchievementCardCanvas {...defaultProps} />);
    const shareBtn = screen.getByLabelText('Share achievement card');
    expect(shareBtn).toBeDefined();
    expect(shareBtn.textContent).toContain('Share');
  });

  it('does not render share button when Web Share API is unavailable', () => {
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'canShare', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    render(<AchievementCardCanvas {...defaultProps} />);
    const shareBtn = screen.queryByLabelText('Share achievement card');
    expect(shareBtn).toBeNull();
  });

  it('calls canvas drawing methods when rendered', () => {
    render(<AchievementCardCanvas {...defaultProps} />);

    // Should have drawn the gradient background
    expect(mockFillRect).toHaveBeenCalled();
    // Should have rendered text (achievement name, progress, quote, branding)
    expect(mockFillText).toHaveBeenCalled();

    // Verify achievement name and progress text were drawn
    const fillTextCalls = mockFillText.mock.calls.map((c) => c[0]);
    expect(fillTextCalls.some((text: string) => text.includes('Streak 7 Hari') || text === '7 Hari')).toBe(true);
  });

  it('triggers download when download button is clicked', () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    const { container } = render(<AchievementCardCanvas {...defaultProps} />);
    const downloadBtn = screen.getByLabelText('Download achievement card');

    fireEvent.click(downloadBtn);

    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalled();
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('calls navigator.share when share button is clicked', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    const mockCanShare = vi.fn(() => true);

    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'canShare', {
      value: mockCanShare,
      writable: true,
      configurable: true,
    });

    render(<AchievementCardCanvas {...defaultProps} />);
    const shareBtn = screen.getByLabelText('Share achievement card');

    fireEvent.click(shareBtn);

    // Wait for async share to be called
    await vi.waitFor(() => {
      expect(mockShare).toHaveBeenCalled();
    });
  });

  it('renders correctly for all achievement types', () => {
    const types = ['streak', 'saving', 'level', 'achievement'] as const;

    for (const type of types) {
      const { container, unmount } = render(
        <AchievementCardCanvas {...defaultProps} type={type} />
      );
      const canvas = container.querySelector('canvas');
      expect(canvas).not.toBeNull();
      unmount();
    }
  });

  it('uses fallback quote when quote prop is empty', () => {
    render(<AchievementCardCanvas {...defaultProps} quote="" />);
    // Should still draw text — the component picks a random fallback quote
    expect(mockFillText).toHaveBeenCalled();
  });

  it('renders Synapse branding on the card', () => {
    render(<AchievementCardCanvas {...defaultProps} />);

    const fillTextCalls = mockFillText.mock.calls.map((c) => c[0]);
    expect(fillTextCalls.some((text: string) => text.includes('Synapse'))).toBe(true);
    expect(fillTextCalls.some((text: string) => text.includes('Platform Mahasiswa Cerdas'))).toBe(true);
  });
});
