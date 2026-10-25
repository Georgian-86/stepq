import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { ReCaptchaEnterpriseProvider, initializeAppCheck, type AppCheck } from 'firebase/app-check';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { PREVIEW_MODE } from './preview';

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

// Preview builds have no Firebase project: nothing is initialised and nothing reads these
// (api.ts and usePublicDoc.ts short-circuit on PREVIEW_MODE first).
export const app = (PREVIEW_MODE ? null : (getApps()[0] ?? initializeApp(config))) as FirebaseApp;
export const db = (PREVIEW_MODE ? null : getFirestore(app)) as Firestore;
export const functions = (PREVIEW_MODE ? null : getFunctions(app, REGION)) as Functions;

type Flags = { __stepqEmulators?: boolean; __stepqAppCheck?: AppCheck | null };
const flags = globalThis as typeof globalThis & Flags;

// Connect once per JS realm (survives HMR re-evaluation of this module).
if (useEmulators && !PREVIEW_MODE && !flags.__stepqEmulators) {
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
  if (typeof window === 'undefined' || useEmulators || PREVIEW_MODE) return null;
  if (flags.__stepqAppCheck !== undefined) return flags.__stepqAppCheck;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_KEY;
  if (!siteKey) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        'App Check is off: NEXT_PUBLIC_RECAPTCHA_KEY is not set, so callables will be rejected.',
      );
    }
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
