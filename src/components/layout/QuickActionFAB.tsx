'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Modal, useToast, TextInput } from '@/components/ui';
import { duitTrackerService } from '@/services/duitTrackerService';
import { useFeatureAccess } from '@/lib/feature-access';
import { Plus, X, Loader2 } from 'lucide-react';
import { ReceiptScannerModal, ScannedItem } from '@/components/duit-tracker/ReceiptScannerModal';

const FAB_ITEMS = [
  { key: 'scan', label: 'Scan Struk 📸', color: 'var(--color-warning)', requiredFeature: 'receipt_scanner' },
  { key: 'catat', label: 'Catat Cepat ⚡', color: 'var(--color-primary)', requiredFeature: 'duit_tracker' },
  { key: 'todo', label: 'Todo Cepat ✅', color: 'var(--color-success)', requiredFeature: 'todo_list' },
  { key: 'tanya', label: 'Tanya 💬', color: 'var(--color-secondary)', requiredFeature: 'qna_public' },
] as const;

type ActionType = typeof FAB_ITEMS[number]['key'] | null;

export function QuickActionFAB() {
  const router = useRouter();
  const { showToast } = useToast();
  const { hasFeature } = useFeatureAccess();
  const [expanded, setExpanded] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);

  // Filter FAB items based on feature access
  const filteredFabItems = FAB_ITEMS.filter(
    (item) => !item.requiredFeature || hasFeature(item.requiredFeature)
  );

  const handleAction = (key: ActionType) => {
    setExpanded(false);
    if (key === 'scan') {
      setShowScanModal(true);
      return;
    }
    if (key === 'tanya') {
      router.push('/qna');
      return;
    }
    setActiveAction(key);
    setInput('');
  };

  const handleBulkCreate = async (items: ScannedItem[]) => {
    const batchId = crypto.randomUUID();
    for (const item of items) {
      await duitTrackerService.createTransaction({
        amount: item.amount,
        type: item.type as 'expense' | 'income',
        category: item.category,
        label: item.label,
        inputMethod: 'receipt_scan',
        receiptBatchId: batchId,
      });
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || submitting) return;
    setSubmitting(true);
    try {
      if (activeAction === 'catat') {
        const p = await duitTrackerService.parseNaturalInput(input);
        if (p.amount) {
          await duitTrackerService.createTransaction({
            amount: p.amount,
            type: p.type || 'expense',
            category: p.category || 'Lainnya',
            label: p.label || input,
          });
          showToast('Transaksi masuk! ⚡', 'success');
          setActiveAction(null);
        } else {
          showToast('Hmm gak ke-parse nih, coba format lain ya~', 'error');
        }
      } else if (activeAction === 'todo') {
        const { apiFetch } = await import('@/lib/api');
        await apiFetch('/todos/parse', { method: 'POST', body: JSON.stringify({ text: input }) })
          .then(async (parsed: any) => {
            await apiFetch('/todos', {
              method: 'POST',
              body: JSON.stringify({
                title: parsed.title || input,
                dueDate: parsed.dueDate,
                priority: parsed.priority || 'medium',
                category: parsed.category,
                inputMethod: 'text',
              }),
            });
            showToast('Todo masuk bos! ✅', 'success');
            setActiveAction(null);
          });
      }
    } catch (e: any) {
      showToast(e.message || 'Waduh error nih, coba lagi ya~', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle = activeAction === 'catat' ? '💸 Catat Cepat' : activeAction === 'todo' ? '✅ Todo Cepat' : '';
  const placeholder = activeAction === 'catat' ? 'kopi 25rb, grab 12k...' : 'kerjakan PR besok...';

  return (
    <>
      {/* Unified ReceiptScannerModal — same as duit-tracker */}
      <ReceiptScannerModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onBulkCreate={handleBulkCreate}
      />

      {/* Overlay to close */}
      {expanded && <div className="fab-overlay" onClick={() => setExpanded(false)} />}

      <div className="fab-container" data-expanded={expanded}>
        {/* Menu items */}
        <div className={`fab-menu ${expanded ? 'fab-menu--open' : ''}`}>
          {filteredFabItems.map((item, i) => (
            <button
              key={item.key}
              onClick={() => handleAction(item.key)}
              className="fab-menu-item"
              style={{ transitionDelay: expanded ? `${i * 40}ms` : '0ms' }}
            >
              <span className="fab-menu-dot" style={{ background: item.color }} />
              {item.label}
            </button>
          ))}
        </div>

        {/* FAB button */}
        <button
          className="fab-btn"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Tutup menu' : 'Buka menu cepat'}
        >
          {expanded ? <X size={14} color="white" strokeWidth={2.5} /> : <Plus size={14} color="white" strokeWidth={2.5} />}
        </button>
      </div>

      {/* Mini modal for quick actions (catat/todo only — scan uses ReceiptScannerModal) */}
      <Modal isOpen={!!activeAction && activeAction !== 'scan'} onClose={() => setActiveAction(null)} title={modalTitle} size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TextInput
            placeholder={placeholder}
            value={input}
            onChange={v => setInput(v)}
            autoFocus
          />
          <Button onClick={handleSubmit} disabled={submitting || !input.trim()} style={{ width: '100%' }}>
            {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : 'Gas Simpan 🔥'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
