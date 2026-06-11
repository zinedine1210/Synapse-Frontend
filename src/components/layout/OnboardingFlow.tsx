'use client';

import React, { useState, useCallback } from 'react';
import { Button, Card, TextInput, SelectOption, TagInput } from '@/components/ui';
import type { SelectOptionItem } from '@/components/ui';
import {
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  Heart,
  Briefcase,
  Lightbulb,
} from 'lucide-react';

// --- Interfaces ---

interface OnboardingField {
  name: string;
  type: 'text' | 'textarea' | 'select' | 'multi-select';
  label: string;
  placeholder: string;
  options?: string[];
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  fields: OnboardingField[];
  illustration: React.ReactNode;
}

// --- Step Definitions ---

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'universitas',
    title: 'Kampus kamu di mana?',
    description: 'Biar Synapse bisa bantu kamu lebih personal.',
    fields: [
      {
        name: 'university',
        type: 'text',
        label: 'Nama Universitas',
        placeholder: 'Contoh: Universitas Indonesia',
      },
    ],
    illustration: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'rgba(var(--color-primary) / 0.1)' }}>
        <GraduationCap size={28} style={{ color: 'rgb(var(--color-primary))' }} />
      </div>
    ),
  },
  {
    id: 'hobi',
    title: 'Apa hobi kamu?',
    description: 'Ceritain hal-hal yang kamu suka!',
    fields: [
      {
        name: 'hobbies',
        type: 'multi-select',
        label: 'Hobi & Minat',
        placeholder: 'Ketik hobi lalu tekan Enter...',
        options: [
          'Membaca', 'Olahraga', 'Gaming', 'Musik', 'Memasak',
          'Fotografi', 'Traveling', 'Coding', 'Menggambar', 'Menulis',
        ],
      },
    ],
    illustration: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)' }}>
        <Heart size={28} style={{ color: '#ef4444' }} />
      </div>
    ),
  },
  {
    id: 'pekerjaan',
    title: 'Kesibukan kamu sekarang?',
    description: 'Bisa pekerjaan, magang, atau organisasi.',
    fields: [
      {
        name: 'job',
        type: 'select',
        label: 'Status Pekerjaan',
        placeholder: 'Pilih yang paling sesuai',
        options: [
          'Mahasiswa Full-time',
          'Mahasiswa + Magang',
          'Mahasiswa + Part-time',
          'Mahasiswa + Freelance',
          'Mahasiswa + Organisasi',
          'Lainnya',
        ],
      },
    ],
    illustration: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'rgba(234, 179, 8, 0.1)' }}>
        <Briefcase size={28} style={{ color: '#eab308' }} />
      </div>
    ),
  },
  {
    id: 'alasan',
    title: 'Kenapa pakai Synapse?',
    description: 'Bantu kami paham kebutuhan kamu.',
    fields: [
      {
        name: 'reason',
        type: 'select',
        label: 'Alasan Menggunakan Synapse',
        placeholder: 'Pilih alasan utama kamu',
        options: [
          'Atur keuangan',
          'Manajemen tugas kuliah',
          'Catat jadwal & to-do',
          'Semua fitur di satu tempat',
          'Rekomendasi teman',
          'Coba-coba aja',
        ],
      },
    ],
    illustration: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)' }}>
        <Lightbulb size={28} style={{ color: '#10b981' }} />
      </div>
    ),
  },
];

// --- Types ---

export interface OnboardingData {
  university: string;
  hobbies: string[];
  job: string;
  reason: string;
  [key: string]: string | string[];
}

export interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  onSkip?: () => void;
}

// --- Component ---

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Form state
  const [formData, setFormData] = useState<OnboardingData>({
    university: '',
    hobbies: [],
    job: '',
    reason: '',
  });

  const totalSteps = ONBOARDING_STEPS.length;
  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // --- Handlers ---

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete(formData);
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [isLastStep, formData, onComplete]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip();
    } else {
      // Fallback: complete with empty data if no onSkip provided
      onComplete({ university: '', hobbies: [], job: '', reason: '' });
    }
  }, [onSkip, onComplete]);

  const updateField = useCallback((name: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // --- Render field based on type ---

  const renderField = (field: OnboardingField) => {
    switch (field.type) {
      case 'text':
        return (
          <TextInput
            key={field.name}
            label={field.label}
            placeholder={field.placeholder}
            value={(formData as Record<string, string | string[]>)[field.name] as string || ''}
            onChange={(val) => updateField(field.name, val)}
          />
        );

      case 'textarea':
        return (
          <TextInput
            key={field.name}
            label={field.label}
            placeholder={field.placeholder}
            value={(formData as Record<string, string | string[]>)[field.name] as string || ''}
            onChange={(val) => updateField(field.name, val)}
          />
        );

      case 'select': {
        const options: SelectOptionItem[] = (field.options || []).map((opt) => ({
          value: opt,
          label: opt,
        }));
        return (
          <SelectOption
            key={field.name}
            label={field.label}
            placeholder={field.placeholder}
            value={(formData as Record<string, string | string[]>)[field.name] as string || ''}
            onChange={(val) => updateField(field.name, val)}
            options={options}
          />
        );
      }

      case 'multi-select':
        return (
          <div key={field.name}>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--font-sm)',
                fontWeight: 600,
                color: 'rgb(var(--text-secondary))',
                marginBottom: 6,
              }}
            >
              {field.label}
            </label>
            {/* Suggestion chips */}
            {field.options && field.options.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {field.options.map((opt) => {
                  const isSelected = (formData.hobbies || []).includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        const current = formData.hobbies || [];
                        if (isSelected) {
                          updateField(field.name, current.filter((h) => h !== opt));
                        } else {
                          updateField(field.name, [...current, opt]);
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected
                          ? '2px solid rgb(var(--color-primary))'
                          : '1px solid var(--border-default)',
                        background: isSelected
                          ? 'rgba(var(--color-primary) / 0.1)'
                          : 'rgb(var(--bg-surface))',
                        color: isSelected
                          ? 'rgb(var(--color-primary))'
                          : 'rgb(var(--text-primary))',
                        fontWeight: isSelected ? 600 : 400,
                        fontSize: 'var(--font-sm)',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        fontFamily: 'inherit',
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Tag input for custom entries */}
            <TagInput
              value={(formData as Record<string, string | string[]>)[field.name] as string[] || []}
              onChange={(tags) => updateField(field.name, tags)}
              placeholder={field.placeholder}
              maxTags={15}
            />
          </div>
        );

      default:
        return null;
    }
  };

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
        padding: '1rem',
      }}
    >
      <Card
        style={{
          maxWidth: 480,
          width: '100%',
          padding: '2rem',
          animation: 'fadeIn 0.3s ease',
        }}
      >
        {/* Progress indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: '1.5rem' }}>
          {ONBOARDING_STEPS.map((s, i) => (
            <div
              key={s.id}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i <= currentStepIndex
                  ? 'rgb(var(--color-primary))'
                  : 'rgba(var(--color-primary) / 0.15)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Step counter */}
        <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginBottom: 12 }}>
          Langkah {currentStepIndex + 1} dari {totalSteps}
        </p>

        {/* Step header with illustration */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          {currentStep.illustration}
          <div>
            <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'rgb(var(--text-primary))', margin: 0 }}>
              {currentStep.title}
            </h2>
          </div>
        </div>
        <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-secondary))', marginBottom: '1.5rem' }}>
          {currentStep.description}
        </p>

        {/* Form fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: '1.75rem' }}>
          {currentStep.fields.map(renderField)}
        </div>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {isFirstStep ? (
              <button
                type="button"
                onClick={handleSkip}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgb(var(--text-muted))',
                  cursor: 'pointer',
                  fontSize: 'var(--font-sm)',
                  fontFamily: 'inherit',
                  padding: '0.5rem 0',
                }}
              >
                Skip semua →
              </button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                leftIcon={<ChevronLeft size={16} />}
              >
                Kembali
              </Button>
            )}
          </div>
          <Button
            onClick={handleNext}
            rightIcon={!isLastStep ? <ChevronRight size={16} /> : undefined}
          >
            {isLastStep ? 'Selesai' : 'Lanjut'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
