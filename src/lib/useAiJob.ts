'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { aiJobService } from '@/services/aiJobService';

const POLL_INTERVAL = 4000; // 4 seconds
const MAX_POLL_DURATION = 3 * 60 * 1000; // 3 minutes

interface UseAiJobOptions<T> {
  /** Callback when job completes */
  onComplete?: (result: T) => void;
  /** Callback when job fails */
  onError?: (error: string) => void;
  /** Whether to check status on mount. Default true. */
  enabled?: boolean;
}

interface UseAiJobReturn<T> {
  /** Whether an AI job is currently processing */
  isProcessing: boolean;
  /** Whether the hook is still doing its initial status check */
  isInitializing: boolean;
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
  /** Dismiss the current job result */
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
  const [isInitializing, setIsInitializing] = useState(enabled); // true until first check completes
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);
  const jobIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Use refs for callbacks to avoid stale closure issues in setInterval
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const handleCompleted = useCallback((jobResult: T | null) => {
    if (!mountedRef.current) return;
    stopPolling();
    setStatus('completed');
    setResult(jobResult);
    if (jobResult) {
      onCompleteRef.current?.(jobResult);
    }
  }, [stopPolling]);

  const handleFailed = useCallback((errMsg: string) => {
    if (!mountedRef.current) return;
    stopPolling();
    setStatus('failed');
    setError(errMsg);
    onErrorRef.current?.(errMsg);
  }, [stopPolling]);

  const pollOnce = useCallback(async (): Promise<boolean> => {
    try {
      const updated = await aiJobService.getStatus<T>(jobType);
      if (!mountedRef.current) return true;

      if (!updated) {
        // null = no job found. Do NOT treat as completed.
        // Keep polling — the job row might not be visible yet due to timing.
        return false;
      }

      jobIdRef.current = updated.id;

      if (updated.status === 'COMPLETED') {
        handleCompleted(updated.result);
        return true;
      } else if (updated.status === 'FAILED') {
        handleFailed(updated.error || 'AI gagal memproses.');
        return true;
      }
      // Still PROCESSING — continue polling
      return false;
    } catch {
      // Ignore transient errors, keep polling
      return false;
    }
  }, [jobType, handleCompleted, handleFailed]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return; // already polling
    pollStartRef.current = Date.now();

    // Immediately do first poll (don't wait 4s)
    pollOnce();

    // Then continue at regular interval
    pollRef.current = setInterval(async () => {
      if (!pollRef.current) return; // polling was stopped
      if (Date.now() - pollStartRef.current > MAX_POLL_DURATION) {
        handleFailed('Request timeout — coba lagi nanti.');
        return;
      }
      await pollOnce();
    }, POLL_INTERVAL);
  }, [pollOnce, handleFailed]);

  // Check status on mount
  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      setIsInitializing(false);
      return () => { mountedRef.current = false; stopPolling(); };
    }

    let cancelled = false;

    (async () => {
      try {
        const job = await aiJobService.getStatus<T>(jobType);
        if (cancelled || !mountedRef.current) return;

        if (!job) {
          setStatus('idle');
          return;
        }

        jobIdRef.current = job.id;

        if (job.status === 'PROCESSING') {
          setStatus('processing');
          startPolling();
        } else if (job.status === 'COMPLETED') {
          // Job already completed — show result immediately
          handleCompleted(job.result);
        } else if (job.status === 'FAILED') {
          setStatus('failed');
          setError(job.error);
          // Don't call onError on mount for stale failed jobs
        } else {
          setStatus('idle');
        }
      } catch {
        // Ignore initial check errors
      } finally {
        if (!cancelled && mountedRef.current) {
          setIsInitializing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobType, enabled]);

  const trigger = useCallback(
    async (apiFn: () => Promise<any>): Promise<void> => {
      stopPolling();
      setStatus('processing');
      setError(null);
      setResult(null);

      // Dismiss old completed job so pollOnce won't find stale results
      if (jobIdRef.current) {
        aiJobService.dismiss(jobIdRef.current).catch(() => {});
        jobIdRef.current = null;
      }

      try {
        const response = await apiFn();

        if (!mountedRef.current) return;

        // If backend returned COMPLETED synchronously (DB fallback mode),
        // use the result directly instead of polling
        if (response && response.status === 'COMPLETED') {
          try {
            const parsed = typeof response.message === 'string'
              ? JSON.parse(response.message)
              : response.message;
            handleCompleted(parsed);
          } catch {
            handleCompleted(response as T);
          }
          return;
        }

        // Otherwise, backend accepted the async job — start polling
        startPolling();
      } catch (err: any) {
        if (!mountedRef.current) return;

        // 409 or "sedang memproses" = already processing — just poll
        if (
          err.message?.includes('sedang memproses') ||
          err.message?.includes('409') ||
          err.message?.includes('Tunggu')
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
    [startPolling, stopPolling, handleCompleted],
  );

  const dismiss = useCallback(async () => {
    stopPolling();
    if (jobIdRef.current) {
      await aiJobService.dismiss(jobIdRef.current).catch(() => {});
    }
    setStatus('idle');
    setResult(null);
    setError(null);
    jobIdRef.current = null;
  }, [stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setResult(null);
    setError(null);
  }, [stopPolling]);

  return {
    isProcessing: status === 'processing',
    isInitializing,
    result,
    error,
    status,
    trigger,
    dismiss,
    reset,
  };
}
