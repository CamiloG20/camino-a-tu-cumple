import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { loadEnv, sanitizeStorageKey } from './lib/env.mjs';
import { getAdminSupabase, getStorageBucket } from './lib/supabaseAdmin.mjs';
import { downloadAudioMp3 } from './lib/ytdlp.mjs';
import { isAllowedUpload } from '../lib/storageSanitize.js';

const authAttempts = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const entry = authAttempts.get(ip);
  if (!entry || now - entry.start > windowMs) {
    authAttempts.set(ip, { start: now, count: 1 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count += 1;
  return true;
}

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
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
  }

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

    if (!isAllowedUpload(type, req.file.mimetype, req.file.originalname)) {
      return res.status(400).json({ error: 'Tipo de archivo no permitido' });
    }

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

app.post('/api/days/:dayNumber/delete-media', requireAdmin, async (req, res) => {
  try {
    const dayNumber = Number(req.params.dayNumber);
    const paths = Array.isArray(req.body?.paths) ? req.body.paths : [];
    if (!paths.length) {
      return res.status(400).json({ error: 'Se requiere al menos una ruta' });
    }

    const bucket = getStorageBucket();
    const supabase = getAdminSupabase();
    const keys = paths
      .filter((path) => path && typeof path === 'string' && !path.startsWith('http'))
      .map((path) => sanitizeStorageKey(path.replace(/^\/+/, '')));

    if (keys.length) {
      const { error: removeError } = await supabase.storage.from(bucket).remove(keys);
      if (removeError) throw removeError;
    }

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
        image_path: paths.includes(existing.image_path) ? null : existing.image_path,
        audio_path: paths.includes(existing.audio_path) ? null : existing.audio_path,
        photo_paths: (existing.photo_paths || []).filter((path) => !paths.includes(path)),
      };
      await supabase.from('days').upsert(patch, { onConflict: 'day_number' });
    }

    res.json({ ok: true, deleted: paths.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🔐 Admin API en http://localhost:${PORT}`);
  console.log(`   Panel web: http://localhost:8081/#/admin (o tu puerto de Expo web)\n`);
});
