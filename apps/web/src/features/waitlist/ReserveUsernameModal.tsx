'use client';

import { normalizeUsername } from '@stepq/schemas';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { Piko } from '@/components/site/Piko';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { ApiFieldError, call, GENERIC_ERROR } from '@/lib/api';
import { removeParams, replaceModalParam, useModalParam } from '@/lib/useModalParam';
import { USERNAME_MESSAGES, useUsernameCheck, type UsernameCheck } from './useUsernameCheck';
import { useWaitlist } from './WaitlistState';

const TITLE_ID = 'reserve-title';

/**
 * W02 Reserve username (`9:313`), at `?modal=reserve`. Three ways in:
 * - right after a join: "You're on the list!" with the real position, then the username form;
 * - a repeat email: the top half only, saying a reserve link was emailed (spec §10a);
 * - the emailed link `/?modal=reserve&token=…`: the username form with that token.
 */
export function ReserveUsernameModal() {
  const { isOpen, close, params } = useModalParam('reserve');
  const { join, loaded, setJoin, setReservation } = useWaitlist();
  // The emailed token is captured once and taken out of the URL right away.
  const urlToken = params.get('token');
  const [linkToken, setLinkToken] = useState<string | null>(null);
  useEffect(() => {
    if (!isOpen || !urlToken) return;
    setLinkToken(urlToken);
    removeParams(['token']);
  }, [isOpen, urlToken]);
  useEffect(() => {
    if (!isOpen) setLinkToken(null);
  }, [isOpen]);
  const mode =
    linkToken || urlToken
      ? 'link'
      : join?.status === 'existing'
        ? 'existing'
        : join?.status === 'joined'
          ? 'joined'
          : null;
  const token = linkToken ?? urlToken ?? (mode === 'joined' ? join?.reserveToken : undefined);

  // Nothing to show (e.g. a stale ?modal=reserve in a new tab): drop the param.
  useEffect(() => {
    if (isOpen && loaded && !mode) close(['token']);
  }, [isOpen, loaded, mode, close]);

  const open = isOpen && mode !== null;

  return (
    <Modal open={open} onClose={() => close(['token'])} labelledBy={TITLE_ID}>
      <div className="flex flex-col items-center gap-[18px] text-center">
        <Piko mood="cheer" size={108} motion="cheer" />
        {mode === 'link' ? (
          <h2 id={TITLE_ID} className="type-web-h2 text-ink">
            Reserve your username
          </h2>
        ) : (
          <>
            <h2 id={TITLE_ID} className="type-web-h2 text-ink">
              You&apos;re on the list!
            </h2>
            {join && (
              <p className="type-web-body text-muted">
                {mode === 'existing'
                  ? `You're already on the list (#${join.position.toLocaleString('en-IN')}). We've emailed you a link to reserve your username.`
                  : `You're #${join.position.toLocaleString('en-IN')}. We'll email ${join.email} the day StepQ launches.`}
              </p>
            )}
          </>
        )}
        {mode === 'existing' ? (
          <Button className="w-full" onClick={() => close()}>
            Done
          </Button>
        ) : (
          open &&
          token && (
            <ReserveForm
              key={token}
              token={token}
              withHeading={mode === 'joined'}
              onReserved={(username) => {
                const own = mode === 'joined' && join ? join : null;
                if (own) setJoin({ ...own, username });
                setReservation({ username, ...(own ? { email: own.email } : {}) });
                replaceModalParam('reserved', { u: username }, ['token']);
              }}
              onLater={() => close(['token'])}
            />
          )
        )}
      </div>
    </Modal>
  );
}

function ReserveForm({
  token,
  withHeading,
  onReserved,
  onLater,
}: {
  token: string;
  withHeading: boolean;
  onReserved: (username: string) => void;
  onLater: () => void;
}) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /** A "Taken" answer from reserveUsername overrides an earlier "Available" for that name. */
  const [takenOnReserve, setTakenOnReserve] = useState<string | null>(null);
  const checked = useUsernameCheck(value);
  const check: UsernameCheck =
    takenOnReserve && checked.username === takenOnReserve
      ? { state: 'taken', username: takenOnReserve, message: USERNAME_MESSAGES.taken }
      : checked;
  const statusId = useId();
  const name = normalizeUsername(value);
  const canReserve = check.state === 'available' && !submitting;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canReserve) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await call('reserveUsername', { username: check.username, reserveToken: token });
      onReserved(res.username);
    } catch (err) {
      if (err instanceof ApiFieldError && err.fields.username) {
        if (/taken/i.test(err.fields.username)) setTakenOnReserve(check.username);
        else setFormError(err.fields.username);
      } else {
        setFormError(err instanceof Error && err.message ? err.message : GENERIC_ERROR);
      }
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex w-full flex-col items-center gap-[18px]">
      {withHeading && (
        <>
          <hr className="h-px w-full border-0 bg-line" />
          <h3 className="type-web-h3 text-ink">Reserve your username</h3>
        </>
      )}
      <p className="type-web-small text-muted">Grab your @name now, before anyone else does.</p>
      <Field
        label="Username"
        className="w-full text-left"
        data-autofocus
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="@yourname"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={check.state === 'taken' || check.state === 'invalid'}
        aria-describedby={statusId}
      />
      <p
        id={statusId}
        role="status"
        className={`type-web-small-strong flex min-h-[20px] items-center gap-[6px] ${
          check.state === 'available'
            ? 'text-deep'
            : check.state === 'checking'
              ? 'text-muted'
              : 'text-tomato-text'
        }`}
      >
        {check.state === 'checking' && 'Checking…'}
        {check.state === 'available' && (
          <>
            <Icon name="check-deep" />
            Available
          </>
        )}
        {check.message}
      </p>
      {formError && (
        <p role="alert" className="type-web-small text-tomato-text">
          {formError}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={!canReserve} loading={submitting}>
        {name ? `Reserve @${name}` : 'Reserve username'}
      </Button>
      <button
        type="button"
        onClick={onLater}
        className="type-web-body-strong inline-flex min-h-[44px] items-center px-xs text-deep"
      >
        Maybe later
      </button>
    </form>
  );
}
