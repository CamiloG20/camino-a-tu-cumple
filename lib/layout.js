import { Platform } from 'react-native';

/** Ancho máximo del contenido (iPhone 17 Pro Max ≈ 440pt lógicos en portrait) */
export const CONTENT_MAX_WIDTH = 440;

export const GRADIENT_COLORS = ['#6a11cb', '#2575fc'];

export function getContentWidth(windowWidth) {
  return Math.min(windowWidth, Platform.OS === 'web' ? CONTENT_MAX_WIDTH : windowWidth);
}

export const safeArea = {
  paddingTop: Platform.select({
    web: 'max(12px, env(safe-area-inset-top, 0px))',
    ios: 56,
    default: 48,
  }),
  paddingBottom: Platform.select({
    web: 'max(28px, env(safe-area-inset-bottom, 0px))',
    ios: 34,
    default: 24,
  }),
  paddingHorizontal: Platform.select({
    web: 'max(16px, env(safe-area-inset-left, 0px))',
    default: 16,
  }),
};
