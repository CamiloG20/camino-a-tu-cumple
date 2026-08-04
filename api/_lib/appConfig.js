/**
 * Configuración pública de la app (hora de aviso, fondos, etc.).
 */
import { DEFAULT_HOUR } from '../../lib/dailyNotifications.js';
import { APP_TIMEZONE } from '../../lib/timezone.js';
import { createSignedMediaUrl } from './admin.js';

export const APP_TIMEZONE_LABEL = APP_TIMEZONE;

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

export async function fetchAppSettingsFromDb(supabase) {
  const { data, error } = await supabase
    .from('app_config')
    .select('notification_hour, background_path')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;

  return {
    notificationHour: normalizeNotificationHour(data?.notification_hour),
    backgroundPath: data?.background_path?.trim() || null,
  };
}

export async function fetchNotificationHourFromDb(supabase) {
  const settings = await fetchAppSettingsFromDb(supabase);
  return settings.notificationHour;
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

export async function updateGlobalBackgroundPath(supabase, backgroundPath) {
  const { error } = await supabase
    .from('app_config')
    .update({
      background_path: backgroundPath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  if (error) throw error;
  return backgroundPath;
}

export async function buildPublicAppConfigPayload(supabase) {
  const settings = await fetchAppSettingsFromDb(supabase);
  let backgroundUrl = null;

  if (settings.backgroundPath) {
    try {
      backgroundUrl = await createSignedMediaUrl(settings.backgroundPath, 3600);
    } catch {
      backgroundUrl = null;
    }
  }

  return {
    notificationHour: settings.notificationHour,
    timezone: APP_TIMEZONE_LABEL,
    backgroundPath: settings.backgroundPath,
    backgroundUrl,
  };
}
