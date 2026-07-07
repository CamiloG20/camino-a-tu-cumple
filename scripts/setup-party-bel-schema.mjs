/**
 * Crea tabla days + bucket media en Party-Bel_Amour.
 * Usa SUPABASE_SERVICE_ROLE_KEY y opcionalmente POSTGRES_PASSWORD.
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

async function ensureBucket(supabase, bucket) {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (buckets?.some((b) => b.name === bucket)) {
    console.log(`✓ Bucket "${bucket}" ya existe`);
    return;
  }
  const { error: createError } = await supabase.storage.createBucket(bucket, { public: true });
  if (createError) throw createError;
  console.log(`✓ Bucket "${bucket}" creado`);
}

async function ensureTable(env) {
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from('days').select('day_number').limit(1);
  if (!error) {
    console.log('✓ Tabla "days" ya existe');
    return;
  }

  const password = env.POSTGRES_PASSWORD?.trim();
  const projectRef = env.POSTGRES_PROJECT_REF?.trim();
  if (!password || !projectRef) {
    throw new Error(
      'Falta POSTGRES_PASSWORD en .env.\n' +
        'Supabase → Party-Bel_Amour → Settings → Database → Database password'
    );
  }

  const schemaSql = readFileSync(resolve(root, 'supabase', 'schema.sql'), 'utf8');
  const hosts = [
    'aws-0-us-west-2.pooler.supabase.com',
    'aws-1-us-west-2.pooler.supabase.com',
    `db.${projectRef}.supabase.co`,
  ];

  const { default: pg } = await import('pg');
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
      await client.query(schemaSql);
      await client.end();
      console.log(`✓ Tabla "days" creada (${host})`);
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

async function main() {
  const env = loadEnv();
  const bucket = env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET || 'media';
  const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('\n🔧 Configurando Party-Bel_Amour...\n');
  await ensureTable(env);
  await ensureBucket(supabase, bucket);
  console.log('\n✅ Schema listo\n');
}

main().catch((err) => {
  console.error('\n❌', err.message || err);
  process.exit(1);
});
