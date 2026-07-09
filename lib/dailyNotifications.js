import {
  getDaysUntilBirthday,
  getDaysUntilEventStart,
  isBeforeEventStart,
  TOTAL_EVENT_DAYS,
} from './calendar';

export const PREFS_KEY = 'dailyNotificationPrefs_v1';
export const LAST_NOTIFIED_KEY = 'dailyNotificationLastTag_v1';
export const DISMISS_BANNER_KEY = 'dailyNotificationBannerDismissed_v1';
export const DEFAULT_HOUR = 9;

export function isNotificationSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    typeof Notification.requestPermission === 'function'
  );
}

export function getTodayDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function loadNotificationPrefs() {
  if (typeof localStorage === 'undefined') {
    return { enabled: false, hour: DEFAULT_HOUR };
  }

  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { enabled: false, hour: DEFAULT_HOUR };
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed.enabled),
      hour: Number(parsed.hour) || DEFAULT_HOUR,
    };
  } catch {
    return { enabled: false, hour: DEFAULT_HOUR };
  }
}

export function saveNotificationPrefs(prefs) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function getLastNotifiedTag() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(LAST_NOTIFIED_KEY);
}

export function setLastNotifiedTag(tag) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LAST_NOTIFIED_KEY, tag);
}

export function buildDailyNotificationPayload(date = new Date()) {
  const dateKey = getTodayDateKey(date);

  if (isBeforeEventStart(date)) {
    const daysUntil = getDaysUntilEventStart(date);
    return {
      title: 'Camino a tu cumple 💌',
      body:
        daysUntil === 1
          ? '¡Mañana empieza el camino! Prepárate para la primera sorpresa.'
          : `Faltan ${daysUntil} días para que empiece el camino hacia tu cumple.`,
      tag: `pre-start-${dateKey}`,
    };
  }

  const daysUntil = getDaysUntilBirthday(date);
  const dayNumber = daysUntil;

  if (daysUntil === 0) {
    return {
      title: '¡Feliz cumpleaños! 🎂❤️',
      body: 'Hoy es el día 0. Abre la app y celebra tu sorpresa final.',
      tag: `birthday-${dateKey}`,
    };
  }

  return {
    title: `Día ${dayNumber} desbloqueado 💌`,
    body: `Tu sorpresa de hoy te espera. Faltan ${daysUntil} días para tu cumple.`,
    tag: `day-${dayNumber}-${dateKey}`,
  };
}

export function msUntilNextLocalHour(hour, date = new Date()) {
  const next = new Date(date);
  next.setHours(hour, 0, 0, 0);
  if (next <= date) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - date.getTime();
}

export function shouldNotifyNow(prefs, date = new Date()) {
  if (!prefs?.enabled) return false;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return false;
  }

  const payload = buildDailyNotificationPayload(date);
  if (getLastNotifiedTag() === payload.tag) {
    return false;
  }

  const hour = prefs.hour ?? DEFAULT_HOUR;
  const currentHour = date.getHours();
  const currentMinute = date.getMinutes();

  return currentHour > hour || (currentHour === hour && currentMinute >= 0);
}

export async function showDailyNotification(payload) {
  if (!payload || Notification.permission !== 'granted') return false;

  const options = {
    body: payload.body,
    icon: '/logo192.png',
    badge: '/favicon.png',
    tag: payload.tag,
    data: { url: '/' },
    vibrate: [180, 90, 180],
    requireInteraction: false,
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(payload.title, options);
    } else {
      new Notification(payload.title, options);
    }
    setLastNotifiedTag(payload.tag);
    return true;
  } catch (error) {
    console.warn('No se pudo mostrar la notificación diaria:', error);
    return false;
  }
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function isEventActiveWindow(date = new Date()) {
  if (isBeforeEventStart(date)) return true;
  const daysUntil = getDaysUntilBirthday(date);
  return daysUntil >= 0 && daysUntil <= TOTAL_EVENT_DAYS - 1;
}
