/**
 * Configuración pública de la app (hora de aviso, etc.).
 */
import { DEFAULT_HOUR } from '../../lib/dailyNotifications.js';

export const APP_TIMEZONE_LABEL = 'America/Guayaquil';

export function normalizeNotificationHour(value, fallback = DEFAULT_HOUR) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const hour = Number(value);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return fallback;
  }
  return hour;
}

export async function fetchNotificationHourFromDb(supabase) {
  const { data, error } = await supabase.rpc('get_notification_hour');
  if (error) throw error;
  return normalizeNotificationHour(data);
}

export async function updateNotificationHourInDb(supabase, hour) {
  const normalized = normalizeNotificationHour(hour);
  const { error } = await supabase
    .from('app_config')
    .update({ notification_hour: normalized, updated_at: new Date().toISOString() })
    .eq('id', 1);

  if (error) throw error;
  return normalized;
}
