// Masud Telecom Service Worker for Mobile Notifications & Home Screen Shortcuts
const CACHE_NAME = 'masud-telecom-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
    ])
  );
});

// Show legitimate mobile notification in device status bar / notification drawer with sound & vibration
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_HOME_SCREEN_NOTIFICATION') {
    let rawTitle = event.data.title || 'Account Notification';
    // Format title cleanly without spam triggers
    const title = rawTitle.startsWith('Masud Telecom') ? rawTitle : `Masud Telecom: ${rawTitle.replace(/^[^\w\s]+/, '').trim()}`;
    const body = event.data.body || 'Activity updated in your Masud Telecom account.';
    
    const options = {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [600, 150, 600, 150, 600, 150, 600], // 3.4+ seconds vibration pattern
      silent: false,
      renotify: true,
      timestamp: Date.now(),
      tag: `masud-txn-${Date.now()}`,
      requireInteraction: false,
      data: {
        url: event.data.url || '/?tab=send',
        dateOfArrival: Date.now()
      },
      actions: [
        { action: 'open', title: 'Open Account' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Handle tap on system notification in mobile notification bar
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/?tab=send';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url && !client.url.includes(targetUrl)) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
