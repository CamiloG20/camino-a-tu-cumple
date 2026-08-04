/**
 * Calendario del evento: 32 días numerados del 31 al 0.
 * - Día 31 = 9 de julio (inicio del camino)
 * - Día 0  = 9 de agosto (cumpleaños / fin)
 *
 * La fecha de fin se configura con EXPO_PUBLIC_BIRTHDAY_MONTH/DAY (default: 9 agosto).
 * Todas las fechas usan hora de Ecuador (Quito / America/Guayaquil).
 * getAppCalendarDate() guarda el día civil Ecuador como instante UTC estable;
 * por eso usamos getters UTC (no getDate()/getMonth() locales del dispositivo).
 */
import { getAppCalendarDate } from './timezone.js';

const BIRTHDAY_MONTH = Number(process.env.EXPO_PUBLIC_BIRTHDAY_MONTH) || 8;
const BIRTHDAY_DAY = Number(process.env.EXPO_PUBLIC_BIRTHDAY_DAY) || 9;

/** Días del recorrido (31, 30, …, 1, 0). */
export const TOTAL_EVENT_DAYS = 32;

const MONTH_NAMES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function toUtcMidnight(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Mes 0-indexado para `Date` (agosto = 7). */
export function getBirthdayMonthIndex() {
  return BIRTHDAY_MONTH - 1;
}

export function getBirthdayDay() {
  return BIRTHDAY_DAY;
}

export function getBirthdayDate(year = getAppCalendarDate().getUTCFullYear()) {
  return new Date(Date.UTC(year, getBirthdayMonthIndex(), getBirthdayDay(), 12, 0, 0));
}

/** Primer día del evento (día 31): 31 días antes del cumpleaños. */
export function getEventStartDate(year = getAppCalendarDate().getUTCFullYear()) {
  const end = getBirthdayDate(year);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (TOTAL_EVENT_DAYS - 1));
  return start;
}

/** Fecha civil del calendario para un `day_number` (31…0) en el año dado. */
export function getCalendarDateForDayNumber(dayNumber, year = getAppCalendarDate().getUTCFullYear()) {
  const start = getEventStartDate(year);
  const date = new Date(start);
  date.setUTCDate(date.getUTCDate() + (31 - dayNumber));
  return date;
}

export function formatCalendarDate(date) {
  const day = date.getUTCDate();
  const month = MONTH_NAMES_ES[date.getUTCMonth()];
  return `${day} de ${month}`;
}

export function getDaysUntilBirthday(date = getAppCalendarDate()) {
  const todayMs = toUtcMidnight(date);
  let birthday = getBirthdayDate(date.getUTCFullYear());

  if (todayMs > toUtcMidnight(birthday)) {
    birthday = getBirthdayDate(date.getUTCFullYear() + 1);
  }

  return Math.round((toUtcMidnight(birthday) - todayMs) / (1000 * 60 * 60 * 24));
}

/** true si la fecha es anterior al 9 de julio (día 31). */
export function isBeforeEventStart(date = getAppCalendarDate()) {
  const todayMs = toUtcMidnight(date);
  const start = getEventStartDate(date.getUTCFullYear());
  return todayMs < toUtcMidnight(start);
}

/** Días que faltan para que empiece el camino (9 jul). 0 si ya empezó. */
export function getDaysUntilEventStart(date = getAppCalendarDate()) {
  const todayMs = toUtcMidnight(date);
  const start = getEventStartDate(date.getUTCFullYear());
  if (todayMs >= toUtcMidnight(start)) return 0;
  return Math.round((toUtcMidnight(start) - todayMs) / (1000 * 60 * 60 * 24));
}

export function getTodayDayIndex(daysCount, date = getAppCalendarDate()) {
  if (isBeforeEventStart(date)) {
    return -1;
  }

  const daysUntilBirthday = getDaysUntilBirthday(date);
  let index = daysCount - 1 - daysUntilBirthday;
  if (index < 0) index = 0;
  if (index >= daysCount) index = daysCount - 1;
  return index;
}

/** Índice de “hoy” en un array de días (ordenados 31→0 o solo desbloqueados). */
export function getTodayDayIndexFromDays(days, date = getAppCalendarDate()) {
  if (!Array.isArray(days) || !days.length) return -1;
  if (isBeforeEventStart(date)) return -1;

  const todayNumber = getDaysUntilBirthday(date);
  const byNumber = days.findIndex((d) => Number(d.dayNumber) === todayNumber);
  if (byNumber >= 0) return byNumber;

  return getTodayDayIndex(days.length, date);
}
