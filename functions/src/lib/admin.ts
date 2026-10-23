import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function app() {
  // Check for the default app specifically: in the emulator the Functions runtime registers its
  // own named app before a Firestore trigger runs, so "any app exists" is not enough.
  if (!getApps().some((a) => a.name === '[DEFAULT]')) {
    // In production FIREBASE_CONFIG supplies the bucket; the fallback covers emulators/tests.
    const project = process.env.GCLOUD_PROJECT;
    const hasConfig = Boolean(process.env.FIREBASE_CONFIG);
    initializeApp(!hasConfig && project ? { storageBucket: `${project}.appspot.com` } : undefined);
  }
}

export function db() {
  app();
  return getFirestore();
}

export function bucket() {
  app();
  return getStorage().bucket();
}
