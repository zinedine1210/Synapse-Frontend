'use client';

import React, { useRef, useState } from 'react';
import { Loader2, ImagePlus, UploadCloud, Camera, ImageIcon } from 'lucide-react';

interface PhotoDropzoneProps {
  loading: boolean;
  title: string;
  hint: string;
  onFile: (file: File) => void;
}

/**
 * Big friendly dropzone with drag & drop + click/tap to upload.
 * On mobile, shows camera vs gallery choice.
 * Accepts images only and forwards the first valid file.
 */
export function PhotoDropzone({ loading, title, hint, onFile }: PhotoDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [showChoice, setShowChoice] = useState(false);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    onFile(file);
  };

  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  const handleClick = () => {
    if (loading) return;
    if (isMobile) {
      setShowChoice(true);
    } else {
      inputRef.current?.click();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={title}
      aria-disabled={loading}
      onClick={handleClick}
      onKeyDown={e => {
        if (loading) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      onDragOver={e => { e.preventDefault(); if (!loading) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        if (!loading) pick(e.dataTransfer.files);
      }}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 12,
        padding: '2.4rem 1.25rem',
        marginBottom: 20,
        cursor: loading ? 'not-allowed' : 'pointer',
        pointerEvents: loading ? 'none' : 'auto',
        borderRadius: 'var(--radius-xl)',
        border: `2px dashed ${dragging ? 'rgb(var(--color-primary))' : 'var(--border-strong)'}`,
        background: dragging
          ? 'rgba(var(--color-primary) / 0.08)'
          : 'linear-gradient(160deg, rgba(var(--color-primary) / 0.04), rgba(var(--color-secondary) / 0.04))',
        transition: 'border-color 0.2s ease, background 0.2s ease, transform 0.2s ease',
        transform: dragging ? 'scale(1.01)' : 'scale(1)',
        opacity: loading ? 0.85 : 1,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
          color: 'rgb(var(--bg-base))',
          boxShadow: '0 8px 22px rgba(var(--color-primary) / 0.35)',
        }}
      >
        {loading
          ? <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          : dragging ? <UploadCloud size={30} /> : <ImagePlus size={28} />}
      </div>

      <div>
        <p style={{ fontSize: 'var(--font-md)', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 4 }}>
          {loading ? 'Memproses fotomu…' : title}
        </p>
        <p style={{ fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))' }}>
          {loading ? 'AI sedang meracik rekomendasi terbaik untukmu ✨' : hint}
        </p>
      </div>

      {!loading && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 999,
            fontSize: 'var(--font-sm)',
            fontWeight: 700,
            color: 'rgb(var(--bg-base))',
            background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)))',
          }}
        >
          📸 Pilih / Tarik Foto
        </span>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        disabled={loading}
        style={{ display: 'none' }}
        onChange={e => { pick(e.target.files); e.target.value = ''; }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={loading}
        style={{ display: 'none' }}
        onChange={e => { pick(e.target.files); e.target.value = ''; }}
      />

      {/* Camera / Gallery choice overlay */}
      {showChoice && (
        <div
          onClick={(e) => { e.stopPropagation(); setShowChoice(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '0 16px 24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgb(var(--bg-surface))', borderRadius: 'var(--radius-xl)',
              padding: '20px', width: '100%', maxWidth: 360,
              display: 'flex', flexDirection: 'column', gap: 12,
            }}
          >
            <p style={{ fontSize: 'var(--font-md)', fontWeight: 700, textAlign: 'center', margin: 0 }}>📸 Pilih Sumber Foto</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setShowChoice(false); cameraRef.current?.click(); }}
                style={{
                  flex: 1, padding: '16px 10px', borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--border-default)', background: 'rgb(var(--bg-surface))',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  fontFamily: 'inherit',
                }}
              >
                <Camera size={24} style={{ color: 'rgb(var(--color-primary))' }} />
                <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>Kamera</span>
              </button>
              <button
                onClick={() => { setShowChoice(false); inputRef.current?.click(); }}
                style={{
                  flex: 1, padding: '16px 10px', borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--border-default)', background: 'rgb(var(--bg-surface))',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  fontFamily: 'inherit',
                }}
              >
                <ImageIcon size={24} style={{ color: 'rgb(var(--color-secondary))' }} />
                <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>Galeri</span>
              </button>
            </div>
            <button
              onClick={() => setShowChoice(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 'var(--font-sm)', color: 'rgb(var(--text-muted))', padding: 8,
              }}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
