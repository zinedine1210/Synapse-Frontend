'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { aiJobService, AiJobStatus } from '@/services/aiJobService';

const POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLL_DURATION = 3 * 60 * 1000; // 3 minutes

interface UseAiJobOptions<T> {
  /** Callback when job completes (from polling, not from direct trigger) */
  onComplete?: (result: T) => void;
  /** Callback when job fails */
  onError?: (error: string) => void;
  /** Whether to check status on mount. Default true. */
  enabled?: boolean;
}

interface UseAiJobReturn<T> {
  /** Whether an AI job is currently processing */
  isProcessing: boolean;
  /** The result from the completed job */
  result: T | null;
  /** Error message if the job failed */
  error: string | null;
  /** Current job status */
  status: 'idle' | 'processing' | 'completed' | 'failed';
  /**
   * Trigger a new AI job. Calls the provided API function to start the job,
   * then automatically starts polling for the result.
   */
  trigger: (apiFn: () => Promise<any>) => Promise<void>;
  /** Dismiss the current job result (hide from future status checks) */
  dismiss: () => Promise<void>;
  /** Reset local state */
  reset: () => void;
}

export function useAiJob<T = any>(
  jobType: string,
  options: UseAiJobOptions<T> = {},
): UseAiJobReturn<T> {
  const { onComplete, onError, enabled = true } = options;
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);
  const jobIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return; // already polling
    pollStartRef.current = Date.now();
    pollRef.current = setInterval(async () => {
      if (Date.now() - pollStartRef.current > MAX_POLL_DURATION) {
        stopPolling();
        if (mountedRef.current) {
          setStatus('failed');
          setError('Request timeout — coba lagi nanti.');
          onError?.('Request timeout');
        }
        return;
      }
      try {
        const updated = await aiJobService.getStatus<T>(jobType);
        if (!mountedRef.current) return;
        if (!updated || updated.status === 'COMPLETED') {
          stopPolling();
          setStatus('completed');
          setResult(updated?.result ?? null);
          if (updated?.result) onComplete?.(updated.result);
        } else if (updated.status === 'FAILED') {
          stopPolling();
          setStatus('failed');
          setError(updated.error);
          onError?.(updated.error || 'AI gagal memproses.');
        }
        // else still PROCESSING, continue polling
      } catch {
        // Ignore polling errors, will retry next interval
      }
    }, POLL_INTERVAL);
  }, [jobType, onComplete, onError, stopPolling]);

  const checkStatus = useCallback(async () => {
    try {
      const job = await aiJobService.getStatus<T>(jobType);
      if (!mountedRef.current) return;

      if (!job) {
        setStatus('idle');
        stopPolling();
        return;
      }

      jobIdRef.current = job.id;

      if (job.status === 'PROCESSING') {
        setStatus('processing');
        startPolling();
      } else if (job.status === 'COMPLETED') {
        setStatus('completed');
        setResult(job.result);
        stopPolling();
      } else if (job.status === 'FAILED') {
        setStatus('failed');
        setError(job.error);
        stopPolling();
      } else {
        // DISMISSED or unknown
        setStatus('idle');
        stopPolling();
      }
    } catch {
      // Ignore initial check errors (e.g., no auth yet)
    }
  }, [jobType, startPolling, stopPolling]);

  // Check status on mount (only once)
  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      checkStatus();
    }
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const trigger = useCallback(
    async (apiFn: () => Promise<any>): Promise<void> => {
      setStatus('processing');
      setError(null);
      setResult(null);
      try {
        await apiFn();
        // API accepted the job — start polling for result
        if (mountedRef.current) {
          startPolling();
        }
      } catch (err: any) {
        if (!mountedRef.current) return;
        // 409 Conflict or "sedang memproses" = already processing, start polling
        if (
          err.message?.includes('sedang memproses') ||
          err.message?.includes('409')
        ) {
          setStatus('processing');
          startPolling();
          return;
        }
        setStatus('failed');
        setError(err.message || 'Terjadi kesalahan.');
        throw err;
      }
    },
    [startPolling],
  );

  const dismiss = useCallback(async () => {
    if (jobIdRef.current) {
      await aiJobService.dismiss(jobIdRef.current).catch(() => {});
    }
    setStatus('idle');
    setResult(null);
    setError(null);
    jobIdRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
    stopPolling();
  }, [stopPolling]);

  return {
    isProcessing: status === 'processing',
    result,
    error,
    status,
    trigger,
    dismiss,
    reset,
  };
}
