import { apiFetch } from '@/lib/api';

export interface ExamPredictionQuestion {
  id: string;
  predictionId: string;
  type: 'ESSAY' | 'MULTIPLE_CHOICE';
  question: string;
  options?: string; // JSON string array of options for multiple choice
  answerKey?: string;
  explanation?: string;
  order: number;
}

export interface ExamPrediction {
  id: string;
  classId: string;
  title: string;
  description?: string;
  createdById: string;
  sessionIds: string[];
  source: 'AI_GENERATED' | 'UPLOADED' | 'KISI_KISI' | 'MANUAL';
  createdAt: string;
  updatedAt: string;
  questions?: ExamPredictionQuestion[];
}

export const examPredictionService = {
  getClassPredictions: (classId: string) =>
    apiFetch<ExamPrediction[]>(`/exam-prediction/class/${classId}`),

  getPredictionById: (id: string) =>
    apiFetch<ExamPrediction>(`/exam-prediction/${id}`),

  createManual: (classId: string, data: {
    title: string;
    description?: string;
    sessionIds: string[];
    source: string;
    questions: Array<{
      type: 'ESSAY' | 'MULTIPLE_CHOICE';
      question: string;
      options?: string;
      answerKey?: string;
      explanation?: string;
    }>;
  }) =>
    apiFetch<ExamPrediction>(`/exam-prediction/class/${classId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generate: (classId: string, data: {
    title: string;
    description?: string;
    sessionIds: string[];
    type: 'ESSAY' | 'MULTIPLE_CHOICE' | 'MIXED';
    countPG: number;
    countEssay: number;
  }) =>
    apiFetch<ExamPrediction>(`/exam-prediction/class/${classId}/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadImage: (classId: string, data: {
    title: string;
    description?: string;
    base64: string;
    mimeType: string;
  }) =>
    apiFetch<ExamPrediction>(`/exam-prediction/class/${classId}/upload-image`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/exam-prediction/${id}`, {
      method: 'DELETE',
    }),
};
