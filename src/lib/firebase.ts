import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Using initializeFirestore with offline persistence enabled
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, firebaseConfig.firestoreDatabaseId);

// Using initializeAuth for better control in iframe/preview environments
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});

export const storage = getStorage(app);

// Validation check
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && (error.message.includes('offline') || error.message.includes('permission-denied'))) {
      console.warn("Firestore connection check failed or restricted:", error.message);
    }
  }
}
testConnection();
