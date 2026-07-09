/**
 * Aplica columnas y políticas de fondos + sube fondo global por defecto si no existe.
 * Uso: npm run setup:backgrounds
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

async function seedDefaultGlobalBackground(env) {
  const url = env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || 'media';
  if (!url || !key) {
    console.log('⚠️  Sin credenciales Supabase: se omitió subida del fondo global por defecto.');
    return;
  }

  const fondoPath = resolve(root, 'assets', 'images', 'fondo.png');
  if (!existsSync(fondoPath)) {
    console.log('⚠️  No existe assets/images/fondo.png para fondo global por defecto.');
    return;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: config } = await supabase
    .from('app_config')
    .select('background_path')
    .eq('id', 1)
    .maybeSingle();

  if (config?.background_path) {
    console.log('✓ Fondo global ya configurado:', config.background_path);
    return;
  }

  const storagePath = 'backgrounds/global.png';
  const buffer = readFileSync(fondoPath);

  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
    upsert: true,
    contentType: 'image/png',
  });
  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase
    .from('app_config')
    .update({ background_path: storagePath, updated_at: new Date().toISOString() })
    .eq('id', 1);

  if (updateError) throw updateError;
  console.log(`✓ Fondo global por defecto subido: ${storagePath}`);
}

async function main() {
  const env = loadEnv();
  const password = env.POSTGRES_PASSWORD?.trim();
  const projectRef = env.POSTGRES_PROJECT_REF?.trim();
  if (!password || !projectRef) {
    throw new Error('Faltan POSTGRES_PASSWORD y POSTGRES_PROJECT_REF en .env');
  }

  const sql = readFileSync(
    resolve(root, 'supabase', 'migrations', '006_backgrounds.sql'),
    'utf8'
  );

  const { default: pg } = await import('pg');
  const hosts = [
    'aws-0-us-west-2.pooler.supabase.com',
    'aws-1-us-west-2.pooler.supabase.com',
    `db.${projectRef}.supabase.co`,
  ];

  let lastError;
  for (const host of hosts) {
    const client = new pg.Client({
      host,
      port: 5432,
      user: host.startsWith('db.') ? 'postgres' : `postgres.${projectRef}`,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      await client.query(sql);
      await client.end();
      console.log(`\n✅ Fondos configurables listos (${host})`);
      await seedDefaultGlobalBackground(env);
      console.log('');
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

  throw lastError;
}

main().catch((err) => {
  console.error('\n❌', err.message || err);
  process.exit(1);
});
