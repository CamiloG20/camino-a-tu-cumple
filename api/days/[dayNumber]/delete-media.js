import { parseDayNumber } from '../../../lib/dayValidation.js';
import {
  deleteStoragePaths,
  getAdminSupabase,
  requireAdmin,
  setCors,
  handleOptions,
} from '../../_lib/admin.js';
import { parseJsonBody } from '../../_lib/parseBody.js';

export default async function handler(req, res) {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  if (!requireAdmin(req, res)) return;

  const dayNumber = parseDayNumber(req.query.dayNumber);
  if (dayNumber == null) {
    return res.status(400).json({ error: 'Día inválido (0-31)' });
  }

  const body = parseJsonBody(req);
  if (body === null) {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  const paths = Array.isArray(body.paths) ? body.paths : [];
  if (!paths.length) {
    return res.status(400).json({ error: 'Se requiere al menos una ruta' });
  }

  try {
    await deleteStoragePaths(paths);
    const supabase = getAdminSupabase();
    const { data: existing } = await supabase
      .from('days')
      .select('*')
      .eq('day_number', dayNumber)
      .maybeSingle();

    if (existing) {
      const patch = {
        day_number: dayNumber,
        text: existing.text ?? '',
        has_gift: existing.has_gift ?? false,
        gift_number: existing.gift_number ?? null,
        gift_message: existing.gift_message ?? null,
        image_path: paths.includes(existing.image_path) ? null : existing.image_path,
        audio_path: paths.includes(existing.audio_path) ? null : existing.audio_path,
        photo_paths: (existing.photo_paths || []).filter((path) => !paths.includes(path)),
      };

      await supabase.from('days').upsert(patch, { onConflict: 'day_number' });
    }

    return res.status(200).json({ ok: true, deleted: paths.length });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error al borrar archivos' });
  }
}
