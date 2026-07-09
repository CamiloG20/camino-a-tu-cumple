self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
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

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Camino a tu cumple 💌', {
      body: payload.body || 'Hay una nueva sorpresa para ti.',
      icon: '/logo192.png',
      badge: '/favicon.png',
      tag: payload.tag || 'daily-reminder',
      data: { url: payload.url || '/' },
      vibrate: [180, 90, 180],
    })
  );
});
