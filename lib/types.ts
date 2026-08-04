/**
 * Tipos compartidos (gradual). Importar solo en archivos TypeScript o con JSDoc.
 */

export type DayNumber = number;

export type DayRecord = {
  id?: string;
  dayNumber: number;
  text?: string;
  imagePath?: string | null;
  audioPath?: string | null;
  backgroundPath?: string | null;
  photoPaths?: string[];
  hasGift?: boolean;
  giftNumber?: number | null;
  giftMessage?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
  backgroundUrl?: string | null;
  photos?: string[];
  enriched?: boolean;
};

export type SurprisePicks = Record<string, string>;

export type AppConfigPublic = {
  notificationHour: number;
  timezone: string;
  backgroundPath: string | null;
  backgroundUrl: string | null;
};
