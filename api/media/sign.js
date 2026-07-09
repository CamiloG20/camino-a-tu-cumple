import {
  createSignedMediaUrl,
  requireAdmin,
  setCors,
  handleOptions,
} from '../_lib/admin.js';
import { parseJsonBody } from '../_lib/parseBody.js';

export default async function handler(req, res) {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  if (!requireAdmin(req, res)) return;

  const body = parseJsonBody(req);
  if (body === null) {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  const path = body.path?.trim();
  if (!path) {
    return res.status(400).json({ error: 'path requerido' });
  }

  try {
    const url = await createSignedMediaUrl(path);
    return res.status(200).json({ url });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'No se pudo firmar la URL' });
  }
}
