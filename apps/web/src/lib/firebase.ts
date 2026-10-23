import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { ReCaptchaEnterpriseProvider, initializeAppCheck, type AppCheck } from 'firebase/app-check';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

export const REGION = 'asia-south1';
export const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === '1';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || (useEmulators ? 'demo-key' : undefined),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || (useEmulators ? 'demo-stepq' : undefined),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app: FirebaseApp = getApps()[0] ?? initializeApp(config);
export const db = getFirestore(app);
export const functions = getFunctions(app, REGION);

type Flags = { __stepqEmulators?: boolean; __stepqAppCheck?: AppCheck | null };
const flags = globalThis as typeof globalThis & Flags;

// Connect once per JS realm (survives HMR re-evaluation of this module).
if (useEmulators && !flags.__stepqEmulators) {
  flags.__stepqEmulators = true;
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

/**
 * Starts App Check in the browser (idempotent). Skipped with the emulators: they do not
 * enforce App Check and reCAPTCHA is unreachable there. In local development against a real
 * project, a debug token is used instead of a reCAPTCHA challenge.
 */
export function initAppCheck(): AppCheck | null {
  if (typeof window === 'undefined' || useEmulators) return null;
  if (flags.__stepqAppCheck !== undefined) return flags.__stepqAppCheck;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_KEY;
  if (!siteKey) {
    flags.__stepqAppCheck = null;
    return null;
  }
  if (process.env.NODE_ENV === 'development') {
    (
      self as typeof self & { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  flags.__stepqAppCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return flags.__stepqAppCheck;
}
