import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported, Messaging } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Use initializeFirestore with force long polling for resilient connections in iframe / cloud sandboxes
export const db = (() => {
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true
    }, dbId);
  } catch {
    // If already initialized or fallback
    return dbId && dbId !== '(default)'
      ? getFirestore(app, dbId)
      : getFirestore(app);
  }
})();

let messagingInstance: Messaging | null = null;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    if (!messagingInstance) {
      messagingInstance = getMessaging(app);
    }
    return messagingInstance;
  } catch (err) {
    console.warn('Firebase Messaging not supported in this browser context:', err);
    return null;
  }
}

export default app;

