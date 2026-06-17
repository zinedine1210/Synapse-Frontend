'use client';

import React, { useRef, useState, useMemo } from 'react';
import { Modal, Button, useToast } from '@/components/ui';
import { duitTrackerService } from '@/services/duitTrackerService';
import { useAiJob } from '@/lib/useAiJob';
import { Loader2, Camera, Image as ImageIcon, Receipt } from 'lucide-react';

export interface ScannedItem {
  label: string;
  amount: number;
  category: string;
  type: string;
  checked: boolean;
}

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkCreate: (items: ScannedItem[]) => Promise<void>;
}

export function ReceiptScannerModal({ isOpen, onClose, onBulkCreate }: ReceiptScannerModalProps) {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [savingBulk, setSavingBulk] = useState(false);

  const scanReceiptJob = useAiJob<any>('scan_receipt', {
    onComplete: (result) => {
      const items: any[] = Array.isArray(result) ? result : result?.items ? result.items : result?.error ? [] : [result];
      if (items.length > 0 && (items[0].amount || items[0].total)) {
        const mapped: ScannedItem[] = items.map((it: any) => ({
          label: it.label || it.merchant || 'Item',
          amount: it.amount || it.total || 0,
          category: it.category || 'lainnya',
          type: it.type || 'expense',
          checked: true,
        }));
        setScannedItems(mapped);
        showToast(`${mapped.length} item terdeteksi dari struk! 📸`, 'success');
      } else {
        showToast('Duh gak kebaca nih, coba foto ulang yang lebih jelas ya! 🔍', 'error');
      }
      setScanning(false);
    },
    onError: (err) => { showToast(err || 'Yah gagal scan nih, coba lagi ya~', 'error'); setScanning(false); },
  });

  const checkedCount = useMemo(() => scannedItems.filter(i => i.checked).length, [scannedItems]);
  const allChecked = useMemo(() => scannedItems.length > 0 && scannedItems.every(i => i.checked), [scannedItems]);

  const handleReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Eh itu bukan gambar bestie, upload foto ya! 📷', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Kegedean nih fotonya, maks 5MB ya! 📏', 'error');
      return;
    }
    setScanning(true);
    setScannedItems([]);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const clean = base64.split(',')[1];
      await scanReceiptJob.trigger(() => duitTrackerService.scanReceipt(clean, file.type));
    } catch (err: any) {
      showToast(err.message || 'Yah gagal scan nih, coba lagi ya~', 'error');
      setScanning(false);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  const handleSaveBulk = async () => {
    const selected = scannedItems.filter(it => it.checked);
    if (selected.length === 0) {
      showToast('Pilih dulu minimal 1 item dong! ☝️', 'error');
      return;
    }
    setSavingBulk(true);
    try {
      await onBulkCreate(selected);
      setScannedItems([]);
      showToast(`${selected.length} transaksi berhasil disimpan! ✅`, 'success');
      onClose(); // Close modal after successful bulk create
    } catch (err: any) {
      showToast(err.message || 'Duh gagal nyimpen nih, coba lagi ya~', 'error');
    } finally {
      setSavingBulk(false);
    }
  };

  const handleClose = () => {
    if (scanning || savingBulk) return; // Prevent closing while processing
    if (scannedItems.length > 0) {
      if (!window.confirm('Yakin nih mau nutup? Hasil scan-nya bakal ilang loh~')) return;
    }
    setScannedItems([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="📸 Scan Struk">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* State: No scanned items yet */}
        {scannedItems.length === 0 && !scanning && (
          <div style={{ textAlign: 'center', padding: '20px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(var(--color-primary), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgb(var(--color-primary))' }}>
              <Receipt size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Scan Struk Belanjaanmu 📸</h3>
              <p style={{ fontSize: 13, color: 'rgb(var(--text-secondary))', maxWidth: 280, margin: '0 auto' }}>
                Tinggal foto struk, AI langsung breakdown jadi transaksi satu-satu. Auto rapi!
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 8 }}>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleReceipt} style={{ display: 'none' }} />
              <input ref={fileRef} type="file" accept="image/*" onChange={handleReceipt} style={{ display: 'none' }} />
              <Button onClick={() => cameraRef.current?.click()} style={{ flex: 1, padding: '14px 0', borderRadius: 12 }} variant="outline">
                <Camera size={18} style={{ marginRight: 8 }} /> Kamera
              </Button>
              <Button onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: '14px 0', borderRadius: 12 }}>
                <ImageIcon size={18} style={{ marginRight: 8 }} /> Galeri
              </Button>
            </div>
          </div>
        )}

        {/* State: Scanning loading */}
        {scanning && (
          <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Loader2 className="spin" size={40} style={{ color: 'rgb(var(--color-primary))' }} />
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Lagi Dibaca AI nih... 🧠</h3>
              <p style={{ fontSize: 13, color: 'rgb(var(--text-secondary))' }}>Bentar ya, AI lagi ngitung belanjaanmu~</p>
            </div>
          </div>
        )}

        {/* State: Review scanned items */}
        {scannedItems.length > 0 && !scanning && (
          <div style={{ background: 'var(--card-bg)', borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'rgb(var(--text-primary))' }}>
                📋 Pilih Item ({checkedCount}/{scannedItems.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '50vh', overflowY: 'auto', paddingBottom: 16, paddingRight: 4 }}>
              {scannedItems.map((item, idx) => (
                <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: item.checked ? 'rgba(var(--color-secondary), 0.08)' : 'var(--input-bg)', border: item.checked ? '1px solid rgba(var(--color-secondary), 0.3)' : '1px solid var(--border-default)', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <input type="checkbox" checked={item.checked} onChange={() => setScannedItems(prev => prev.map((it, i) => i === idx ? { ...it, checked: !it.checked } : it))} style={{ accentColor: 'rgb(var(--color-primary))', width: 20, height: 20, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgb(var(--text-primary))' }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'rgb(var(--text-muted))', marginTop: 2 }}>Kategori: {item.category}</div>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--dt-expense)', flexShrink: 0 }}>
                    Rp {item.amount.toLocaleString('id-ID')}
                  </span>
                </label>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <Button type="button" variant="outline" onClick={() => setScannedItems(items => items.map(i => ({ ...i, checked: !allChecked })))} style={{ flex: 1, borderRadius: 12, fontSize: 13 }}>
                {allChecked ? 'Batal Semua' : 'Pilih Semua'}
              </Button>
              <Button type="button" onClick={handleSaveBulk} disabled={savingBulk || checkedCount === 0} style={{ flex: 2, borderRadius: 12, fontSize: 13 }}>
                {savingBulk ? <Loader2 className="spin" size={16} /> : `💾 Simpan ${checkedCount} Transaksi`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
