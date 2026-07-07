import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import {
  getScheduledGiftDayNumbers,
  getGiftNumberForDay,
} from '../lib/giftSchedule.js';

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

const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const giftDays = getScheduledGiftDayNumbers();

console.log('Días de regalo (12):', giftDays.join(', '));
console.log('');

const { data: rows, error } = await supabase.from('days').select('*').order('day_number', { ascending: false });
if (error) {
  console.error(error.message);
  process.exit(1);
}

for (const row of rows) {
  const giftNumber = getGiftNumberForDay(row.day_number, giftDays);
  const hasGift = giftNumber != null;

  const patch = {
    day_number: row.day_number,
    text: row.text ?? '',
    has_gift: hasGift,
    gift_number: hasGift ? giftNumber : null,
    image_path: row.image_path ?? null,
    audio_path: row.audio_path ?? null,
    photo_paths: row.photo_paths ?? [],
  };

  const { error: upsertError } = await supabase.from('days').upsert(patch, { onConflict: 'day_number' });
  if (upsertError) {
    console.error(`Día ${row.day_number}:`, upsertError.message);
    process.exit(1);
  }

  if (hasGift) {
    console.log(`✓ Día ${row.day_number} → regalo #${giftNumber}`);
  }
}

console.log('\nListo: 12 días con regalo asignados en Supabase.');
