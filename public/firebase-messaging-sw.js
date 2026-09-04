// Masud Telecom - Firebase Messaging Service Worker for PWA Push Notifications
// Supports Android Mobile, Windows PC, macOS, and Desktop Browsers (Chrome, Edge, etc.)

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

const firebaseConfig = {
  projectId: "masud-telecom-9bc1e",
  appId: "1:470904821560:web:716b189f18dfe4cac113cd",
  apiKey: "AIzaSyCXHpiJHbo-VNr3DXJn8_SxvTnIUHhRvLI",
  authDomain: "masud-telecom-9bc1e.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-masudtelecom-af6e25de-4baa-479f-b28e-cb0fa81dce98",
  storageBucket: "masud-telecom-9bc1e.firebasestorage.app",
  messagingSenderId: "470904821560"
};

firebase.initializeApp(firebaseConfig);

let messaging = null;
try {
  messaging = firebase.messaging();
} catch (e) {
  console.log('Firebase messaging compat init in sw:', e);
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Format notification title
function formatNotificationTitle(rawTitle) {
  if (!rawTitle) return 'Masud Telecom: Account Notification';
  const clean = rawTitle.replace(/^[^\w\s]+/, '').trim();
  if (clean.toLowerCase().startsWith('masud telecom')) {
    return clean;
  }
  return `Masud Telecom: ${clean}`;
}

// Background message handler from Firebase Cloud Messaging
if (messaging && typeof messaging.onBackgroundMessage === 'function') {
  messaging.onBackgroundMessage((payload) => {
    const title = formatNotificationTitle(payload.notification?.title || payload.data?.title || 'Account Notification');
    const body = payload.notification?.body || payload.data?.body || payload.data?.message || 'New update in your Masud Telecom account.';
    const badgeCount = Number(payload.data?.badgeCount || payload.notification?.badge || 1);
    const targetUrl = payload.data?.url || payload.fcmOptions?.link || '/?tab=send';

    if ('setAppBadge' in self.navigator && badgeCount > 0) {
      self.navigator.setAppBadge(badgeCount).catch(() => {});
    }

    const notificationOptions = {
      body,
      icon: '/icon-192.png',
      badge: '/badge-icon.png',
      vibrate: [600, 150, 600, 150, 600, 150, 600],
      silent: false,
      renotify: true,
      tag: payload.data?.notificationId || `masud-push-${Date.now()}`,
      timestamp: Date.now(),
      requireInteraction: false,
      data: {
        url: targetUrl,
        notificationId: payload.data?.notificationId || '',
        type: payload.data?.type || '',
        referenceId: payload.data?.referenceId || ''
      },
      actions: [
        { action: 'open', title: 'Open Masud Telecom' }
      ]
    };

    return self.registration.showNotification(title, notificationOptions);
  });
}

// General Web Push event listener (handles all push notifications when closed or in background)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  // Support both FCM wrapped payload and raw Web Push payload
  const notifObj = data.notification || {};
  const dataObj = data.data || {};

  const title = formatNotificationTitle(notifObj.title || dataObj.title || data.title || 'Account Notification');
  const body = notifObj.body || dataObj.body || dataObj.message || data.body || data.message || 'Activity updated in your account.';
  const targetUrl = dataObj.url || data.url || '/?tab=send';
  const badgeCount = Number(dataObj.badgeCount || data.badgeCount || 1);

  if ('setAppBadge' in self.navigator && badgeCount > 0) {
    self.navigator.setAppBadge(badgeCount).catch(() => {});
  }

  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/badge-icon.png',
    vibrate: [600, 150, 600, 150, 600, 150, 600],
    silent: false,
    renotify: true,
    tag: dataObj.notificationId || `masud-push-${Date.now()}`,
    timestamp: Date.now(),
    requireInteraction: false,
    data: {
      url: targetUrl,
      notificationId: dataObj.notificationId || '',
      type: dataObj.type || '',
      referenceId: dataObj.referenceId || ''
    },
    actions: [
      { action: 'open', title: 'Open App' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler - focuses existing window or opens new window and navigates to correct route
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/?tab=send';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl).catch(() => {});
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// App badge and message communication
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'UPDATE_BADGE_COUNT') {
    const count = Number(event.data.count) || 0;
    if ('setAppBadge' in self.navigator) {
      if (count > 0) {
        self.navigator.setAppBadge(count).catch(() => {});
      } else if ('clearAppBadge' in self.navigator) {
        self.navigator.clearAppBadge().catch(() => {});
      }
    }
  } else if (event.data.type === 'SHOW_HOME_SCREEN_NOTIFICATION') {
    const title = formatNotificationTitle(event.data.title);
    const body = event.data.body || 'Activity updated in your Masud Telecom account.';
    const badgeCount = Number(event.data.badgeCount) || 1;
    const targetUrl = event.data.url || '/?tab=send';

    if ('setAppBadge' in self.navigator && badgeCount > 0) {
      self.navigator.setAppBadge(badgeCount).catch(() => {});
    }

    const options = {
      body,
      icon: '/icon-192.png',
      badge: '/badge-icon.png',
      vibrate: [600, 150, 600, 150, 600, 150, 600],
      silent: false,
      renotify: true,
      tag: `masud-local-${Date.now()}`,
      timestamp: Date.now(),
      data: { url: targetUrl }
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});
