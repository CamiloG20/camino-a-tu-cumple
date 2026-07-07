import { readFileSync } from 'fs';
import { resolve, dirname, extname, basename } from 'path';
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

const dayNumber = Number(process.argv[2]);
const filePath = process.argv[3];

if (Number.isNaN(dayNumber) || dayNumber < 0 || !filePath) {
  console.error('Uso: node scripts/upload-day-image.mjs <día> <ruta-imagen>');
  process.exit(1);
}

const ext = extname(filePath).slice(1) || 'png';
const storagePath = `images/${dayNumber}.${ext}`;
const buffer = readFileSync(resolve(filePath));
const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';

const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const bucket = env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'media';

const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
  upsert: true,
  contentType: mime,
});
if (uploadError) {
  console.error('Upload error:', uploadError.message);
  process.exit(1);
}

const { data: existing } = await supabase
  .from('days')
  .select('*')
  .eq('day_number', dayNumber)
  .maybeSingle();

const patch = {
  day_number: dayNumber,
  text: existing?.text ?? '',
  has_gift: existing?.has_gift ?? false,
  gift_number: existing?.gift_number ?? null,
  photo_paths: existing?.photo_paths ?? [],
  image_path: storagePath,
  audio_path: existing?.audio_path ?? null,
};

const { error: dbError } = await supabase.from('days').upsert(patch, { onConflict: 'day_number' });
if (dbError) {
  console.error('DB error:', dbError.message);
  process.exit(1);
}

const publicUrl = `${env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`;
console.log(`Día ${dayNumber} actualizado → ${storagePath}`);
console.log(publicUrl);
