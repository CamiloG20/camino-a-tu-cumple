import { DEFAULT_HOUR } from './dailyNotifications';
import { getAdminApiUrl } from './config';

const CACHE_KEY = 'appConfigCache_v2';
const CACHE_TTL_MS = 5 * 60 * 1000;

let memoryCache = null;

function readCache() {
  if (memoryCache && Date.now() - memoryCache.at < CACHE_TTL_MS) {
    return memoryCache.data;
  }

  if (typeof localStorage === 'undefined') return null;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.at || Date.now() - parsed.at > CACHE_TTL_MS) return null;
    memoryCache = parsed;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  const entry = { at: Date.now(), data };
  memoryCache = entry;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  }
}

export function clearAppConfigCache() {
  memoryCache = null;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem('appConfigCache_v1');
  }
}

export async function fetchAppConfig({ force = false } = {}) {
  if (!force) {
    const cached = readCache();
    if (cached) return cached;
  }

  const fallback = {
    notificationHour: DEFAULT_HOUR,
    timezone: 'America/Guayaquil',
    backgroundPath: null,
    backgroundUrl: null,
  };

  if (typeof fetch === 'undefined') return fallback;

  try {
    const response = await fetch(`${getAdminApiUrl()}/api/app-config`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'No se pudo cargar la configuración');

    const config = {
      notificationHour: Number(data.notificationHour) || DEFAULT_HOUR,
      timezone: data.timezone || fallback.timezone,
      backgroundPath: data.backgroundPath || null,
      backgroundUrl: data.backgroundUrl || null,
    };
    writeCache(config);
    return config;
  } catch {
    return readCache()?.data || fallback;
  }
}
