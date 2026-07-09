self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || self.location.origin + '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client && targetUrl) {
            return client.navigate(targetUrl).then(() => client.focus());
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Camino a tu cumple', body: event.data.text() };
  }

  const title = payload.title || '✨ Día desbloqueado';
  const body = payload.body || 'Tu sorpresa de hoy ya te espera. Abre la app 💌';
  const targetUrl = payload.url || self.location.origin + '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/logo192.png',
      badge: '/favicon.png',
      tag: payload.tag || 'daily-reminder',
      data: { url: targetUrl },
      vibrate: [200, 100, 200],
      requireInteraction: true,
    })
  );
});
