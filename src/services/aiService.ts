import { apiFetch, apiUpload } from '@/lib/api';
import { Material, UploadMaterialResponse } from '@/models/File';

export const aiService = {
  /** Upload materi baru (async – return 202) */
  uploadMaterial: (file: File, sessionId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);
    return apiUpload<UploadMaterialResponse>('/materials/upload', formData);
  },

  /** Polling status AI processing material */
  getMaterialStatus: (materialId: string) =>
    apiFetch<Material>(`/materials/${materialId}/status`),

  /** Hapus material */
  deleteMaterial: (materialId: string) =>
    apiFetch<{ message: string }>(`/materials/${materialId}`, { method: 'DELETE' }),

  /** Generate soal kuis dari sesi yang dipilih */
  generateQuiz: (sessionIds: string[], count?: number) =>
    apiFetch<any>('/quizzes/generate', {
      method: 'POST',
      body: JSON.stringify({ sessionIds, count }),
    }),

  /** Submit jawaban kuis */
  submitQuizAttempt: (quizId: string, score: number, answers?: Record<string, string>) =>
    apiFetch<any>('/quizzes/attempt', {
      method: 'POST',
      body: JSON.stringify({ quizId, score, answers }),
    }),

  /** Upload gambar jadwal kuliah untuk diurai oleh AI Gemini */
  parseSchedule: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiUpload<{ courseName: string; day: string; time: string; room?: string; lecturer?: string }[]>('/ai/parse-schedule', formData);
  },

  /** OCR: extract text from image using AI */
  ocrImage: (base64: string, mimeType: string) =>
    apiFetch<{ text: string }>('/ai/ocr', {
      method: 'POST',
      body: JSON.stringify({ base64, mimeType }),
    }),
};
