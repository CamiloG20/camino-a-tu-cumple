import { createClient } from '@supabase/supabase-js';

let client;

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() || '';
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

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');
}

export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.status(204).end();
    return true;
  }
  return false;
}
