import {
  getAdminSupabase,
  requireAdmin,
  setCors,
  handleOptions,
} from '../_lib/admin.js';
import { parseJsonBody } from '../_lib/parseBody.js';
import {
  APP_TIMEZONE_LABEL,
  fetchNotificationHourFromDb,
  normalizeNotificationHour,
  updateNotificationHourInDb,
} from '../_lib/appConfig.js';
import { DEFAULT_HOUR } from '../../lib/dailyNotifications.js';

export default async function handler(req, res) {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'GET') {
      try {
        const supabase = getAdminSupabase();
        const notificationHour = await fetchNotificationHourFromDb(supabase);
        return res.status(200).json({
          notificationHour,
          timezone: APP_TIMEZONE_LABEL,
        });
      } catch {
        return res.status(200).json({
          notificationHour: DEFAULT_HOUR,
          timezone: APP_TIMEZONE_LABEL,
        });
      }
    }

    if (req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;

      const body = parseJsonBody(req);
      if (body === null) {
        return res.status(400).json({ error: 'JSON inválido' });
      }

      const notificationHour = normalizeNotificationHour(body.notificationHour);

      const supabase = getAdminSupabase();
      const saved = await updateNotificationHourInDb(supabase, notificationHour);

      return res.status(200).json({
        ok: true,
        notificationHour: saved,
        timezone: APP_TIMEZONE_LABEL,
      });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error de configuración' });
  }
}
