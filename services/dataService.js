import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';
import { getSupabase } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/config';
import { resolveStorageUrl } from '../lib/mediaUrl';
import { TOTAL_EVENT_DAYS } from '../lib/calendar';
import { getTodayDateKey } from '../lib/timezone';

/** v4: solo paths en disco; las signed URLs se re-firman al leer. */
const DAYS_CACHE_KEY = 'daysCache_v4';
const LOCAL_FONDO = require('../assets/images/fondo.png');

/** URI de asset local; Image.resolveAssetSource no existe en react-native-web. */
function getLocalAssetUri(source) {
  if (!source) return '';
  if (typeof source === 'string') return source;
  if (typeof source?.uri === 'string') return source.uri;
  if (typeof source?.default === 'string') return source.default;
  if (typeof Image.resolveAssetSource === 'function') {
    try {
      return Image.resolveAssetSource(source)?.uri || '';
    } catch {
      return '';
    }
  }
  return '';
}

const PLACEHOLDER_IMAGE = getLocalAssetUri(LOCAL_FONDO);

function mapDayRow(row) {
  return {
    id: row.id,
    dayNumber: row.day_number ?? row.dayNumber,
    text: row.text ?? '',
    imagePath: row.image_path ?? row.imagePath ?? null,
    audioPath: row.audio_path ?? row.audioPath ?? null,
    hasGift: Boolean(row.has_gift ?? row.hasGift),
    giftNumber: row.gift_number ?? row.giftNumber ?? null,
    giftMessage: row.gift_message ?? row.giftMessage ?? null,
    photoPaths: row.photo_paths ?? row.photoPaths ?? [],
    backgroundPath: row.background_path ?? row.backgroundPath ?? null,
  };
}

function mapAdminDayRow(row) {
  return mapDayRow(row);
}

/** Quita URLs firmadas antes de persistir (expiran ~1h). */
function stripSignedMedia(day) {
  const {
    imageUrl: _iu,
    audioUrl: _au,
    backgroundUrl: _bu,
    photos: _ph,
    enriched: _en,
    ...rest
  } = day;
  return rest;
}

async function getDayPhotos(day) {
  const photos = [];
  const seen = new Set();

  const addPhoto = (url) => {
    if (url && !seen.has(url)) {
      seen.add(url);
      photos.push(url);
    }
  };

  if (day.imagePath) {
    addPhoto(await resolveStorageUrl(day.imagePath));
  }

  if (Array.isArray(day.photoPaths) && day.photoPaths.length) {
    const extraUrls = await Promise.all(day.photoPaths.map((path) => resolveStorageUrl(path)));
    extraUrls.forEach(addPhoto);
  }

  if (!photos.length && PLACEHOLDER_IMAGE) {
    photos.push(PLACEHOLDER_IMAGE);
  }

  return photos;
}

async function lightEnrichDay(day) {
  const imageUrl = day.imagePath
    ? (await resolveStorageUrl(day.imagePath)) ?? PLACEHOLDER_IMAGE
    : PLACEHOLDER_IMAGE;
  const backgroundUrl = day.backgroundPath ? await resolveStorageUrl(day.backgroundPath) : null;

  return {
    ...day,
    imageUrl,
    backgroundUrl,
    audioUrl: null,
    photos: imageUrl ? [imageUrl] : [],
    enriched: false,
  };
}

async function enrichDay(day) {
  const imageUrl = (await resolveStorageUrl(day.imagePath)) ?? PLACEHOLDER_IMAGE;
  const audioUrl = day.audioPath ? await resolveStorageUrl(day.audioPath) : null;
  const backgroundUrl = day.backgroundPath ? await resolveStorageUrl(day.backgroundPath) : null;
  const photos = await getDayPhotos(day);

  return {
    ...day,
    imageUrl,
    backgroundUrl,
    audioUrl,
    photos,
    enriched: true,
  };
}

export class DataService {
  static async getUnlockedDays() {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('get_unlocked_days', {
      as_of: getTodayDateKey(),
    });

    if (error) {
      // No fallback a select *: expondría días futuros si RLS no está aplicado.
      throw error;
    }

    return (data ?? []).map(mapDayRow);
  }

  static mapAdminDays(rows) {
    return (rows ?? []).map(mapAdminDayRow);
  }

  static async loadDaysWithCache({ adminDays = null } = {}) {
    try {
      const rawDays = adminDays ?? (await this.getUnlockedDays());
      const days = await Promise.all(rawDays.map((day) => lightEnrichDay(day)));
      await AsyncStorage.setItem(
        DAYS_CACHE_KEY,
        JSON.stringify(days.map(stripSignedMedia))
      ).catch(() => {});
      return { days, fromCache: false };
    } catch (error) {
      const cached = await this.getCachedDays();
      if (cached) {
        return { days: cached, fromCache: true };
      }
      throw error;
    }
  }

  static async getCachedDays() {
    try {
      const raw = await AsyncStorage.getItem(DAYS_CACHE_KEY);
      if (!raw) return null;
      const days = JSON.parse(raw);
      if (!Array.isArray(days) || days.length === 0) {
        return null;
      }
      // Re-firmar paths al leer (URLs viejas no se guardan).
      return Promise.all(days.map((day) => lightEnrichDay(stripSignedMedia(day))));
    } catch {
      return null;
    }
  }

  static async getAllDaysLight({ adminDays = null } = {}) {
    if (!isSupabaseConfigured() && !adminDays) {
      throw new Error('Supabase no está configurado');
    }

    const days = adminDays ?? (await this.getUnlockedDays());
    if (!days.length) {
      throw new Error('No hay días configurados en Supabase');
    }

    return Promise.all(days.map((day) => lightEnrichDay(day)));
  }

  static async enrichDayFull(day) {
    if (day?.enriched) {
      return day;
    }
    return enrichDay(day);
  }

  static async getAllDaysWithUrls({ adminDays = null } = {}) {
    if (!isSupabaseConfigured() && !adminDays) {
      throw new Error('Supabase no está configurado');
    }

    const days = adminDays ?? (await this.getUnlockedDays());
    if (!days.length) {
      throw new Error('No hay días configurados en Supabase');
    }

    return Promise.all(days.map((day) => enrichDay(day)));
  }

  static async getFallbackData() {
    if (typeof __DEV__ !== 'undefined' && !__DEV__) {
      throw new Error('Datos de demostración no disponibles en producción');
    }

    const img = PLACEHOLDER_IMAGE;
    return [
      {
        dayNumber: 31,
        text: '¡Comienza la cuenta regresiva hacia tu cumpleaños! Cada día será una nueva sorpresa.',
        imageUrl: img,
        audioUrl: null,
        photos: img ? [img] : [],
        enriched: true,
      },
      {
        dayNumber: 30,
        text: 'Hoy es el primer día de nuestro camino hacia tu cumpleaños.',
        imageUrl: img,
        audioUrl: null,
        photos: img ? [img] : [],
        enriched: true,
      },
      {
        dayNumber: 29,
        text: 'El segundo día nos trae nuevas emociones y recuerdos que compartir.',
        imageUrl: img,
        audioUrl: null,
        photos: img ? [img] : [],
        enriched: true,
      },
    ];
  }
}

export { TOTAL_EVENT_DAYS };
