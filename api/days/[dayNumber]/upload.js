import { parseDayNumber } from '../../../lib/dayValidation.js';
import formidable from 'formidable';
import { isAllowedUpload } from '../../../lib/storageSanitize.js';
import {
  getAdminSupabase,
  getStorageBucket,
  requireAdmin,
  sanitizeStorageKey,
  setCors,
  handleOptions,
} from '../../_lib/admin.js';

export const config = {
  api: { bodyParser: false },
};

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false, maxFileSize: 25 * 1024 * 1024 });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

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

  try {
    const { fields, files } = await parseForm(req);
    const file = files.file?.[0] || files.file;
    if (!file) {
      return res.status(400).json({ error: 'Archivo requerido' });
    }

    const fs = await import('fs/promises');
    const buffer = await fs.readFile(file.filepath);
    const typeField = fields.type?.[0] || fields.type || 'main';
    const type = typeField === 'extra' ? 'extra' : typeField === 'audio' ? 'audio' : 'main';

    const bucket = getStorageBucket();
    const supabase = getAdminSupabase();
    const originalName = file.originalFilename || 'upload.bin';

    if (!isAllowedUpload(type, file.mimetype, originalName)) {
      return res.status(400).json({ error: 'Tipo de archivo no permitido' });
    }

    let storagePath;
    if (type === 'main') {
      const ext = originalName.split('.').pop() || 'jpg';
      storagePath = sanitizeStorageKey(`images/${dayNumber}.${ext}`);
    } else if (type === 'audio') {
      const ext = originalName.split('.').pop() || 'mp3';
      storagePath = sanitizeStorageKey(`sounds/${dayNumber}.${ext}`);
    } else {
      storagePath = sanitizeStorageKey(`photos/day${dayNumber}/${originalName}`);
    }

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
      upsert: true,
      contentType: file.mimetype || 'application/octet-stream',
    });
    if (uploadError) throw uploadError;

    const { data: existing } = await supabase
      .from('days')
      .select('*')
      .eq('day_number', dayNumber)
      .maybeSingle();

    const patch = {
      day_number: dayNumber,
      text: existing?.text ?? '',
      has_gift: existing?.has_gift ?? false,
      gift_number: existing?.gift_number ?? null,
      gift_message: existing?.gift_message ?? null,
      photo_paths: existing?.photo_paths ?? [],
      image_path: existing?.image_path ?? null,
      audio_path: existing?.audio_path ?? null,
    };

    if (type === 'main') patch.image_path = storagePath;
    else if (type === 'audio') patch.audio_path = storagePath;
    else patch.photo_paths = [...new Set([...(patch.photo_paths || []), storagePath])];

    const { data, error } = await supabase
      .from('days')
      .upsert(patch, { onConflict: 'day_number' })
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ day: data, storagePath });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error al subir archivo' });
  }
}
