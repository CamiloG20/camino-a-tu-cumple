/** 4 sorpresas: una por semana (día al azar con semilla fija). */

export const GIFT_DAY_COUNT = 4;
const SCHEDULE_SEED = 'camino-bel-amour-2026-weekly';

/** Rangos day_number (31→0) por semana del camino. */
const WEEKLY_DAY_RANGES = [
  { week: 1, from: 31, to: 25 }, // 9–15 jul
  { week: 2, from: 24, to: 18 }, // 16–22 jul
  { week: 3, from: 17, to: 11 }, // 23–29 jul
  { week: 4, from: 10, to: 0 }, // 30 jul–9 ago
];

const GIFT_MESSAGES = [
  'Hoy el cariño te trae una sorpresa. Elige con el corazón… yo ya estoy sonriendo.',
  'Una cartita de amor disfrazada de regalo. ¿Cuál te llama más?',
  'A mitad del camino, y aún hay magia por descubrir. Toca y siente.',
  'Casi tu día… y esta sorpresa es solo tuya. Confía en tu intuición.',
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

function pickDayInRange(from, to, rng) {
  const pool = [];
  for (let d = from; d >= to; d -= 1) {
    pool.push(d);
  }
  const index = Math.floor(rng() * pool.length);
  return pool[index];
}

/** @returns {number[]} day_number values (31…0), length 4, ordenados desc */
export function getScheduledGiftDayNumbers() {
  const rng = mulberry32(hashSeed(SCHEDULE_SEED));
  const days = WEEKLY_DAY_RANGES.map(({ from, to }) => pickDayInRange(from, to, rng));
  return days.sort((a, b) => b - a);
}

/** Índice 1–4 de la sorpresa en el calendario (no la categoría). */
export function getSurpriseOrdinal(dayNumber, giftDayNumbers = getScheduledGiftDayNumbers()) {
  const index = giftDayNumbers.indexOf(dayNumber);
  return index >= 0 ? index + 1 : null;
}

export function getGiftMessage(surpriseOrdinal) {
  if (!surpriseOrdinal || surpriseOrdinal < 1 || surpriseOrdinal > GIFT_MESSAGES.length) {
    return 'Hoy tienes una sorpresa esperándote. Elige con el corazón.';
  }
  return GIFT_MESSAGES[surpriseOrdinal - 1];
}

/** Mensaje del modal: BD primero, plantilla por ordinal como respaldo. */
export function resolveGiftMessage(day) {
  const custom = day?.giftMessage ?? day?.gift_message;
  if (custom && String(custom).trim()) {
    return String(custom).trim();
  }
  const ordinal = getSurpriseOrdinal(day?.dayNumber ?? day?.day_number);
  if (ordinal != null) {
    return getGiftMessage(ordinal);
  }
  return 'Hoy tienes algo especial esperándote.';
}

/** Respaldo de tests / seed vacío: no usar en cliente si BD ya tiene hasGift. */
export function applyGiftScheduleToDay(day, giftDayNumbers = getScheduledGiftDayNumbers()) {
  const ordinal = getSurpriseOrdinal(day.dayNumber, giftDayNumbers);
  if (ordinal == null) {
    return { ...day, hasGift: false, giftNumber: null };
  }
  return {
    ...day,
    hasGift: true,
    giftNumber: day.giftNumber ?? null,
  };
}

export function applyGiftScheduleToDays(days) {
  if ((days || []).some((day) => day.hasGift)) {
    return days;
  }
  const giftDayNumbers = getScheduledGiftDayNumbers();
  return days.map((day) => applyGiftScheduleToDay(day, giftDayNumbers));
}
