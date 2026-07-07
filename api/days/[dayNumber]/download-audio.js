import { requireAdmin, setCors, handleOptions } from '../../_lib/admin.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  if (!requireAdmin(req, res)) return;

  return res.status(501).json({
    error:
      'Descarga con yt-dlp no está disponible en Vercel. Sube el MP3 manualmente o usa el admin local (npm run admin:server).',
  });
}
