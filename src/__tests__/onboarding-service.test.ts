import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { completeOnboarding, skipOnboarding } from '@/lib/onboarding-service';

// Mock the apiFetch module
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '@/lib/api';
const mockApiFetch = vi.mocked(apiFetch);

describe('onboarding-service', () => {
  const userId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('completeOnboarding', () => {
    it('should POST profile data and mark onboarding completed', async () => {
      mockApiFetch.mockResolvedValue({});

      const data = {
        university: 'Universitas Indonesia',
        hobbies: ['Coding', 'Gaming'],
        job: 'Mahasiswa Full-time',
        reason: 'Atur keuangan',
      };

      const result = await completeOnboarding(userId, data);

      // Should call PATCH /user/profile with the onboarding data
      expect(mockApiFetch).toHaveBeenCalledWith('/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          university: 'Universitas Indonesia',
          hobbies: ['Coding', 'Gaming'],
          job: 'Mahasiswa Full-time',
          reason: 'Atur keuangan',
        }),
      });

      // Should call PATCH /auth/complete-onboarding
      expect(mockApiFetch).toHaveBeenCalledWith('/auth/complete-onboarding', {
        method: 'PATCH',
      });

      // Should set localStorage flag
      expect(localStorage.getItem(`synapse_onboarding_${userId}`)).toBe('done');

      // Both should succeed
      expect(result).toEqual({ profileSaved: true, onboardingMarked: true });
    });

    it('should omit empty fields from profile data', async () => {
      mockApiFetch.mockResolvedValue({});

      const data = {
        university: '',
        hobbies: [],
        job: 'Mahasiswa + Magang',
        reason: '',
      };

      await completeOnboarding(userId, data);

      // Should call with only non-empty fields
      expect(mockApiFetch).toHaveBeenCalledWith('/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          university: undefined,
          hobbies: undefined,
          job: 'Mahasiswa + Magang',
          reason: undefined,
        }),
      });
    });

    it('should still mark onboarding complete if profile save fails', async () => {
      mockApiFetch
        .mockRejectedValueOnce(new Error('Network error')) // profile save fails
        .mockResolvedValueOnce({}); // complete-onboarding succeeds

      const data = {
        university: 'UI',
        hobbies: ['Coding'],
        job: '',
        reason: '',
      };

      const result = await completeOnboarding(userId, data);

      expect(result.profileSaved).toBe(false);
      expect(result.onboardingMarked).toBe(true);
      expect(localStorage.getItem(`synapse_onboarding_${userId}`)).toBe('done');
    });

    it('should set localStorage even if both API calls fail', async () => {
      mockApiFetch.mockRejectedValue(new Error('Network error'));

      const data = {
        university: 'UI',
        hobbies: [],
        job: '',
        reason: '',
      };

      const result = await completeOnboarding(userId, data);

      expect(result.profileSaved).toBe(false);
      expect(result.onboardingMarked).toBe(false);
      // localStorage should still be set as a fallback
      expect(localStorage.getItem(`synapse_onboarding_${userId}`)).toBe('done');
    });
  });

  describe('skipOnboarding', () => {
    it('should mark onboarding completed WITHOUT saving profile data', async () => {
      mockApiFetch.mockResolvedValue({});

      const result = await skipOnboarding(userId);

      // Should only call complete-onboarding, NOT /user/profile
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
      expect(mockApiFetch).toHaveBeenCalledWith('/auth/complete-onboarding', {
        method: 'PATCH',
      });

      // Should NOT have called profile endpoint
      expect(mockApiFetch).not.toHaveBeenCalledWith(
        '/user/profile',
        expect.anything(),
      );

      // Should set localStorage flag
      expect(localStorage.getItem(`synapse_onboarding_${userId}`)).toBe('done');

      expect(result).toEqual({ onboardingMarked: true });
    });

    it('should set localStorage even if API call fails', async () => {
      mockApiFetch.mockRejectedValue(new Error('Server down'));

      const result = await skipOnboarding(userId);

      expect(result.onboardingMarked).toBe(false);
      // localStorage should still be set as fallback
      expect(localStorage.getItem(`synapse_onboarding_${userId}`)).toBe('done');
    });
  });
});
