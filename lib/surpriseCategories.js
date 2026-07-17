/** 12 categorías elegibles; el nombre es el único referente (sin números). */

export const SURPRISE_CATEGORIES = [
  { key: 'zapatos', name: 'Zapatos', emoji: '👠' },
  { key: 'camiseta', name: 'Camiseta', emoji: '👕' },
  { key: 'saco-o-buzo', name: 'Saco o buzo', emoji: '🧥' },
  { key: 'pantalon', name: 'Pantalón', emoji: '👖' },
  { key: 'collar', name: 'Collar', emoji: '💎' },
  { key: 'anillo', name: 'Anillo', emoji: '💍' },
  { key: 'pulsera', name: 'Pulsera', emoji: '📿' },
  { key: 'tatuaje', name: 'Tatuaje', emoji: '🦋' },
  { key: 'salida-pagada', name: 'Salida pagada', emoji: '🥂' },
  { key: 'restaurante', name: 'Restaurante', emoji: '🍝' },
  { key: 'pestanas', name: 'Pestañas', emoji: '💄' },
  { key: 'tratamiento-piel', name: 'Tratamiento de piel', emoji: '🧖' },
];

export const SURPRISE_CATEGORY_COUNT = SURPRISE_CATEGORIES.length;

export function getSurpriseCategoryByName(name) {
  if (!name) return null;
  const normalized = String(name).trim().toLowerCase();
  return (
    SURPRISE_CATEGORIES.find((c) => c.name.toLowerCase() === normalized) ||
    SURPRISE_CATEGORIES.find((c) => c.key === normalized) ||
    null
  );
}

export function getSurpriseCategoryByKey(key) {
  return SURPRISE_CATEGORIES.find((c) => c.key === key) || null;
}

/** @deprecated prefer getSurpriseCategoryByName */
export function getSurpriseCategory(idOrName) {
  if (typeof idOrName === 'string' && Number.isNaN(Number(idOrName))) {
    return getSurpriseCategoryByName(idOrName);
  }
  // Compat con picks viejos numéricos (ya no se usan)
  const index = Number(idOrName) - 1;
  return SURPRISE_CATEGORIES[index] || getSurpriseCategoryByName(idOrName);
}

export function getSurpriseCategoryName(nameOrKey) {
  return getSurpriseCategoryByName(nameOrKey)?.name || getSurpriseCategory(nameOrKey)?.name || String(nameOrKey || '');
}
