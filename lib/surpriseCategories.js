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

export function getSurpriseCategoryByName(name) {
  if (!name) return null;
  const normalized = String(name).trim().toLowerCase();
  return (
    SURPRISE_CATEGORIES.find((c) => c.name.toLowerCase() === normalized) ||
    SURPRISE_CATEGORIES.find((c) => c.key === normalized) ||
    null
  );
}

export function getSurpriseCategoryName(nameOrKey) {
  return getSurpriseCategoryByName(nameOrKey)?.name || String(nameOrKey || '');
}
