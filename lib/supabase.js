import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './config';

let client;

export function getSupabase() {
  if (!client) {
    const { url, anonKey } = getSupabaseConfig();
    client = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return client;
}
