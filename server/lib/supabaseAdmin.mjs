import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './env.mjs';

let client;

export function getAdminSupabase() {
  if (!client) {
    const env = loadEnv();
    const url = env.EXPO_PUBLIC_SUPABASE_URL;
    const key = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
    }

    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return client;
}

export function getStorageBucket() {
  return loadEnv().EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'media';
}
