import { buildUpiLink, firstName, newReference } from '@stepq/core';
import {
  ambassadorInput,
  backingInput,
  founderMessageInput,
  normalizeUsername,
  teamApplicationInput,
  usernameProblem,
  waitlistInput,
  type Api,
  type ApiName,
} from '@stepq/schemas';
import { z } from 'zod';
import { ApiFieldError } from './apiErrors';

/** How long a simulated callable takes, so loading states show as they would live. */
export const PREVIEW_DELAY_MS = 600;
export const PREVIEW_ACTION_ERROR = 'Approve and verify links work once the backend is connected.';

const STORAGE_KEY = 'stepq.preview';
const TAKEN = 'Taken. Try another.';
const usernameData = z.object({ username: z.string().max(100) });
const reserveData = usernameData.extend({ reserveToken: z.string().max(1000) });

/** What this browser session has "saved": waitlist positions by email and reserved names. */
type Session = { count: number; emails: Record<string, number>; usernames: string[] };

const empty = (): Session => ({ count: 0, emails: {}, usernames: [] });
let memory = empty();

function load(): Session {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    memory = raw ? (JSON.parse(raw) as Session) : empty();
  } catch {
    // Storage blocked or garbled: keep the in-memory copy.
  }
  return memory;
}

function save(s: Session) {
  memory = s;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Storage blocked: the in-memory copy lasts until the page reloads.
  }
}

/** Same shape as the server's `parseOrThrow`: first message per field. */
function parse<S extends z.ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) fields[issue.path.join('.') || '_'] ??= issue.message;
  throw new ApiFieldError(fields);
}

type Handlers = { [K in ApiName]: (data: unknown) => Api[K]['out'] };

const handlers: Handlers = {
  joinWaitlist(data) {
    const { email } = parse(waitlistInput, data);
    const s = load();
    const known = s.emails[email];
    if (known !== undefined) return { status: 'existing', position: known, email };
    const position = s.count + 1;
    save({ ...s, count: position, emails: { ...s.emails, [email]: position } });
    return { status: 'joined', position, reserveToken: 'preview', email };
  },
  checkUsername(data) {
    const { username } = parse(usernameData, data);
    const problem = usernameProblem(username);
    if (problem) return { available: false, reason: problem };
    return load().usernames.includes(normalizeUsername(username))
      ? { available: false, reason: 'taken' }
      : { available: true };
  },
  reserveUsername(data) {
    const { username: raw } = parse(reserveData, data);
    const problem = usernameProblem(raw);
    if (problem) {
      throw new ApiFieldError({
        username:
          problem === 'reserved' ? 'That name is reserved.' : 'Use 3–20 letters, numbers, . or _',
      });
    }
    const username = normalizeUsername(raw);
    const s = load();
    if (s.usernames.includes(username)) throw new Error(TAKEN);
    save({ ...s, usernames: [...s.usernames, username] });
    return { username };
  },
  submitTeamApplication: (data) => ({
    firstName: firstName(parse(teamApplicationInput, data).name),
  }),
  submitAmbassador: (data) => ({ firstName: firstName(parse(ambassadorInput, data).name) }),
  sendFounderMessage: (data) => ({ firstName: firstName(parse(founderMessageInput, data).name) }),
  recordBacking(data) {
    const { amount } = parse(backingInput, data);
    const reference = newReference();
    return { reference, amount, upiLink: buildUpiLink({ amount, note: `StepQ ${reference}` }) };
  },
  describeAction() {
    throw new Error(PREVIEW_ACTION_ERROR);
  },
  confirmAction() {
    throw new Error(PREVIEW_ACTION_ERROR);
  },
};

/** Preview-mode stand-in for the callables: validates like the server, saves nothing remote. */
export async function previewCall<K extends ApiName>(
  name: K,
  data: Api[K]['in'],
): Promise<Api[K]['out']> {
  await new Promise((resolve) => setTimeout(resolve, PREVIEW_DELAY_MS));
  return (handlers[name] as (d: unknown) => Api[K]['out'])(data);
}
