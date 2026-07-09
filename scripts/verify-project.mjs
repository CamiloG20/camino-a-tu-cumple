/**
 * Auditoría completa: tabla days, imágenes, audios, fotos extra y regalos.
 * Uso: node scripts/verify-project.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) throw new Error('No existe .env');
  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

function encodeStoragePath(path) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function publicUrl(baseUrl, bucket, path) {
  const clean = path.replace(/^\/+/, '');
  return `${baseUrl}/storage/v1/object/public/${bucket}/${encodeStoragePath(clean)}`;
}

async function signedUrl(supabase, bucket, path) {
  const clean = path.replace(/^\/+/, '');
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(clean, 300);
  if (error) throw error;
  return data.signedUrl;
}

async function mediaHeadOk(supabase, bucket, baseUrl, path) {
  if (!path || path.startsWith('http')) {
    return headOk(path);
  }

  try {
    const url = await signedUrl(supabase, bucket, path);
    return headOk(url);
  } catch {
    return headOk(publicUrl(baseUrl, bucket, path));
  }
}

async function headOk(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function listAllFiles(supabase, bucket, prefix = '') {
  const files = [];
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error) return files;

  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id) files.push(path);
    else files.push(...(await listAllFiles(supabase, bucket, path)));
  }
  return files;
}

async function main() {
  const env = loadEnv();
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'media';

  if (!url || !key) throw new Error('Faltan credenciales Supabase en .env');

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('\n🔍 Auditoría del proyecto\n');
  console.log(`Proyecto: ${url}\n`);

  const { data: days, error: daysError } = await supabase
    .from('days')
    .select('*')
    .order('day_number', { ascending: false });

  if (daysError) {
    console.log('❌ Tabla days:', daysError.message);
    console.log('   → Ejecuta supabase/schema.sql en SQL Editor y npm run migrate:supabase\n');
    process.exit(1);
  }

  console.log(`✓ Tabla days: ${days.length} filas`);

  const gifts = days.filter((d) => d.has_gift);
  console.log(`✓ Regalos: ${gifts.length}/12 esperados`);

  const storageFiles = await listAllFiles(supabase, bucket);
  const imagesInStorage = storageFiles.filter((f) => f.startsWith('images/'));
  const soundsInStorage = storageFiles.filter((f) => f.startsWith('sounds/'));
  const photosInStorage = storageFiles.filter((f) => f.startsWith('photos/'));

  console.log(`✓ Storage: ${imagesInStorage.length} imágenes, ${soundsInStorage.length} audios, ${photosInStorage.length} fotos extra\n`);

  const issues = [];
  const expectedDays = 32;

  if (days.length < expectedDays) {
    issues.push(`Faltan días en DB: ${days.length}/${expectedDays}`);
  }

  const missingImages = [];
  const missingAudios = [];
  const brokenImages = [];
  const brokenAudios = [];
  const brokenPhotos = [];

  for (const day of days) {
    const n = day.day_number;

    if (!day.image_path) {
      missingImages.push(n);
    } else if (!day.image_path.startsWith('http')) {
      if (!(await mediaHeadOk(supabase, bucket, url, day.image_path))) {
        brokenImages.push({ day: n, path: day.image_path });
      }
    }

    if (!day.audio_path) {
      if (n !== 0) missingAudios.push(n);
    } else if (!day.audio_path.startsWith('http')) {
      if (!(await mediaHeadOk(supabase, bucket, url, day.audio_path))) {
        brokenAudios.push({ day: n, path: day.audio_path });
      }
    }

    for (const p of day.photo_paths ?? []) {
      if (!p || p.startsWith('http')) continue;
      if (!(await mediaHeadOk(supabase, bucket, url, p))) {
        brokenPhotos.push({ day: n, path: p });
      }
    }
  }

  for (let i = 0; i <= 31; i++) {
    const expected = `images/${i}.png`;
    const alt = `images/${i}.jpg`;
    if (!imagesInStorage.some((f) => f === expected || f === alt || f.startsWith(`images/${i}.`))) {
      const inDb = days.some((d) => d.day_number === i && d.image_path);
      if (!inDb) issues.push(`Sin imagen en storage para día ${i}`);
    }
  }

  if (missingImages.length) issues.push(`Días sin image_path en DB: ${missingImages.join(', ')}`);
  if (missingAudios.length) issues.push(`Días sin audio_path en DB: ${missingAudios.join(', ')}`);
  if (brokenImages.length) issues.push(`Imágenes rotas: ${brokenImages.map((x) => x.day).join(', ')}`);
  if (brokenAudios.length) issues.push(`Audios rotos: ${brokenAudios.map((x) => x.day).join(', ')}`);
  if (brokenPhotos.length) issues.push(`Fotos extra rotas: ${brokenPhotos.length}`);

  if (gifts.length !== 12) issues.push(`Regalos en DB: ${gifts.length} (esperados 12)`);

  console.log('--- Resultado ---\n');

  if (!issues.length) {
    console.log('✅ Todo OK: días, imágenes, audios y regalos verificados.\n');
    return;
  }

  console.log(`⚠️  ${issues.length} problema(s):\n`);
  issues.forEach((i) => console.log(`  • ${i}`));
  console.log('');
  process.exit(1);
}

main().catch((err) => {
  console.error('❌', err.message || err);
  process.exit(1);
});
