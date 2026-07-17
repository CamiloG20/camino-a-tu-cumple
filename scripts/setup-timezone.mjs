/**
 * Aplica zona horaria Ecuador en Supabase (desbloqueo de días a medianoche Quito).
 * Uso: npm run setup:timezone
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

async function main() {
  const env = loadEnv();
  const password = env.POSTGRES_PASSWORD?.trim();
  const projectRef = env.POSTGRES_PROJECT_REF?.trim();
  if (!password || !projectRef) {
    throw new Error('Faltan POSTGRES_PASSWORD y POSTGRES_PROJECT_REF en .env');
  }

  const sql = readFileSync(
    resolve(root, 'supabase', 'migrations', '004_app_timezone_ecuador.sql'),
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
      // Reafirmar filtro de días pasados tras recrear get_unlocked_days
      const unlockedPastSql = readFileSync(
        resolve(root, 'supabase', 'migrations', '007_fix_unlocked_days_past.sql'),
        'utf8'
      );
      await client.query(unlockedPastSql);
      await client.end();
      console.log(`\n✅ Zona horaria Ecuador aplicada en Supabase (${host})`);
      console.log('   (días pasados siguen desbloqueados)\n');
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
