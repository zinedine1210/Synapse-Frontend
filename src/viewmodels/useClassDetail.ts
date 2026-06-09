'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Class, Session } from '@/models/Class';
import { Material, MaterialStatus } from '@/models/File';
import { classService } from '@/services/classService';
import { aiService } from '@/services/aiService';

/**
 * useClassDetail – ViewModel untuk halaman detail kelas.
 * Menangani: memuat detail kelas, sesi, upload materi, polling AI, dan quiz.
 */
export function useClassDetail(classId: string) {
  const [classData, setClassData] = useState<Class | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Session details states (materials & quizzes)
  const [sessionDetailsLoading, setSessionDetailsLoading] = useState(false);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedMaterials, setUploadedMaterials] = useState<Map<string, Material>>(new Map());
  
  const pollingRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const fetchClassData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [cls, sess] = await Promise.all([
        classService.getClassById(classId),
        classService.getClassSessions(classId),
      ]);
      setClassData(cls);
      setSessions(sess ?? []);
      if (sess && sess.length > 0 && !selectedSession) {
        setSelectedSession(sess[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat detail kelas.');
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  const fetchSessionDetails = useCallback(async () => {
    if (!selectedSession) return;
    try {
      setSessionDetailsLoading(true);
      const details = await classService.getSessionById(selectedSession.id);
      setQuizzes(details.quizzes || []);
      
      const materialMap = new Map<string, Material>();
      (details.materials || []).forEach((m: Material) => {
        materialMap.set(m.id, m);
      });
      setUploadedMaterials(materialMap);
    } catch (err) {
      console.error('Gagal memuat detail sesi:', err);
    } finally {
      setSessionDetailsLoading(false);
    }
  }, [selectedSession?.id]);

  useEffect(() => {
    fetchClassData();
    return () => {
      pollingRefs.current.forEach((timeout) => clearInterval(timeout));
    };
  }, [fetchClassData]);

  useEffect(() => {
    fetchSessionDetails();
  }, [fetchSessionDetails]);

  // Resume polling for any materials still in PROCESSING state
  useEffect(() => {
    if (uploadedMaterials.size === 0) return;
    uploadedMaterials.forEach((mat, matId) => {
      if (mat.status === 'PROCESSING' && !pollingRefs.current.has(matId)) {
        startPolling(matId);
      }
    });
  }, [uploadedMaterials]);

  /** Upload file dan mulai polling status AI */
  const uploadMaterial = async (file: File) => {
    if (!selectedSession) return;

    try {
      setIsUploading(true);
      const { materialId } = await aiService.uploadMaterial(file, selectedSession.id);

      const processingMaterial: Material = {
        id: materialId,
        sessionId: selectedSession.id,
        fileName: file.name,
        fileUrl: '',
        fileType: file.type.startsWith('audio/') ? 'AUDIO' : 'PDF',
        status: 'PROCESSING',
        createdAt: new Date().toISOString(),
      };

      setUploadedMaterials((prev) => new Map(prev).set(materialId, processingMaterial));

      startPolling(materialId);

      return { success: true, materialId };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Upload gagal.',
      };
    } finally {
      setIsUploading(false);
    }
  };

  /** Polling status AI setiap 3 detik sampai SUCCESS/FAILED */
  const startPolling = (materialId: string) => {
    const interval = setInterval(async () => {
      try {
        const material = await aiService.getMaterialStatus(materialId);
        setUploadedMaterials((prev) => new Map(prev).set(materialId, material));

        const terminalStatuses: MaterialStatus[] = ['SUCCESS', 'FAILED'];
        if (terminalStatuses.includes(material.status)) {
          clearInterval(interval);
          pollingRefs.current.delete(materialId);
          // Refetch to ensure everything is synchronized (like new quizzes generated)
          fetchSessionDetails();
        }
      } catch {
        clearInterval(interval);
        pollingRefs.current.delete(materialId);
      }
    }, 3000);

    pollingRefs.current.set(materialId, interval);
  };

  /** Buat sesi baru */
  const createSession = async (title?: string) => {
    try {
      const newSession = await classService.createSession(classId, title);
      setSessions((prev) => [...prev, newSession]);
      if (!selectedSession) setSelectedSession(newSession);
      return { success: true, session: newSession };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal membuat pertemuan.',
      };
    }
  };

  /** Update judul sesi */
  const updateSession = async (sessionId: string, title: string) => {
    try {
      const updated = await classService.updateSession(sessionId, title);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: updated.title } : s)),
      );
      if (selectedSession?.id === sessionId) {
        setSelectedSession((prev) => (prev ? { ...prev, title: updated.title } : null));
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal memperbarui pertemuan.',
      };
    }
  };

  /** Hapus sesi */
  const deleteSession = async (sessionId: string) => {
    try {
      await classService.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal menghapus pertemuan.',
      };
    }
  };

  /** Ubah urutan sesi */
  const reorderSession = async (sessionId: string, newSequence: number) => {
    try {
      await classService.reorderSession(sessionId, newSequence);
      const sess = await classService.getClassSessions(classId);
      setSessions(sess ?? []);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Gagal mengubah urutan pertemuan.',
      };
    }
  };

  return {
    classData,
    setClassData,
    sessions,
    selectedSession,
    setSelectedSession,
    isLoading,
    error,
    isUploading,
    uploadedMaterials: Array.from(uploadedMaterials.values()),
    uploadMaterial,
    quizzes,
    sessionDetailsLoading,
    refetchSessionDetails: fetchSessionDetails,
    createSession,
    updateSession,
    deleteSession,
    reorderSession,
  };
}
