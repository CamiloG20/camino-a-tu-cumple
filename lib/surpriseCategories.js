/** 12 categorías elegibles en el juego de sorpresas (números únicos). */

export const SURPRISE_CATEGORIES = [
  { id: 1, name: 'Zapatos', icon: 'sneakers' },
  { id: 2, name: 'Camiseta', icon: 'checkroom' },
  { id: 3, name: 'Saco o buzo', icon: 'dry-cleaning' },
  { id: 4, name: 'Pantalón', icon: 'styler' },
  { id: 5, name: 'Collar', icon: 'diamond' },
  { id: 6, name: 'Anillo', icon: 'brightness-1' },
  { id: 7, name: 'Pulsera', icon: 'watch' },
  { id: 8, name: 'Tatuaje', icon: 'brush' },
  { id: 9, name: 'Salida pagada', icon: 'local-activity' },
  { id: 10, name: 'Restaurante', icon: 'restaurant' },
  { id: 11, name: 'Pestañas', icon: 'visibility' },
  { id: 12, name: 'Tratamiento de piel', icon: 'spa' },
];

export const SURPRISE_CATEGORY_COUNT = SURPRISE_CATEGORIES.length;

export function getSurpriseCategory(id) {
  return SURPRISE_CATEGORIES.find((c) => c.id === Number(id)) || null;
}

export function getSurpriseCategoryName(id) {
  return getSurpriseCategory(id)?.name || `Categoría #${id}`;
}
