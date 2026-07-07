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

export function getAdminApiUrl() {
  const envUrl = process.env.EXPO_PUBLIC_ADMIN_API_URL?.trim();
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:8787';
}

export { STORAGE_BUCKET };
