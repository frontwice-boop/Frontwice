import { auth, db } from '../lib/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { getAi } from '../lib/gemini';

export async function runCloudDiagnostics() {
  const results: Record<string, string> = {
    timestamp: new Date().toISOString(),
    auth: 'Pending...',
    firestore: 'Pending...',
    gemini: 'Pending...',
    environment: window.location.hostname.includes('ais-') ? 'AI Studio Preview' : 'Local/Other'
  };

  console.info('Starting Cloud System Diagnostics...');

  // 1. Auth Check
  try {
    results.auth = auth.currentUser 
      ? `AUTHENTICATED (UID: ${auth.currentUser.uid}, Email: ${auth.currentUser.email})` 
      : 'UNAUTHENTICATED';
    console.info(`Auth Status: ${results.auth}`);
  } catch (e: any) {
    results.auth = `AUTH_ERROR: ${e.message}`;
    console.error(results.auth);
  }

  // 2. Firestore Check
  try {
    // Check if we can reach the server
    await getDoc(doc(db, 'users', 'check_connection_only'));
    results.firestore = 'REACHABLE (Permission check handled by rules)';
    console.info(`Firestore Status: ${results.firestore}`);
  } catch (e: any) {
    if (e.message.includes('permission-denied')) {
      results.firestore = 'REACHABLE (Permission Denied as expected)';
      console.info(`Firestore Status: ${results.firestore}`);
    } else {
      results.firestore = `UNREACHABLE: ${e.message}`;
      console.error(results.firestore);
    }
  }

  // 3. Gemini Check
  try {
    const ai = getAi();
    if (ai) {
      results.gemini = 'INITIALIZED (Ready for generation)';
      console.info(`Gemini Status: ${results.gemini}`);
    } else {
      results.gemini = 'NOT_INITIALIZED';
      console.warn(results.gemini);
    }
  } catch (e: any) {
    results.gemini = `GEMINI_ERROR: ${e.message}`;
    console.error(results.gemini);
  }

  console.info('Diagnostics Complete.', results);
  return results;
}
