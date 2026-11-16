'use client';

import { useActionState, useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { CAMPAIGN_IDEAS, fill } from '@/lib/pushCopy';
import { cancelPushAction, queuePushAction, type PushState } from './actions';

const AUDIENCES = [
  { value: 'everyone', label: 'Everyone with notifications on' },
  { value: 'not_walked_today', label: 'People under 1,000 steps today' },
  { value: 'goal_reached_today', label: 'People who hit their goal today' },
  { value: 'username', label: 'One person (by username), e.g. a test' },
];

const ROUTES = [
  { value: 'home', label: 'Home' },
  { value: 'challenges', label: 'Challenges' },
  { value: 'qrun', label: 'QRuns' },
  { value: 'friends', label: 'Friends' },
  { value: 'groups', label: 'Groups' },
  { value: 'profile', label: 'Profile' },
];

const PLACEHOLDERS = ['{name}', '{steps}', '{left}', '{goal}'];

/** What the preview fills placeholders with. */
const SAMPLE = { name: 'Riya', steps: 6240, goal: 8000, left: 1760, km: '4.8', streak: 5 };

export type ScheduledPush = { id: string; title: string; sendAt: string; audience: string };

/**
 * Writes a push to the StepQ app: title, message, who gets it, where a tap opens and when, with
 * a lock-screen preview. "Surprise me" fills in one of the ready-made ideas to edit.
 */
export function PushComposer({
  configured,
  scheduled,
}: {
  configured: boolean;
  scheduled: ScheduledPush[];
}) {
  const [state, action, pending] = useActionState<PushState, FormData>(queuePushAction, {});
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('everyone');
  const [idea, setIdea] = useState(-1);
  const [focus, setFocus] = useState<'title' | 'body'>('body');

  const surprise = () => {
    let next = Math.floor(Math.random() * CAMPAIGN_IDEAS.length);
    if (next === idea) next = (next + 1) % CAMPAIGN_IDEAS.length;
    setIdea(next);
    setTitle(CAMPAIGN_IDEAS[next]!.title);
    setBody(CAMPAIGN_IDEAS[next]!.body);
  };
  const insert = (p: string) =>
    focus === 'title'
      ? setTitle((t) => (t + p).slice(0, 65))
      : setBody((b) => (b + p).slice(0, 240));

  return (
    <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_320px]">
      <form action={action} className="rounded-card bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="type-app-subheading mb-1">Send a push notification</h3>
            <p className="type-web-small text-muted">
              Shows on the phones of StepQ app users. Placeholders fill in per person.
            </p>
          </div>
          <button
            type="button"
            onClick={surprise}
            className="type-web-small rounded-pill bg-mango-soft px-4 py-2 font-bold text-[#7A4B00] hover:brightness-95"
          >
            ✨ Surprise me
          </button>
        </div>
        {!configured && (
          <p className="type-web-small mb-4 rounded-[10px] bg-mango-soft px-3 py-2 text-[#7A4B00]">
            Firebase is not connected yet, so pushes wait in the queue. Set FIREBASE_SERVICE_ACCOUNT
            on Vercel to send them.
          </p>
        )}
        <div className="grid gap-4">
          <Field
            label={`Title (${title.length}/65)`}
            name="title"
            required
            maxLength={65}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setFocus('title')}
            placeholder="Weekend mode: ON 🏞️"
          />
          <TextArea
            label={`Message (${body.length}/240)`}
            name="body"
            required
            maxLength={240}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => setFocus('body')}
            placeholder="Saturdays are for long walks and longer brunches, {name}."
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-web-small text-muted">Insert:</span>
            {PLACEHOLDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => insert(p)}
                className="type-web-small rounded-pill bg-page px-3 py-1 font-mono text-ink hover:bg-line"
              >
                {p}
              </button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Who gets it"
              name="audience"
              options={AUDIENCES}
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            />
            {audience === 'username' ? (
              <Field
                label="Username"
                name="username"
                required
                autoComplete="off"
                placeholder="riya.walks"
              />
            ) : (
              <Select label="A tap opens" name="route" options={ROUTES} defaultValue="home" />
            )}
            <Field label="Send at (India time, empty = now)" name="send_at" type="datetime-local" />
            <Field
              label="Picture link (optional, https)"
              name="image_url"
              type="url"
              placeholder="https://stepq.in/…/banner.png"
            />
          </div>
          <div>
            <Button type="submit" loading={pending}>
              Send notification
            </Button>
          </div>
        </div>
        {state.error && (
          <p role="alert" className="type-web-small mt-3 text-tomato-text">
            {state.error}
          </p>
        )}
        {state.done && (
          <p role="status" className="type-web-small mt-3 text-deep">
            {state.done}
          </p>
        )}
      </form>

      <div className="flex flex-col gap-4">
        <PhonePreview title={title} body={body} />
        {scheduled.length > 0 && <Scheduled items={scheduled} />}
      </div>
    </div>
  );
}

/** Roughly how Android shows it on the lock screen, with sample values in the placeholders. */
function PhonePreview({ title, body }: { title: string; body: string }) {
  return (
    <figure
      aria-label="Preview on a phone"
      className="rounded-[28px] bg-[linear-gradient(160deg,#0E3B2E,#1D6B4F)] p-4 pt-6 shadow-card"
    >
      <p className="mb-4 text-center font-[Fredoka] text-[40px] leading-none font-medium text-white/90">
        9:41
      </p>
      <div className="rounded-[18px] bg-white/95 p-3 shadow-[0_6px_20px_rgba(0,0,0,0.25)]">
        <div className="mb-1 flex items-center gap-2 text-[12px] text-muted">
          <span
            aria-hidden="true"
            className="inline-flex size-4 items-center justify-center rounded-full bg-deep text-[9px] font-bold text-white"
          >
            S
          </span>
          StepQ · now
        </div>
        <p className="text-[14px] leading-snug font-bold text-ink">
          {fill(title, SAMPLE) || 'Your title'}
        </p>
        <p className="text-[13px] leading-snug text-ink/80">
          {fill(body, SAMPLE) || 'Your message shows here.'}
        </p>
      </div>
      <figcaption className="mt-3 text-center text-[11px] text-white/70">
        Preview with sample values (Riya, 6,240 of 8,000 steps)
      </figcaption>
    </figure>
  );
}

function Scheduled({ items }: { items: ScheduledPush[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  return (
    <div className="rounded-card bg-white p-4 shadow-card">
      <h3 className="type-web-body-strong mb-2">Scheduled</h3>
      <ul className="flex flex-col gap-2">
        {items.map((x) => (
          <li key={x.id} className="flex items-center justify-between gap-2">
            <span className="min-w-0">
              <span className="type-web-small block truncate font-bold">{x.title}</span>
              <span className="type-web-small block text-muted">
                {new Date(x.sendAt).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </span>
            <Button
              type="button"
              variant="text"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await cancelPushAction(x.id);
                  setError(r.error ?? '');
                })
              }
            >
              Cancel
            </Button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="type-web-small mt-2 text-tomato-text">
          {error}
        </p>
      )}
    </div>
  );
}
