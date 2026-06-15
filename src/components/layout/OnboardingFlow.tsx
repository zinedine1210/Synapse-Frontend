'use client';

import React, { useState, useCallback } from 'react';
import { Button, TagInput, TextInput } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { GraduationCap, Heart, Briefcase, Lightbulb, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

export interface OnboardingData {
  university: string;
  hobbies: string[];
  job: string;
  reason: string;
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

const JOB_OPTIONS = ['Mahasiswa Full-time', 'Mahasiswa + Magang', 'Mahasiswa + Part-time', 'Pekerja', 'Freelancer', 'Lainnya'];
const REASON_OPTIONS = ['Atur keuangan', 'Manajemen tugas kuliah', 'Catat jadwal & to-do', 'Semua fitur di satu tempat', 'Rekomendasi teman', 'Coba-coba aja'];
const HOBBY_SUGGESTIONS = ['Membaca', 'Olahraga', 'Gaming', 'Musik', 'Memasak', 'Fotografi', 'Traveling', 'Coding', 'Menggambar', 'Menulis'];

const STEPS = [
  { id: 'uni', title: 'Kampus kamu di mana?', desc: 'Biar Synapse bisa bantu kamu lebih personal.', icon: GraduationCap, color: 'rgb(var(--color-primary))', bg: 'rgba(var(--color-primary) / 0.08)' },
  { id: 'hobi', title: 'Apa hobi kamu?', desc: 'Ceritain hal-hal yang kamu suka!', icon: Heart, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)' },
  { id: 'job', title: 'Kesibukan kamu?', desc: 'Bisa pekerjaan, magang, atau organisasi.', icon: Briefcase, color: '#eab308', bg: 'rgba(234, 179, 8, 0.08)' },
  { id: 'reason', title: 'Kenapa pakai Synapse?', desc: 'Bantu kami paham kebutuhanmu.', icon: Lightbulb, color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' },
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({ university: '', hobbies: [], job: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const saveAndComplete = useCallback(async () => {
    setSaving(true);
    try {
      await apiFetch('/user/profile', { method: 'PATCH', body: JSON.stringify(data) });
      await apiFetch('/auth/complete-onboarding', { method: 'PATCH' });
      onComplete();
    } catch {
      await apiFetch('/auth/complete-onboarding', { method: 'PATCH' }).catch(() => {});
      onComplete();
    }
  }, [data, onComplete]);

  const handleNext = () => { if (isLast) saveAndComplete(); else setStep(s => s + 1); };
  const handleBack = () => { if (step > 0) setStep(s => s - 1); };
  const handleSkip = async () => {
    await apiFetch('/auth/complete-onboarding', { method: 'PATCH' }).catch(() => {});
    onComplete();
  };

  const Icon = current.icon;

  const chipBtn = (label: string, selected: boolean, onClick: () => void) => (
    <button key={label} type="button" onClick={onClick} style={{
      padding: '8px 14px', borderRadius: '10px', border: selected ? `2px solid ${current.color}` : '1.5px solid var(--border-default)',
      background: selected ? current.bg : 'transparent', color: selected ? current.color : 'rgb(var(--text-primary))',
      fontWeight: selected ? 600 : 400, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
    }}>{label}</button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', padding: '1rem' }}>
      <div style={{
        maxWidth: 440, width: '100%', padding: '2rem', borderRadius: '16px',
        background: 'rgb(var(--bg-surface))', border: '1px solid var(--border-default)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'fadeSlideIn 0.3s ease',
      }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? current.color : 'var(--border-default)', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: current.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={22} style={{ color: current.color }} />
          </div>
          <div>
            <p style={{ fontSize: '0.7rem', color: 'rgb(var(--text-muted))', fontWeight: 500, margin: 0 }}>Langkah {step + 1} dari {STEPS.length}</p>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{current.title}</h2>
          </div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'rgb(var(--text-secondary))', marginBottom: '1.25rem' }}>{current.desc}</p>

        {/* Fields */}
        <div style={{ marginBottom: '1.5rem', minHeight: 80 }}>
          {step === 0 && (
            <TextInput value={data.university} onChange={v => setData(d => ({ ...d, university: v }))}
              placeholder="Contoh: Universitas Indonesia" autoFocus />
          )}
          {step === 1 && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {HOBBY_SUGGESTIONS.map(h => chipBtn(h, data.hobbies.includes(h), () => {
                  setData(d => ({ ...d, hobbies: d.hobbies.includes(h) ? d.hobbies.filter(x => x !== h) : [...d.hobbies, h] }));
                }))}
              </div>
              <TagInput value={data.hobbies} onChange={v => setData(d => ({ ...d, hobbies: v }))} placeholder="Atau ketik lalu Enter..." maxTags={15} />
            </div>
          )}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {JOB_OPTIONS.map(j => (
                <button key={j} type="button" onClick={() => setData(d => ({ ...d, job: j }))}
                  style={{
                    padding: '10px 14px', borderRadius: '10px', border: data.job === j ? `2px solid ${current.color}` : '1.5px solid var(--border-default)',
                    background: data.job === j ? current.bg : 'transparent', textAlign: 'left',
                    color: data.job === j ? current.color : 'rgb(var(--text-primary))',
                    fontWeight: data.job === j ? 600 : 400, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                  }}>{j}</button>
              ))}
            </div>
          )}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {REASON_OPTIONS.map(r => (
                <button key={r} type="button" onClick={() => setData(d => ({ ...d, reason: r }))}
                  style={{
                    padding: '10px 14px', borderRadius: '10px', border: data.reason === r ? `2px solid ${current.color}` : '1.5px solid var(--border-default)',
                    background: data.reason === r ? current.bg : 'transparent', textAlign: 'left',
                    color: data.reason === r ? current.color : 'rgb(var(--text-primary))',
                    fontWeight: data.reason === r ? 600 : 400, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                  }}>{r}</button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {step === 0 ? (
            <button type="button" onClick={handleSkip} style={{
              background: 'none', border: 'none', color: 'rgb(var(--text-muted))',
              cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit', padding: '0.4rem 0',
            }}>Skip semua →</button>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleBack} leftIcon={<ChevronLeft size={14} />}>Kembali</Button>
          )}
          <Button onClick={handleNext} size="sm" disabled={saving} rightIcon={!isLast ? <ChevronRight size={14} /> : <Sparkles size={14} />}>
            {saving ? 'Menyimpan...' : isLast ? 'Selesai' : 'Lanjut'}
          </Button>
        </div>
      </div>
    </div>
  );
}
