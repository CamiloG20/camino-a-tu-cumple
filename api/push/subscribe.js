import { createClient } from '@supabase/supabase-js';
import { parseJsonBody } from '../_lib/parseBody.js';
import { checkRateLimit, getClientIp } from '../_lib/rateLimit.js';

function getSupabase() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Supabase no configurado');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const ip = getClientIp(req);
  const limit = checkRateLimit(`push-subscribe:${ip}`, {
    maxAttempts: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) {
    return res.status(429).json({
      error: 'Demasiadas suscripciones. Espera unos minutos e inténtalo de nuevo.',
    });
  }

  const body = parseJsonBody(req);
  if (!body?.endpoint || typeof body.endpoint !== 'string') {
    return res.status(400).json({ error: 'Suscripción inválida' });
  }

  if (body.endpoint.length > 2048) {
    return res.status(400).json({ error: 'Endpoint demasiado largo' });
  }

  try {
    const supabase = getSupabase();
    const row = {
      endpoint: body.endpoint,
      subscription: body,
      user_agent: req.headers['user-agent'] || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('push_subscriptions').upsert(row, {
      onConflict: 'endpoint',
    });

    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (error) {
    if (/push_subscriptions/i.test(error.message || '')) {
      return res.status(500).json({
        error: 'Tabla push_subscriptions no existe. Ejecuta supabase/migrations/003_push_subscriptions.sql',
      });
    }
    return res.status(500).json({ error: error.message || 'No se pudo guardar la suscripción' });
  }
}
