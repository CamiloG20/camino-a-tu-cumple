#!/usr/bin/env node
/**
 * Tests mínimos (módulos sin dependencias relativas sin extensión).
 * Ejecutar: npm test
 */
import assert from 'assert';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test-password-for-unit';
process.env.ADMIN_TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || 'test-token-secret';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

// Cargar con require: Babel/Metro usa export, Node los trata como ESM si hay "export".
// Preferimos import dinámico con rutas absolutas file:// y query — más simple: duplicar asserts
// sobre lógica pura importando solo archivos con extensión en sus deps.

const { pathToFileURL } = await import('url');
const { resolve, dirname } = await import('path');
const { fileURLToPath } = await import('url');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function load(rel) {
  return import(pathToFileURL(resolve(root, rel)).href);
}

const { timingSafeEqualString } = await load('lib/safeCompare.js');
const { createAdminToken, verifyAdminToken } = await load('lib/adminToken.js');
const { isAdminTokenUnexpired, peekAdminTokenExpiry } = await load('lib/adminTokenClient.js');
const {
  getScheduledGiftDayNumbers,
  applyGiftScheduleToDays,
  GIFT_DAY_COUNT,
} = await load('lib/giftSchedule.js');
const { getAppHour, getTodayDateKey, APP_TIMEZONE } = await load('lib/timezone.js');

test('timezone Ecuador definida', () => {
  assert.equal(APP_TIMEZONE, 'America/Guayaquil');
  assert.equal(typeof getAppHour(), 'number');
  assert.match(getTodayDateKey(), /^\d{4}-\d{2}-\d{2}$/);
});

test('gift schedule: 4 días únicos', () => {
  const days = getScheduledGiftDayNumbers();
  assert.equal(days.length, GIFT_DAY_COUNT);
  assert.equal(new Set(days).size, GIFT_DAY_COUNT);
  days.forEach((d) => {
    assert.ok(d >= 0 && d <= 31);
  });
});

test('applyGiftScheduleToDays respeta hasGift de BD', () => {
  const withDb = applyGiftScheduleToDays([
    { dayNumber: 31, hasGift: true },
    { dayNumber: 30, hasGift: false },
  ]);
  assert.equal(withDb[0].hasGift, true);
  assert.equal(withDb[1].hasGift, false);
});

test('timingSafeEqualString', () => {
  assert.equal(timingSafeEqualString('abc', 'abc'), true);
  assert.equal(timingSafeEqualString('abc', 'abd'), false);
  assert.equal(timingSafeEqualString('abc', 'ab'), false);
});

test('admin token create/verify + expiry client', () => {
  const token = createAdminToken();
  assert.equal(verifyAdminToken(token), true);
  assert.equal(isAdminTokenUnexpired(token), true);
  const exp = peekAdminTokenExpiry(token);
  assert.ok(exp > Date.now());
  assert.equal(verifyAdminToken(`tampered.${token.split('.')[1]}`), false);
  assert.equal(isAdminTokenUnexpired('x.y'), false);
});

console.log(`\n${passed} tests ok`);
