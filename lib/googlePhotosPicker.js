/**
 * Google Photos Picker (admin web).
 * Requiere EXPO_PUBLIC_GOOGLE_PHOTOS_CLIENT_ID (OAuth Web Client ID).
 *
 * Flujo: GIS token → session → pickerUri/autoclose → poll → mediaItems → File[]
 */

const PICKER_SCOPE = 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly';
const PICKER_BASE = 'https://photospicker.googleapis.com/v1';
const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';

// Client ID OAuth es público (va al navegador). Fallback si el build no inyectó la env.
const FALLBACK_CLIENT_ID =
  '492716866781-ps9i1mg2vpv34a4r2n1k4h7v73sjn1st.apps.googleusercontent.com';

export function getGooglePhotosClientId() {
  const fromEnv =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GOOGLE_PHOTOS_CLIENT_ID?.trim()) ||
    '';
  return fromEnv || FALLBACK_CLIENT_ID;
}

export function isGooglePhotosPickerConfigured() {
  return Boolean(getGooglePhotosClientId()) && typeof window !== 'undefined';
}

function loadGisScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Solo disponible en el navegador'));
  }
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity')));
      if (window.google?.accounts?.oauth2) resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity'));
    document.head.appendChild(script);
  });
}

let cachedToken = null;
let cachedTokenExpiry = 0;

function requestAccessToken() {
  const clientId = getGooglePhotosClientId();
  if (!clientId) {
    return Promise.reject(
      new Error('Falta EXPO_PUBLIC_GOOGLE_PHOTOS_CLIENT_ID. Configúralo en .env y Vercel.')
    );
  }

  if (cachedToken && Date.now() < cachedTokenExpiry - 60_000) {
    return Promise.resolve(cachedToken);
  }

  return loadGisScript().then(
    () =>
      new Promise((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: PICKER_SCOPE,
          callback: (response) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error));
              return;
            }
            cachedToken = response.access_token;
            const expiresIn = Number(response.expires_in) || 3600;
            cachedTokenExpiry = Date.now() + expiresIn * 1000;
            resolve(cachedToken);
          },
          error_callback: (err) => {
            reject(new Error(err?.message || 'Autorización de Google cancelada'));
          },
        });
        client.requestAccessToken({ prompt: '' });
      })
  );
}

async function pickerFetch(path, accessToken, options = {}) {
  const response = await fetch(`${PICKER_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || `Picker API ${response.status}`);
  }
  return data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parsea "5s" / "300s" / números de la pollingConfig de Google. */
function parseDurationMs(value, fallbackMs) {
  if (value == null || value === '') return fallbackMs;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1000 ? value : value * 1000;
  }
  const raw = String(value).trim();
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m)?$/i);
  if (!match) {
    const asNum = Number(raw);
    return Number.isFinite(asNum) && asNum > 0 ? asNum : fallbackMs;
  }
  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  if (unit === 'ms') return amount;
  if (unit === 'm') return amount * 60_000;
  return amount * 1000;
}

function withAutoclose(pickerUri) {
  if (!pickerUri || pickerUri.includes('/autoclose')) return pickerUri;
  try {
    const url = new URL(pickerUri);
    url.pathname = `${url.pathname.replace(/\/$/, '')}/autoclose`;
    return url.toString();
  } catch {
    return `${pickerUri.replace(/\/$/, '')}/autoclose`;
  }
}

function isPopupClosed(popup) {
  if (!popup) return true;
  try {
    return Boolean(popup.closed);
  } catch {
    // COOP (Brave/Chrome) puede bloquear window.closed — no abortar por eso
    return false;
  }
}

function safeClosePopup(popup) {
  if (!popup) return;
  try {
    if (!popup.closed) popup.close();
  } catch {
    // ignore COOP
  }
}

/**
 * @param {{ multiple?: boolean, maxItems?: number }} [options]
 * @returns {Promise<File[]>}
 */
export async function pickGooglePhotosFiles(options = {}) {
  const { multiple = false, maxItems = multiple ? 12 : 1 } = options;
  const accessToken = await requestAccessToken();

  const session = await pickerFetch('/sessions', accessToken, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  const sessionId = session.id || session.sessionId;
  const pickerUri = session.pickerUri;
  if (!sessionId || !pickerUri) {
    throw new Error('La sesión de Google Fotos no devolvió pickerUri');
  }

  // Sin noopener: hace falta la referencia. COOP puede limitar .closed; lo manejamos.
  const pickerUrl = withAutoclose(pickerUri);
  const popup = window.open(pickerUrl, 'google-photos-picker', 'width=980,height=780');

  if (!popup) {
    throw new Error(
      'El navegador bloqueó la ventana de Google Fotos. Permite ventanas emergentes y prueba en Chrome (Brave a veces bloquea el Picker).'
    );
  }

  try {
    popup.focus();
  } catch {
    // ignore
  }

  const pollMs = parseDurationMs(session.pollingConfig?.pollInterval, 2000);
  const timeoutMs = parseDurationMs(session.pollingConfig?.timeoutIn, 5 * 60 * 1000);
  const started = Date.now();

  let mediaItemsSet = false;
  while (!mediaItemsSet) {
    if (Date.now() - started > timeoutMs) {
      try {
        await pickerFetch(`/sessions/${encodeURIComponent(sessionId)}`, accessToken, {
          method: 'DELETE',
        });
      } catch {
        // ignore cleanup errors
      }
      safeClosePopup(popup);
      throw new Error(
        'Tiempo agotado. En la ventana de Google Fotos elige las fotos y pulsa Done/Listo.'
      );
    }

    if (isPopupClosed(popup)) {
      // Dale un poll más por si cerró tras confirmar (autoclose)
      await sleep(Math.min(pollMs, 1500));
      const last = await pickerFetch(`/sessions/${encodeURIComponent(sessionId)}`, accessToken);
      if (last.mediaItemsSet) {
        mediaItemsSet = true;
        break;
      }
      try {
        await pickerFetch(`/sessions/${encodeURIComponent(sessionId)}`, accessToken, {
          method: 'DELETE',
        });
      } catch {
        // ignore
      }
      throw new Error('Cerraste Google Fotos sin elegir fotos. Vuelve a intentarlo.');
    }

    await sleep(pollMs);
    const status = await pickerFetch(`/sessions/${encodeURIComponent(sessionId)}`, accessToken);
    mediaItemsSet = Boolean(status.mediaItemsSet);
  }

  safeClosePopup(popup);

  const listed = await pickerFetch(
    `/mediaItems?sessionId=${encodeURIComponent(sessionId)}&pageSize=50`,
    accessToken
  );

  const items = Array.isArray(listed.mediaItems) ? listed.mediaItems : [];
  const photos = items.filter((item) => {
    const type = String(item.type || item.mediaType || '').toUpperCase();
    const mime = item.mediaFile?.mimeType || '';
    return type === 'PHOTO' || mime.startsWith('image/');
  });

  if (!photos.length) {
    throw new Error('No se seleccionó ninguna foto');
  }

  const selected = photos.slice(0, Math.max(1, maxItems));
  if (!multiple && selected.length > 1) {
    selected.length = 1;
  }

  const files = [];
  for (const item of selected) {
    const mediaFile = item.mediaFile || {};
    const baseUrl = mediaFile.baseUrl;
    if (!baseUrl) continue;

    // =d descarga el original; fallback a tamaño grande
    const downloadUrl = `${baseUrl}=d`;
    let blobResponse = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!blobResponse.ok) {
      blobResponse = await fetch(`${baseUrl}=w2048-h2048`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }

    if (!blobResponse.ok) {
      throw new Error(`No se pudo descargar una foto (${blobResponse.status})`);
    }

    const blob = await blobResponse.blob();
    const mime = mediaFile.mimeType || blob.type || 'image/jpeg';
    const rawName = mediaFile.filename || `google-photo-${item.id || Date.now()}.jpg`;
    const safeName = String(rawName).replace(/[^\w.\- ]+/g, '_') || 'google-photo.jpg';
    files.push(new File([blob], safeName, { type: mime }));
  }

  if (!files.length) {
    throw new Error('No se pudieron descargar las fotos seleccionadas');
  }

  try {
    await pickerFetch(`/sessions/${encodeURIComponent(sessionId)}`, accessToken, {
      method: 'DELETE',
    });
  } catch {
    // ignore
  }

  return files;
}
