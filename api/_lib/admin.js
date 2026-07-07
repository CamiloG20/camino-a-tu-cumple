import { createClient } from '@supabase/supabase-js';
import { sanitizeStorageKey } from '../../lib/storageSanitize.js';
import { isVercelHostname, PRODUCTION_URL } from '../../lib/site.js';

export { sanitizeStorageKey };

let client;

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() || '';
}

export function getAllowedOrigin() {
  const explicit = process.env.ADMIN_ALLOWED_ORIGIN?.trim();
  if (explicit) return explicit;

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return `https://${production}`;

  const deployment = process.env.VERCEL_URL?.trim();
  if (deployment) return `https://${deployment}`;

  return PRODUCTION_URL;
}

function isAllowedRequestOrigin(origin, req) {
  if (!origin) return false;

  const allowed = getAllowedOrigin();
  if (allowed && origin === allowed) return true;

  try {
    const { hostname } = new URL(origin);
    const requestHost = (req?.headers?.['x-forwarded-host'] || req?.headers?.host || '')
      .split(',')[0]
      .trim()
      .split(':')[0];

    if (requestHost && hostname === requestHost) return true;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (isVercelHostname(hostname)) return true;
  } catch {
    return false;
  }

  return false;
}

export function setCors(res, req) {
  const origin = req?.headers?.origin;

  if (origin && isAllowedRequestOrigin(origin, req)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin() || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin() || 'null');
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');
}

export function getStorageBucket() {
  return process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || 'media';
}

export function getAdminSupabase() {
  if (!client) {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !key) {
      throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export function requireAdmin(req, res) {
  const password = getAdminPassword();
  if (!password) {
    res.status(500).json({ error: 'ADMIN_PASSWORD no configurado en Vercel' });
    return false;
  }
  if (req.headers['x-admin-password'] !== password) {
    res.status(401).json({ error: 'Contraseña incorrecta' });
    return false;
  }
  return true;
}

export async function deleteStoragePaths(paths) {
  const bucket = getStorageBucket();
  const supabase = getAdminSupabase();
  const keys = paths
    .filter((path) => path && typeof path === 'string' && !path.startsWith('http'))
    .map((path) => sanitizeStorageKey(path.replace(/^\/+/, '')));

  if (!keys.length) return;

  const { error } = await supabase.storage.from(bucket).remove(keys);
  if (error) throw error;
}

export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res, req);
    res.status(204).end();
    return true;
  }
  return false;
}
