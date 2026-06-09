'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { classService, CustomTab, CustomTabFile } from '@/services/classService';
import { Button, useToast, useConfirm, MarkdownRenderer } from '@/components/ui';
import {
  Loader2, Upload, Trash2, FileText, Image as ImageIcon,
  File as FileIcon, Pencil, Eye, Save, X, Download,
} from 'lucide-react';

interface CustomTabContentProps {
  tabId: string;
  classId: string;
  memberRole?: string;
  permissions?: string[];
}

export function CustomTabContent({ tabId, classId, memberRole, permissions }: CustomTabContentProps) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [tab, setTab] = useState<CustomTab | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save timer
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTab = useCallback(async () => {
    try {
      const tabs = await classService.getCustomTabs(classId);
      const found = tabs.find(t => t.id === tabId);
      if (found) {
        setTab(found);
        if (!isEditing) setEditContent(found.content);
      }
    } catch {
      showToast('Gagal memuat tab.', 'error');
    } finally {
      setLoading(false);
    }
  }, [classId, tabId]);

  useEffect(() => {
    setLoading(true);
    fetchTab();
  }, [tabId]);

  const handleSave = async () => {
    if (!tab) return;
    setSaving(true);
    try {
      const updated = await classService.updateCustomTab(tab.id, { content: editContent });
      setTab(updated);
      setIsEditing(false);
      showToast('Konten berhasil disimpan.', 'success');
    } catch {
      showToast('Gagal menyimpan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tab) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Ukuran file maksimal 10MB.', 'error');
      return;
    }

    setUploading(true);
    try {
      const uploaded = await classService.uploadCustomTabFile(tab.id, file);
      setTab(prev => prev ? { ...prev, files: [...prev.files, uploaded] } : prev);
      showToast('File berhasil diupload.', 'success');
    } catch {
      showToast('Gagal upload file.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (file: CustomTabFile) => {
    const yes = await confirm({ message: `Hapus file "${file.fileName}"?`, variant: 'danger' });
    if (!yes) return;
    try {
      await classService.deleteCustomTabFile(file.id);
      setTab(prev => prev ? { ...prev, files: prev.files.filter(f => f.id !== file.id) } : prev);
      showToast('File berhasil dihapus.', 'success');
    } catch {
      showToast('Gagal menghapus file.', 'error');
    }
  };

  const getFileIcon = (fileType: string, fileName: string) => {
    if (fileType === 'IMAGE') return <ImageIcon size={16} style={{ color: 'rgb(var(--color-success))' }} />;
    if (fileType === 'DOCUMENT') return <FileText size={16} style={{ color: 'rgb(var(--color-primary))' }} />;
    return <FileIcon size={16} style={{ color: 'rgb(var(--text-muted))' }} />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <Loader2 className="animate-spin" size={24} style={{ color: 'rgb(var(--color-primary))' }} />
      </div>
    );
  }

  if (!tab) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'rgb(var(--text-muted))' }}>Tab tidak ditemukan.</div>;
  }

  return (
    <div style={{ padding: '1.25rem', maxWidth: 900 }}>
      {/* Content area */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, color: 'rgb(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            📝 Konten
          </h3>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave} disabled={saving} leftIcon={saving ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setEditContent(tab.content); }} leftIcon={<X size={13} />}>
                  Batal
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => { setIsEditing(true); setEditContent(tab.content); }} leftIcon={<Pencil size={13} />}>
                Edit
              </Button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div>
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Tulis konten tab di sini... (mendukung Markdown)"
              style={{
                width: '100%',
                minHeight: 300,
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                background: 'rgb(var(--bg-primary))',
                color: 'rgb(var(--text-primary))',
                fontFamily: 'inherit',
                fontSize: 'var(--font-sm)',
                resize: 'vertical',
                lineHeight: 1.7,
              }}
            />
            <p style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', marginTop: '0.35rem' }}>
              💡 Mendukung format Markdown: **bold**, *italic*, # heading, - list, ```code```, dll.
            </p>
          </div>
        ) : (
          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            background: 'rgb(var(--bg-primary))',
            minHeight: 100,
          }}>
            {tab.content ? (
              <MarkdownRenderer content={tab.content} />
            ) : (
              <p style={{ color: 'rgb(var(--text-muted))', fontSize: 'var(--font-sm)', fontStyle: 'italic' }}>
                Belum ada konten. Klik "Edit" untuk mulai menulis.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Files area */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, color: 'rgb(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            📎 Lampiran {tab.files.length > 0 && <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))', fontWeight: 400 }}>({tab.files.length})</span>}
          </h3>
          <div>
            <input ref={fileInputRef} type="file" onChange={handleUploadFile} style={{ display: 'none' }} />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              leftIcon={uploading ? <Loader2 className="animate-spin" size={13} /> : <Upload size={13} />}
            >
              {uploading ? 'Mengupload...' : 'Upload File'}
            </Button>
          </div>
        </div>

        {tab.files.length === 0 ? (
          <div style={{
            padding: '2rem',
            borderRadius: 'var(--radius-md)',
            border: '2px dashed var(--border-default)',
            textAlign: 'center',
            color: 'rgb(var(--text-muted))',
            cursor: 'pointer',
          }}
          onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
            <p style={{ fontSize: 'var(--font-sm)' }}>Klik atau drag file untuk upload</p>
            <p style={{ fontSize: 'var(--font-xs)', opacity: 0.7, marginTop: '0.25rem' }}>Maksimal 10MB per file</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {tab.files.map(file => (
              <div key={file.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)', background: 'rgb(var(--bg-surface))',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                  {getFileIcon(file.fileType, file.fileName)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 'var(--font-sm)', fontWeight: 500,
                        color: 'rgb(var(--color-primary))', textDecoration: 'none',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                      }}
                    >
                      {file.fileName}
                    </a>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'rgb(var(--text-muted))' }}>
                      {formatFileSize(file.fileSizeBytes)}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                  <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" title="Download" style={{
                    padding: '0.3rem', borderRadius: 'var(--radius-sm)',
                    color: 'rgb(var(--text-muted))', display: 'flex', alignItems: 'center',
                  }}>
                    <Download size={14} />
                  </a>
                  <button onClick={() => handleDeleteFile(file)} title="Hapus" style={{
                    padding: '0.3rem', borderRadius: 'var(--radius-sm)', border: 'none',
                    background: 'none', cursor: 'pointer', color: 'rgb(var(--color-danger))',
                    display: 'flex', alignItems: 'center',
                  }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image preview for image files */}
        {tab.files.filter(f => f.fileType === 'IMAGE').length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4 style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'rgb(var(--text-secondary))', marginBottom: '0.5rem' }}>
              🖼️ Preview Gambar
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
              {tab.files.filter(f => f.fileType === 'IMAGE').map(file => (
                <a key={file.id} href={file.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                  <img
                    src={file.fileUrl}
                    alt={file.fileName}
                    style={{
                      width: '100%', height: 120, objectFit: 'cover',
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)',
                    }}
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
