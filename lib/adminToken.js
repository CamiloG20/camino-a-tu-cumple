import crypto from 'crypto';

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

export function getTokenSecret() {
  return (
    process.env.ADMIN_TOKEN_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    ''
  );
}

export function createAdminToken() {
  const secret = getTokenSecret();
  if (!secret) {
    throw new Error('ADMIN_TOKEN_SECRET o ADMIN_PASSWORD no configurado');
  }

  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;

  const secret = getTokenSecret();
  if (!secret) return false;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (signature !== expected) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof exp === 'number' && Date.now() < exp;
  } catch {
    return false;
  }
}
