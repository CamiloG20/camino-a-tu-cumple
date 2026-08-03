import { Platform } from 'react-native';

/** Ancho máximo del contenido (iPhone 17 Pro Max ≈ 440pt lógicos en portrait) */
export const CONTENT_MAX_WIDTH = 440;

/** Teal profundo → rosa empolvado (evita el gradiente púrpura genérico). */
export const GRADIENT_COLORS = ['#0f2c2e', '#c45c6a'];

/** Overlay semitransparente sobre la imagen de fondo (legibilidad del texto). */
export const BACKGROUND_OVERLAY_COLORS = ['rgba(15, 44, 46, 0.52)', 'rgba(196, 92, 106, 0.45)'];

/** Gradiente festivo para el día 0 (cumpleaños). */
export const BIRTHDAY_GRADIENT_COLORS = ['#c45c6a', '#e8b86d', '#0f2c2e'];

export const BIRTHDAY_BACKGROUND_OVERLAY_COLORS = [
  'rgba(196, 92, 106, 0.5)',
  'rgba(232, 184, 109, 0.42)',
  'rgba(15, 44, 46, 0.55)',
];

export const FONTS = {
  display: Platform.select({
    web: '"Fraunces", "Iowan Old Style", Georgia, serif',
    ios: 'Georgia',
    default: 'serif',
  }),
  body: Platform.select({
    web: '"Source Sans 3", "Source Sans Pro", system-ui, sans-serif',
    ios: 'System',
    default: 'sans-serif',
  }),
};

export const THEME = {
  primary: '#0f2c2e',
  secondary: '#c45c6a',
  accent: '#c45c6a',
  accentSoft: '#e8b86d',
  surface: 'rgba(0,0,0,0.35)',
  textOnGradient: '#fff',
  textMuted: '#e8d5d8',
};

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
    web: 'max(24px, env(safe-area-inset-bottom, 0px))',
    ios: 34,
    default: 24,
  }),
  paddingLeft: Platform.select({
    web: 'max(16px, env(safe-area-inset-left, 0px))',
    default: 16,
  }),
  paddingRight: Platform.select({
    web: 'max(16px, env(safe-area-inset-right, 0px))',
    default: 16,
  }),
};
