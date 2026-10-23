import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { ref, getBytes, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// These suites need the Firestore + Storage emulators. They run via
// `pnpm emulators -- "pnpm --filter functions test:emulator"`; a plain
// `pnpm test` (no FIRESTORE_EMULATOR_HOST) skips them.
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const root = resolve(import.meta.dirname, '../..');

const CLOSED = [
  'waitlist',
  'waitlistEmails',
  'usernames',
  'teamApplications',
  'ambassadorApplications',
  'backings',
  'founderMessages',
  'mail',
  'rateLimits',
  'requests',
];

describe.skipIf(!hasEmulator)('security rules', () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-stepq',
      firestore: { rules: readFileSync(resolve(root, 'firestore.rules'), 'utf8') },
      storage: { rules: readFileSync(resolve(root, 'storage.rules'), 'utf8') },
    });
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'public/stats'), { waitlistCount: 3, updatedAt: 1 });
      await setDoc(doc(db, 'public/backers'), { names: ['A'], updatedAt: 1 });
      await setDoc(doc(db, 'public/other'), { secret: true });
      for (const c of CLOSED) await setDoc(doc(db, `${c}/x`), { v: 1 });
    });
  });

  afterAll(async () => {
    await env?.cleanup();
  });

  it('lets an unauthenticated client get public/stats and public/backers', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'public/stats')));
    await assertSucceeds(getDoc(doc(db, 'public/backers')));
  });

  it('denies get of other public docs and list of public', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'public/other')));
    await assertFails(getDocs(collection(db, 'public')));
  });

  it('denies all writes to public/*', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'public/stats'), { waitlistCount: 999 }));
    await assertFails(setDoc(doc(db, 'public/backers'), { names: ['x'] }));
    await assertFails(setDoc(doc(db, 'public/new'), { a: 1 }));
  });

  it.each(CLOSED)('denies read and write on %s', async (name) => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, `${name}/x`)));
    await assertFails(getDocs(collection(db, name)));
    await assertFails(setDoc(doc(db, `${name}/y`), { v: 2 }));
  });

  it('denies signed-in clients too', async () => {
    const db = env.authenticatedContext('u1').firestore();
    await assertFails(getDoc(doc(db, 'waitlist/x')));
    await assertFails(setDoc(doc(db, 'public/stats'), { waitlistCount: 1 }));
  });

  it('denies storage read and write of resumes/x.pdf', async () => {
    const storage = env.unauthenticatedContext().storage();
    const file = ref(storage, 'resumes/x.pdf');
    await assertFails(getBytes(file));
    await assertFails(uploadBytes(file, new Uint8Array([1, 2, 3])));
    expect(file.fullPath).toBe('resumes/x.pdf');
  });
});
