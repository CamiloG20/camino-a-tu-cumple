import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { loadEnv, sanitizeStorageKey } from './lib/env.mjs';
import { getAdminSupabase, getStorageBucket } from './lib/supabaseAdmin.mjs';
import { downloadAudioMp3 } from './lib/ytdlp.mjs';

const env = loadEnv();
const PORT = Number(env.ADMIN_SERVER_PORT || 8787);
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || '';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

function requireAdmin(req, res, next) {
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD no configurado en .env' });
  }

  const headerPassword = req.headers['x-admin-password'];
  if (headerPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  next();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/verify', (req, res) => {
  const { password } = req.body ?? {};
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD no configurado' });
  }
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  res.json({ ok: true });
});

app.get('/api/days', requireAdmin, async (_req, res) => {
  try {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
      .from('days')
      .select('*')
      .order('day_number', { ascending: false });

    if (error) throw error;
    res.json(data ?? []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/days/:dayNumber', requireAdmin, async (req, res) => {
  try {
    const dayNumber = Number(req.params.dayNumber);
    const body = req.body ?? {};
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
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/days/:dayNumber/upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo requerido' });
    }

    const dayNumber = Number(req.params.dayNumber);
    const type = req.body?.type === 'extra' ? 'extra' : req.body?.type === 'audio' ? 'audio' : 'main';
    const bucket = getStorageBucket();
    const supabase = getAdminSupabase();

    let storagePath;
    if (type === 'main') {
      const ext = req.file.originalname.split('.').pop() || 'jpg';
      storagePath = sanitizeStorageKey(`images/${dayNumber}.${ext}`);
    } else if (type === 'audio') {
      const ext = req.file.originalname.split('.').pop() || 'mp3';
      storagePath = sanitizeStorageKey(`sounds/${dayNumber}.${ext}`);
    } else {
      storagePath = sanitizeStorageKey(`photos/day${dayNumber}/${req.file.originalname}`);
    }

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, req.file.buffer, {
      upsert: true,
      contentType: req.file.mimetype,
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

    res.json({ day: data, storagePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/days/:dayNumber/download-audio', requireAdmin, async (req, res) => {
  try {
    const { url } = req.body ?? {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL requerida' });
    }

    const dayNumber = Number(req.params.dayNumber);
    const bucket = getStorageBucket();
    const supabase = getAdminSupabase();

    const { buffer, filename } = await downloadAudioMp3(url, `${dayNumber}.${filename?.split('.')[0] || 'song'}`);
    const storagePath = sanitizeStorageKey(`sounds/${dayNumber}.${filename.split('.').pop() || 'mp3'}`);

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
      upsert: true,
      contentType: 'audio/mpeg',
    });

    if (uploadError) throw uploadError;

    const { data: existing } = await supabase
      .from('days')
      .select('*')
      .eq('day_number', dayNumber)
      .maybeSingle();

    const row = {
      day_number: dayNumber,
      text: existing?.text ?? '',
      image_path: existing?.image_path ?? null,
      audio_path: storagePath,
      has_gift: existing?.has_gift ?? false,
      gift_number: existing?.gift_number ?? null,
      photo_paths: existing?.photo_paths ?? [],
    };

    const { data, error } = await supabase
      .from('days')
      .upsert(row, { onConflict: 'day_number' })
      .select()
      .single();

    if (error) throw error;

    res.json({ day: data, storagePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🔐 Admin API en http://localhost:${PORT}`);
  console.log(`   Panel web: http://localhost:8081/#/admin (o tu puerto de Expo web)\n`);
});
