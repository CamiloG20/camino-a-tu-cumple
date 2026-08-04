import {
  createSignedMediaUrl,
  requireAdmin,
  setCors,
  handleOptions,
} from '../_lib/admin.js';
import { parseJsonBody } from '../_lib/parseBody.js';
import { sanitizeStorageKey } from '../../lib/storageSanitize.js';

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

  const rawPath = body.path?.trim();
  if (!rawPath) {
    return res.status(400).json({ error: 'path requerido' });
  }

  let path;
  try {
    path = sanitizeStorageKey(rawPath);
  } catch {
    return res.status(400).json({ error: 'Ruta de storage inválida' });
  }

  try {
    const url = await createSignedMediaUrl(path);
    return res.status(200).json({ url });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'No se pudo firmar la URL' });
  }
}
