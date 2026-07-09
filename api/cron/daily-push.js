import { createClient } from '@supabase/supabase-js';
import { buildTodayPushPayload, sendPushNotification } from '../_lib/webPush.js';

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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
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
    const { data: rows, error } = await supabase.from('push_subscriptions').select('*');
    if (error) throw error;

    const payload = buildTodayPushPayload();
    let sent = 0;
    let removed = 0;
    const failures = [];

    for (const row of rows || []) {
      try {
        await sendPushNotification(row.subscription, payload);
        sent += 1;
      } catch (err) {
        const status = err?.statusCode || err?.status;
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', row.endpoint);
          removed += 1;
        } else {
          failures.push({ endpoint: row.endpoint?.slice(0, 48), error: err.message });
        }
      }
    }

    return res.status(200).json({
      ok: true,
      tag: payload.tag,
      total: rows?.length || 0,
      sent,
      removed,
      failures: failures.slice(0, 5),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error enviando push diario' });
  }
}
