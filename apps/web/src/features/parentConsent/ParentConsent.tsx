'use client';

import { RELATIONSHIPS, respondParentConsentInput } from '@stepq/schemas';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button, buttonClass } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { Field } from '@/components/ui/Field';
import { call } from '@/lib/api';
import { removeParams } from '@/lib/useModalParam';

const INVALID_LINK =
  'This link is not valid any more. Ask your child to send a new one from the app.';
const RELATIONSHIP_LABELS: Record<(typeof RELATIONSHIPS)[number], string> = {
  parent: 'Parent',
  guardian: 'Legal guardian',
};

type State =
  | { step: 'loading' }
  | { step: 'ready'; childName: string }
  | { step: 'answered'; childName: string; status: 'granted' | 'declined' | 'withdrawn' }
  | { step: 'error'; message: string };

const errorMessage = (e: unknown) => (e instanceof Error && e.message ? e.message : INVALID_LINK);

/** What StepQ keeps about a teen, shown to the parent before they decide. */
const WHAT_WE_KEEP = [
  'Their name, username, avatar, gender and date of birth.',
  'Daily step totals, distance, calories and active minutes from their phone or Health Connect. No GPS route.',
  'Friends, groups, QRuns and challenges they join, and what they post in the community.',
];

/**
 * /parent-consent?token=…: a parent grants or declines consent for their 13 to 17 year old to
 * use the StepQ app (DPDP Act s.9). Opening the page changes nothing; only the buttons do.
 */
export function ParentConsent() {
  const token = useRef<string | null | undefined>(undefined);
  const [state, setState] = useState<State>({ step: 'loading' });
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<(typeof RELATIONSHIPS)[number] | null>(null);
  const [birthYear, setBirthYear] = useState('');
  const [declared, setDeclared] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'grant' | 'decline' | null>(null);

  useEffect(() => {
    if (token.current === undefined) {
      token.current = new URLSearchParams(window.location.search).get('token') || null;
      removeParams(['token']);
    }
    const t = token.current;
    if (!t) {
      setState({ step: 'error', message: INVALID_LINK });
      return;
    }
    let live = true;
    call('describeParentConsent', { token: t }).then(
      (res) => {
        if (!live) return;
        setState(
          res.status === 'pending'
            ? { step: 'ready', childName: res.childName }
            : { step: 'answered', childName: res.childName, status: res.status },
        );
      },
      (e: unknown) => live && setState({ step: 'error', message: errorMessage(e) }),
    );
    return () => {
      live = false;
    };
  }, []);

  async function respond(decision: 'grant' | 'decline') {
    if (state.step !== 'ready' || !token.current || busy) return;
    const parsed = respondParentConsentInput.safeParse({
      token: token.current,
      decision,
      parentName: name,
      relationship: relationship ?? undefined,
      birthYear,
    });
    const next: Record<string, string> = {};
    if (!parsed.success) {
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
    }
    if (decision === 'grant' && !declared) next.declared = 'Tick this to give consent';
    setErrors(next);
    if (!parsed.success || Object.keys(next).length > 0) return;
    setBusy(decision);
    try {
      const res = await call('respondParentConsent', parsed.data);
      setState({ step: 'answered', childName: state.childName, status: res.status });
    } catch (e) {
      setErrors({ form: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      aria-live="polite"
      className="flex w-full max-w-[600px] flex-col gap-[18px] rounded-(--radius-form) bg-white p-l shadow-card sm:p-[40px]"
    >
      {state.step === 'loading' && (
        <>
          <h1 className="type-web-h2 text-ink">Parental consent</h1>
          <p className="type-web-body text-muted">Checking this link…</p>
        </>
      )}
      {state.step === 'ready' && (
        <>
          <h1 className="type-web-h2 text-ink">{`${state.childName} wants to use StepQ`}</h1>
          <p className="type-web-body text-muted">
            StepQ is a walking app. Because {state.childName} is under 18, India&apos;s Digital
            Personal Data Protection Act needs a parent or guardian&apos;s consent before we keep
            their data. Here is what we would keep and why:
          </p>
          <ul className="type-web-body list-disc pl-[24px] text-ink">
            {WHAT_WE_KEEP.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="type-web-body text-muted">
            We use it only to run the app for them: counting steps, goals and streaks, and showing
            progress to the friends and groups they choose. We never show ads to teens, never track
            them across other apps or sites, never sell their data, and never share it except with
            the providers that host StepQ. Read the{' '}
            <Link href="/privacy" className="text-deep underline">
              Privacy policy
            </Link>{' '}
            and{' '}
            <Link href="/terms" className="text-deep underline">
              Terms of use
            </Link>
            . You can withdraw consent any time by emailing connect@stepq.in, and we will delete
            their account.
          </p>
          <Field
            label="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.parentName}
            autoComplete="name"
          />
          <ChipGroup
            label="You are their"
            options={RELATIONSHIPS.map((value) => ({ value, label: RELATIONSHIP_LABELS[value] }))}
            value={relationship}
            onChange={setRelationship}
            error={errors.relationship}
          />
          <Field
            label="The year you were born"
            inputMode="numeric"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
            error={errors.birthYear}
          />
          <Checkbox
            label={`I am ${state.childName}'s parent or legal guardian, I am 18 or older, and I agree to StepQ processing their data as described above.`}
            checked={declared}
            onChange={setDeclared}
            error={errors.declared}
          />
          <Button className="w-full" loading={busy === 'grant'} onClick={() => respond('grant')}>
            Give consent
          </Button>
          <Button
            variant="text"
            className="w-full"
            loading={busy === 'decline'}
            onClick={() => respond('decline')}
          >
            Don&apos;t allow, delete their account
          </Button>
          {errors.form && (
            <p role="alert" className="type-web-small text-tomato-text">
              {errors.form}
            </p>
          )}
        </>
      )}
      {state.step === 'answered' && (
        <>
          <h1 className="type-web-h2 text-ink">
            {state.status === 'granted' ? 'Thank you' : 'Done'}
          </h1>
          <p className="type-web-body text-muted">
            {state.status === 'granted'
              ? `${state.childName} can now use StepQ. To withdraw consent later, email connect@stepq.in.`
              : `We won't keep ${state.childName}'s data. Their account will be deleted.`}
          </p>
          <Link href="/" className={buttonClass('primary', 'w-full')}>
            Back to home
          </Link>
        </>
      )}
      {state.step === 'error' && (
        <>
          <h1 className="type-web-h2 text-ink">Can&apos;t use this link</h1>
          <p className="type-web-body text-muted">{state.message}</p>
        </>
      )}
    </div>
  );
}
