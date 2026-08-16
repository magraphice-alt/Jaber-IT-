// Masud Telecom Service Worker for Mobile Notifications & Home Screen Shortcuts
const CACHE_NAME = 'masud-telecom-v5';

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

// Handle Web Push notification events when the web app is closed or running in background
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const rawTitle = data.title || 'Account Notification';
  const title = rawTitle.startsWith('Masud Telecom') ? rawTitle : `Masud Telecom: ${rawTitle.replace(/^[^\w\s]+/, '').trim()}`;
  const body = data.body || data.message || 'New activity in your Masud Telecom account.';
  const count = typeof data.badgeCount === 'number' ? data.badgeCount : 1;

  if ('setAppBadge' in self.navigator && count > 0) {
    self.navigator.setAppBadge(count).catch(() => {});
  }

  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/badge-icon.png',
    vibrate: [600, 150, 600, 150, 600, 150, 600], // Mobile vibration alert
    silent: false,
    renotify: true,
    timestamp: Date.now(),
    tag: `masud-push-${Date.now()}`,
    requireInteraction: true,
    data: {
      url: data.url || '/?tab=send',
      dateOfArrival: Date.now()
    },
    actions: [
      { action: 'open', title: 'Open App' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Show legitimate mobile notification in device status bar / notification drawer with sound & vibration
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_HOME_SCREEN_NOTIFICATION') {
    let rawTitle = event.data.title || 'Account Notification';
    const title = rawTitle.startsWith('Masud Telecom') ? rawTitle : `Masud Telecom: ${rawTitle.replace(/^[^\w\s]+/, '').trim()}`;
    const body = event.data.body || 'Activity updated in your Masud Telecom account.';
    const count = typeof event.data.badgeCount === 'number' ? event.data.badgeCount : 1;

    if ('setAppBadge' in self.navigator && count > 0) {
      self.navigator.setAppBadge(count).catch(() => {});
    }

    const options = {
      body,
      icon: '/icon-192.png',
      badge: '/badge-icon.png',
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
  } else if (event.data && event.data.type === 'UPDATE_BADGE_COUNT') {
    const count = Number(event.data.count) || 0;
    if ('setAppBadge' in self.navigator) {
      if (count > 0) {
        self.navigator.setAppBadge(count).catch(() => {});
      } else if ('clearAppBadge' in self.navigator) {
        self.navigator.clearAppBadge().catch(() => {});
      }
    }
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
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
