/**
 * Calendario del servidor (API / cron). Misma lógica que lib/calendar.js
 */
const BIRTHDAY_MONTH = Number(process.env.EXPO_PUBLIC_BIRTHDAY_MONTH) || 8;
const BIRTHDAY_DAY = Number(process.env.EXPO_PUBLIC_BIRTHDAY_DAY) || 9;
const TOTAL_EVENT_DAYS = 32;

function getBirthdayDate(year = new Date().getFullYear()) {
  return new Date(year, BIRTHDAY_MONTH - 1, BIRTHDAY_DAY);
}

function getEventStartDate(year = new Date().getFullYear()) {
  const end = getBirthdayDate(year);
  const start = new Date(end);
  start.setDate(start.getDate() - (TOTAL_EVENT_DAYS - 1));
  return start;
}

export function getDaysUntilBirthday(date = new Date()) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let birthday = getBirthdayDate(date.getFullYear());
  if (today > birthday) {
    birthday = getBirthdayDate(date.getFullYear() + 1);
  }
  return Math.round((birthday - today) / (1000 * 60 * 60 * 24));
}

export function isBeforeEventStart(date = new Date()) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const start = getEventStartDate(date.getFullYear());
  return today < start;
}

export function getDaysUntilEventStart(date = new Date()) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const start = getEventStartDate(date.getFullYear());
  if (today >= start) return 0;
  return Math.round((start - today) / (1000 * 60 * 60 * 24));
}

export function getTodayDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildDailyNotificationPayload(date = new Date()) {
  const dateKey = getTodayDateKey(date);
  const siteUrl = process.env.EXPO_PUBLIC_SITE_URL?.trim() || 'https://camino-a-tu-cumple.vercel.app';

  if (isBeforeEventStart(date)) {
    const daysUntil = getDaysUntilEventStart(date);
    return {
      title: 'Camino a tu cumple 💌',
      body:
        daysUntil === 1
          ? '¡Mañana empieza el camino! Tu primera sorpresa está casi lista.'
          : `Faltan ${daysUntil} días para que empiece el camino hacia tu cumple.`,
      tag: `pre-start-${dateKey}`,
      url: siteUrl,
    };
  }

  const daysUntil = getDaysUntilBirthday(date);
  const dayNumber = daysUntil;

  if (daysUntil === 0) {
    return {
      title: '¡Feliz cumpleaños! 🎂❤️',
      body: 'Hoy es el día 0. Abre la app y vive tu sorpresa final.',
      tag: `birthday-${dateKey}`,
      url: siteUrl,
    };
  }

  return {
    title: `✨ Día ${dayNumber} desbloqueado`,
    body: `Tu sorpresa de hoy ya te espera. Faltan ${daysUntil} días para tu cumple 🎁`,
    tag: `day-${dayNumber}-${dateKey}`,
    url: siteUrl,
  };
}
