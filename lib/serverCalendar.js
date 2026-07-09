/**
 * Calendario del servidor (API / cron). Misma lógica que lib/calendar.js
 * con hora de Ecuador (Quito / America/Guayaquil).
 */
import { getAppCalendarDate, getTodayDateKey } from './timezone.js';
const BIRTHDAY_MONTH = Number(process.env.EXPO_PUBLIC_BIRTHDAY_MONTH) || 8;
const BIRTHDAY_DAY = Number(process.env.EXPO_PUBLIC_BIRTHDAY_DAY) || 9;
const TOTAL_EVENT_DAYS = 32;

function getBirthdayDate(year = getAppCalendarDate().getUTCFullYear()) {
  return new Date(Date.UTC(year, BIRTHDAY_MONTH - 1, BIRTHDAY_DAY, 12, 0, 0));
}

function getEventStartDate(year = getAppCalendarDate().getUTCFullYear()) {
  const end = getBirthdayDate(year);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (TOTAL_EVENT_DAYS - 1));
  return start;
}

function toUtcMidnight(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function getDaysUntilBirthday(date = getAppCalendarDate()) {
  const todayMs = toUtcMidnight(date);
  let birthday = getBirthdayDate(date.getUTCFullYear());
  if (todayMs > toUtcMidnight(birthday)) {
    birthday = getBirthdayDate(date.getUTCFullYear() + 1);
  }
  return Math.round((toUtcMidnight(birthday) - todayMs) / (1000 * 60 * 60 * 24));
}

export function isBeforeEventStart(date = getAppCalendarDate()) {
  const todayMs = toUtcMidnight(date);
  const start = getEventStartDate(date.getUTCFullYear());
  return todayMs < toUtcMidnight(start);
}

export function getDaysUntilEventStart(date = getAppCalendarDate()) {
  const todayMs = toUtcMidnight(date);
  const start = getEventStartDate(date.getUTCFullYear());
  if (todayMs >= toUtcMidnight(start)) return 0;
  return Math.round((toUtcMidnight(start) - todayMs) / (1000 * 60 * 60 * 24));
}

export function buildDailyNotificationPayload(date = getAppCalendarDate()) {
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
