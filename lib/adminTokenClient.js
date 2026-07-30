/** Helpers de token admin seguros para el cliente (sin Node crypto). */

function decodeBase64UrlJson(payload) {
  if (!payload || typeof payload !== 'string') return null;
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Solo lee `exp` del payload (sin verificar firma). */
export function peekAdminTokenExpiry(token) {
  if (!token || typeof token !== 'string') return null;
  const [payload] = token.split('.');
  const data = decodeBase64UrlJson(payload);
  return typeof data?.exp === 'number' ? data.exp : null;
}

export function isAdminTokenUnexpired(token) {
  const exp = peekAdminTokenExpiry(token);
  return typeof exp === 'number' && Date.now() < exp;
}
