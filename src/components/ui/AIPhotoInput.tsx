'use client';

import React, { useRef, useState } from 'react';
import { Camera, Loader2, Image as ImageIcon } from 'lucide-react';
import { useToast } from './Toast';
import { apiFetch } from '@/lib/api';

interface AIPhotoInputProps {
  onExtracted: (result: any) => void;
  mode: 'ocr' | 'krs' | 'schedule' | 'questions';
  className?: string;
  label?: string;
}

export function AIPhotoInput({ onExtracted, mode, className = '' }: AIPhotoInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate is image
    if (!file.type.startsWith('image/')) {
      showToast('Format berkas harus berupa gambar.', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran gambar maksimal 5MB.', 'error');
      return;
    }

    setIsLoading(true);
    showToast('Mengunggah dan memproses gambar dengan Gemini AI...', 'info');

    try {
      // Read file as base64
      const base64 = await fileToBase64(file);
      const cleanBase64 = base64.split(',')[1];
      const mimeType = file.type;

      // Select endpoint based on mode
      let endpoint = '/ai/ocr';
      if (mode === 'krs') endpoint = '/ai/krs';
      else if (mode === 'schedule') endpoint = '/ai/parse-schedule-base64';
      else if (mode === 'questions') endpoint = '/ai/extract-questions';

      const result = await apiFetch<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ base64: cleanBase64, mimeType }),
      });

      onExtracted(result);
      showToast('Analisis AI berhasil!', 'success');
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error(err);
      showToast(err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses gambar.', 'error');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }} className={className}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
        id={`ai-photo-file-input-${mode}`}
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        id={`ai-photo-camera-input-${mode}`}
      />
      
      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        disabled={isLoading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 12,
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          color: 'rgb(99, 102, 241)',
          fontSize: 13, fontWeight: 600,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.6 : 1,
          transition: 'all 0.2s',
          fontFamily: 'inherit',
        }}
      >
        {isLoading ? (
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Camera size={16} />
        )}
        <span>{isLoading ? 'Menganalisis...' : '📸 Ambil Foto'}</span>
      </button>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 12,
          background: 'rgba(168, 85, 247, 0.06)',
          border: '1px dashed rgba(168, 85, 247, 0.25)',
          color: 'rgb(168, 85, 247)',
          fontSize: 13, fontWeight: 600,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.6 : 1,
          transition: 'all 0.2s',
          fontFamily: 'inherit',
        }}
      >
        {isLoading ? (
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <ImageIcon size={16} />
        )}
        <span>{isLoading ? 'Menganalisis...' : '🖼️ Pilih File'}</span>
      </button>
    </div>
  );
}
