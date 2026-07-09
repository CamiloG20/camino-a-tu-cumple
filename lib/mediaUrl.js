import { getSupabase } from './supabase';
import { STORAGE_BUCKET } from './config';

const signedUrlCache = new Map();
const SIGNED_URL_TTL_MS = 50 * 60 * 1000;

function normalizeStoragePath(path) {
  if (!path || typeof path !== 'string') return null;
  if (/^https?:\/\//i.test(path)) return path;
  return path.replace(/^\/+/, '');
}

export async function resolveStorageUrl(path) {
  const normalized = normalizeStoragePath(path);
  if (!normalized) return null;
  if (/^https?:\/\//i.test(normalized)) return normalized;

  const cached = signedUrlCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(normalized, 3600);

  if (error || !data?.signedUrl) {
    return null;
  }

  signedUrlCache.set(normalized, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_TTL_MS,
  });

  return data.signedUrl;
}

export function getPublicStorageUrl(path) {
  const normalized = normalizeStoragePath(path);
  if (!normalized) return null;
  if (/^https?:\/\//i.test(normalized)) return normalized;

  const supabase = getSupabase();
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(normalized);
  return data.publicUrl;
}
