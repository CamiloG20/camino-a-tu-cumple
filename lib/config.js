const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
const STORAGE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || 'media';

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabaseConfig() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY. Copia .env.example a .env y completa tus credenciales.'
    );
  }

  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    storageBucket: STORAGE_BUCKET,
  };
}

function isLocalOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

export function getAdminApiUrl() {
  const envUrl = process.env.EXPO_PUBLIC_ADMIN_API_URL?.trim();

  if (typeof window !== 'undefined' && window.location?.origin) {
    const { origin } = window.location;
    // En producción (Vercel, etc.) la API vive en el mismo dominio (/api/*).
    // Ignora localhost embebido en el build aunque venga del .env local.
    if (!isLocalOrigin(origin)) {
      return origin;
    }
    if (envUrl) return envUrl;
    return 'http://localhost:8787';
  }

  if (envUrl) return envUrl;
  return 'http://localhost:8787';
}

export function isLocalAdminApi() {
  const url = getAdminApiUrl();
  return isLocalOrigin(url);
}

export { STORAGE_BUCKET };
