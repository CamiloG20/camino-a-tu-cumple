/** 12 días de regalo repartidos de forma fija (semilla) entre los 32 días (31→0). */

export const GIFT_DAY_COUNT = 12;
const SCHEDULE_SEED = 'camino-bel-amour-2026';

const GIFT_MESSAGES = [
  'Hoy hay una sorpresa pensada solo para ti. Guárdala bien.',
  'Este día es especial: algo te espera fuera de la pantalla.',
  'Un detalle pequeño, pero lleno de cariño. Búscalo con calma.',
  'Hoy toca regalo. No lo dejes pasar sin abrirlo.',
  'Algo bonito llegó para ti este día. Mereces cada pedacito.',
  'Sorpresa desbloqueada: hoy hay algo extra solo para mi cielito.',
  'Un regalo escondido en este día. Ya casi es tuyo.',
  'Hoy el universo conspiró a tu favor. Hay algo especial.',
  'Este día trae más que una imagen: trae un regalo real.',
  'Algo te espera hoy. Cuando lo veas, vas a sonreír.',
  'Día de regalo: una pista más cerca de algo muy bonito.',
  'El mejor regalo es verte feliz. Hoy hay uno más para ti.',
];

function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let s = seed;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** @returns {number[]} day_number values (31…0), length 12 */
export function getScheduledGiftDayNumbers() {
  const pool = [];
  for (let d = 31; d >= 0; d -= 1) {
    pool.push(d);
  }

  const rng = mulberry32(hashSeed(SCHEDULE_SEED));
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, GIFT_DAY_COUNT).sort((a, b) => b - a);
}

export function getGiftNumberForDay(dayNumber, giftDayNumbers = getScheduledGiftDayNumbers()) {
  const index = giftDayNumbers.indexOf(dayNumber);
  return index >= 0 ? index + 1 : null;
}

export function isGiftDay(dayNumber, giftDayNumbers = getScheduledGiftDayNumbers()) {
  return giftDayNumbers.includes(dayNumber);
}

export function getGiftMessage(giftNumber) {
  if (!giftNumber || giftNumber < 1 || giftNumber > GIFT_MESSAGES.length) {
    return 'Hoy tienes algo especial esperándote.';
  }
  return GIFT_MESSAGES[giftNumber - 1];
}

/** Mensaje del modal: BD primero, plantilla por número como respaldo. */
export function resolveGiftMessage(day) {
  const custom = day?.giftMessage ?? day?.gift_message;
  if (custom && String(custom).trim()) {
    return String(custom).trim();
  }
  if (day?.giftNumber != null) {
    return getGiftMessage(day.giftNumber);
  }
  return 'Hoy tienes algo especial esperándote.';
}

export function applyGiftScheduleToDay(day, giftDayNumbers = getScheduledGiftDayNumbers()) {
  const giftNumber = getGiftNumberForDay(day.dayNumber, giftDayNumbers);
  if (giftNumber == null) {
    return { ...day, hasGift: false, giftNumber: null };
  }
  return {
    ...day,
    hasGift: true,
    giftNumber,
  };
}

export function applyGiftScheduleToDays(days) {
  const giftDayNumbers = getScheduledGiftDayNumbers();
  return days.map((day) => applyGiftScheduleToDay(day, giftDayNumbers));
}
