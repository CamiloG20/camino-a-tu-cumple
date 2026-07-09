import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/config';
import { resolveStorageUrl } from '../lib/mediaUrl';
import { TOTAL_EVENT_DAYS } from '../lib/calendar';
import { getTodayDateKey } from '../lib/timezone';

const DAYS_CACHE_KEY = 'daysCache_v2';

const PLACEHOLDER_IMAGE =
  'https://via.placeholder.com/400x400/cccccc/ffffff?text=Imagen+no+disponible';

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
  };
}

function mapAdminDayRow(row) {
  return mapDayRow(row);
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

  if (!photos.length) {
    photos.push(PLACEHOLDER_IMAGE);
  }

  return photos;
}

async function lightEnrichDay(day) {
  const imageUrl = day.imagePath
    ? (await resolveStorageUrl(day.imagePath)) ?? PLACEHOLDER_IMAGE
    : PLACEHOLDER_IMAGE;

  return {
    ...day,
    imageUrl,
    audioUrl: null,
    photos: [imageUrl],
    enriched: false,
  };
}

async function enrichDay(day) {
  const imageUrl = (await resolveStorageUrl(day.imagePath)) ?? PLACEHOLDER_IMAGE;
  const audioUrl = day.audioPath ? await resolveStorageUrl(day.audioPath) : null;
  const photos = await getDayPhotos(day);

  return {
    ...day,
    imageUrl,
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
      if (error.code === 'PGRST202' || /get_unlocked_days/i.test(error.message || '')) {
        const fallback = await supabase
          .from('days')
          .select('*')
          .order('day_number', { ascending: false });
        if (fallback.error) throw fallback.error;
        return (fallback.data ?? []).map(mapDayRow);
      }
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
      await AsyncStorage.setItem(DAYS_CACHE_KEY, JSON.stringify(days)).catch(() => {});
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
      return days;
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

    return [
      {
        dayNumber: 31,
        text: '¡Comienza la cuenta regresiva hacia tu cumpleaños! Cada día será una nueva sorpresa.',
        imageUrl: 'https://via.placeholder.com/400x400/ff6b6b/ffffff?text=D%C3%ADa+31',
        audioUrl: null,
        photos: ['https://via.placeholder.com/400x400/ff6b6b/ffffff?text=D%C3%ADa+31'],
        enriched: true,
      },
      {
        dayNumber: 30,
        text: 'Hoy es el primer día de nuestro camino hacia tu cumpleaños.',
        imageUrl: 'https://via.placeholder.com/400x400/6a11cb/ffffff?text=D%C3%ADa+30',
        audioUrl: null,
        photos: ['https://via.placeholder.com/400x400/6a11cb/ffffff?text=D%C3%ADa+30'],
        enriched: true,
      },
      {
        dayNumber: 29,
        text: 'El segundo día nos trae nuevas emociones y recuerdos que compartir.',
        imageUrl: 'https://via.placeholder.com/400x400/2575fc/ffffff?text=D%C3%ADa+29',
        audioUrl: null,
        photos: ['https://via.placeholder.com/400x400/2575fc/ffffff?text=D%C3%ADa+29'],
        enriched: true,
      },
    ];
  }
}

export { TOTAL_EVENT_DAYS };
