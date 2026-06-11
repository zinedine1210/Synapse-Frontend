import confetti from 'canvas-confetti';

let lastConfettiTime = 0;

/**
 * Fire confetti animation (max 1x per session to avoid spam)
 * Triggers: saving tree 100%, achievement unlocked, streak milestone
 */
export function fireConfetti() {
  const now = Date.now();
  // Cooldown: 1 per session (30 seconds min gap)
  if (now - lastConfettiTime < 30000) return;
  lastConfettiTime = now;

  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });
}

/**
 * Haptic feedback (mobile only, 50ms pulse)
 */
export function hapticFeedback() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(50);
  }
}
