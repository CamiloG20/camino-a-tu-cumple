/**
 * Normaliza y valida claves de Supabase Storage.
 * Rechaza path traversal (`..`) y segmentos vacíos peligrosos.
 * @param {string} path
 * @returns {string}
 */
export function sanitizeStorageKey(path) {
  if (typeof path !== 'string' || !path.trim()) {
    throw new Error('Ruta de storage inválida');
  }

  const segments = path
    .replace(/^\/+/, '')
    .split('/')
    .map((part) =>
      part
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.\-_ ]/g, '_')
        .replace(/\s+/g, ' ')
        .replace(/_+/g, '_')
        .trim()
    )
    .filter(Boolean);

  if (!segments.length) {
    throw new Error('Ruta de storage inválida');
  }

  if (segments.some((part) => part === '.' || part === '..' || part.includes('..'))) {
    throw new Error('Ruta de storage inválida');
  }

  return segments.join('/');
}

/**
 * Prefijos válidos para media de un día concreto.
 * @param {string} path
 * @param {number} dayNumber
 * @returns {boolean}
 */
export function isStoragePathAllowedForDay(path, dayNumber) {
  let key;
  try {
    key = sanitizeStorageKey(path);
  } catch {
    return false;
  }

  const n = Number(dayNumber);
  if (!Number.isInteger(n) || n < 0 || n > 31) return false;

  return (
    new RegExp(`^images/${n}\\.[^/]+$`).test(key) ||
    new RegExp(`^sounds/${n}\\.[^/]+$`).test(key) ||
    new RegExp(`^backgrounds/day${n}\\.[^/]+$`).test(key) ||
    new RegExp(`^photos/day${n}/`).test(key)
  );
}

/** @type {Record<string, string[]>} */
const ALLOWED_MIME = {
  main: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  extra: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  background: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/ogg', 'audio/webm'],
};

/** @type {Record<string, string[]>} */
const ALLOWED_EXT = {
  main: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  extra: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  background: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  audio: ['mp3', 'm4a', 'wav', 'ogg', 'webm'],
};

/**
 * @param {string} type
 * @param {string} [mimetype]
 * @param {string} [filename]
 * @returns {boolean}
 */
export function isAllowedUpload(type, mimetype, filename) {
  const ext = (filename?.split('.').pop() || '').toLowerCase();
  const types = ALLOWED_MIME[type] || [];
  const exts = ALLOWED_EXT[type] || [];
  const mimeOk = !mimetype || types.includes(mimetype.toLowerCase());
  const extOk = !ext || exts.includes(ext);
  return mimeOk && extOk;
}
