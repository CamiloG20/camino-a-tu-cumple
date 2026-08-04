import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Respeta “reducir movimiento” del sistema / prefers-reduced-motion en web.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const apply = () => {
        if (mounted) setReduced(Boolean(mq.matches));
      };
      apply();
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', apply);
        return () => {
          mounted = false;
          mq.removeEventListener('change', apply);
        };
      }
      mq.addListener?.(apply);
      return () => {
        mounted = false;
        mq.removeListener?.(apply);
      };
    }

    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => {
        if (mounted) setReduced(Boolean(value));
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) => {
      if (mounted) setReduced(Boolean(value));
    });

    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}
