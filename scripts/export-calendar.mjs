import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const BIRTHDAY_MONTH = 7;
const BIRTHDAY_DAY = 9;

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

function publicUrl(path) {
  if (!path) return null;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

function getCalendarDate(daysUntil, year = 2026) {
  const birthday = new Date(year, BIRTHDAY_MONTH, BIRTHDAY_DAY);
  const d = new Date(birthday);
  d.setDate(d.getDate() - daysUntil);
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}

const { data, error } = await supabase.from('days').select('*').order('day_number', { ascending: false });
if (error) throw error;

const schedule = data.map((row) => {
  const daysUntil = row.day_number;
  return {
    fecha: getCalendarDate(daysUntil),
    day_number: row.day_number,
    text: (row.text || '').slice(0, 80),
    image_url: publicUrl(row.image_path),
    image_path: row.image_path,
    audio_path: row.audio_path,
    has_gift: row.has_gift,
    gift_number: row.gift_number,
    extra_photos: (row.photo_paths || []).map(publicUrl),
  };
});

console.log(JSON.stringify(schedule, null, 2));
