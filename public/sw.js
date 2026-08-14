// Masud Telecom Service Worker for Home Screen Notifications & Offline Cache
const CACHE_NAME = 'masud-telecom-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for message from main app to show notification with 3+ second vibration & sound
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_HOME_SCREEN_NOTIFICATION') {
    const title = event.data.title || '🎉 Masud Telecom Added to Home Screen';
    const options = {
      body: event.data.body || 'App shortcut is now saved on your mobile home screen. Tap to launch anytime!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [1000, 150, 1000, 150, 1000], // 3.3 seconds vibration pattern (> 3 seconds)
      tag: 'home-screen-shortcut-installed',
      renotify: true,
      requireInteraction: true,
      data: {
        url: '/'
      },
      actions: [
        { action: 'open', title: 'Open App' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
