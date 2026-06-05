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
     const quotaDetail = `Service temporarily unavailable due to high demand. Please try again in a few hours.`;
     const event = new CustomEvent('firestore-quota-exceeded', { detail: quotaDetail });
     window.dispatchEvent(event);
  } else if (lowerMsg.includes('permission') || lowerMsg.includes('missing or insufficient permissions')) {
     const event = new CustomEvent('firestore-error', { detail: 'Please make sure you are logged in to perform this action.' });
     window.dispatchEvent(event);
  } else {
     const event = new CustomEvent('firestore-error', { detail: `Unable to complete request. Please try again later.` });
     window.dispatchEvent(event);
  }

  throw new Error(JSON.stringify(errInfo));
}
