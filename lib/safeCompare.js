import crypto from 'crypto';

/** Comparación en tiempo constante para secretos (password, HMAC, etc.). */
export function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a ?? ''), 'utf8');
  const right = Buffer.from(String(b ?? ''), 'utf8');

  if (left.length !== right.length) {
    // Evita filtrar longitud: siempre comparamos algo de igual tamaño.
    const dummy = crypto.createHash('sha256').update(left).digest();
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}
