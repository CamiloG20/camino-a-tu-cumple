import {
  createAdminToken,
  getAdminPassword,
  setCors,
  handleOptions,
} from '../_lib/admin.js';
import { parseJsonBody } from '../_lib/parseBody.js';
import { checkRateLimit, getClientIp } from '../_lib/rateLimit.js';
import { timingSafeEqualString } from '../../lib/safeCompare.js';

export default function handler(req, res) {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const password = getAdminPassword();
  if (!password) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD no configurado' });
  }

  const ip = getClientIp(req);
  const limit = checkRateLimit(`auth:${ip}`);
  if (!limit.allowed) {
    return res.status(429).json({
      error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
    });
  }

  const body = parseJsonBody(req);
  if (body === null) {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  if (!timingSafeEqualString(body.password, password)) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  try {
    const token = createAdminToken();
    return res.status(200).json({ ok: true, token, expiresInHours: 8 });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'No se pudo crear la sesión' });
  }
}
