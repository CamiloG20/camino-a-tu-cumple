/**
 * Calendario del evento: 32 días numerados del 31 al 0.
 * - Día 31 = 9 de julio (inicio del camino)
 * - Día 0  = 9 de agosto (cumpleaños / fin)
 *
 * La fecha de fin se configura con EXPO_PUBLIC_BIRTHDAY_MONTH/DAY (default: 9 agosto).
 */
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

/** Mes 0-indexado para `Date` (agosto = 7). */
export function getBirthdayMonthIndex() {
  return BIRTHDAY_MONTH - 1;
}

export function getBirthdayDay() {
  return BIRTHDAY_DAY;
}

export function getBirthdayDate(year = new Date().getFullYear()) {
  return new Date(year, getBirthdayMonthIndex(), getBirthdayDay());
}

/** Primer día del evento (día 31): 31 días antes del cumpleaños. */
export function getEventStartDate(year = new Date().getFullYear()) {
  const end = getBirthdayDate(year);
  const start = new Date(end);
  start.setDate(start.getDate() - (TOTAL_EVENT_DAYS - 1));
  return start;
}

/** Fecha civil del calendario para un `day_number` (31…0) en el año dado. */
export function getCalendarDateForDayNumber(dayNumber, year = new Date().getFullYear()) {
  const start = getEventStartDate(year);
  const date = new Date(start);
  date.setDate(date.getDate() + (31 - dayNumber));
  return date;
}

export function formatCalendarDate(date) {
  const day = date.getDate();
  const month = MONTH_NAMES_ES[date.getMonth()];
  return `${day} de ${month}`;
}

export function getDaysUntilBirthday(date = new Date()) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let birthday = getBirthdayDate(date.getFullYear());

  if (today > birthday) {
    birthday = getBirthdayDate(date.getFullYear() + 1);
  }

  return Math.round((birthday - today) / (1000 * 60 * 60 * 24));
}

/** true si la fecha es anterior al 9 de julio (día 31). */
export function isBeforeEventStart(date = new Date()) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const start = getEventStartDate(date.getFullYear());
  return today < start;
}

/** Días que faltan para que empiece el camino (9 jul). 0 si ya empezó. */
export function getDaysUntilEventStart(date = new Date()) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const start = getEventStartDate(date.getFullYear());
  if (today >= start) return 0;
  return Math.round((start - today) / (1000 * 60 * 60 * 24));
}

export function getTodayDayIndex(daysCount, date = new Date()) {
  if (isBeforeEventStart(date)) {
    return -1;
  }

  const daysUntilBirthday = getDaysUntilBirthday(date);
  let index = daysCount - 1 - daysUntilBirthday;
  if (index < 0) index = 0;
  if (index >= daysCount) index = daysCount - 1;
  return index;
}
