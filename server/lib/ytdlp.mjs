import { mkdtemp, readdir, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import YTDlpWrap from 'yt-dlp-wrap';

const ALLOWED_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'm.youtube.com',
  'music.youtube.com',
];

function assertAllowedUrl(sourceUrl) {
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error('URL inválida');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Solo se permiten URLs http/https');
  }
  const host = parsed.hostname.toLowerCase();
  const allowed = ALLOWED_HOSTS.some((item) => host === item || host.endsWith(`.${item}`));
  if (!allowed) {
    throw new Error('Dominio no permitido. Usa enlaces de YouTube.');
  }
}

export async function downloadAudioMp3(sourceUrl, baseName) {
  assertAllowedUrl(sourceUrl);
  const tmpDir = await mkdtemp(join(tmpdir(), 'ytdlp-'));
  const safeName = baseName.replace(/[^a-zA-Z0-9.\-_ ]/g, '_').trim();
  const outputTemplate = join(tmpDir, `${safeName}.%(ext)s`);
  const ytDlp = new YTDlpWrap();

  try {
    await ytDlp.execPromise([
      sourceUrl,
      '-x',
      '--audio-format',
      'mp3',
      '--audio-quality',
      '0',
      '-o',
      outputTemplate,
      '--no-playlist',
      ...(process.env.FFMPEG_PATH ? ['--ffmpeg-location', process.env.FFMPEG_PATH] : []),
    ]);

    const files = await readdir(tmpDir);
    const audioFile = files.find((f) => f.endsWith('.mp3') || f.endsWith('.m4a') || f.endsWith('.webm'));

    if (!audioFile) {
      throw new Error('yt-dlp no generó un archivo de audio');
    }

    const buffer = await readFile(join(tmpDir, audioFile));
    const ext = audioFile.endsWith('.mp3') ? '.mp3' : '.mp3';
    return { buffer, filename: `${safeName}${ext}` };
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}
