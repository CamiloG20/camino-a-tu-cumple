/** Dominio de producción en Vercel */
export const PRODUCTION_DOMAIN = 'camino-a-tu-cumple.vercel.app';

export const PRODUCTION_URL =
  process.env.EXPO_PUBLIC_SITE_URL?.trim() || `https://${PRODUCTION_DOMAIN}`;

export const PRODUCTION_ADMIN_URL = `${PRODUCTION_URL}/#/admin`;

/** Patrón de previews de Vercel (ej. camino-a-tu-cumple-xxx-camilos-projects-xxx.vercel.app) */
export const VERCEL_PREVIEW_SUFFIX = '.vercel.app';

export function isVercelHostname(hostname) {
  if (!hostname) return false;
  return hostname === PRODUCTION_DOMAIN || hostname.endsWith(VERCEL_PREVIEW_SUFFIX);
}
