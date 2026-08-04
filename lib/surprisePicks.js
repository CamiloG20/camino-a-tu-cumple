import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScheduledGiftDayNumbers, getSurpriseOrdinal } from './giftSchedule';
import { getDaysUntilBirthday } from './calendar';
import { getSurpriseCategoryByName } from './surpriseCategories';

/** v2: picks por nombre de categoría (única referencia). Ignora elecciones de prueba en v1. */
export const SURPRISE_PICKS_KEY = 'surprisePicks_v2';

/** @returns {Promise<Record<string, string>>} dayNumber → categoryName */
export async function loadSurprisePicks() {
  try {
    const raw = await AsyncStorage.getItem(SURPRISE_PICKS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const cleaned = {};
    for (const [day, value] of Object.entries(parsed)) {
      const cat = getSurpriseCategoryByName(value);
      if (cat) cleaned[String(day)] = cat.name;
    }
    return cleaned;
  } catch {
    return {};
  }
}

export async function saveSurprisePicks(picks) {
  await AsyncStorage.setItem(SURPRISE_PICKS_KEY, JSON.stringify(picks));
}

export async function clearSurprisePicks() {
  await AsyncStorage.removeItem(SURPRISE_PICKS_KEY);
}

export async function setSurprisePick(dayNumber, categoryName) {
  const cat = getSurpriseCategoryByName(categoryName);
  if (!cat) {
    throw new Error('Categoría no válida');
  }

  const picks = await loadSurprisePicks();
  const used = new Set(Object.values(picks).map((n) => String(n).toLowerCase()));
  const nameKey = cat.name.toLowerCase();
  if (used.has(nameKey) && String(picks[String(dayNumber)] || '').toLowerCase() !== nameKey) {
    throw new Error(`“${cat.name}” ya fue elegida en otra sorpresa`);
  }

  const next = { ...picks, [String(dayNumber)]: cat.name };
  await saveSurprisePicks(next);
  return next;
}

/** Nombres de categorías ya elegidas (únicos). */
export function getUsedCategoryNames(picks) {
  return new Set(
    Object.values(picks || {})
      .map((n) => getSurpriseCategoryByName(n)?.name)
      .filter(Boolean)
  );
}

/**
 * Sorpresas ya desbloqueadas (día pasado o hoy) sin categoría elegida.
 * Orden: la más antigua primero (day_number más alto).
 * Si `days` trae hasGift, usa BD; si no, cae al schedule seed.
 */
export function getPendingSurpriseDayNumbers(picks, days = null, date = new Date()) {
  const todayNumber = getDaysUntilBirthday(date);
  const giftDays =
    Array.isArray(days) && days.length
      ? days
          .filter((d) => d?.hasGift || d?.has_gift)
          .map((d) => Number(d.dayNumber ?? d.day_number))
          .filter((n) => Number.isInteger(n))
      : getScheduledGiftDayNumbers();

  return [...new Set(giftDays)]
    .filter((dayNumber) => dayNumber >= todayNumber && picks[String(dayNumber)] == null)
    .sort((a, b) => b - a);
}

export function getSurpriseProgress(picks, dayNumber) {
  const ordinal = getSurpriseOrdinal(dayNumber);
  const categoryName = picks[String(dayNumber)] ?? null;
  return { ordinal, categoryName };
}
