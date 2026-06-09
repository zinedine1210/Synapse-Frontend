'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, useConfirm } from '@/components/ui';
import { User, Mail, Shield, LogOut, Settings } from 'lucide-react';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { confirm } = useConfirm();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSignOut = async () => {
    const ok = await confirm({ title: 'Konfirmasi', message: 'Apakah Anda yakin ingin keluar dari akun Anda?', confirmText: 'Keluar', variant: 'danger' });
    if (!ok) return;
    await signOut();
  };

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar userRole={user?.role} collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

        <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Appbar title="Pengaturan" userName={user?.fullName} userId={user?.id} sidebarCollapsed={sidebarCollapsed} />

          <div className="page-content animate-fade-in" style={{ maxWidth: '700px', margin: '0 auto' }}>
            
            {/* Title */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Settings size={20} style={{ color: 'rgb(var(--color-primary))' }} />
                Pengaturan Akun
              </h2>
              <p style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)', marginTop: '0.25rem' }}>
                Kelola informasi profil, status paket belajar, dan preferensi akun Anda.
              </p>
            </div>

            {/* Profile Info Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <Card style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border-default)', paddingBottom: '0.4rem' }}>
                  Profil Pengguna
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: 'rgb(var(--bg-base))', fontWeight: 700, fontSize: 'var(--font-xl)' }}>
                      {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h4 style={{ fontSize: 'var(--font-md)', fontWeight: 600 }}>{user?.fullName}</h4>
                      <span className={`badge ${user?.plan === 'PRO' ? 'badge-pro' : 'badge-free'}`} style={{ marginTop: '0.2rem', display: 'inline-block' }}>
                        Paket {user?.plan}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-default)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <User size={16} style={{ color: 'rgb(var(--text-muted))' }} />
                      <div style={{ fontSize: 'var(--font-sm)' }}>
                        <span style={{ color: 'rgb(var(--text-muted))' }}>Nama:</span>{' '}
                        <span style={{ fontWeight: 500 }}>{user?.fullName}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Mail size={16} style={{ color: 'rgb(var(--text-muted))' }} />
                      <div style={{ fontSize: 'var(--font-sm)' }}>
                        <span style={{ color: 'rgb(var(--text-muted))' }}>Email:</span>{' '}
                        <span style={{ fontWeight: 500 }}>{user?.email}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Shield size={16} style={{ color: 'rgb(var(--text-muted))' }} />
                      <div style={{ fontSize: 'var(--font-sm)' }}>
                        <span style={{ color: 'rgb(var(--text-muted))' }}>Role:</span>{' '}
                        <span style={{ fontWeight: 500 }}>{user?.role}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Account Actions */}
              <Card style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: 'var(--font-base)', fontWeight: 600 }}>
                    Keluar Sesi Belajar
                  </h4>
                  <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginTop: '0.1rem' }}>
                    Keluarkan akun ini secara aman dari perangkat saat ini.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleSignOut} leftIcon={<LogOut size={14} />} style={{ border: '1px solid rgba(var(--color-error) / 0.2)', color: 'rgb(var(--color-error))' }}>
                  Keluar
                </Button>
              </Card>

              <div style={{ textAlign: 'center', color: 'rgb(var(--text-muted))', fontSize: 'var(--font-xs)', marginTop: '0.75rem' }}>
                Butuh bantuan? Hubungi kami di <span style={{ color: 'rgb(var(--color-primary))' }}>support@synapse.dev</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
