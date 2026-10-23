import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function db() {
  if (getApps().length === 0) initializeApp();
  return getFirestore();
}
