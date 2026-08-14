import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Use initializeFirestore with auto detect long polling for resilient connections in iframe / cloud sandboxes
export const db = (() => {
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      experimentalForceLongPolling: false
    }, dbId);
  } catch {
    // If already initialized or fallback
    return dbId && dbId !== '(default)'
      ? getFirestore(app, dbId)
      : getFirestore(app);
  }
})();

export default app;

