/**
 * Copia datos del proyecto Supabase temporal → Party-Bel_Amour (destino en .env).
 *
 * Requisitos en .env:
 * - EXPO_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY → destino (Party-Bel_Amour)
 * - SOURCE_SUPABASE_URL / SOURCE_SUPABASE_SERVICE_ROLE_KEY → origen con los datos
 * - POSTGRES_PASSWORD + POSTGRES_PROJECT_REF del destino (para crear tabla si falta)
 *
 * Uso: npm run migrate:supabase
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
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function guessContentType(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  return 'application/octet-stream';
}

async function ensureBucket(supabase, bucket) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  if (buckets?.some((b) => b.name === bucket)) {
    console.log(`✓ Bucket "${bucket}" ya existe en destino`);
    return;
  }

  const { error } = await supabase.storage.createBucket(bucket, { public: true });
  if (error) throw error;
  console.log(`✓ Bucket "${bucket}" creado en destino`);
}

async function daysTableReady(dest) {
  const { error } = await dest.from('days').select('day_number').limit(1);
  return !error;
}

async function ensureDaysTable(env) {
  const dest = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (await daysTableReady(dest)) {
    console.log('✓ Tabla "days" accesible en destino');
    return;
  }

  const password = env.POSTGRES_PASSWORD?.trim();
  const projectRef = env.POSTGRES_PROJECT_REF?.trim();
  if (!password || !projectRef) {
    throw new Error(
      'La tabla "days" no existe en Party-Bel_Amour.\n\n' +
        'Opción A (rápida): Supabase → Party-Bel_Amour → SQL Editor → pega y ejecuta supabase/schema.sql\n' +
        'Opción B: agrega POSTGRES_PASSWORD en .env (Settings → Database → Database password) y vuelve a ejecutar npm run migrate:supabase'
    );
  }

  const schemaSql = readFileSync(resolve(root, 'supabase', 'schema.sql'), 'utf8');
  const poolerHosts = [
    'aws-0-us-west-2.pooler.supabase.com',
    'aws-1-us-west-2.pooler.supabase.com',
    'aws-0-us-west-2.pooler.supabase.com',
  ];

  console.log('· Creando tabla "days" en destino vía PostgreSQL...');
  const { default: pg } = await import('pg');
  let lastError;

  for (const host of poolerHosts) {
    const client = new pg.Client({
      host,
      port: 5432,
      user: `postgres.${projectRef}`,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      await client.query(schemaSql);
      await client.end();
      console.log(`✓ Tabla "days" creada en destino (${host})`);
      return;
    } catch (err) {
      lastError = err;
      try {
        await client.end();
      } catch {
        // ignore
      }
    }
  }

  throw lastError ?? new Error('No se pudo crear la tabla "days" en destino');
}

async function listAllFiles(supabase, bucket, prefix = '') {
  const files = [];
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error) throw error;

  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id) {
      files.push(path);
    } else {
      files.push(...(await listAllFiles(supabase, bucket, path)));
    }
  }
  return files;
}

function encodeStoragePath(path) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

async function downloadFromSource(source, sourceUrl, bucket, path) {
  const { data, error } = await source.storage.from(bucket).download(path);
  if (!error && data) {
    return {
      buffer: Buffer.from(await data.arrayBuffer()),
      contentType: guessContentType(path),
    };
  }

  const url = `${sourceUrl}/storage/v1/object/public/${bucket}/${encodeStoragePath(path)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar ${path}: ${response.status}`);
  }
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') || guessContentType(path),
  };
}

async function main() {
  const env = loadEnv();
  const bucket = env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'media';
  const daysOnly = process.argv.includes('--days-only');

  const sourceUrl = env.SOURCE_SUPABASE_URL?.trim();
  const sourceKey = env.SOURCE_SUPABASE_SERVICE_ROLE_KEY?.trim();
  const destUrl = env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const destKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!sourceUrl || !sourceKey) {
    throw new Error('Faltan SOURCE_SUPABASE_URL y SOURCE_SUPABASE_SERVICE_ROLE_KEY en .env');
  }
  if (!destUrl || !destKey) {
    throw new Error(
      'Faltan credenciales del destino (Party-Bel_Amour).\n' +
        'Agrega SUPABASE_SERVICE_ROLE_KEY en .env (Supabase → Settings → API → service_role).'
    );
  }

  if (sourceUrl === destUrl) {
    throw new Error('Origen y destino son el mismo proyecto. No hay nada que migrar.');
  }

  const source = createClient(sourceUrl, sourceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const dest = createClient(destUrl, destKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('\n🔧 Preparando destino (Party-Bel_Amour)...');
  await ensureBucket(dest, bucket);

  console.log('\n📋 Leyendo días del origen...');
  const { data: days, error: daysError } = await source
    .from('days')
    .select('*')
    .order('day_number', { ascending: false });
  if (daysError) throw daysError;
  console.log(`✓ ${days.length} días encontrados`);

  let pathsCopied = 0;

  if (!daysOnly) {
    console.log('\n📁 Listando archivos en Storage del origen...');
    const allFiles = await listAllFiles(source, bucket);
    console.log(`✓ ${allFiles.length} archivos en bucket "${bucket}"`);

    const pathsToCopy = new Set(allFiles);
    for (const day of days) {
      if (day.image_path && !day.image_path.startsWith('http')) pathsToCopy.add(day.image_path);
      if (day.audio_path && !day.audio_path.startsWith('http')) pathsToCopy.add(day.audio_path);
      for (const p of day.photo_paths ?? []) {
        if (p && !p.startsWith('http')) pathsToCopy.add(p);
      }
    }

    console.log(`\n⬆️  Copiando ${pathsToCopy.size} archivos al destino...`);
    let copied = 0;
    const skipped = [];
    for (const path of [...pathsToCopy].sort()) {
      let buffer;
      let contentType;
      try {
        ({ buffer, contentType } = await downloadFromSource(source, sourceUrl, bucket, path));
      } catch (err) {
        skipped.push({ path, reason: err.message });
        continue;
      }
      const { error } = await dest.storage.from(bucket).upload(path, buffer, {
        upsert: true,
        contentType,
      });
      if (error) throw error;
      copied += 1;
      if (copied % 10 === 0 || copied === pathsToCopy.size) {
        console.log(`  · ${copied}/${pathsToCopy.size} archivos`);
      }
    }
    pathsCopied = copied;
    if (skipped.length) {
      console.log(`  ⚠️  ${skipped.length} archivo(s) omitido(s):`);
      skipped.forEach((s) => console.log(`     - ${s.path}`));
    }
  }

  const tableReady = await daysTableReady(dest);
  if (!tableReady) {
    try {
      await ensureDaysTable(env);
    } catch (err) {
      if (!daysOnly) {
        console.log(`\n⚠️  Archivos copiados (${pathsCopied}), pero falta la tabla "days".`);
      }
      throw err;
    }
  }

  console.log('\n💾 Insertando filas en tabla "days"...');
  const rows = days.map(({ id, ...row }) => row);
  const { error: upsertError } = await dest.from('days').upsert(rows, { onConflict: 'day_number' });
  if (upsertError) throw upsertError;

  const gifts = days.filter((d) => d.has_gift).length;
  console.log(`\n✅ Migración completa → ${destUrl}`);
  console.log(`   ${days.length} días, ${gifts} regalos${daysOnly ? '' : `, ${pathsCopied} archivos`}\n`);
}

main().catch((err) => {
  console.error('\n❌', err.message || err);
  process.exit(1);
});
