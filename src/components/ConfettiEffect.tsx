import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export const ConfettiEffect = () => {
  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    // First burst
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.65 },
      colors: ['#ccff00', '#ffffff', '#22c55e', '#a3e635', '#facc15'],
    });

    // Second celebratory bursts from sides
    const timer1 = setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ccff00', '#ffffff', '#38bdf8'],
      });
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ccff00', '#ffffff', '#a855f7'],
      });
    }, 250);

    return () => clearTimeout(timer1);
  }, []);

  return null;
};
