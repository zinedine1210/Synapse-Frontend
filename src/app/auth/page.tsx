'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { brand } from '@/config/brand';
import {
  Eye, EyeOff, Sparkles, Brain, BookOpen, MessageSquare,
  ArrowLeft, Sun, Moon, Target, Users, BarChart3, FileText,
  CheckCircle2, ArrowRight, Shield, Loader2,
} from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { TextInput, PasswordInput } from '@/components/ui';

const SIDE_FEATURES = [
  { icon: Brain, label: 'AI Summarizer', sub: 'Rangkum materi otomatis dengan AI', color: '#00D4FF' },
  { icon: Target, label: 'Kuis Adaptif', sub: 'Latihan soal sesuai kelemahanmu', color: '#00F5A0' },
  { icon: MessageSquare, label: 'Forum Diskusi', sub: 'Kolaborasi real-time per kelas', color: '#a18cd1' },
  { icon: BarChart3, label: 'Prediksi Ujian', sub: 'AI memprediksi soal ujian', color: '#f093fb' },
  { icon: Users, label: 'Kelompok Belajar', sub: 'Bagi tugas & kelola tim', color: '#4facfe' },
  { icon: FileText, label: 'Export PDF', sub: 'Rangkuman siap cetak format B5', color: '#fa709a' },
];

function useAuthTheme(isDark: boolean) {
  return useMemo(() => isDark ? {
    bg: 'rgb(6, 11, 24)',
    sideBg: 'linear-gradient(135deg, rgba(0,212,255,0.04), rgba(0,245,160,0.02))',
    text: '#e8ecf4',
    textSub: 'rgba(160,175,210,0.75)',
    textMuted: 'rgba(140,160,200,0.6)',
    textFaint: 'rgba(140,160,200,0.5)',
    cardBg: 'rgba(16,20,36,0.95)',
    cardBorder: 'rgba(255,255,255,0.06)',
    cardShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 60px rgba(0,212,255,0.05)',
    inputBg: 'rgba(255,255,255,0.04)',
    inputBorder: 'rgba(255,255,255,0.08)',
    inputFocusBorder: 'rgba(0,212,255,0.4)',
    inputText: '#e8ecf4',
    inputPlaceholder: 'rgba(140,160,200,0.4)',
    featureCardBg: 'rgba(255,255,255,0.03)',
    featureCardBorder: 'rgba(255,255,255,0.05)',
    dividerColor: 'rgba(255,255,255,0.06)',
    btnPrimaryText: '#060B18',
    btnSecondaryBg: 'rgba(0,212,255,0.08)',
    btnSecondaryBorder: 'rgba(0,212,255,0.15)',
    btnSecondaryColor: 'rgba(0,212,255,0.85)',
    glowOrb1: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%)',
    glowOrb2: 'radial-gradient(circle, rgba(0,245,160,0.07) 0%, transparent 70%)',
    toggleBg: 'rgba(255,255,255,0.06)',
    toggleBorder: 'rgba(255,255,255,0.1)',
    toggleColor: 'rgba(200,210,230,0.7)',
    successBg: 'rgba(0,200,140,0.1)',
    successBorder: 'rgba(0,200,140,0.2)',
    successText: '#00C98D',
    errorBg: 'rgba(239,68,68,0.1)',
    errorBorder: 'rgba(239,68,68,0.2)',
    errorText: '#ef4444',
    linkColor: '#00D4FF',
    badgeBg: 'rgba(0,212,255,0.06)',
    badgeBorder: 'rgba(0,212,255,0.15)',
    badgeColor: 'rgba(0,212,255,0.8)',
  } : {
    bg: '#f8fafc',
    sideBg: 'linear-gradient(135deg, rgba(0,150,200,0.04), rgba(0,200,140,0.03))',
    text: '#111827',
    textSub: 'rgba(30,50,80,0.8)',
    textMuted: 'rgba(50,70,100,0.65)',
    textFaint: 'rgba(50,70,100,0.5)',
    cardBg: '#ffffff',
    cardBorder: 'rgba(0,0,0,0.08)',
    cardShadow: '0 4px 24px rgba(0,0,0,0.06), 0 0 40px rgba(0,150,200,0.04)',
    inputBg: 'rgba(0,0,0,0.02)',
    inputBorder: 'rgba(0,0,0,0.1)',
    inputFocusBorder: 'rgba(0,150,200,0.5)',
    inputText: '#111827',
    inputPlaceholder: 'rgba(50,70,100,0.4)',
    featureCardBg: 'rgba(0,0,0,0.02)',
    featureCardBorder: 'rgba(0,0,0,0.06)',
    dividerColor: 'rgba(0,0,0,0.06)',
    btnPrimaryText: '#060B18',
    btnSecondaryBg: 'rgba(0,150,200,0.06)',
    btnSecondaryBorder: 'rgba(0,150,200,0.18)',
    btnSecondaryColor: '#0088aa',
    glowOrb1: 'radial-gradient(circle, rgba(0,150,200,0.06) 0%, transparent 70%)',
    glowOrb2: 'radial-gradient(circle, rgba(0,200,140,0.04) 0%, transparent 70%)',
    toggleBg: 'rgba(0,0,0,0.04)',
    toggleBorder: 'rgba(0,0,0,0.1)',
    toggleColor: 'rgba(40,60,90,0.7)',
    successBg: 'rgba(0,200,140,0.08)',
    successBorder: 'rgba(0,200,140,0.2)',
    successText: '#059669',
    errorBg: 'rgba(239,68,68,0.06)',
    errorBorder: 'rgba(239,68,68,0.15)',
    errorText: '#dc2626',
    linkColor: '#0088aa',
    badgeBg: 'rgba(0,150,200,0.08)',
    badgeBorder: 'rgba(0,150,200,0.2)',
    badgeColor: '#0088aa',
  }, [isDark]);
}

export default function AuthPage() {
  const router = useRouter();
  const { user, session, refetchProfile } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const { theme, toggleTheme: ctxToggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle error from callback redirect (e.g. confirmation failed)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'confirmation_failed') {
      setError('Konfirmasi email gagal nih. Coba daftar ulang ya.');
      window.history.replaceState({}, '', '/auth');
    }
  }, []);

  const c = useAuthTheme(isDark);

  useEffect(() => {
    if (session && user) {
      if (user.role === 'SUPERADMIN') {
        router.push('/superadmin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [session, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;

        if (data.session) {
          const userMeta = data.user?.user_metadata;
          const name = userMeta?.full_name || userMeta?.name || data.user?.email?.split('@')[0] || 'User';

          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/sync-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.session.access_token}` },
            body: JSON.stringify({ email: data.user.email!, fullName: name }),
          });

          await refetchProfile();
          const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/me`, {
            headers: { 'Authorization': `Bearer ${data.session.access_token}` }
          });
          const profile = await profileResponse.json().catch(() => ({}));
          if (profile.role === 'SUPERADMIN') {
            router.push('/superadmin');
          } else {
            router.push('/dashboard');
          }
        }
      } else {
        if (!fullName.trim()) throw new Error('Nama lengkap-nya diisi dulu dong!');

        const { data, error: authError } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (authError) throw authError;

        if (data.user) {
          if (data.session) {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/sync-user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.session.access_token}` },
              body: JSON.stringify({ email, fullName }),
            });
            await refetchProfile();
            const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/me`, {
              headers: { 'Authorization': `Bearer ${data.session.access_token}` }
            });
            const profile = await profileResponse.json().catch(() => ({}));
            if (profile.role === 'SUPERADMIN') {
              setSuccess('Registrasi sukses! Otw superadmin panel...');
              setTimeout(() => router.push('/superadmin'), 1500);
            } else {
              setSuccess('Registrasi sukses! Otw dashboard...');
              setTimeout(() => router.push('/dashboard'), 1500);
            }
          } else {
            setSuccess('Registrasi sukses! Cek email lo ya buat konfirmasi akun.');
          }
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error(err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = ctxToggleTheme;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.7rem 0.9rem', borderRadius: 12,
    border: `1px solid ${c.inputBorder}`, background: c.inputBg,
    color: c.inputText, fontSize: '0.88rem', fontFamily: 'inherit',
    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', background: c.bg, transition: 'background 0.4s ease' }}>

      {/* ═══ LEFT PANEL — branding ═══ */}
      <div style={{
        flex: '1 1 50%', display: 'none', position: 'relative', overflow: 'hidden',
        background: c.sideBg, padding: '3rem',
      }} className="auth-side-panel">
        {/* Glow circles */}
        <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: c.glowOrb1, pointerEvents: 'none', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: c.glowOrb2, pointerEvents: 'none', filter: 'blur(40px)' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', maxWidth: 440, margin: '0 auto' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2.5rem' }}>
            <Image src={brand.logoPath} alt={brand.name} width={42} height={42} style={{ objectFit: 'contain' }} />
            <span style={{ fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{brand.name}</span>
          </div>

          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '0.75rem', color: c.text }}>
            Belajar jadi<br />
            <span style={{ background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>lebih cerdas.</span>
          </h2>
          <p style={{ fontSize: '0.95rem', color: c.textMuted, lineHeight: 1.65, marginBottom: '2.5rem' }}>
            Platform produktivitas berbasis AI untuk anak muda — rangkum materi, kuis adaptif, prediksi ujian, dan kelola kelas dalam satu platform.
          </p>

          {/* Feature grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
            {SIDE_FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.65rem',
                  padding: '0.7rem 0.85rem', borderRadius: 14,
                  background: c.featureCardBg, border: `1px solid ${c.featureCardBorder}`,
                  transition: 'all 0.2s',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: isDark ? `${f.color}12` : `${f.color}10`,
                    border: `1px solid ${isDark ? `${f.color}22` : `${f.color}18`}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={15} style={{ color: f.color }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 650, color: c.text, lineHeight: 1.2 }}>{f.label}</div>
                    <div style={{ fontSize: '0.65rem', color: c.textFaint, lineHeight: 1.3, marginTop: '0.1rem' }}>{f.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trust badges */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            {['Gratis selamanya', 'Tanpa kartu kredit', 'Setup 30 detik'].map((t, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: c.textFaint }}>
                <CheckCircle2 size={12} style={{ color: '#00C98D' }} /> {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL — form ═══ */}
      <div style={{
        flex: '1 1 50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem 1.5rem', position: 'relative',
      }}>
        {/* Top bar: back + theme */}
        <div style={{ position: 'absolute', top: '1.25rem', left: '1.5rem', right: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => router.push('/')} style={{
            background: 'none', border: 'none', color: c.textFaint, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem',
            fontFamily: 'inherit', padding: '0.4rem 0.6rem', borderRadius: 8,
            transition: 'color 0.2s',
          }}>
            <ArrowLeft size={14} /> Balik
          </button>
          <button onClick={toggleTheme} title="Toggle theme" style={{
            padding: '0.4rem', borderRadius: 8, border: `1px solid ${c.toggleBorder}`,
            background: c.toggleBg, color: c.toggleColor, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
          }}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Card */}
          <div style={{
            background: c.cardBg, border: `1px solid ${c.cardBorder}`,
            borderRadius: 20, padding: '2.25rem 2rem',
            boxShadow: c.cardShadow, transition: 'background 0.4s, border-color 0.4s, box-shadow 0.4s',
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              {/* Logo (mobile only - visible when side panel hidden) */}
              <div className="auth-mobile-logo" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', marginBottom: '1.25rem',
              }}>
                <Image src={brand.logoPath} alt={brand.name} width={32} height={32} style={{ objectFit: 'contain' }} />
                <span style={{ fontSize: '1.15rem', fontWeight: 800, background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{brand.name}</span>
              </div>

              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.3rem 0.85rem', borderRadius: 999, marginBottom: '1rem',
                background: c.badgeBg, border: `1px solid ${c.badgeBorder}`,
                fontSize: '0.72rem', color: c.badgeColor, fontWeight: 600,
              }}>
                <Sparkles size={12} /> {isLogin ? 'Eh, balik lagi nih!' : 'Yuk gabung sekarang!'}
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: c.text, margin: '0 0 0.35rem' }}>
                {isLogin ? 'Masuk ke ' : 'Daftar '}
                <span style={{ background: 'linear-gradient(135deg, #00D4FF, #00F5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{brand.name}</span>
              </h2>
              <p style={{ fontSize: '0.85rem', color: c.textMuted, margin: 0 }}>
                {isLogin ? 'Gas login dulu biar bisa lanjut! 🚀' : 'Bikin akun & mulai belajar lebih smart 🧠'}
              </p>
            </div>

            {/* Alerts */}
            {error && (
              <div style={{
                padding: '0.7rem 0.9rem', borderRadius: 12, marginBottom: '1.25rem',
                background: c.errorBg, border: `1px solid ${c.errorBorder}`,
                fontSize: '0.82rem', color: c.errorText, display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}>
                <Shield size={14} /> {error}
              </div>
            )}
            {success && (
              <div style={{
                padding: '0.7rem 0.9rem', borderRadius: 12, marginBottom: '1.25rem',
                background: c.successBg, border: `1px solid ${c.successBorder}`,
                fontSize: '0.82rem', color: c.successText, display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}>
                <CheckCircle2 size={14} /> {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!isLogin && (
                <TextInput label="Nama Lengkap" value={fullName} onChange={setFullName} placeholder="John Doe" required />
              )}

              <TextInput label="Email" type="email" value={email} onChange={setEmail} placeholder="nama@email.com" required />

              <PasswordInput label="Password" value={password} onChange={setPassword} placeholder="••••••••" required />

              {/* Submit button */}
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '0.8rem', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #00D4FF, #00F5A0)',
                color: c.btnPrimaryText, fontSize: '0.92rem', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                boxShadow: isDark ? '0 4px 20px rgba(0,212,255,0.3)' : '0 4px 16px rgba(0,150,200,0.2)',
                opacity: loading ? 0.7 : 1, transition: 'all 0.2s', marginTop: '0.25rem',
              }}>
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Memproses...</>
                ) : (
                  <>{isLogin ? 'Gas Masuk' : 'Gas Daftar'} <ArrowRight size={15} /></>
                )}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0' }}>
              <div style={{ flex: 1, height: 1, background: c.dividerColor }} />
              <span style={{ fontSize: '0.72rem', color: c.textFaint, fontWeight: 500 }}>
                {isLogin ? 'Belum punya akun?' : 'Udah punya akun?'}
              </span>
              <div style={{ flex: 1, height: 1, background: c.dividerColor }} />
            </div>

            {/* Switch auth mode */}
            <button onClick={() => { setIsLogin(!isLogin); setError(null); setSuccess(null); }} style={{
              width: '100%', padding: '0.7rem', borderRadius: 14,
              background: c.btnSecondaryBg, border: `1px solid ${c.btnSecondaryBorder}`,
              color: c.btnSecondaryColor, fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
            }}>
              {isLogin ? 'Bikin Akun Baru' : 'Login ke Akun'} <ArrowRight size={14} />
            </button>
          </div>

          {/* Footer note */}
          <p style={{ textAlign: 'center', fontSize: '0.7rem', color: c.textFaint, marginTop: '1.25rem', lineHeight: 1.5 }}>
            Dengan mendaftar, kamu menyetujui{' '}
            <span style={{ color: c.linkColor, cursor: 'pointer' }}>Ketentuan Layanan</span> dan{' '}
            <span style={{ color: c.linkColor, cursor: 'pointer' }}>Kebijakan Privasi</span> kami.
          </p>
        </div>
      </div>

      {/* Responsive: show side panel on larger screens, hide mobile logo on desktop */}
      <style>{`
        @media (min-width: 768px) {
          .auth-side-panel { display: flex !important; }
          .auth-mobile-logo { display: none !important; }
        }
      `}</style>
    </main>
  );
}
