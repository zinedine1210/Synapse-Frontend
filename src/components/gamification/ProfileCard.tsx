'use client';

import React, { useRef, useCallback } from 'react';
import { Card, Button } from '@/components/ui';
import { Share2, Download, Flame, Trophy, Star, Wallet } from 'lucide-react';

interface ProfileCardData {
  name: string;
  avatarUrl?: string;
  university?: string;
  personalityType?: { emoji: string; title: string; color: string };
  level: number;
  levelName: string;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  achievementCount: number;
  totalSaved: number;
  memberSince: string;
}

interface ProfileCardProps {
  data: ProfileCardData;
}

export function ProfileCard({ data }: ProfileCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const w = 1080, h = 1920;
    canvas.width = w;
    canvas.height = h;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.5, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Decorative circles
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(200, 300, 250, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(880, 1600, 300, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SYNAPSE', w / 2, 100);
    ctx.font = '24px -apple-system, system-ui, sans-serif';
    ctx.globalAlpha = 0.5;
    ctx.fillText('Financial Identity Card', w / 2, 140);
    ctx.globalAlpha = 1;

    // Avatar circle
    ctx.beginPath();
    ctx.arc(w / 2, 350, 100, 0, Math.PI * 2);
    ctx.fillStyle = '#4ECDC4';
    ctx.fill();
    ctx.font = 'bold 80px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.name.charAt(0).toUpperCase(), w / 2, 350);
    ctx.textBaseline = 'alphabetic';

    // Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px -apple-system, system-ui, sans-serif';
    ctx.fillText(data.name, w / 2, 520);

    // University
    if (data.university) {
      ctx.font = '28px -apple-system, system-ui, sans-serif';
      ctx.globalAlpha = 0.6;
      ctx.fillText(data.university, w / 2, 570);
      ctx.globalAlpha = 1;
    }

    // Personality type
    if (data.personalityType) {
      ctx.font = 'bold 36px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = data.personalityType.color;
      ctx.fillText(`${data.personalityType.emoji} ${data.personalityType.title}`, w / 2, 660);
    }

    // Stats grid
    const statsY = 780;
    const stats = [
      { label: 'Level', value: `${data.level}`, sub: data.levelName },
      { label: 'XP Total', value: `${data.totalXp.toLocaleString()}`, sub: 'points' },
      { label: 'Streak', value: `${data.currentStreak}`, sub: `best: ${data.longestStreak}` },
      { label: 'Achievements', value: `${data.achievementCount}`, sub: 'unlocked' },
    ];

    stats.forEach((stat, i) => {
      const x = 140 + (i % 2) * 440;
      const y = statsY + Math.floor(i / 2) * 200;

      // Card bg
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.roundRect(x, y, 380, 160, 20);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(stat.value, x + 190, y + 70);

      ctx.font = '24px -apple-system, system-ui, sans-serif';
      ctx.globalAlpha = 0.5;
      ctx.fillText(stat.label, x + 190, y + 110);
      ctx.font = '20px -apple-system, system-ui, sans-serif';
      ctx.fillText(stat.sub, x + 190, y + 140);
      ctx.globalAlpha = 1;
    });

    // Saved amount
    const savedY = statsY + 440;
    ctx.fillStyle = 'rgba(78, 205, 196, 0.15)';
    ctx.beginPath();
    ctx.roundRect(140, savedY, 800, 140, 20);
    ctx.fill();
    ctx.fillStyle = '#4ECDC4';
    ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💰 Total Tabungan', w / 2, savedY + 50);
    ctx.font = 'bold 44px -apple-system, system-ui, sans-serif';
    ctx.fillText(`Rp${data.totalSaved.toLocaleString('id-ID')}`, w / 2, savedY + 110);

    // Footer
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.3;
    ctx.font = '22px -apple-system, system-ui, sans-serif';
    ctx.fillText(`Member since ${data.memberSince}`, w / 2, h - 120);
    ctx.fillText('synapse-app.vercel.app', w / 2, h - 80);
    ctx.globalAlpha = 1;

    return canvas.toDataURL('image/png');
  }, [data]);

  const handleDownload = () => {
    const dataUrl = generateImage();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `synapse-profile-${data.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleShare = async () => {
    const dataUrl = generateImage();
    if (!dataUrl) return;
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], 'synapse-profile.png', { type: 'image/png' });
    if (navigator.share) {
      await navigator.share({ title: 'My Synapse Profile', files: [file] });
    } else {
      handleDownload();
    }
  };

  return (
    <Card style={{ padding: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Star size={16} style={{ color: '#f59e0b' }} /> Digital Identity Card
      </h3>

      {/* Preview mini card */}
      <div style={{
        padding: 20, borderRadius: 16, marginBottom: 16,
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)', color: '#fff',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: '#4ECDC4',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800,
          }}>
            {data.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{data.name}</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>{data.university || 'Synapse Member'}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 11, opacity: 0.5 }}>Level</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{data.level}</div>
          </div>
        </div>

        {data.personalityType && (
          <div style={{ marginBottom: 12, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'inline-block', fontSize: 12 }}>
            {data.personalityType.emoji} {data.personalityType.title}
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Flame size={12} /> {data.currentStreak} streak</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Trophy size={12} /> {data.achievementCount}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Wallet size={12} /> Rp{(data.totalSaved / 1000).toFixed(0)}k saved</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={handleShare} style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}>
          <Share2 size={14} /> Share
        </Button>
        <Button variant="ghost" onClick={handleDownload} style={{ fontSize: 13 }}>
          <Download size={14} /> Download
        </Button>
      </div>

      {/* Hidden canvas for generating image */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Card>
  );
}
