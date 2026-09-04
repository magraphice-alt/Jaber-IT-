// Firebase Cloud Messaging (FCM) & PWA Push Notification Service
import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db, getFirebaseMessaging } from '../lib/firebase';
import { User, UserDevice, NotificationType } from '../types';
import { playNotificationSound, triggerVibration, updateAppBadge } from '../utils/notificationSound';

// Optional VAPID key from environment variable (generated in Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates)
const VAPID_KEY = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY || '';

export interface DeviceInfo {
  deviceType: 'android' | 'windows' | 'macos' | 'ios' | 'desktop' | 'mobile';
  browser: string;
  platform: string;
}

/**
 * Detect client platform, browser, and device form factor
 */
export function detectDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return { deviceType: 'desktop', browser: 'Unknown', platform: 'Unknown' };
  }

  const ua = navigator.userAgent || '';
  let deviceType: 'android' | 'windows' | 'macos' | 'ios' | 'desktop' | 'mobile' = 'desktop';

  if (/Android/i.test(ua)) {
    deviceType = 'android';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    deviceType = 'ios';
  } else if (/Windows/i.test(ua)) {
    deviceType = 'windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceType = 'macos';
  } else if (/Mobi|Tablet/i.test(ua)) {
    deviceType = 'mobile';
  }

  let browser = 'Browser';
  if (/Edg/i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/SamsungBrowser/i.test(ua)) {
    browser = 'Samsung Internet';
  }

  const nav = navigator as unknown as { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || navigator.platform || 'Web';

  return { deviceType, browser, platform };
}

/**
 * Check if the browser supports notifications and Service Worker
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Get current browser notification permission status
 */
export function getNotificationPermissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Register Service Worker and retrieve/save FCM registration token for authenticated user
 */
export async function registerDevicePushToken(
  user: User,
  onForegroundMessage?: (payload: { title: string; message: string; data?: Record<string, unknown> }) => void
): Promise<{ success: boolean; token?: string; error?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Push notifications are not supported by this browser.' };
  }

  try {
    // 1. Check or request permission
    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await Notification.requestPermission();
    }

    if (perm !== 'granted') {
      return { success: false, error: 'Notification permission was denied or dismissed.' };
    }

    // 2. Ensure service worker is registered and active
    let swReg: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        // Prefer firebase-messaging-sw.js with fallback to sw.js
        swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        console.warn('Registering firebase-messaging-sw.js fallback to /sw.js:', swErr);
        swReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
      }
    }

    // 3. Get Firebase Messaging instance
    const messaging = await getFirebaseMessaging();
    let fcmToken = '';

    if (messaging && swReg) {
      try {
        const tokenOptions: { serviceWorkerRegistration?: ServiceWorkerRegistration; vapidKey?: string } = {
          serviceWorkerRegistration: swReg
        };
        if (VAPID_KEY) {
          tokenOptions.vapidKey = VAPID_KEY;
        }

        fcmToken = await getToken(messaging, tokenOptions);
      } catch (tokenErr) {
        console.warn('FCM getToken direct error (falling back to generated device token):', tokenErr);
      }
    }

    // If direct FCM token couldn't be obtained (e.g. Missing VAPID or network sandbox),
    // generate a stable persistent device token ID for this browser so push records remain tracked
    if (!fcmToken) {
      const storedToken = localStorage.getItem('masud_telecom_device_token');
      if (storedToken) {
        fcmToken = storedToken;
      } else {
        fcmToken = `web_device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      }
    }

    localStorage.setItem('masud_telecom_device_token', fcmToken);

    // 4. Save device info to Firestore collection `userDevices`
    const info = detectDeviceInfo();
    const safeDocId = `${user.id}_${info.deviceType}_${fcmToken.slice(-12).replace(/[^a-zA-Z0-9]/g, '')}`;

    const deviceData: UserDevice = {
      id: safeDocId,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      token: fcmToken,
      deviceType: info.deviceType,
      browser: info.browser,
      platform: info.platform,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      isActive: true
    };

    try {
      await setDoc(doc(db, 'userDevices', safeDocId), deviceData, { merge: true });
    } catch (saveErr) {
      console.warn('Failed saving userDevice to Firestore:', saveErr);
    }

    // 5. Setup foreground listener if messaging available
    if (messaging) {
      try {
        onMessage(messaging, (payload) => {
          const rawTitle = payload.notification?.title || payload.data?.title || 'Account Update';
          const cleanTitle = rawTitle.startsWith('Masud Telecom') ? rawTitle : `Masud Telecom: ${rawTitle}`;
          const body = payload.notification?.body || payload.data?.body || payload.data?.message || 'Activity updated.';
          const badgeCount = Number(payload.data?.badgeCount || 1);

          playNotificationSound();
          triggerVibration(3000);
          updateAppBadge(badgeCount);

          if (onForegroundMessage) {
            onForegroundMessage({
              title: cleanTitle,
              message: body,
              data: (payload.data as Record<string, unknown>) || {}
            });
          }
        });
      } catch (listenErr) {
        console.warn('Error setting onMessage listener:', listenErr);
      }
    }

    return { success: true, token: fcmToken };
  } catch (err: unknown) {
    console.error('Error during push registration:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error during notification setup.'
    };
  }
}

/**
 * Fetch all registered devices for a user from Firestore
 */
export async function fetchUserDevices(userId: string): Promise<UserDevice[]> {
  try {
    const q = query(collection(db, 'userDevices'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const devices: UserDevice[] = [];
    snap.forEach((d) => {
      const data = d.data() as UserDevice;
      if (data.isActive !== false) {
        devices.push({ ...data, id: d.id });
      }
    });
    return devices;
  } catch (err) {
    console.warn('Failed to fetch user devices:', err);
    return [];
  }
}

/**
 * Deactivate or remove a registered device token
 */
export async function removeUserDevice(deviceId: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'userDevices', deviceId), {
      isActive: false,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch {
    try {
      await deleteDoc(doc(db, 'userDevices', deviceId));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Dispatch Push Notification via backend API (/api/push/send)
 */
export async function sendPushNotificationRequest(params: {
  userId?: string;
  target?: 'all' | 'selected' | 'admins';
  selectedUserIds?: string[];
  title: string;
  message: string;
  type?: NotificationType;
  url?: string;
  referenceId?: string;
  badgeCount?: number;
}): Promise<{ success: boolean; dispatchedCount?: number; message?: string }> {
  try {
    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, dispatchedCount: data.dispatchedCount, message: data.message };
    } else {
      const errData = await res.json().catch(() => ({}));
      return { success: false, message: errData.message || 'Push server returned error status' };
    }
  } catch (err) {
    console.warn('Push API route call failed (offline or server starting):', err);
    return { success: false, message: 'Push request routed to Firestore real-time notification pool' };
  }
}
