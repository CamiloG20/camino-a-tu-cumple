import formidable from 'formidable';
import { isAllowedUpload } from '../../../lib/storageSanitize.js';
import {
  createSignedMediaUrl,
  getAdminSupabase,
  getStorageBucket,
  requireAdmin,
  sanitizeStorageKey,
  setCors,
  handleOptions,
} from '../_lib/admin.js';
import { updateGlobalBackgroundPath } from '../_lib/appConfig.js';

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

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;

    try {
      const { files } = await parseForm(req);
      const file = files.file?.[0] || files.file;
      if (!file) {
        return res.status(400).json({ error: 'Archivo requerido' });
      }

      const fs = await import('fs/promises');
      const buffer = await fs.readFile(file.filepath);
      const originalName = file.originalFilename || 'background.jpg';

      if (!isAllowedUpload('background', file.mimetype, originalName)) {
        return res.status(400).json({ error: 'Tipo de archivo no permitido (jpg, png, webp, gif)' });
      }

      const ext = originalName.split('.').pop() || 'jpg';
      const storagePath = sanitizeStorageKey(`backgrounds/global.${ext}`);
      const bucket = getStorageBucket();
      const supabase = getAdminSupabase();

      const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
        upsert: true,
        contentType: file.mimetype || 'image/jpeg',
      });
      if (uploadError) throw uploadError;

      await updateGlobalBackgroundPath(supabase, storagePath);
      const backgroundUrl = await createSignedMediaUrl(storagePath, 3600);

      return res.status(200).json({
        ok: true,
        backgroundPath: storagePath,
        backgroundUrl,
      });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Error al subir fondo global' });
    }
  }

  if (req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;

    try {
      const supabase = getAdminSupabase();
      const bucket = getStorageBucket();
      const { data: config } = await supabase
        .from('app_config')
        .select('background_path')
        .eq('id', 1)
        .maybeSingle();

      const path = config?.background_path;
      if (path) {
        await supabase.storage.from(bucket).remove([sanitizeStorageKey(path)]);
      }

      await updateGlobalBackgroundPath(supabase, null);
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Error al quitar fondo global' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
