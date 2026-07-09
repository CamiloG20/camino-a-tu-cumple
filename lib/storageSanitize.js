export function sanitizeStorageKey(path) {
  return path
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
    .join('/');
}

const ALLOWED_MIME = {
  main: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  extra: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  background: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/ogg', 'audio/webm'],
};

const ALLOWED_EXT = {
  main: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  extra: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  background: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  audio: ['mp3', 'm4a', 'wav', 'ogg', 'webm'],
};

export function isAllowedUpload(type, mimetype, filename) {
  const ext = (filename?.split('.').pop() || '').toLowerCase();
  const types = ALLOWED_MIME[type] || [];
  const exts = ALLOWED_EXT[type] || [];
  const mimeOk = !mimetype || types.includes(mimetype.toLowerCase());
  const extOk = !ext || exts.includes(ext);
  return mimeOk && extOk;
}
