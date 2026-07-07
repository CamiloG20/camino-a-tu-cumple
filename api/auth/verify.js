import { getAdminPassword, setCors, handleOptions } from '../_lib/admin.js';

export default function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const password = getAdminPassword();
  if (!password) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD no configurado' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
  if (body.password !== password) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  return res.status(200).json({ ok: true });
}
