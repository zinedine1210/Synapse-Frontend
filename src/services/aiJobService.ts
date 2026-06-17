import { apiFetch } from '@/lib/api';

export interface AiJobStatus<T = any> {
  id: string;
  jobType: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DISMISSED';
  result: T | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export const aiJobService = {
  /** Check current status of an AI job for the given type */
  getStatus: <T = any>(jobType: string) =>
    apiFetch<AiJobStatus<T> | null>(`/ai-jobs/status?type=${encodeURIComponent(jobType)}`),

  /** Dismiss a completed/failed job so it no longer shows up */
  dismiss: (jobId: string) =>
    apiFetch<{ success: boolean }>(`/ai-jobs/${jobId}/dismiss`, { method: 'POST' }),
};
