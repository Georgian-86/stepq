import { firstName } from '@stepq/core';
import { normalizeUsername, usernameProblem, waitlistInput, type Api } from '@stepq/schemas';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { SITE_URL } from '../config';
import { db } from '../lib/admin';
import { once } from '../lib/idempotency';
import { callOptions } from '../lib/appCheck';
import { queueMail } from '../lib/mail';
import { enforceRateLimit } from '../lib/rateLimit';
import { signToken, verifyToken } from '../lib/signedToken';
import { parseOrThrow } from '../lib/validate';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

type Req = Pick<CallableRequest, 'data' | 'rawRequest'>;

export async function joinWaitlistHandler(req: Req): Promise<Api['joinWaitlist']['out']> {
  const input = parseOrThrow(waitlistInput, req.data);
  await enforceRateLimit(req, 'join', 10, 600);

  return once('join', input.requestId, async (tx) => {
    const emailRef = db().doc(`waitlistEmails/${input.email}`);
    const statsRef = db().doc('public/stats');
    const [emailSnap, statsSnap] = await Promise.all([tx.get(emailRef), tx.get(statsRef)]);

    if (emailSnap.exists) {
      const id = (emailSnap.data() as { id: string }).id;
      const entry = (await tx.get(db().doc(`waitlist/${id}`))).data() as
        { position: number; name: string; username?: string } | undefined;
      const position = entry?.position ?? 0;
      if (entry && !entry.username) {
        const token = signToken({ k: 'reserve', id, exp: Date.now() + 7 * DAY });
        queueMail(tx, {
          to: input.email,
          subject: '',
          template: 'reserveLink',
          props: {
            firstName: firstName(entry.name),
            position,
            reserveUrl: `${SITE_URL.value()}/?modal=reserve&token=${token}`,
          },
        });
      }
      return { status: 'existing' as const, position, email: input.email };
    }

    const position = ((statsSnap.data()?.waitlistCount as number | undefined) ?? 0) + 1;
    const ref = db().collection('waitlist').doc();
    tx.set(ref, {
      name: input.name,
      email: input.email,
      gender: input.gender,
      ageGroup: input.ageGroup,
      ...(input.source ? { source: input.source } : {}),
      position,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(emailRef, { id: ref.id });
    tx.set(
      statsRef,
      { waitlistCount: position, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return {
      status: 'joined' as const,
      position,
      reserveToken: signToken({ k: 'reserve', id: ref.id, exp: Date.now() + 30 * MIN }),
      email: input.email,
    };
  });
}

export async function checkUsernameHandler(req: Req): Promise<Api['checkUsername']['out']> {
  const { username } = parseOrThrow(z.object({ username: z.string().max(100) }), req.data);
  await enforceRateLimit(req, 'checkUsername', 60, 600);
  const problem = usernameProblem(username);
  if (problem) return { available: false, reason: problem };
  const snap = await db()
    .doc(`usernames/${normalizeUsername(username)}`)
    .get();
  return snap.exists ? { available: false, reason: 'taken' } : { available: true };
}

export async function reserveUsernameHandler(req: Req): Promise<Api['reserveUsername']['out']> {
  const { username: raw, reserveToken } = parseOrThrow(
    z.object({ username: z.string().max(100), reserveToken: z.string().max(1000) }),
    req.data,
  );
  const { id } = verifyToken(reserveToken, 'reserve');
  const problem = usernameProblem(raw);
  if (problem) {
    throw new HttpsError('invalid-argument', 'Check the highlighted fields', {
      fields: {
        username:
          problem === 'reserved' ? 'That name is reserved.' : 'Use 3–20 letters, numbers, . or _',
      },
    });
  }
  const username = normalizeUsername(raw);

  await db().runTransaction(async (tx) => {
    const entryRef = db().doc(`waitlist/${id}`);
    const nameRef = db().doc(`usernames/${username}`);
    const [entry, name] = await Promise.all([tx.get(entryRef), tx.get(nameRef)]);
    if (!entry.exists) throw new HttpsError('permission-denied', 'This link is not valid.');
    const existing = (entry.data() as { username?: string }).username;
    if (existing) throw new HttpsError('failed-precondition', `You already reserved @${existing}`);
    if (name.exists) {
      throw new HttpsError('already-exists', 'Taken. Try another.', {
        fields: { username: 'Taken. Try another.' },
      });
    }
    tx.set(nameRef, { waitlistId: id, createdAt: FieldValue.serverTimestamp() });
    tx.update(entryRef, { username });
  });
  return { username };
}

export const joinWaitlist = onCall(callOptions, joinWaitlistHandler);
export const checkUsername = onCall(callOptions, checkUsernameHandler);
export const reserveUsername = onCall(callOptions, reserveUsernameHandler);
