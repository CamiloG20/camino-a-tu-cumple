import {
  getAdminSupabase,
  requireAdmin,
  setCors,
  handleOptions,
} from '../_lib/admin.js';
import { parseJsonBody } from '../_lib/parseBody.js';

export default async function handler(req, res) {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  if (!requireAdmin(req, res)) return;

  const dayNumber = Number(req.query.dayNumber);
  if (Number.isNaN(dayNumber)) {
    return res.status(400).json({ error: 'Día inválido' });
  }

  try {
    const body = parseJsonBody(req);
    if (body === null) {
      return res.status(400).json({ error: 'JSON inválido' });
    }

    if (body.has_gift && body.gift_number != null) {
      const giftNum = Number(body.gift_number);
      if (Number.isNaN(giftNum) || giftNum < 1 || giftNum > 12) {
        return res.status(400).json({ error: 'Número de regalo inválido (1-12)' });
      }
    }

    const supabase = getAdminSupabase();

    const row = {
      day_number: dayNumber,
      text: body.text ?? '',
      image_path: body.image_path ?? null,
      audio_path: body.audio_path ?? null,
      has_gift: Boolean(body.has_gift),
      gift_number: body.gift_number ?? null,
      photo_paths: Array.isArray(body.photo_paths) ? body.photo_paths : [],
    };

    const { data, error } = await supabase
      .from('days')
      .upsert(row, { onConflict: 'day_number' })
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error al guardar' });
  }
}
