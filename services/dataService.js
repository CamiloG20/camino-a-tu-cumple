import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '../lib/supabase';
import { isSupabaseConfigured, STORAGE_BUCKET } from '../lib/config';
import { TOTAL_EVENT_DAYS } from '../lib/calendar';

const DAYS_CACHE_KEY = 'daysCache_v1';

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

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function getStoragePublicUrl(path) {
  const supabase = getSupabase();
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function resolveMediaUrl(path) {
  if (!path || typeof path !== 'string') {
    return null;
  }

  if (isHttpUrl(path)) {
    return path;
  }

  return getStoragePublicUrl(path.replace(/^\/+/, ''));
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
    addPhoto(await resolveMediaUrl(day.imagePath));
  }

  if (Array.isArray(day.photoPaths) && day.photoPaths.length) {
    const extraUrls = await Promise.all(day.photoPaths.map((path) => resolveMediaUrl(path)));
    extraUrls.forEach(addPhoto);
  }

  if (!photos.length) {
    photos.push(PLACEHOLDER_IMAGE);
  }

  return photos;
}

function lightEnrichDay(day) {
  const imageUrl = day.imagePath ? getStoragePublicUrl(day.imagePath) : PLACEHOLDER_IMAGE;
  return {
    ...day,
    imageUrl,
    audioUrl: null,
    photos: [imageUrl],
    enriched: false,
  };
}

async function enrichDay(day) {
  const imageUrl = (await resolveMediaUrl(day.imagePath)) ?? PLACEHOLDER_IMAGE;
  const audioUrl = day.audioPath ? await resolveMediaUrl(day.audioPath) : null;
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
  static async getDays() {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('days')
      .select('*')
      .order('day_number', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapDayRow);
  }

  /** Carga rápida: solo metadatos + URL de imagen principal (sin listar Storage ni audio) */
  /** Carga ligera con caché offline de los 32 días. */
  static async loadDaysWithCache() {
    try {
      const days = await this.getAllDaysLight();
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
      if (!Array.isArray(days) || days.length < TOTAL_EVENT_DAYS) {
        return null;
      }
      return days;
    } catch {
      return null;
    }
  }

  static async getAllDaysLight() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase no está configurado');
    }

    const days = await this.getDays();
    if (!days.length) {
      throw new Error('No hay días configurados en Supabase');
    }

    return days.map(lightEnrichDay);
  }

  /** Carga completa de un día (audio, fotos extra, carrusel) */
  static async enrichDayFull(day) {
    if (day?.enriched) {
      return day;
    }
    return enrichDay(day);
  }

  static async getAllDaysWithUrls() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase no está configurado');
    }

    const days = await this.getDays();

    if (!days.length) {
      throw new Error('No hay días configurados en Supabase');
    }

    return Promise.all(days.map((day) => enrichDay(day)));
  }

  static async getFallbackData() {
    return [
      {
        dayNumber: 31,
        text: '¡Comienza la cuenta regresiva hacia tu cumpleaños! Cada día será una nueva sorpresa.',
        imageUrl: 'https://via.placeholder.com/400x400/ff6b6b/ffffff?text=D%C3%ADa+31',
        audioUrl: null,
        photos: [
          'https://via.placeholder.com/400x400/ff6b6b/ffffff?text=D%C3%ADa+31',
        ],
        enriched: true,
      },
      {
        dayNumber: 30,
        text: 'Hoy es el primer día de nuestro camino hacia tu cumpleaños.',
        imageUrl: 'https://via.placeholder.com/400x400/6a11cb/ffffff?text=D%C3%ADa+30',
        audioUrl: null,
        photos: [
          'https://via.placeholder.com/400x400/6a11cb/ffffff?text=D%C3%ADa+30',
        ],
        enriched: true,
      },
      {
        dayNumber: 29,
        text: 'El segundo día nos trae nuevas emociones y recuerdos que compartir.',
        imageUrl: 'https://via.placeholder.com/400x400/2575fc/ffffff?text=D%C3%ADa+29',
        audioUrl: null,
        photos: [
          'https://via.placeholder.com/400x400/2575fc/ffffff?text=D%C3%ADa+29',
        ],
        enriched: true,
      },
    ];
  }
}
