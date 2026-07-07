#!/usr/bin/env node
/**
 * Elimina variables obsoletas de Vercel (proyecto viejo Supabase / Next.js).
 * Mantiene solo las que usa la app Expo + API admin.
 */

import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const REMOVE = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_JWT_SECRET',
  'POSTGRES_URL',
  'POSTGRES_URL_NON_POOLING',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_HOST',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DATABASE',
];

const environments = ['production', 'preview', 'development'];

console.log('\n🧹 Limpiando variables obsoletas en Vercel...\n');

for (const key of REMOVE) {
  for (const env of environments) {
    try {
      execSync(`npx vercel env rm ${key} ${env} --yes`, { cwd: root, stdio: 'ignore' });
      console.log(`✓ Eliminada ${key} (${env})`);
    } catch {
      // no existía
    }
  }
}

console.log('\n✅ Limpieza lista.\n');
