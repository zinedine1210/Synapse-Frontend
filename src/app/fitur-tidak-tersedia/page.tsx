'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { Card, Button } from '@/components/ui';
import { Lock, ArrowLeft, Sparkles } from 'lucide-react';

export default function FiturTidakTersediaPage() {
  const { user } = useAuth();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'rgb(var(--bg-base))',
      }}
    >
      <Card
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '2.5rem 2rem',
          textAlign: 'center',
        }}
      >
        {/* Lock icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(var(--color-primary) / 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}
        >
          <Lock size={28} style={{ color: 'rgb(var(--color-primary))' }} />
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 'var(--font-xl)',
            fontWeight: 700,
            color: 'rgb(var(--text-primary))',
            marginBottom: '0.75rem',
          }}
        >
          Yah, Fitur Ini Belum Kebuka 🔒
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: 'var(--font-sm)',
            color: 'rgb(var(--text-muted))',
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}
        >
          Fitur ini belum available di paket{' '}
          <strong style={{ color: 'rgb(var(--text-secondary))' }}>
            {user?.plan ?? 'Gratis'}
          </strong>{' '}
          kamu. Gas upgrade buat unlock semua fitur keren Synapse! 🚀
        </p>

        {/* Upgrade CTA */}
        <Link href="/billing" style={{ textDecoration: 'none' }}>
          <Button
            leftIcon={<Sparkles size={14} />}
            style={{
              width: '100%',
              justifyContent: 'center',
              background:
                'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
              color: 'rgb(var(--bg-base))',
              border: 'none',
              marginBottom: '0.75rem',
            }}
          >
            Gas Upgrade ✨
          </Button>
        </Link>

        {/* Back to dashboard */}
        <Link href="/dashboard" style={{ textDecoration: 'none' }}>
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={14} />}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Balik ke Dashboard
          </Button>
        </Link>
      </Card>
    </div>
  );
}
