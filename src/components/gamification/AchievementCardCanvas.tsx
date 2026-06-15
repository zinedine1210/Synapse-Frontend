'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Download, Share2 } from 'lucide-react';

// --- Types ---

export type AchievementType = 'streak' | 'saving' | 'level' | 'achievement';

export interface AchievementCardCanvasProps {
  /** The achievement title displayed prominently */
  achievementName: string;
  /** Progress numbers or subtitle (e.g., "7 Hari Berturut-turut") */
  progressText: string;
  /** Motivational quote in Indonesian */
  quote: string;
  /** Type of achievement — determines gradient colors */
  type: AchievementType;
}

// --- Constants ---

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

const GRADIENT_COLORS: Record<AchievementType, [string, string, string]> = {
  streak: ['#FF6B35', '#F7931E', '#FFD23F'],
  saving: ['#06D6A0', '#0CBABA', '#00D4FF'],
  level: ['#8B5CF6', '#6366F1', '#00D4FF'],
  achievement: ['#F43F5E', '#EC4899', '#A855F7'],
};

const MOTIVATIONAL_QUOTES_FALLBACK: string[] = [
  'Konsistensi mengalahkan bakat.',
  'Satu langkah kecil, satu lompatan besar.',
  'Progress, bukan perfection.',
  'Kamu lebih kuat dari yang kamu kira.',
  'Terus melangkah, hasilnya akan terasa.',
];

// --- Helpers ---

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[i] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY;
}

function getTypeEmoji(type: AchievementType): string {
  switch (type) {
    case 'streak':
      return '🔥';
    case 'saving':
      return '🌳';
    case 'level':
      return '⬆️';
    case 'achievement':
      return '🏆';
  }
}

// --- Component ---

export function AchievementCardCanvas({
  achievementName,
  progressText,
  quote,
  type,
}: AchievementCardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canShare, setCanShare] = useState(false);

  // Check Web Share API support
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare);
  }, []);

  // Draw the achievement card on canvas
  const drawCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;

    // --- Background gradient ---
    const colors = GRADIENT_COLORS[type];
    const bgGradient = ctx.createLinearGradient(0, 0, w, h);
    bgGradient.addColorStop(0, colors[0]);
    bgGradient.addColorStop(0.5, colors[1]);
    bgGradient.addColorStop(1, colors[2]);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // --- Decorative circles (subtle) ---
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(w * 0.85, h * 0.15, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w * 0.15, h * 0.75, 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.5, 400, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // --- Central content card (frosted glass effect) ---
    const cardX = 80;
    const cardY = 480;
    const cardW = w - 160;
    const cardH = 960;

    ctx.save();
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 48);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // --- Emoji icon at top of card ---
    const emoji = getTypeEmoji(type);
    ctx.font = '120px serif';
    ctx.textAlign = 'center';
    ctx.fillText(emoji, w / 2, cardY + 160);

    // --- Achievement name ---
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const nameY = cardY + 220;
    wrapText(ctx, achievementName, w / 2, nameY, cardW - 120, 80);

    // --- Progress text ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '800 96px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(progressText, w / 2, cardY + cardH / 2 + 20);

    // --- Motivational quote ---
    const displayQuote = quote || MOTIVATIONAL_QUOTES_FALLBACK[Math.floor(Math.random() * MOTIVATIONAL_QUOTES_FALLBACK.length)];
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = 'italic 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const quoteY = cardY + cardH - 240;
    wrapText(ctx, `"${displayQuote}"`, w / 2, quoteY, cardW - 120, 48);

    // --- Divider line above branding ---
    const dividerY = h - 280;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.3, dividerY);
    ctx.lineTo(w * 0.7, dividerY);
    ctx.stroke();

    // --- Synapse branding ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦ Synapse', w / 2, h - 200);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('Platform Anak Muda Cerdas', w / 2, h - 140);
  }, [achievementName, progressText, quote, type]);

  useEffect(() => {
    drawCard();
  }, [drawCard]);

  // --- Download handler ---
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `synapse-achievement-${type}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, [type]);

  // --- Share handler (Web Share API) ---
  const handleShare = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], `synapse-achievement-${type}.png`, {
        type: 'image/png',
      });

      const shareData: ShareData = {
        title: achievementName,
        text: `${achievementName} — ${progressText} 🎉\n${quote}`,
        files: [file],
      };

      try {
        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          // Fallback: share without file
          await navigator.share({
            title: achievementName,
            text: `${achievementName} — ${progressText} 🎉\n${quote}\n\n#Synapse`,
          });
        }
      } catch (err) {
        // User cancelled or share failed — silent
        if ((err as Error).name !== 'AbortError') {
          console.warn('Share failed:', err);
        }
      }
    }, 'image/png');
  }, [achievementName, progressText, quote, type]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      {/* Canvas preview (scaled down for display) */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          width: '100%',
          maxWidth: '320px',
          height: 'auto',
          borderRadius: 'var(--radius-lg, 16px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }}
      />

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: '320px' }}>
        <button
          onClick={handleDownload}
          aria-label="Download achievement card"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md, 12px)',
            border: '1px solid rgba(var(--border-color, 200, 200, 210), 0.3)',
            background: 'var(--card-bg, rgba(30, 30, 40, 0.8))',
            color: 'rgb(var(--text-primary, 255, 255, 255))',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.2s, transform 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.85';
            e.currentTarget.style.transform = 'scale(0.98)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Download size={18} />
          Download
        </button>

        {canShare && (
          <button
            onClick={handleShare}
            aria-label="Share achievement card"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md, 12px)',
              border: 'none',
              background: 'linear-gradient(135deg, rgb(var(--color-primary, 0, 212, 255)), rgb(var(--color-secondary, 139, 92, 246)))',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.2s, transform 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.85';
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Share2 size={18} />
            Share
          </button>
        )}
      </div>
    </div>
  );
}
