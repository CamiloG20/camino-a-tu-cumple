import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScheduledGiftDayNumbers, getSurpriseOrdinal } from './giftSchedule';
import { getDaysUntilBirthday } from './calendar';

export const SURPRISE_PICKS_KEY = 'surprisePicks_v1';

/** @returns {Promise<Record<string, number>>} dayNumber → categoryId */
export async function loadSurprisePicks() {
  try {
    const raw = await AsyncStorage.getItem(SURPRISE_PICKS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

export async function saveSurprisePicks(picks) {
  await AsyncStorage.setItem(SURPRISE_PICKS_KEY, JSON.stringify(picks));
}

export async function setSurprisePick(dayNumber, categoryId) {
  const picks = await loadSurprisePicks();
  const used = new Set(Object.values(picks).map(Number));
  if (used.has(Number(categoryId)) && picks[String(dayNumber)] !== Number(categoryId)) {
    throw new Error('Esa categoría ya fue elegida en otra sorpresa');
  }
  const next = { ...picks, [String(dayNumber)]: Number(categoryId) };
  await saveSurprisePicks(next);
  return next;
}

export function getUsedCategoryIds(picks) {
  return new Set(Object.values(picks || {}).map(Number));
}

/**
 * Sorpresas ya desbloqueadas (día pasado o hoy) sin categoría elegida.
 * Orden: la más antigua primero (day_number más alto).
 */
export function getPendingSurpriseDayNumbers(picks, date = new Date()) {
  const todayNumber = getDaysUntilBirthday(date);
  const giftDays = getScheduledGiftDayNumbers();
  return giftDays
    .filter((dayNumber) => dayNumber >= todayNumber && picks[String(dayNumber)] == null)
    .sort((a, b) => b - a);
}

export function getSurpriseProgress(picks, dayNumber) {
  const ordinal = getSurpriseOrdinal(dayNumber);
  const categoryId = picks[String(dayNumber)] ?? null;
  return { ordinal, categoryId };
}
