import { createClient } from '@supabase/supabase-js';
import { setCors, handleOptions } from './_lib/admin.js';
import { getTodayDateKey } from '../lib/timezone.js';

/**
 * Health check. Con ?ping=1 toca Supabase con la anon key
 * (suficiente para evitar pausa por inactividad en el plan free).
 */
function getAnonSupabase() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default async function handler(req, res) {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  const wantPing =
    req.method === 'GET' &&
    (req.query?.ping === '1' || req.query?.ping === 'true');

  if (!wantPing) {
    return res.status(200).json({ ok: true });
  }

  try {
    const supabase = getAnonSupabase();
    const started = Date.now();

    // RPC pública de la app: genera actividad real y valida el schema.
    const today = getTodayDateKey();
    const { data, error } = await supabase.rpc('get_unlocked_days', { as_of: today });

    if (error) {
      // Respaldo: head count (puede devolver 0 por RLS; igual despierta el proyecto)
      const fallback = await supabase.from('days').select('id', { count: 'exact', head: true });
      if (fallback.error) throw error;
      return res.status(200).json({
        ok: true,
        supabase: true,
        via: 'days_head',
        days: fallback.count ?? 0,
        rpcError: error.message,
        latencyMs: Date.now() - started,
      });
    }

    return res.status(200).json({
      ok: true,
      supabase: true,
      via: 'get_unlocked_days',
      unlocked: Array.isArray(data) ? data.length : 0,
      latencyMs: Date.now() - started,
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      supabase: false,
      error: error.message || 'Supabase no responde',
    });
  }
}
