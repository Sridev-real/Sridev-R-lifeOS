// Firebase configuration & client architecture
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore } from 'firebase/firestore';

const fallbackConfig = {
  apiKey: "AIzaSyAJ4hlRlq2ctg7OAH2eDVOJcYEcCv2Uxck",
  authDomain: "dev-s-3c8eb.firebaseapp.com",
  projectId: "dev-s-3c8eb",
  storageBucket: "dev-s-3c8eb.firebasestorage.app",
  messagingSenderId: "429497325014",
  appId: "1:429497325014:web:08169472b88cd734bf4077",
  measurementId: "G-BFHT8B1V8R"
};

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || fallbackConfig.apiKey;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain;
export const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || fallbackConfig.projectId;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId;
const appId = import.meta.env.VITE_FIREBASE_APP_ID || fallbackConfig.appId;

export const isFirebaseConfigValid = true;

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId
};

let app: any;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (err) {
  console.error('[AUTH] Firebase initialization error:', err);
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Safe diagnostic logging (no secrets exposed)
console.log('[FIREBASE DIAGNOSTICS]', {
  initialized: Boolean(app),
  projectId: projectId,
  authAvailable: Boolean(auth),
  currentAuthUid: auth?.currentUser?.uid || 'none'
});

let firestoreInstance: Firestore | null = null;
try {
  if (app) {
    firestoreInstance = initializeFirestore(app, { experimentalForceLongPolling: true });
  }
} catch (err) {
  console.warn('[AUTH] Firestore client initialization deferred:', err);
}
export const db = firestoreInstance;

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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User-Isolated Path Generators
export const getUserDocPath = (uid: string) => `users/${uid}`;
export const getVaultCollectionPath = (uid: string) => `users/${uid}/vault`;
export const getProblemsCollectionPath = (uid: string) => `users/${uid}/problems`;
export const getOpportunitiesCollectionPath = (uid: string) => `users/${uid}/opportunities`;
export const getDeadlinesCollectionPath = (uid: string) => `users/${uid}/deadlines`;
export const getActionsCollectionPath = (uid: string) => `users/${uid}/actions`;

export default app;
