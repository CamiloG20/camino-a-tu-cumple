import { createClient } from '@supabase/supabase-js';
import { createAdminToken, verifyAdminToken } from '../../lib/adminToken.js';
import { sanitizeStorageKey } from '../../lib/storageSanitize.js';
import { PRODUCTION_URL } from '../../lib/site.js';
import { timingSafeEqualString } from '../../lib/safeCompare.js';
import { checkRateLimit, getClientIp } from './rateLimit.js';

export { sanitizeStorageKey, createAdminToken, verifyAdminToken };

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
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;

    const requestHost = (req?.headers?.['x-forwarded-host'] || req?.headers?.host || '')
      .split(',')[0]
      .trim()
      .split(':')[0];

    if (requestHost && hostname === requestHost) return true;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
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
    res.setHeader('Access-Control-Allow-Origin', 'null');
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-admin-password'
  );
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

export function extractAdminToken(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

export function isAdminAuthorized(req) {
  const token = extractAdminToken(req);
  if (token && verifyAdminToken(token)) {
    return true;
  }

  const password = getAdminPassword();
  if (!password) return false;
  return timingSafeEqualString(req.headers['x-admin-password'], password);
}

export function requireAdmin(req, res, { rateLimitKey = 'admin' } = {}) {
  const ip = getClientIp(req);
  const limit = checkRateLimit(`${rateLimitKey}:${ip}`, {
    maxAttempts: 120,
    windowMs: 15 * 60 * 1000,
  });

  if (!limit.allowed) {
    res.status(429).json({
      error: 'Demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo.',
    });
    return false;
  }

  if (!getAdminPassword() && !getTokenSecret()) {
    res.status(500).json({ error: 'ADMIN_PASSWORD no configurado en Vercel' });
    return false;
  }

  if (!isAdminAuthorized(req)) {
    res.status(401).json({ error: 'No autorizado' });
    return false;
  }

  return true;
}

function getTokenSecret() {
  return (
    process.env.ADMIN_TOKEN_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    ''
  );
}

export async function deleteStoragePaths(paths) {
  const bucket = getStorageBucket();
  const supabase = getAdminSupabase();
  const keys = paths
    .filter((path) => path && typeof path === 'string' && !path.startsWith('http'))
    .map((path) => sanitizeStorageKey(path));

  if (!keys.length) return;

  const { error } = await supabase.storage.from(bucket).remove(keys);
  if (error) throw error;
}

export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export async function createSignedMediaUrl(path, expiresIn = 3600) {
  const bucket = getStorageBucket();
  const supabase = getAdminSupabase();
  const key = sanitizeStorageKey(path);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
