import type { ActionKind } from './actions';
import type { AmbassadorInput } from './ambassador';
import type { BackingInput } from './backing';
import type { FounderMessageInput } from './founder';
import type { TeamApplicationInput } from './team';
import type { WaitlistInput } from './waitlist';

export interface Api {
  joinWaitlist: {
    in: WaitlistInput;
    out: { status: 'joined' | 'existing'; position: number; reserveToken?: string; email: string };
  };
  checkUsername: {
    in: { username: string };
    out: { available: boolean; reason?: 'invalid' | 'reserved' | 'taken' };
  };
  reserveUsername: { in: { username: string; reserveToken: string }; out: { username: string } };
  submitTeamApplication: { in: TeamApplicationInput; out: { firstName: string } };
  submitAmbassador: { in: AmbassadorInput; out: { firstName: string } };
  recordBacking: {
    in: BackingInput;
    out: { reference: string; amount: number; upiLink: string };
  };
  sendFounderMessage: { in: FounderMessageInput; out: { firstName: string } };
  describeAction: {
    in: { token: string };
    out: { kind: ActionKind; summary: string; done: boolean };
  };
  confirmAction: { in: { token: string }; out: { done: true } };
}

export type ApiName = keyof Api;

export type ApiErrorCode =
  | 'invalid-argument'
  | 'already-exists'
  | 'resource-exhausted'
  | 'permission-denied'
  | 'not-found'
  | 'failed-precondition';

/** Shape of `HttpsError.details` for field-level validation errors. */
export interface ApiErrorDetails {
  fields: Record<string, string>;
}
