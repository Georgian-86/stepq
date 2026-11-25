'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import type { LogEntry, Member, PlanFeature, ProChallenge } from '@/server/admin/pro';
import {
  postQRunAction,
  setChallengeProOnlyAction,
  setFeatureAction,
  setMemberAction,
  type ProState,
} from './proActions';

const gold = 'bg-[linear-gradient(90deg,#FFE29A,#F5B83D,#C98A1B)]';

function Result({ state }: { state: ProState }) {
  if (state.error)
    return (
      <span role="alert" className="type-web-small text-tomato-text">
        {state.error}
      </span>
    );
  if (state.done)
    return (
      <span role="status" className="type-web-small text-deep">
        {state.done}
      </span>
    );
  return null;
}

export function ProBadge() {
  return (
    <span
      className={`${gold} inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-bold tracking-wider text-ink`}
    >
      ♛ PRO
    </span>
  );
}

/** One row of the limits table: its own small form, saved on its own. */
function FeatureRow({ f }: { f: PlanFeature }) {
  const [state, action, pending] = useActionState<ProState, FormData>(setFeatureAction, {});
  const [dirty, setDirty] = useState(false);
  const input =
    'type-web-small w-full rounded-[10px] border-[1.5px] border-line bg-white px-3 py-2 tabular-nums focus:border-deep focus:outline-none';
  return (
    <tr className="edge-b align-middle">
      <td className="py-3 pr-3">
        <div className="type-web-body-strong">{f.label}</div>
        <div className="type-web-small text-muted">
          <code>{f.key}</code>
          {f.kind === 'limit' && f.unit
            ? f.unit.startsWith('a')
              ? ` · per ${f.unit.replace(/^an? /, '')}`
              : ` · in ${f.unit}`
            : ''}
        </div>
      </td>
      <td colSpan={3} className="py-3">
        <form
          action={(fd) => {
            setDirty(false);
            action(fd);
          }}
          onChange={() => setDirty(true)}
          className="grid grid-cols-[1fr_1fr_auto] items-center gap-3"
        >
          <input type="hidden" name="key" value={f.key} />
          <input type="hidden" name="kind" value={f.kind} />
          {f.kind === 'switch' ? (
            <>
              <label className="type-web-small flex items-center gap-2">
                <input
                  type="checkbox"
                  name="free"
                  defaultChecked={f.free === 1}
                  className="size-4 accent-[#0A7F3F]"
                />
                Free
              </label>
              <label className="type-web-small flex items-center gap-2">
                <input
                  type="checkbox"
                  name="pro"
                  defaultChecked={f.pro === 1}
                  className="size-4 accent-[#C98A1B]"
                />
                Pro
              </label>
            </>
          ) : (
            <>
              <input
                name="free"
                aria-label={`${f.label}, Free`}
                inputMode="numeric"
                defaultValue={f.free ?? ''}
                placeholder="Unlimited"
                className={input}
              />
              <input
                name="pro"
                aria-label={`${f.label}, Pro`}
                inputMode="numeric"
                defaultValue={f.pro ?? ''}
                placeholder="Unlimited"
                className={input}
              />
            </>
          )}
          <button
            type="submit"
            disabled={pending || !dirty}
            className="type-web-small rounded-pill bg-deep px-4 py-2 font-bold text-white disabled:bg-page disabled:text-muted"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          <div className="col-span-3 -mt-1 min-h-0">
            <Result state={state} />
          </div>
        </form>
      </td>
    </tr>
  );
}

export function LimitsEditor({ features }: { features: PlanFeature[] }) {
  return (
    <section className="rounded-card bg-white p-5 shadow-card">
      <h2 className="type-app-subheading mb-1">Free vs Pro limits</h2>
      <p className="type-web-small mb-4 text-muted">
        Ticks turn a feature on per plan. For limits, type a number, or leave it blank for
        unlimited. Postgres enforces these, so a change applies to everyone at once; the app shows
        it on next open.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left">
          <thead>
            <tr className="type-label text-muted edge-b">
              <th className="py-2 pr-3 font-bold">Feature</th>
              <th className="w-[30%] py-2 font-bold">Free</th>
              <th className="w-[30%] py-2 font-bold">
                <ProBadge />
              </th>
              <th className="w-[80px]" />
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <FeatureRow key={f.key} f={f} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MemberRow({ m }: { m: Member }) {
  const [state, action, pending] = useActionState<ProState, FormData>(setMemberAction, {});
  const isPro = m.plan === 'pro';
  return (
    <li className="flex flex-wrap items-center gap-3 py-3 edge-b">
      <div className="min-w-[180px] flex-1">
        <div className="type-web-body-strong flex items-center gap-2">
          {m.name} {isPro && <ProBadge />}
          {m.qrunHost && (
            <span className="type-web-small rounded-pill bg-mint px-2 py-0.5 font-bold text-deep">
              QRun host
            </span>
          )}
        </div>
        <div className="type-web-small text-muted">
          @{m.username}
          {m.hostRequestedAt && !m.qrunHost ? ' · asked to host QRuns' : ''}
        </div>
      </div>
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={m.id} />
        {isPro ? (
          <>
            <input type="hidden" name="plan" value="pro" />
            <input type="hidden" name="host" value={m.qrunHost ? 'off' : 'on'} />
            <button
              type="submit"
              disabled={pending}
              className="type-web-small rounded-pill bg-page px-3 py-2 font-bold text-ink hover:bg-line"
            >
              {m.qrunHost ? 'Stop QRun hosting' : 'Allow QRun hosting'}
            </button>
          </>
        ) : (
          <>
            <input type="hidden" name="plan" value="pro" />
            <button
              type="submit"
              disabled={pending}
              className={`${gold} type-web-small rounded-pill px-3 py-2 font-bold text-ink`}
            >
              Make Pro
            </button>
          </>
        )}
      </form>
      {isPro && (
        <form action={action}>
          <input type="hidden" name="id" value={m.id} />
          <input type="hidden" name="plan" value="free" />
          <button
            type="submit"
            disabled={pending}
            className="type-web-small rounded-pill px-3 py-2 font-bold text-tomato-text hover:bg-tomato-soft"
          >
            Move to Free
          </button>
        </form>
      )}
      <div className="basis-full empty:hidden">
        <Result state={state} />
      </div>
    </li>
  );
}

export function Members({
  members,
  requests,
  counts,
  search,
  filter,
}: {
  members: Member[];
  requests: Member[];
  counts: { pro: number; free: number; hosts: number };
  search: string;
  filter: string;
}) {
  const filters: [string, string][] = [
    ['all', 'Everyone'],
    ['pro', `Pro (${counts.pro})`],
    ['free', `Free (${counts.free})`],
    ['hosts', `QRun hosts (${counts.hosts})`],
    ['requests', `Asked to host (${requests.length})`],
  ];
  return (
    <section className="rounded-card bg-white p-5 shadow-card">
      <h2 className="type-app-subheading mb-1">Members</h2>
      <p className="type-web-small mb-4 text-muted">
        Make someone Pro, or move them back to Free (their theme, photo and BFF reset). Only Pro
        members you allow can post QRuns.
      </p>
      {requests.length > 0 && (
        <div className="mb-4 rounded-[12px] bg-[#FFF8E6] p-3 shadow-[inset_0_0_0_1.5px_#F5B83D]">
          <div className="type-web-body-strong mb-1">Asked to host QRuns</div>
          <ul>
            {requests.map((m) => (
              <MemberRow key={`r${m.id}`} m={m} />
            ))}
          </ul>
        </div>
      )}
      <form method="get" className="mb-2 flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <Field
            label="Search by name or username"
            name="q"
            defaultValue={search}
            placeholder="riya"
          />
        </div>
        <select
          name="f"
          defaultValue={filter}
          aria-label="Show"
          className="type-web-small min-h-[48px] rounded-[12px] border-[1.5px] border-line bg-white px-3"
        >
          {filters.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <Button type="submit">Search</Button>
      </form>
      <ul>
        {members.map((m) => (
          <MemberRow key={m.id} m={m} />
        ))}
        {members.length === 0 && (
          <li className="type-web-small py-4 text-muted">No one matches.</li>
        )}
      </ul>
      {members.length === 50 && (
        <p className="type-web-small mt-2 text-muted">
          Showing the first 50. Search to narrow it down.
        </p>
      )}
    </section>
  );
}

export function OfficialQRun() {
  const [state, action, pending] = useActionState<ProState, FormData>(postQRunAction, {});
  return (
    <section className="rounded-card bg-white p-5 shadow-card">
      <h2 className="type-app-subheading mb-1">Post an official QRun</h2>
      <p className="type-web-small mb-4 text-muted">
        Hosted by StepQ. Free members can join every QRun; only admins and approved Pro members can
        post one.
      </p>
      <form action={action} className="grid gap-4 md:grid-cols-2">
        <Field
          label="Name"
          name="title"
          required
          maxLength={80}
          placeholder="Sunday 5K at Cubbon Park"
        />
        <Field
          label="Where people meet"
          name="place"
          required
          maxLength={120}
          placeholder="Cubbon Park main gate"
        />
        <Field label="Starts (India time)" name="starts_at" type="datetime-local" required />
        <Field label="Price in ₹ (0 = free)" name="price" inputMode="numeric" defaultValue="0" />
        <Field label="Latitude (optional)" name="lat" inputMode="decimal" placeholder="12.9763" />
        <Field label="Longitude (optional)" name="lng" inputMode="decimal" placeholder="77.5929" />
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <Button type="submit" loading={pending}>
            Post QRun
          </Button>
          <Result state={state} />
        </div>
      </form>
    </section>
  );
}

function ChallengeRow({ c }: { c: ProChallenge }) {
  const [state, action, pending] = useActionState<ProState, FormData>(
    setChallengeProOnlyAction,
    {},
  );
  return (
    <li className="flex flex-wrap items-center gap-3 py-3 edge-b">
      <div className="min-w-[180px] flex-1">
        <div className="type-web-body-strong flex items-center gap-2">
          {c.title} {c.proOnly && <ProBadge />}
        </div>
        <div className="type-web-small text-muted">
          Ends{' '}
          {new Date(c.endsAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            timeZone: 'Asia/Kolkata',
          })}
        </div>
      </div>
      <form action={action}>
        <input type="hidden" name="id" value={c.id} />
        {!c.proOnly && <input type="hidden" name="pro_only" value="on" />}
        <button
          type="submit"
          disabled={pending}
          className="type-web-small rounded-pill bg-page px-3 py-2 font-bold text-ink hover:bg-line"
        >
          {c.proOnly ? 'Open to everyone' : 'Make Pro-only'}
        </button>
      </form>
      <div className="basis-full empty:hidden">
        <Result state={state} />
      </div>
    </li>
  );
}

export function ProChallenges({ challenges }: { challenges: ProChallenge[] }) {
  return (
    <section className="rounded-card bg-white p-5 shadow-card">
      <h2 className="type-app-subheading mb-1">Pro-only challenges</h2>
      <p className="type-web-small mb-2 text-muted">
        Free members see Pro-only challenges with a Pro tag but can&apos;t join them (when
        &quot;Join every challenge&quot; is off for Free).
      </p>
      <ul>
        {challenges.map((c) => (
          <ChallengeRow key={c.id} c={c} />
        ))}
        {challenges.length === 0 && (
          <li className="type-web-small py-4 text-muted">No running challenges.</li>
        )}
      </ul>
    </section>
  );
}

export function ChangeLog({ log }: { log: LogEntry[] }) {
  if (!log.length) return null;
  return (
    <section className="rounded-card bg-white p-5 shadow-card">
      <h2 className="type-app-subheading mb-2">Recent changes</h2>
      <ul>
        {log.map((l, i) => (
          <li key={i} className="type-web-small flex flex-wrap gap-x-3 py-2 edge-b">
            <span className="text-muted tabular-nums">
              {new Date(l.at).toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
            <span className="font-bold">{l.action.replaceAll('_', ' ')}</span>
            <span className="min-w-0 flex-1 truncate text-muted">{l.detail}</span>
            <span className="text-muted">{l.admin ?? ''}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
