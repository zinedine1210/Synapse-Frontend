import { apiFetch } from '@/lib/api';
import type { OnboardingData } from '@/components/layout/OnboardingFlow';

/**
 * Handles onboarding completion logic:
 * - Saves profile data to backend via PATCH /user/profile
 * - Marks onboarding as completed via PATCH /auth/complete-onboarding
 * - Sets localStorage flag
 *
 * @returns true if all API calls succeeded, false if any failed (local flag still set)
 */
export async function completeOnboarding(
  userId: string,
  data: OnboardingData,
): Promise<{ profileSaved: boolean; onboardingMarked: boolean }> {
  let profileSaved = false;
  let onboardingMarked = false;

  // 1. Save profile data to backend
  try {
    await apiFetch('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        university: data.university || undefined,
        hobbies: data.hobbies.length > 0 ? data.hobbies : undefined,
        job: data.job || undefined,
        reason: data.reason || undefined,
      }),
    });
    profileSaved = true;
  } catch {
    // Profile save failed, but we proceed with marking onboarding complete
  }

  // 2. Mark onboarding as completed on the backend
  try {
    await apiFetch('/auth/complete-onboarding', { method: 'PATCH' });
    onboardingMarked = true;
  } catch {
    // Backend flag failed, rely on localStorage
  }

  // 3. Set localStorage flag regardless of API success
  localStorage.setItem(`synapse_onboarding_${userId}`, 'done');

  return { profileSaved, onboardingMarked };
}

/**
 * Handles onboarding skip logic:
 * - Marks onboarding as completed via PATCH /auth/complete-onboarding
 * - Sets localStorage flag
 * - Does NOT save any profile data
 *
 * @returns true if API call succeeded, false otherwise (local flag still set)
 */
export async function skipOnboarding(
  userId: string,
): Promise<{ onboardingMarked: boolean }> {
  let onboardingMarked = false;

  // 1. Mark onboarding as completed on the backend (no profile data)
  try {
    await apiFetch('/auth/complete-onboarding', { method: 'PATCH' });
    onboardingMarked = true;
  } catch {
    // Backend flag failed, rely on localStorage
  }

  // 2. Set localStorage flag regardless
  localStorage.setItem(`synapse_onboarding_${userId}`, 'done');

  return { onboardingMarked };
}
