import {
  getDaysUntilBirthday,
  getDaysUntilEventStart,
  isBeforeEventStart,
} from './calendar';
import {
  getAppCalendarDate,
  getAppHour,
  getTodayDateKey,
  msUntilNextAppHour,
} from './timezone';

export const PREFS_KEY = 'dailyNotificationPrefs_v1';
export const LAST_NOTIFIED_KEY = 'dailyNotificationLastTag_v1';
export const DISMISS_BANNER_KEY = 'dailyNotificationBannerDismissed_v1';
export const DAY_WELCOME_KEY = 'dayWelcomeShown_v1';
export const DEFAULT_HOUR = 10; // 10:00 hora Ecuador (Quito)

export function isNotificationSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    typeof Notification.requestPermission === 'function'
  );
}

export { getTodayDateKey };

export function loadNotificationPrefs() {
  if (typeof localStorage === 'undefined') {
    return { enabled: false };
  }

  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { enabled: false };
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed.enabled),
    };
  } catch {
    return { enabled: false };
  }
}

export function saveNotificationPrefs(prefs) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PREFS_KEY, JSON.stringify({ enabled: Boolean(prefs.enabled) }));
}

export function getLastNotifiedTag() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(LAST_NOTIFIED_KEY);
}

export function setLastNotifiedTag(tag) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LAST_NOTIFIED_KEY, tag);
}

export function buildDailyNotificationPayload(date = getAppCalendarDate()) {
  const dateKey = getTodayDateKey(date);

  if (isBeforeEventStart(date)) {
    const daysUntil = getDaysUntilEventStart(date);
    return {
      title: 'Camino a tu cumple 💌',
      body:
        daysUntil === 1
          ? '¡Mañana empieza el camino! Tu primera sorpresa está casi lista.'
          : `Faltan ${daysUntil} días para que empiece el camino hacia tu cumple.`,
      tag: `pre-start-${dateKey}`,
      dayNumber: null,
      daysUntil,
      isBirthday: false,
    };
  }

  const daysUntil = getDaysUntilBirthday(date);
  const dayNumber = daysUntil;

  if (daysUntil === 0) {
    return {
      title: '¡Feliz cumpleaños! 🎂❤️',
      body: 'Hoy es el día 0. Abre la app y vive tu sorpresa final.',
      tag: `birthday-${dateKey}`,
      dayNumber: 0,
      daysUntil: 0,
      isBirthday: true,
    };
  }

  return {
    title: `✨ Día ${dayNumber} desbloqueado`,
    body: `Tu sorpresa de hoy ya te espera. Faltan ${daysUntil} días para tu cumple 🎁`,
    tag: `day-${dayNumber}-${dateKey}`,
    dayNumber,
    daysUntil,
    isBirthday: false,
  };
}

export function msUntilNextLocalHour(hour, date = new Date()) {
  return msUntilNextAppHour(hour, date);
}

export function shouldNotifyNow(prefs, date = new Date(), hour = DEFAULT_HOUR) {
  if (!prefs?.enabled) return false;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return false;
  }

  const payload = buildDailyNotificationPayload(date);
  if (getLastNotifiedTag() === payload.tag) {
    return false;
  }

  const notifyHour = normalizeNotificationHour(hour);
  return getAppHour(date) >= notifyHour;
}

function normalizeNotificationHour(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 23) {
    return DEFAULT_HOUR;
  }
  return parsed;
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

export function shouldShowDayWelcome(date = new Date(), hour = DEFAULT_HOUR) {
  if (typeof localStorage === 'undefined') return false;
  if (isBeforeEventStart(date)) return false;

  const payload = buildDailyNotificationPayload(date);
  if (payload.tag.startsWith('pre-start')) return false;

  if (getAppHour(date) < normalizeNotificationHour(hour)) return false;

  return localStorage.getItem(DAY_WELCOME_KEY) !== payload.tag;
}

export function markDayWelcomeShown(date = new Date()) {
  if (typeof localStorage === 'undefined') return;
  const payload = buildDailyNotificationPayload(date);
  localStorage.setItem(DAY_WELCOME_KEY, payload.tag);
}

export function getDayWelcomePayload(date = new Date()) {
  return buildDailyNotificationPayload(date);
}
