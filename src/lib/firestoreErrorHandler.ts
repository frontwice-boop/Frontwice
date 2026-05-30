import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed: ', JSON.stringify(errInfo));

  const lowerMsg = errorMessage.toLowerCase();
  const isQuotaExceeded = lowerMsg.includes('quota') || 
                          lowerMsg.includes('exhausted') || 
                          lowerMsg.includes('exceeded') || 
                          lowerMsg.includes('resource_exhausted');

  if (isQuotaExceeded) {
     const quotaDetail = `Firestore daily quota limit exceeded. Free daily read/write limits have been reached for your project. This free-tier quota resets daily at midnight Pacific Time. Learn more about Spark plan limits at https://firebase.google.com/pricing#cloud-firestore. To upgrade your database or inspect detailed usage metrics, please visit: https://console.firebase.google.com/project/gen-lang-client-0496666046/firestore/databases/ai-studio-259b562f-e18e-4b6c-a9fc-e2016e808a59/data?openUpgradeDialog=true`;
     const event = new CustomEvent('firestore-quota-exceeded', { detail: quotaDetail });
     window.dispatchEvent(event);
  } else if (lowerMsg.includes('permission') || lowerMsg.includes('missing or insufficient permissions')) {
     const event = new CustomEvent('firestore-error', { detail: 'Access restricted: Permission denied by database. Please make sure you are logged in.' });
     window.dispatchEvent(event);
  } else {
     // Output the actual underlying error to the UI so we can see what is disrupting the db
     const event = new CustomEvent('firestore-error', { detail: `Database signal disrupted: ${errorMessage}` });
     window.dispatchEvent(event);
  }

  throw new Error(JSON.stringify(errInfo));
}
