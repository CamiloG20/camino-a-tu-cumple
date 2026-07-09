import { getAdminApiUrl } from '../lib/config';

const TOKEN_KEY = 'admin_token';
const LEGACY_PASSWORD_KEY = 'admin_password';

export function getStoredAdminToken() {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredAdminToken(token) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.removeItem(LEGACY_PASSWORD_KEY);
}

export function clearStoredAdminToken() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(LEGACY_PASSWORD_KEY);
}

export function isAdminAuthenticated() {
  return Boolean(getStoredAdminToken());
}

async function adminFetch(path, options = {}) {
  const token = getStoredAdminToken();
  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${getAdminApiUrl()}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    clearStoredAdminToken();
  }

  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}`);
  }

  return data;
}

export const AdminApi = {  verify(password) {
    return fetch(`${getAdminApiUrl()}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Contraseña incorrecta');
      if (data.token) {
        setStoredAdminToken(data.token);
      }
      return data;
    });
  },

  getDays() {
    return adminFetch('/api/days');
  },

  signMediaUrl(path) {
    return adminFetch('/api/media/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    }).then((data) => data.url);
  },

  saveDay(dayNumber, payload) {
    return adminFetch(`/api/days/${dayNumber}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  uploadFile(dayNumber, file, type) {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    return adminFetch(`/api/days/${dayNumber}/upload`, {
      method: 'POST',
      body: form,
    });
  },

  downloadAudio(dayNumber, url) {
    return adminFetch(`/api/days/${dayNumber}/download-audio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  },

  deleteMedia(dayNumber, paths) {
    return adminFetch(`/api/days/${dayNumber}/delete-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    });
  },

  getAppConfig() {
    return adminFetch('/api/app-config');
  },

  saveAppConfig(payload) {
    return adminFetch('/api/app-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  uploadGlobalBackground(file) {
    const form = new FormData();
    form.append('file', file);
    return adminFetch('/api/app-config/background', {
      method: 'POST',
      body: form,
    });
  },

  deleteGlobalBackground() {
    return adminFetch('/api/app-config/background', {
      method: 'DELETE',
    });
  },
};
