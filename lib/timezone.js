/**
 * Zona horaria de la app: Ecuador (Quito / Guayaquil), UTC-5 sin horario de verano.
 */
export const APP_TIMEZONE =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_APP_TIMEZONE?.trim()) ||
  'America/Guayaquil';

const ECUADOR_UTC_OFFSET_HOURS = 5;

export function getZonedParts(date = new Date(), timeZone = APP_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const pick = (type) => parts.find((part) => part.type === type)?.value ?? '0';
  const hour = Number(pick('hour')) % 24;

  return {
    year: Number(pick('year')),
    month: Number(pick('month')),
    day: Number(pick('day')),
    hour,
    minute: Number(pick('minute')),
    second: Number(pick('second')),
  };
}

/** Fecha civil “hoy” en Ecuador (representada como instante UTC estable). */
export function getAppCalendarDate(date = new Date()) {
  const { year, month, day } = getZonedParts(date);
  return new Date(ecuadorLocalToUtc(year, month, day, 12, 0, 0));
}

export function getTodayDateKey(date = new Date()) {
  const { year, month, day } = getZonedParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getAppHour(date = new Date()) {
  return getZonedParts(date).hour;
}

/** Convierte hora civil en Ecuador a timestamp UTC. */
export function ecuadorLocalToUtc(year, month, day, hour = 0, minute = 0, second = 0) {
  return Date.UTC(year, month - 1, day, hour + ECUADOR_UTC_OFFSET_HOURS, minute, second);
}

/** Milisegundos hasta la próxima hora en punto (hora Ecuador). */
export function msUntilNextAppHour(hour, date = new Date()) {
  const parts = getZonedParts(date);
  const pastHour =
    parts.hour > hour || (parts.hour === hour && (parts.minute > 0 || parts.second > 0));

  let { year, month, day } = parts;
  if (pastHour) {
    const nextDay = new Date(year, month - 1, day + 1);
    year = nextDay.getFullYear();
    month = nextDay.getMonth() + 1;
    day = nextDay.getDate();
  }

  const targetUtc = ecuadorLocalToUtc(year, month, day, hour, 0, 0);
  return Math.max(0, targetUtc - date.getTime());
}
