'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/AuthContext';
import { classService } from '@/services/classService';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { useToast, PasswordInput } from '@/components/ui';
import { brand } from '@/config/brand';
import {
  Sparkles, GraduationCap, Users, Loader2, ArrowLeft, BookOpen,
  Lock, Eye, EyeOff, ArrowRight, Shield, CheckCircle2, Sun, Moon, Clock,
} from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';

function useJoinTheme(isDark: boolean) {
  return useMemo(() => isDark ? {
    bg: 'rgb(6, 11, 24)',
    text: '#e8ecf4',
    textSub: 'rgba(160,175,210,0.75)',
    textMuted: 'rgba(140,160,200,0.6)',
    textFaint: 'rgba(140,160,200,0.5)',
    cardBg: 'rgba(16,20,36,0.95)',
    cardBorder: 'rgba(255,255,255,0.06)',
    cardShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 60px rgba(0,212,255,0.05)',
    infoBg: 'rgba(0,212,255,0.04)',
    infoBorder: 'rgba(0,212,255,0.1)',
    inputBg: 'rgba(255,255,255,0.04)',
    inputBorder: 'rgba(255,255,255,0.08)',
    inputFocusBorder: 'rgba(0,212,255,0.4)',
    inputText: '#e8ecf4',
    dividerColor: 'rgba(255,255,255,0.06)',
    btnPrimaryText: '#060B18',
    glowOrb1: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
    glowOrb2: 'radial-gradient(circle, rgba(0,245,160,0.06) 0%, transparent 70%)',
    toggleBg: 'rgba(255,255,255,0.06)',
    toggleBorder: 'rgba(255,255,255,0.1)',
    toggleColor: 'rgba(200,210,230,0.7)',
    errorBg: 'rgba(239,68,68,0.1)',
    errorBorder: 'rgba(239,68,68,0.2)',
    errorText: '#ef4444',
    badgeBg: 'rgba(0,212,255,0.06)',
    badgeBorder: 'rgba(0,212,255,0.15)',
    badgeColor: 'rgba(0,212,255,0.8)',
    ownerPillBg: 'rgba(0,245,160,0.08)',
    ownerPillColor: '#00F5A0',
    memberPillBg: 'rgba(161,140,209,0.1)',
    memberPillColor: '#a18cd1',
    approvalBg: 'rgba(246,211,101,0.08)',
    approvalBorder: 'rgba(246,211,101,0.15)',
    approvalText: '#f6d365',
    btnShadow: '0 4px 20px rgba(0,212,255,0.3)',
    btnGhostBg: 'rgba(255,255,255,0.04)',
    btnGhostBorder: 'rgba(255,255,255,0.06)',
    btnGhostColor: 'rgba(160,175,210,0.75)',
  } : {
    bg: '#f8fafc',
    text: '#111827',
    textSub: 'rgba(30,50,80,0.8)',
    textMuted: 'rgba(50,70,100,0.65)',
    textFaint: 'rgba(50,70,100,0.5)',
    cardBg: '#ffffff',
    cardBorder: 'rgba(0,0,0,0.08)',
    cardShadow: '0 4px 24px rgba(0,0,0,0.06), 0 0 40px rgba(0,150,200,0.04)',
    infoBg: 'rgba(0,150,200,0.04)',
    infoBorder: 'rgba(0,150,200,0.1)',
    inputBg: 'rgba(0,0,0,0.02)',
    inputBorder: 'rgba(0,0,0,0.1)',
    inputFocusBorder: 'rgba(0,150,200,0.5)',
    inputText: '#111827',
    dividerColor: 'rgba(0,0,0,0.06)',
    btnPrimaryText: '#060B18',
    glowOrb1: 'radial-gradient(circle, rgba(0,150,200,0.06) 0%, transparent 70%)',
    glowOrb2: 'radial-gradient(circle, rgba(0,200,140,0.04) 0%, transparent 70%)',
    toggleBg: 'rgba(0,0,0,0.04)',
    toggleBorder: 'rgba(0,0,0,0.1)',
    toggleColor: 'rgba(40,60,90,0.7)',
    errorBg: 'rgba(239,68,68,0.06)',
    errorBorder: 'rgba(239,68,68,0.15)',
    errorText: '#dc2626',
    badgeBg: 'rgba(0,150,200,0.08)',
    badgeBorder: 'rgba(0,150,200,0.2)',
    badgeColor: '#0088aa',
    ownerPillBg: 'rgba(0,180,120,0.08)',
    ownerPillColor: '#059669',
    memberPillBg: 'rgba(120,100,180,0.08)',
    memberPillColor: '#7a5fb5',
    approvalBg: 'rgba(200,170,60,0.06)',
    approvalBorder: 'rgba(200,170,60,0.15)',
    approvalText: '#b8960a',
    btnShadow: '0 4px 16px rgba(0,150,200,0.2)',
    btnGhostBg: 'rgba(0,0,0,0.02)',
    btnGhostBorder: 'rgba(0,0,0,0.06)',
    btnGhostColor: 'rgba(50,70,100,0.7)',
  }, [isDark]);
}

export default function JoinClassPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;
  const { user } = useAuth();
  const { showToast } = useToast();

  const [classInfo, setClassInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { theme, toggleTheme: ctxToggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const c = useJoinTheme(isDark);

  useEffect(() => {
    if (!classId) return;

    async function loadClassInfo() {
      try {
        setLoading(true);
        setError(null);
        const data = await classService.getClassInfo(classId);
        setClassInfo(data);
      } catch (err) {
        try {
          const resolved = await classService.resolveClassCode(classId);
          if (resolved?.classId) {
            const data = await classService.getClassInfo(resolved.classId);
            setClassInfo({ ...data, resolvedId: resolved.classId });
          } else {
            setError('Kelas tidak ditemukan. Periksa kembali kode/link undangan.');
          }
        } catch {
          setError(err instanceof Error ? err.message : 'Kelas tidak ditemukan. Periksa kembali kode/link undangan.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadClassInfo();
  }, [classId]);

  const handleJoin = async () => {
    const joinId = classInfo?.resolvedId || classId;
    if (!joinId) return;
    if (classInfo?.hasPassword && !password.trim()) {
      showToast('Password kelas wajib diisi.', 'error');
      return;
    }
    setIsJoining(true);
    try {
      const res = await classService.joinClass(joinId, password.trim() || undefined);
      if (res.status === 'PENDING') {
        showToast(res.message || 'Permintaan bergabung dikirim. Menunggu persetujuan admin.', 'success');
        router.push('/dashboard');
      } else {
        showToast(res.message || 'Berhasil bergabung dengan kelas!', 'success');
        router.push(`/class/${joinId}`);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal bergabung dengan kelas.', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const toggleTheme = ctxToggleTheme;

  return (
    <AuthGuard requiredFeature="class">
      <main style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: c.bg, padding: '1.5rem', position: 'relative', overflow: 'hidden',
        transition: 'background 0.4s ease',
      }}>
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '-25%', left: '-15%', width: '55%', height: '55%', borderRadius: '50%', background: c.glowOrb1, pointerEvents: 'none', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '-25%', right: '-15%', width: '55%', height: '55%', borderRadius: '50%', background: c.glowOrb2, pointerEvents: 'none', filter: 'blur(40px)' }} />

        {/* Top bar */}
        <div style={{ position: 'absolute', top: '1.25rem', left: '1.5rem', right: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
          <button onClick={() => router.push('/dashboard')} style={{
            background: 'none', border: 'none', color: c.textFaint, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem',
            fontFamily: 'inherit', padding: '0.4rem 0.6rem', borderRadius: 8,
          }}>
            <ArrowLeft size={14} /> Dashboard
          </button>
          <button onClick={toggleTheme} title="Toggle theme" style={{
            padding: '0.4rem', borderRadius: 8, border: `1px solid ${c.toggleBorder}`,
            background: c.toggleBg, color: c.toggleColor, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
          }}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>
          {/* Card */}
          <div style={{
            background: c.cardBg, border: `1px solid ${c.cardBorder}`,
            borderRadius: 22, padding: '2.25rem 2rem',
            boxShadow: c.cardShadow, transition: 'background 0.4s, border-color 0.4s, box-shadow 0.4s',
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, margin: '0 auto 1rem',
                background: isDark
                  ? 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(0,245,160,0.12))'
                  : 'linear-gradient(135deg, rgba(0,150,200,0.1), rgba(0,200,140,0.1))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <GraduationCap size={28} style={{ color: isDark ? '#00D4FF' : '#0088aa' }} />
              </div>

              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.3rem 0.85rem', borderRadius: 999, marginBottom: '0.85rem',
                background: c.badgeBg, border: `1px solid ${c.badgeBorder}`,
                fontSize: '0.72rem', color: c.badgeColor, fontWeight: 600,
              }}>
                <Sparkles size={12} /> Undangan Kelas
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: c.text, margin: '0 0 0.3rem' }}>
                Bergabung ke{' '}
                <span style={{ background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{brand.name}</span>
              </h2>
              <p style={{ fontSize: '0.82rem', color: c.textMuted, margin: 0 }}>
                Bergabunglah untuk belajar bersama teman sekelas.
              </p>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem 0' }}>
                <div className="skeleton" style={{ height: 18, width: '70%', borderRadius: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '50%', borderRadius: 6 }} />
                <div className="skeleton" style={{ height: 44, borderRadius: 12, marginTop: 12 }} />
              </div>
            ) : error ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{
                  padding: '0.85rem 1rem', borderRadius: 14,
                  background: c.errorBg, border: `1px solid ${c.errorBorder}`,
                  fontSize: '0.84rem', color: c.errorText, display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <Shield size={16} /> {error}
                </div>
                <button onClick={() => router.push('/dashboard')} style={{
                  width: '100%', padding: '0.75rem', borderRadius: 14,
                  background: c.btnGhostBg, border: `1px solid ${c.btnGhostBorder}`,
                  color: c.btnGhostColor, fontSize: '0.88rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                }}>
                  <ArrowLeft size={15} /> Kembali ke Dashboard
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Class Info Card */}
                <div style={{
                  background: c.infoBg, border: `1px solid ${c.infoBorder}`,
                  borderRadius: 16, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: 'linear-gradient(135deg, #00D4FF, #00F5A0)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <BookOpen size={22} style={{ color: '#060B18' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: c.text, margin: 0, lineHeight: 1.25 }}>
                        {classInfo.name}
                      </h3>
                      {classInfo.description && (
                        <p style={{ fontSize: '0.82rem', color: c.textMuted, marginTop: '0.3rem', lineHeight: 1.45, margin: '0.3rem 0 0' }}>
                          {classInfo.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Meta info pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', borderTop: `1px solid ${c.dividerColor}`, paddingTop: '0.85rem' }}>
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.25rem 0.65rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
                      background: c.ownerPillBg, color: c.ownerPillColor,
                    }}>
                      <Users size={11} /> {classInfo.ownerName}
                    </span>
                    {classInfo.memberCount != null && (
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.25rem 0.65rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
                        background: c.memberPillBg, color: c.memberPillColor,
                      }}>
                        <Users size={11} /> {classInfo.memberCount} anggota
                      </span>
                    )}
                    {classInfo.hasPassword && (
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.25rem 0.65rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
                        background: isDark ? 'rgba(246,211,101,0.08)' : 'rgba(200,170,60,0.06)',
                        color: isDark ? '#f6d365' : '#b8960a',
                      }}>
                        <Lock size={11} /> Dilindungi password
                      </span>
                    )}
                  </div>
                </div>

                {/* Password Input */}
                {classInfo?.hasPassword && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <PasswordInput label="Password Kelas" value={password} onChange={setPassword} placeholder="Masukkan password kelas" required />
                  </div>
                )}

                {/* Approval notice */}
                {classInfo?.joinMode === 'APPROVAL' && (
                  <div style={{
                    padding: '0.7rem 0.9rem', borderRadius: 12,
                    background: c.approvalBg, border: `1px solid ${c.approvalBorder}`,
                    fontSize: '0.78rem', color: c.approvalText,
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                  }}>
                    <Clock size={14} /> Kelas ini memerlukan persetujuan admin untuk bergabung
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
                  <button onClick={handleJoin} disabled={isJoining} style={{
                    width: '100%', padding: '0.85rem', borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg, #00D4FF, #00F5A0)',
                    color: c.btnPrimaryText, fontSize: '0.92rem', fontWeight: 700,
                    cursor: isJoining ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    boxShadow: c.btnShadow, opacity: isJoining ? 0.7 : 1, transition: 'all 0.2s',
                  }}>
                    {isJoining ? (
                      <><Loader2 size={16} className="animate-spin" /> Memproses...</>
                    ) : (
                      <>{classInfo?.joinMode === 'APPROVAL' ? 'Kirim Permintaan' : 'Bergabung Sekarang'} <ArrowRight size={15} /></>
                    )}
                  </button>

                  <button onClick={() => router.push('/dashboard')} style={{
                    width: '100%', padding: '0.7rem', borderRadius: 14,
                    background: c.btnGhostBg, border: `1px solid ${c.btnGhostBorder}`,
                    color: c.btnGhostColor, fontSize: '0.85rem', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer brand */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '1.5rem' }}>
            <Image src={brand.logoPath} alt={brand.name} width={18} height={18} style={{ objectFit: 'contain' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: c.textFaint }}>
              Powered by <span style={{ background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>{brand.name}</span>
            </span>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
