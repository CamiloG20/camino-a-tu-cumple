import webpush from 'web-push';
import { buildDailyNotificationPayload } from '../lib/serverCalendar.js';

let configured = false;

export function getVapidPublicKey() {
  return process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY?.trim() || '';
}

function ensureWebPush() {
  if (configured) return;

  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@camino-a-tu-cumple.app';

  if (!publicKey || !privateKey) {
    throw new Error('Faltan EXPO_PUBLIC_VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export async function sendPushNotification(subscription, payload) {
  ensureWebPush();
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: payload.tag,
    url: payload.url || '/',
  });

  return webpush.sendNotification(subscription, body, {
    TTL: 60 * 60 * 12,
    urgency: 'high',
  });
}

export function buildTodayPushPayload(date = new Date()) {
  return buildDailyNotificationPayload(date);
}
