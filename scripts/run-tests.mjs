#!/usr/bin/env node
/**
 * Tests mínimos (módulos sin dependencias relativas sin extensión).
 * Ejecutar: npm test
 */
import assert from 'assert';

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
const { getAppHour, getTodayDateKey, APP_TIMEZONE, ecuadorLocalToUtc } = await load('lib/timezone.js');
const {
  getDaysUntilBirthday,
  getBirthdayDate,
  isBeforeEventStart,
} = await load('lib/calendar.js');
const { sanitizeStorageKey, isStoragePathAllowedForDay } = await load('lib/storageSanitize.js');

test('timezone Ecuador definida', () => {
  assert.equal(APP_TIMEZONE, 'America/Guayaquil');
  assert.equal(typeof getAppHour(), 'number');
  assert.match(getTodayDateKey(), /^\d{4}-\d{2}-\d{2}$/);
});

test('calendar usa día civil Ecuador (UTC getters)', () => {
  const appDate = new Date(ecuadorLocalToUtc(2026, 8, 9, 12, 0, 0));
  assert.equal(getDaysUntilBirthday(appDate), 0);
  assert.equal(isBeforeEventStart(appDate), false);
  assert.equal(getBirthdayDate(2026).getUTCMonth(), 7);
  assert.equal(getBirthdayDate(2026).getUTCDate(), 9);
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

test('pending gifts: filtrar por hasGift + desbloqueados (misma regla que surprisePicks)', () => {
  const todayNumber = getDaysUntilBirthday(getBirthdayDate(2026));
  assert.equal(todayNumber, 0);
  const days = [
    { dayNumber: 20, hasGift: true },
    { dayNumber: 10, hasGift: false },
    { dayNumber: 5, hasGift: true },
  ];
  const picks = {};
  const pending = days
    .filter((d) => d.hasGift)
    .map((d) => d.dayNumber)
    .filter((dayNumber) => dayNumber >= todayNumber && picks[String(dayNumber)] == null)
    .sort((a, b) => b - a);
  assert.deepEqual(pending, [20, 5]);
});

test('sanitizeStorageKey rechaza path traversal', () => {
  assert.equal(sanitizeStorageKey('images/12.jpg'), 'images/12.jpg');
  assert.throws(() => sanitizeStorageKey('../secrets/x'), /inválida/);
  assert.throws(() => sanitizeStorageKey('photos/day1/../../x'), /inválida/);
  assert.equal(isStoragePathAllowedForDay('images/12.jpg', 12), true);
  assert.equal(isStoragePathAllowedForDay('images/11.jpg', 12), false);
  assert.equal(isStoragePathAllowedForDay('photos/day12/a.jpg', 12), true);
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
