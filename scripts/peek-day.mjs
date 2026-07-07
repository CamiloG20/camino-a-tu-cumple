import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(resolve(root, '.env'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
const bucket = env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'media';
const base = env.EXPO_PUBLIC_SUPABASE_URL;

const { data } = await supabase.from('days').select('*').eq('day_number', 31).single();
if (data) {
  const img = data.image_path ? `${base}/storage/v1/object/public/${bucket}/${data.image_path}` : null;
  console.log(JSON.stringify({ ...data, image_url: img }, null, 2));
}
