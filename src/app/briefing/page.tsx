'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Appbar } from '@/components/layout/Appbar';
import { Card, Button, useToast } from '@/components/ui';
import { briefingService, DailyBriefing } from '@/services/briefingService';
import { Loader2, RefreshCw, Calendar, Sunrise } from 'lucide-react';

export default function BriefingPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [history, setHistory] = useState<DailyBriefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'today' | 'history'>('today');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [b, h] = await Promise.all([
        briefingService.getTodayBriefing(),
        briefingService.getHistory(7),
      ]);
      setBriefing(b);
      setHistory(h);
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const b = await briefingService.refreshBriefing();
      setBriefing(b);
      showToast('Briefing berhasil di-refresh!', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const renderMarkdown = (content: string) => {
    // Simple markdown rendering
    return content
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} style={{ fontWeight: 700, marginTop: 16, marginBottom: 8 }}>{line.slice(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={i} style={{ fontWeight: 700, fontSize: 18, marginTop: 16, marginBottom: 8 }}>{line.slice(3)}</h2>;
        if (line.startsWith('# ')) return <h1 key={i} style={{ fontWeight: 700, fontSize: 20, marginTop: 16, marginBottom: 8 }}>{line.slice(2)}</h1>;
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} style={{ marginLeft: 16, lineHeight: 1.6 }}>{line.slice(2)}</li>;
        if (line.match(/^\d+\. /)) return <li key={i} style={{ marginLeft: 16, lineHeight: 1.6 }}>{line.replace(/^\d+\. /, '')}</li>;
        if (line.trim() === '') return <br key={i} />;
        return <p key={i} style={{ lineHeight: 1.6 }}>{line}</p>;
      });
  };

  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="app-main">
          <Appbar sidebarCollapsed={sidebarCollapsed} />
          <div className="page-content">
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700 }}>🌅 Briefing Harian</h1>
                <Button onClick={handleRefresh} disabled={refreshing} variant="secondary" size="sm">
                  {refreshing ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />} Refresh
                </Button>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                {(['today', 'history'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: tab === t ? 600 : 400,
                    background: tab === t ? 'var(--color-primary)' : 'transparent', color: tab === t ? '#fff' : 'inherit',
                  }}>
                    {t === 'today' ? '📋 Hari Ini' : '📅 Riwayat'}
                  </button>
                ))}
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <Loader2 className="spin" size={32} />
                  <p style={{ marginTop: 12, opacity: 0.6 }}>Menyiapkan briefing...</p>
                </div>
              ) : tab === 'today' ? (
                briefing ? (
                  <Card>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <Sunrise size={20} style={{ color: 'var(--color-warning)' }} />
                      <span style={{ fontSize: 14, opacity: 0.6 }}>
                        {new Date(briefing.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <div>{renderMarkdown(briefing.content)}</div>
                  </Card>
                ) : (
                  <Card>
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <Sunrise size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                      <p style={{ opacity: 0.6 }}>Briefing belum tersedia. Klik Refresh untuk generate.</p>
                    </div>
                  </Card>
                )
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {history.length === 0 ? (
                    <Card><p style={{ textAlign: 'center', opacity: 0.6 }}>Belum ada riwayat briefing.</p></Card>
                  ) : history.map(b => (
                    <Card key={b.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Calendar size={16} style={{ opacity: 0.5 }} />
                        <strong>{new Date(b.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                      </div>
                      <div style={{ fontSize: 14 }}>{renderMarkdown(b.content)}</div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
