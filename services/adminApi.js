import { getAdminApiUrl } from '../lib/config';

const STORAGE_KEY = 'admin_password';

export function getStoredAdminPassword() {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setStoredAdminPassword(password) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, password);
}

export function clearStoredAdminPassword() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}

async function adminFetch(path, options = {}) {
  const password = getStoredAdminPassword();
  const headers = {
    ...(options.headers || {}),
    'x-admin-password': password || '',
  };

  const response = await fetch(`${getAdminApiUrl()}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}`);
  }

  return data;
}

export const AdminApi = {
  verify(password) {
    return fetch(`${getAdminApiUrl()}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Contraseña incorrecta');
      setStoredAdminPassword(password);
      return data;
    });
  },

  getDays() {
    return adminFetch('/api/days');
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
};
