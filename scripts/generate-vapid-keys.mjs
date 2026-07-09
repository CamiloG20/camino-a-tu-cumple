#!/usr/bin/env node
/**
 * Genera claves VAPID para Web Push (iPhone PWA).
 * Uso: npm run generate:vapid
 */

import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();

console.log('\n🔑 Claves VAPID generadas\n');
console.log('Añade a tu .env y Vercel:\n');
console.log(`EXPO_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:tu-email@ejemplo.com');
console.log('CRON_SECRET=elige-un-secreto-largo-aleatorio');
console.log('\nLuego: npm run setup:vercel-env\n');
