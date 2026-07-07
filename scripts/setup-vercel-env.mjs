#!/usr/bin/env node
/**
 * Configura variables de entorno en Vercel desde .env local.
 * Uso: node scripts/setup-vercel-env.mjs
 * Requiere: npx vercel login (una vez)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');

const PUBLIC_VARS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET',
];

if (!existsSync(envPath)) {
  console.error('❌ No existe .env');
  process.exit(1);
}

const env = {};
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}

console.log('\n📦 Configurando variables en Vercel (production + preview)...\n');

for (const key of PUBLIC_VARS) {
  const value = env[key];
  if (!value) {
    console.warn(`⚠️  Saltando ${key} (vacío en .env)`);
    continue;
  }

  for (const target of ['production', 'preview']) {
    try {
      execSync(`npx vercel env rm ${key} ${target} --yes`, { cwd: root, stdio: 'ignore' });
    } catch {
      // no existía
    }

    execSync(`npx vercel env add ${key} ${target}`, {
      cwd: root,
      input: value,
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    console.log(`✓ ${key} → ${target}`);
  }
}

console.log('\n✅ Variables listas. Despliega con: npm run deploy:vercel\n');
