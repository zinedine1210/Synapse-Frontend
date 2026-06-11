'use client';

import React, { useState } from 'react';
import { Button, Card } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import { duitTrackerService } from '@/services/duitTrackerService';
import { ChevronRight, Check, Sparkles, GraduationCap, School, BookOpen } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 4;

const BUDGET_PRESETS = [
  { label: 'Rp 500.000', value: 500000 },
  { label: 'Rp 750.000', value: 750000 },
  { label: 'Rp 1.000.000', value: 1000000 },
];

const TREE_TEMPLATES = [
  { icon: '🎧', name: 'AirPods', target: 4200000 },
  { icon: '📱', name: 'iPhone', target: 18000000 },
  { icon: '💻', name: 'MacBook', target: 25000000 },
  { icon: '✈️', name: 'Liburan', target: 5000000 },
  { icon: '🎓', name: 'Wisuda', target: 3000000 },
];

const SEMESTER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

const INTEREST_TAGS = [
  '💻 Programming', '🎨 Design', '📊 Data Science', '🤖 AI/ML',
  '📱 Mobile Dev', '🌐 Web Dev', '🎮 Game Dev', '📈 Bisnis',
  '🧪 Riset', '🎵 Musik', '📸 Fotografi', '✍️ Menulis',
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);

  // Step 1: personal info
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [currentSemester, setCurrentSemester] = useState<number | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Step 2: budget
  const [selectedBudget, setSelectedBudget] = useState<number | null>(null);
  const [customBudget, setCustomBudget] = useState('');

  // Step 3: tree
  const [selectedTree, setSelectedTree] = useState<typeof TREE_TEMPLATES[0] | null>(null);

  const [saving, setSaving] = useState(false);

  const budgetValue = selectedBudget || (customBudget ? parseInt(customBudget.replace(/\D/g, '')) : 0);

  const toggleInterest = (tag: string) => {
    setSelectedInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const saveProfile = async () => {
    const payload: Record<string, unknown> = {};
    if (university.trim()) payload.university = university.trim();
    if (major.trim()) payload.major = major.trim();
    if (currentSemester) payload.currentSemester = currentSemester;
    if (selectedInterests.length > 0) payload.interests = selectedInterests.map((t) => t.replace(/^\S+\s/, ''));
    if (Object.keys(payload).length > 0) {
      await apiFetch('/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) }).catch(() => {});
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Save profile info first
      await saveProfile();

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      if (budgetValue > 0) {
        await duitTrackerService.setBudget({
          category: 'Makanan',
          amount: budgetValue,
          month,
          year,
        });
      }

      if (selectedTree) {
        await duitTrackerService.createTree({
          name: selectedTree.name,
          targetAmount: selectedTree.target,
          treeType: 'sapling',
        });
      }

      await apiFetch('/auth/complete-onboarding', { method: 'PATCH' });
      onComplete();
    } catch {
      await apiFetch('/auth/complete-onboarding', { method: 'PATCH' }).catch(() => {});
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    await apiFetch('/auth/complete-onboarding', { method: 'PATCH' }).catch(() => {});
    onComplete();
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px',
    borderRadius: 'var(--radius-md)',
    border: active ? '2px solid rgb(var(--color-primary))' : '1px solid var(--border-default)',
    background: active ? 'rgba(var(--color-primary) / 0.1)' : 'rgb(var(--bg-surface))',
    color: 'rgb(var(--text-primary))',
    fontWeight: active ? 600 : 400,
    fontSize: 'var(--font-sm)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    fontFamily: 'inherit',
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Card
        style={{
          maxWidth: 500,
          width: '90vw',
          padding: '2rem',
          animation: 'fadeIn 0.3s ease',
        }}
      >
        {/* Progress indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem' }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: s <= step ? 'rgb(var(--color-primary))' : 'rgba(var(--color-primary) / 0.15)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginBottom: 4 }}>Step 1/{TOTAL_STEPS}</p>
            <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <GraduationCap size={22} style={{ color: 'rgb(var(--color-primary))' }} />
              Kenalan dulu, yuk!
            </h2>
            <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', marginBottom: '1.25rem' }}>
              Biar Synapse bisa bantu kamu lebih personal.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-secondary))', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <School size={14} /> Universitas
                </label>
                <input
                  className="themed-input"
                  placeholder="Nama universitas kamu..."
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-secondary))', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <BookOpen size={14} /> Jurusan
                  </label>
                  <input
                    className="themed-input"
                    placeholder="Misal: Informatika"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-secondary))', marginBottom: 4, display: 'block' }}>
                    Semester
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {SEMESTER_OPTIONS.map((s) => (
                      <button key={s} onClick={() => setCurrentSemester(currentSemester === s ? null : s)} style={{ ...chipStyle(currentSemester === s), padding: '6px 12px', minWidth: 36 }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-secondary))', marginBottom: 6, display: 'block' }}>
                Minat & Interest
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {INTEREST_TAGS.map((tag) => (
                  <button key={tag} onClick={() => toggleInterest(tag)} style={chipStyle(selectedInterests.includes(tag))}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={handleSkip}
                style={{ background: 'none', border: 'none', color: 'rgb(var(--text-muted))', cursor: 'pointer', fontSize: 'var(--font-sm)', fontFamily: 'inherit' }}
              >
                Skip →
              </button>
              <Button onClick={() => setStep(2)} rightIcon={<ChevronRight size={16} />}>
                Lanjut
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Budget */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginBottom: 4 }}>Step 2/{TOTAL_STEPS}</p>
            <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginBottom: 8 }}>
              💰 Mau mulai catat keuangan?
            </h2>
            <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', marginBottom: '1.5rem' }}>
              Berapa budget makan per bulan?
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
              {BUDGET_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => { setSelectedBudget(preset.value); setCustomBudget(''); }}
                  style={chipStyle(selectedBudget === preset.value)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <input
              className="themed-input"
              placeholder="Atau ketik nominal custom..."
              value={customBudget}
              onChange={(e) => {
                setCustomBudget(e.target.value);
                setSelectedBudget(null);
              }}
              style={{ width: '100%', marginBottom: '1.5rem' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={handleSkip}
                style={{ background: 'none', border: 'none', color: 'rgb(var(--text-muted))', cursor: 'pointer', fontSize: 'var(--font-sm)', fontFamily: 'inherit' }}
              >
                Skip →
              </button>
              <Button onClick={() => setStep(3)} rightIcon={<ChevronRight size={16} />}>
                Lanjut
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Saving tree */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginBottom: 4 }}>Step 3/{TOTAL_STEPS}</p>
            <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginBottom: 8 }}>
              🌳 Mau nabung buat apa?
            </h2>
            <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', marginBottom: '1.5rem' }}>
              Pilih target tabunganmu:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1.5rem' }}>
              {TREE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.name}
                  onClick={() => setSelectedTree(selectedTree?.name === tmpl.name ? null : tmpl)}
                  style={{
                    padding: '14px 8px',
                    borderRadius: 'var(--radius-md)',
                    border: selectedTree?.name === tmpl.name
                      ? '2px solid rgb(var(--color-primary))'
                      : '1px solid var(--border-default)',
                    background: selectedTree?.name === tmpl.name
                      ? 'rgba(var(--color-primary) / 0.1)'
                      : 'rgb(var(--bg-surface))',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'var(--transition-fast)',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{tmpl.icon}</div>
                  <div style={{ fontSize: 'var(--font-xs)', fontWeight: 600, color: 'rgb(var(--text-primary))' }}>{tmpl.name}</div>
                  <div style={{ fontSize: '10px', color: 'rgb(var(--text-muted))' }}>
                    Rp {tmpl.target.toLocaleString('id-ID')}
                  </div>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={handleSkip}
                style={{ background: 'none', border: 'none', color: 'rgb(var(--text-muted))', cursor: 'pointer', fontSize: 'var(--font-sm)', fontFamily: 'inherit' }}
              >
                Skip →
              </button>
              <Button onClick={() => setStep(4)} rightIcon={<ChevronRight size={16} />}>
                Lanjut
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Summary */}
        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginBottom: 4 }}>Step {TOTAL_STEPS}/{TOTAL_STEPS}</p>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎉</div>
            <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginBottom: '1rem' }}>
              Kamu sudah siap!
            </h2>

            <div
              style={{
                background: 'rgba(var(--color-primary) / 0.05)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1rem',
                textAlign: 'left',
              }}
            >
              {university && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Check size={16} style={{ color: 'rgb(var(--color-success))' }} />
                  <span style={{ fontSize: 'var(--font-sm)' }}>{university}{major ? ` — ${major}` : ''}{currentSemester ? `, Semester ${currentSemester}` : ''}</span>
                </div>
              )}
              {selectedInterests.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Check size={16} style={{ color: 'rgb(var(--color-success))' }} />
                  <span style={{ fontSize: 'var(--font-sm)' }}>Minat: {selectedInterests.map((t) => t.replace(/^\S+\s/, '')).join(', ')}</span>
                </div>
              )}
              {budgetValue > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Check size={16} style={{ color: 'rgb(var(--color-success))' }} />
                  <span style={{ fontSize: 'var(--font-sm)' }}>
                    Budget makan: Rp {budgetValue.toLocaleString('id-ID')}/bulan
                  </span>
                </div>
              )}
              {selectedTree && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Check size={16} style={{ color: 'rgb(var(--color-success))' }} />
                  <span style={{ fontSize: 'var(--font-sm)' }}>
                    Target tabungan: {selectedTree.icon} {selectedTree.name}
                  </span>
                </div>
              )}
              {!university && !selectedInterests.length && !budgetValue && !selectedTree && (
                <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>
                  Tidak ada setup awal — kamu bisa atur nanti di Settings.
                </p>
              )}
            </div>

            <div
              style={{
                background: 'rgba(var(--color-primary) / 0.05)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Sparkles size={16} style={{ color: 'rgb(var(--color-primary))', flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-secondary))' }}>
                Tip: Ketik &quot;kopi 25rb&quot; di dashboard untuk catat pengeluaran pertamamu!
              </span>
            </div>

            <Button
              onClick={handleFinish}
              disabled={saving}
              style={{ width: '100%' }}
            >
              {saving ? 'Menyimpan...' : 'Masuk Dashboard →'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
