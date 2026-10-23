import { firstName, wallName } from '@stepq/core';
import { actionTokenInput, type Api, type ActionKind } from '@stepq/schemas';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { AMBASSADOR_KIT_URL } from '../config';
import { db } from '../lib/admin';
import { callOptions } from '../lib/appCheck';
import { queueMail } from '../lib/mail';
import { enforceRateLimit } from '../lib/rateLimit';
import { verifyAnyToken } from '../lib/signedToken';
import { parseOrThrow } from '../lib/validate';

type Req = Pick<CallableRequest, 'data' | 'rawRequest'>;

/** Kinds these callables act on; 'reserve' tokens belong to the waitlist flow. */
const ACTION_KINDS = [
  'approveAmbassador',
  'verifyBacking',
] as const satisfies readonly ActionKind[];
type HandledKind = (typeof ACTION_KINDS)[number];

const notFound = () => new HttpsError('not-found', 'This link is no longer valid.');

type Application = { name: string; email: string; city: string; status: 'pending' | 'approved' };

type Backing = {
  name: string;
  amount: number;
  reference: string;
  showOnWall: boolean;
  status: 'pending' | 'verified';
};

async function describe(
  kind: HandledKind,
  id: string,
): Promise<{ summary: string; done: boolean }> {
  switch (kind) {
    case 'approveAmbassador': {
      const snap = await db().doc(`ambassadorApplications/${id}`).get();
      if (!snap.exists) throw notFound();
      const a = snap.data() as Application;
      return {
        summary: `Approve ${a.name} (${a.city}) as an ambassador?`,
        done: a.status === 'approved',
      };
    }
    case 'verifyBacking': {
      const snap = await db().doc(`backings/${id}`).get();
      if (!snap.exists) throw notFound();
      const b = snap.data() as Backing;
      return {
        summary: `Verify ₹${b.amount.toLocaleString('en-IN')} from ${wallName(b.name)} (ref ${b.reference})?`,
        done: b.status === 'verified',
      };
    }
    default: {
      const unhandled: never = kind;
      throw new HttpsError('internal', `Unhandled action ${String(unhandled)}`);
    }
  }
}

async function confirm(kind: HandledKind, id: string): Promise<void> {
  switch (kind) {
    case 'approveAmbassador': {
      await db().runTransaction(async (tx) => {
        const ref = db().doc(`ambassadorApplications/${id}`);
        const snap = await tx.get(ref);
        if (!snap.exists) throw notFound();
        const a = snap.data() as Application;
        if (a.status === 'approved') return;
        tx.update(ref, { status: 'approved', approvedAt: FieldValue.serverTimestamp() });
        queueMail(tx, {
          to: a.email,
          subject: '',
          template: 'ambassadorApproved',
          props: {
            firstName: firstName(a.name),
            city: a.city,
            ...(AMBASSADOR_KIT_URL.value() ? { kitUrl: AMBASSADOR_KIT_URL.value() } : {}),
          },
        });
      });
      return;
    }
    case 'verifyBacking': {
      await db().runTransaction(async (tx) => {
        const ref = db().doc(`backings/${id}`);
        const wallRef = db().doc('public/backers');
        const [snap, wall] = await Promise.all([tx.get(ref), tx.get(wallRef)]);
        if (!snap.exists) throw notFound();
        const b = snap.data() as Backing;
        if (b.status === 'verified') return;
        tx.update(ref, { status: 'verified', verifiedAt: FieldValue.serverTimestamp() });
        if (b.showOnWall) {
          const names = wall.exists ? ((wall.data()?.names as string[] | undefined) ?? []) : [];
          tx.set(
            wallRef,
            { names: [...names, wallName(b.name)], updatedAt: FieldValue.serverTimestamp() },
            { merge: true },
          );
        }
      });
      return;
    }
    default: {
      const unhandled: never = kind;
      throw new HttpsError('internal', `Unhandled action ${String(unhandled)}`);
    }
  }
}

export async function describeActionHandler(req: Req): Promise<Api['describeAction']['out']> {
  const { token } = parseOrThrow(actionTokenInput, req.data);
  await enforceRateLimit(req, 'describeAction', 60, 600);
  const { k, id } = verifyAnyToken(token, ACTION_KINDS);
  return { kind: k, ...(await describe(k, id)) };
}

export async function confirmActionHandler(req: Req): Promise<Api['confirmAction']['out']> {
  const { token } = parseOrThrow(actionTokenInput, req.data);
  await enforceRateLimit(req, 'confirmAction', 20, 600);
  const { k, id } = verifyAnyToken(token, ACTION_KINDS);
  await confirm(k, id);
  return { done: true };
}

export const describeAction = onCall(callOptions, describeActionHandler);
export const confirmAction = onCall(callOptions, confirmActionHandler);
