/**
 * Quita la foto extra rota del día 1 en Party-Bel_Amour.
 */
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

const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const broken = 'photos/day1/Diseño sin título.png';

const { data: day } = await supabase.from('days').select('photo_paths').eq('day_number', 1).single();
if (!day) {
  console.log('Día 1 no encontrado');
  process.exit(0);
}

const cleaned = (day.photo_paths ?? []).filter((p) => p !== broken && !p.includes('Diseño sin t'));
if (cleaned.length === (day.photo_paths ?? []).length) {
  console.log('✓ Día 1 sin fotos rotas (ya limpio)');
  process.exit(0);
}

const { error } = await supabase.from('days').update({ photo_paths: cleaned }).eq('day_number', 1);
if (error) throw error;
console.log(`✓ Día 1: eliminada foto rota (${(day.photo_paths?.length ?? 0) - cleaned.length} archivo)`);
