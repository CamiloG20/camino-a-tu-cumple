import { createClient } from '@supabase/supabase-js';

/**
 * Ping a Party-Bel_Amour (tivquhixdeutjlndafcm) para evitar pausa automática.
 * Usa anon key (EXPO_PUBLIC_SUPABASE_ANON_KEY); no hace falta service role.
 */
function isAuthorizedCron(req) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.authorization || '';
    if (auth === `Bearer ${secret}`) return true;
  }
  return req.headers['x-vercel-cron'] === '1';
}

function getSupabase() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Supabase no configurado');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const supabase = getSupabase();
    const started = Date.now();
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase.rpc('get_unlocked_days', { as_of: today });

    if (error) {
      const fallback = await supabase.from('days').select('id', { count: 'exact', head: true });
      if (fallback.error) throw error;
      return res.status(200).json({
        ok: true,
        project: 'Party-Bel_Amour',
        via: 'days_head',
        count: fallback.count ?? 0,
        rpcError: error.message,
        latencyMs: Date.now() - started,
        at: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      ok: true,
      project: 'Party-Bel_Amour',
      via: 'get_unlocked_days',
      unlocked: Array.isArray(data) ? data.length : 0,
      latencyMs: Date.now() - started,
      at: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Keep-alive falló',
    });
  }
}
