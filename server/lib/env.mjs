import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export function loadEnv() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const envPath = resolve(root, '.env');

  if (!existsSync(envPath)) {
    throw new Error('No existe .env. Copia .env.example y completa las variables.');
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

export { sanitizeStorageKey } from '../../lib/storageSanitize.js';
