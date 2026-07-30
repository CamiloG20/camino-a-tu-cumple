/**
 * Rate limit en memoria por instancia.
 * En Vercel no es global entre lambdas; sirve como freno básico.
 * Para límite fuerte en auth/push, combinar con CRON_SECRET y secretos de app.
 */
const buckets = new Map();

const MAX_KEYS = 5000;

export function checkRateLimit(key, { maxAttempts = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const now = Date.now();

  if (buckets.size > MAX_KEYS) {
    for (const [k, entry] of buckets) {
      if (now - entry.start > windowMs) buckets.delete(k);
    }
  }

  const entry = buckets.get(key);

  if (!entry || now - entry.start > windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, retryAfterMs: windowMs - (now - entry.start) };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxAttempts - entry.count };
}

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}
