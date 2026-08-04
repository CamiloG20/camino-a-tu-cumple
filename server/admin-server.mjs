import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { loadEnv, sanitizeStorageKey } from './lib/env.mjs';
import { getAdminSupabase, getStorageBucket } from './lib/supabaseAdmin.mjs';
import { downloadAudioMp3 } from './lib/ytdlp.mjs';
import { isAllowedUpload, isStoragePathAllowedForDay } from '../lib/storageSanitize.js';
import { createAdminToken, verifyAdminToken } from '../lib/adminToken.js';
import { parseDayNumber } from '../lib/dayValidation.js';
import { timingSafeEqualString } from '../lib/safeCompare.js';
import {
  buildPublicAppConfigPayload,
  updateGlobalBackgroundPath,
} from '../api/_lib/appConfig.js';

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
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origen no permitido'), false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

function extractAdminToken(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

function requireAdmin(req, res, next) {
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD no configurado en .env' });
  }

  const token = extractAdminToken(req);
  if (token && verifyAdminToken(token)) {
    return next();
  }

  const headerPassword = req.headers['x-admin-password'];
  if (
    typeof headerPassword === 'string' &&
    timingSafeEqualString(headerPassword, ADMIN_PASSWORD)
  ) {
    return next();
  }

  return res.status(401).json({ error: 'No autorizado' });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/app-config', async (_req, res) => {
  try {
    const supabase = getAdminSupabase();
    const payload = await buildPublicAppConfigPayload(supabase);
    res.json(payload);
  } catch {
    res.json({
      notificationHour: 10,
      timezone: 'America/Guayaquil',
      backgroundPath: null,
      backgroundUrl: null,
    });
  }
});

app.put('/api/app-config', requireAdmin, async (req, res) => {
  try {
    const hour = Number(req.body?.notificationHour);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      return res.status(400).json({ error: 'Hora inválida (0-23)' });
    }

    const supabase = getAdminSupabase();
    const { error } = await supabase
      .from('app_config')
      .update({ notification_hour: hour, updated_at: new Date().toISOString() })
      .eq('id', 1);

    if (error) throw error;
    const payload = await buildPublicAppConfigPayload(supabase);
    res.json({
      ok: true,
      notificationHour: hour,
      timezone: payload.timezone,
      backgroundPath: payload.backgroundPath,
      backgroundUrl: payload.backgroundUrl,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/app-config/background', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo requerido' });
    }
    if (!isAllowedUpload('background', req.file.mimetype, req.file.originalname)) {
      return res.status(400).json({ error: 'Tipo de archivo no permitido' });
    }

    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const storagePath = sanitizeStorageKey(`backgrounds/global.${ext}`);
    const bucket = getStorageBucket();
    const supabase = getAdminSupabase();

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, req.file.buffer, {
      upsert: true,
      contentType: req.file.mimetype,
    });
    if (uploadError) throw uploadError;

    await updateGlobalBackgroundPath(supabase, storagePath);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 3600);
    if (error) throw error;

    res.json({
      ok: true,
      backgroundPath: storagePath,
      backgroundUrl: data.signedUrl,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/app-config/background', requireAdmin, async (_req, res) => {
  try {
    const supabase = getAdminSupabase();
    const bucket = getStorageBucket();
    const { data: config } = await supabase
      .from('app_config')
      .select('background_path')
      .eq('id', 1)
      .maybeSingle();

    if (config?.background_path) {
      await supabase.storage.from(bucket).remove([sanitizeStorageKey(config.background_path)]);
    }

    await updateGlobalBackgroundPath(supabase, null);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
  if (!timingSafeEqualString(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  res.json({ ok: true, token: createAdminToken(), expiresInHours: 8 });
});

app.post('/api/media/sign', requireAdmin, async (req, res) => {
  try {
    const rawPath = req.body?.path?.trim();
    if (!rawPath) {
      return res.status(400).json({ error: 'path requerido' });
    }

    const bucket = getStorageBucket();
    const supabase = getAdminSupabase();
    let key;
    try {
      key = sanitizeStorageKey(rawPath);
    } catch {
      return res.status(400).json({ error: 'Ruta de storage inválida' });
    }
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, 3600);
    if (error) throw error;
    res.json({ url: data.signedUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
    const dayNumber = parseDayNumber(req.params.dayNumber);
    if (dayNumber == null) {
      return res.status(400).json({ error: 'Día inválido (0-31)' });
    }
    const body = req.body ?? {};

    if (body.has_gift && body.gift_number != null) {
      const giftNum = Number(body.gift_number);
      if (Number.isNaN(giftNum) || giftNum < 1 || giftNum > 12) {
        return res.status(400).json({ error: 'Número de regalo inválido (1-12)' });
      }
    }

    const supabase = getAdminSupabase();

    const { data: existing } = await supabase
      .from('days')
      .select('*')
      .eq('day_number', dayNumber)
      .maybeSingle();

    const row = {
      day_number: dayNumber,
      text: body.text ?? existing?.text ?? '',
      image_path: body.image_path !== undefined ? body.image_path : existing?.image_path ?? null,
      audio_path: body.audio_path !== undefined ? body.audio_path : existing?.audio_path ?? null,
      background_path:
        body.background_path !== undefined ? body.background_path : existing?.background_path ?? null,
      has_gift: body.has_gift !== undefined ? Boolean(body.has_gift) : Boolean(existing?.has_gift),
      gift_number: body.gift_number !== undefined ? body.gift_number : existing?.gift_number ?? null,
      gift_message:
        body.gift_message !== undefined
          ? body.gift_message?.trim() || null
          : existing?.gift_message ?? null,
      photo_paths: Array.isArray(body.photo_paths)
        ? body.photo_paths
        : existing?.photo_paths ?? [],
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

    const dayNumber = parseDayNumber(req.params.dayNumber);
    if (dayNumber == null) {
      return res.status(400).json({ error: 'Día inválido (0-31)' });
    }
    const type =
      req.body?.type === 'extra'
        ? 'extra'
        : req.body?.type === 'audio'
          ? 'audio'
          : req.body?.type === 'background'
            ? 'background'
            : 'main';

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
    } else if (type === 'background') {
      const ext = req.file.originalname.split('.').pop() || 'jpg';
      storagePath = sanitizeStorageKey(`backgrounds/day${dayNumber}.${ext}`);
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
      gift_message: existing?.gift_message ?? null,
      photo_paths: existing?.photo_paths ?? [],
      image_path: existing?.image_path ?? null,
      audio_path: existing?.audio_path ?? null,
      background_path: existing?.background_path ?? null,
    };

    if (type === 'main') patch.image_path = storagePath;
    else if (type === 'audio') patch.audio_path = storagePath;
    else if (type === 'background') patch.background_path = storagePath;
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

    const dayNumber = parseDayNumber(req.params.dayNumber);
    if (dayNumber == null) {
      return res.status(400).json({ error: 'Día inválido (0-31)' });
    }
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
      gift_message: existing?.gift_message ?? null,
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
    const dayNumber = parseDayNumber(req.params.dayNumber);
    if (dayNumber == null) {
      return res.status(400).json({ error: 'Día inválido (0-31)' });
    }
    const rawPaths = Array.isArray(req.body?.paths) ? req.body.paths : [];
    if (!rawPaths.length) {
      return res.status(400).json({ error: 'Se requiere al menos una ruta' });
    }

    const bucket = getStorageBucket();
    const supabase = getAdminSupabase();
    let keys;
    try {
      keys = rawPaths
        .filter((path) => path && typeof path === 'string' && !path.startsWith('http'))
        .map((path) => sanitizeStorageKey(path));
    } catch {
      return res.status(400).json({ error: 'Ruta de storage inválida' });
    }

    if (!keys.length) {
      return res.status(400).json({ error: 'Se requiere al menos una ruta válida' });
    }
    if (keys.some((path) => !isStoragePathAllowedForDay(path, dayNumber))) {
      return res.status(400).json({ error: 'La ruta no pertenece a este día' });
    }

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
        gift_message: existing.gift_message ?? null,
        image_path: keys.includes(existing.image_path) ? null : existing.image_path,
        audio_path: keys.includes(existing.audio_path) ? null : existing.audio_path,
        background_path: keys.includes(existing.background_path) ? null : existing.background_path,
        photo_paths: (existing.photo_paths || []).filter((path) => !keys.includes(path)),
      };
      await supabase.from('days').upsert(patch, { onConflict: 'day_number' });
    }

    res.json({ ok: true, deleted: keys.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🔐 Admin API en http://localhost:${PORT}`);
  console.log(`   Panel web: http://localhost:8081/#/admin (o tu puerto de Expo web)\n`);
});
