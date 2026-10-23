import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function app() {
  if (getApps().length === 0) {
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
