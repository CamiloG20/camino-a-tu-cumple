/**
 * Migración completa Firebase → Supabase
 * Uso: node scripts/migrate-firebase-to-supabase.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL, listAll } from 'firebase/storage';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) {
    throw new Error('No existe .env');
  }

  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function guessContentType(filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  return 'application/octet-stream';
}

async function downloadFirebaseFile(storage, path) {
  const fileRef = ref(storage, path);
  const url = await getDownloadURL(fileRef);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar ${path}: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    buffer,
    contentType: response.headers.get('content-type') || guessContentType(path),
  };
}

function sanitizeStorageKey(path) {
  return path
    .split('/')
    .map((part) =>
      part
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.\-_ ]/g, '_')
        .replace(/\s+/g, ' ')
        .replace(/_+/g, '_')
        .trim()
    )
    .join('/');
}

async function uploadToSupabase(supabase, bucket, destPath, buffer, contentType) {
  const safePath = sanitizeStorageKey(destPath);
  const { error } = await supabase.storage.from(bucket).upload(safePath, buffer, {
    upsert: true,
    contentType,
  });
  if (error) throw error;
  return safePath;
}

async function ensureBucket(supabase, bucket) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const exists = buckets?.some((b) => b.name === bucket);
  if (exists) {
    console.log(`✓ Bucket "${bucket}" ya existe`);
    return;
  }

  const { error } = await supabase.storage.createBucket(bucket, { public: true });
  if (error) throw error;
  console.log(`✓ Bucket "${bucket}" creado`);
}

async function ensureDaysTable(supabase, env) {
  const { error } = await supabase.from('days').select('day_number').limit(1);
  if (!error) {
    console.log('✓ Tabla "days" accesible');
    return;
  }

  const pgUrl = env.POSTGRES_URL_NON_POOLING;
  if (!pgUrl) {
    throw new Error(
      'La tabla "days" no existe. Agrega POSTGRES_URL_NON_POOLING en .env o ejecuta supabase/schema.sql manualmente.'
    );
  }

  console.log('· Creando tabla "days" vía PostgreSQL...');
  const { default: pg } = await import('pg');
  const client = new pg.Client({
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 5432,
    user: `postgres.${env.POSTGRES_PROJECT_REF || 'lrwzuosmgzqglsdqsnqt'}`,
    password: env.POSTGRES_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query(`
    create table if not exists public.days (
      id bigint generated always as identity primary key,
      day_number int unique not null,
      text text,
      image_path text,
      audio_path text,
      has_gift boolean default false,
      gift_number int,
      photo_paths text[] default '{}'
    );
    alter table public.days enable row level security;
    drop policy if exists "Lectura publica de days" on public.days;
    create policy "Lectura publica de days" on public.days for select using (true);
  `);
  await client.end();
  console.log('✓ Tabla "days" creada');
}

async function migrateFileIfNeeded(firebaseStorage, supabase, bucket, firebasePath, cache) {
  if (!firebasePath || firebasePath.startsWith('http')) {
    return firebasePath;
  }

  const normalized = firebasePath.replace(/^\/+/, '');
  if (cache.has(normalized)) {
    return normalized;
  }

  const { buffer, contentType } = await downloadFirebaseFile(firebaseStorage, normalized);
  const storedPath = await uploadToSupabase(supabase, bucket, normalized, buffer, contentType);
  cache.add(normalized);
  console.log(`  ✓ archivo: ${normalized}${storedPath !== normalized ? ` → ${storedPath}` : ''}`);
  return storedPath;
}

async function migrateExtraPhotos(firebaseStorage, supabase, bucket, dayNumber, cache) {
  const folderPath = `photos/day${dayNumber}`;
  const photoPaths = [];

  try {
    const result = await listAll(ref(firebaseStorage, folderPath));
    for (const item of result.items) {
      const dest = `${folderPath}/${item.name}`;
      await migrateFileIfNeeded(firebaseStorage, supabase, bucket, dest, cache);
      photoPaths.push(dest);
    }
  } catch {
    // sin carpeta extra
  }

  return photoPaths;
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'media';

  if (!supabaseUrl) {
    throw new Error('Falta EXPO_PUBLIC_SUPABASE_URL en .env');
  }

  if (!serviceKey) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY en .env.\n' +
        'Supabase → Project Settings → API → service_role (secret)\n' +
        'Pégala en .env y vuelve a ejecutar: npm run migrate:firebase'
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('\n🔧 Preparando Supabase...');
  await ensureDaysTable(supabase, env);
  await ensureBucket(supabase, bucket);

  const firebaseApp = initializeApp({
    apiKey: env.FIREBASE_API_KEY,
    projectId: env.FIREBASE_PROJECT_ID,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
  });
  const db = getFirestore(firebaseApp);
  const firebaseStorage = getStorage(firebaseApp);

  console.log('\n📥 Leyendo 31 días desde Firebase Firestore...');
  const snapshot = await getDocs(collection(db, 'days'));
  const days = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  days.sort((a, b) => (b.dayNumber ?? 0) - (a.dayNumber ?? 0));

  console.log(`Encontrados ${days.length} días\n`);

  const uploaded = new Set();

  for (const day of days) {
    const n = day.dayNumber;
    console.log(`📅 Día ${n}...`);

    const imagePath = await migrateFileIfNeeded(
      firebaseStorage,
      supabase,
      bucket,
      day.imagePath,
      uploaded
    );

    const audioPath = await migrateFileIfNeeded(
      firebaseStorage,
      supabase,
      bucket,
      day.audioPath,
      uploaded
    );

    const photoPaths = await migrateExtraPhotos(firebaseStorage, supabase, bucket, n, uploaded);

    const row = {
      day_number: n,
      text: day.text ?? day.title ?? '',
      image_path: imagePath,
      audio_path: audioPath,
      has_gift: Boolean(day.hasGift),
      gift_number: day.giftNumber ?? null,
      photo_paths: photoPaths,
    };

    const { error } = await supabase.from('days').upsert(row, { onConflict: 'day_number' });
    if (error) {
      throw new Error(`Error guardando día ${n}: ${error.message}`);
    }

    console.log(`  ✓ registro en Supabase\n`);
  }

  console.log('✅ Migración completa. Ejecuta: npm run web\n');
}

main().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
