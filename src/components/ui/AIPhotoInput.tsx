'use client';

import React, { useRef, useState } from 'react';
import { Camera, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Button } from './Button';
import { useToast } from './Toast';
import { apiFetch } from '@/lib/api';

interface AIPhotoInputProps {
  onExtracted: (result: any) => void;
  mode: 'ocr' | 'krs' | 'schedule' | 'questions';
  className?: string;
  label?: string;
}

export function AIPhotoInput({ onExtracted, mode, className = '', label = 'Gunakan AI Photo' }: AIPhotoInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    <div className={`inline-block ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        id={`ai-photo-input-${mode}`}
      />
      
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className="flex items-center gap-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 transition-all duration-300 text-indigo-700 font-medium py-2 px-3 rounded-xl shadow-sm hover:shadow-md active:scale-95"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
        ) : (
          <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
        )}
        <span>{isLoading ? 'Menganalisis...' : label}</span>
        <Camera className="h-4 w-4 opacity-70" />
      </Button>
    </div>
  );
}
