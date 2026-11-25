import { redirect } from 'next/navigation';
import { asAdmin } from '@/server/admin/data';
import { MEMBER_FILTERS, readPro, type MemberFilter } from '@/server/admin/pro';
import { signedInUser } from '@/server/admin/session';
import { first, type Params } from '../../params';
import {
  ChangeLog,
  LimitsEditor,
  Members,
  OfficialQRun,
  ProBadge,
  ProChallenges,
} from '../../ProPanel';

export const dynamic = 'force-dynamic';

/**
 * StepQ Pro: the Free vs Pro limits, who is Pro, who may host QRuns, official QRuns and
 * Pro-only challenges. Reads and writes run as the signed-in admin; Postgres checks access.
 */
export default async function ProPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await signedInUser();
  if (!user) redirect('/admin/login');
  const params = await searchParams;
  const search = first(params.q).slice(0, 60);
  const f = first(params.f);
  const filter: MemberFilter = (MEMBER_FILTERS as readonly string[]).includes(f)
    ? (f as MemberFilter)
    : 'all';
  const data = await asAdmin(user, (c) => readPro(c, { search, filter }));

  if (!data) {
    return (
      <div className="p-6">
        <h1 className="type-app-title mb-2">No admin access</h1>
      </div>
    );
  }
  return (
    <main className="flex flex-col gap-5 p-4 md:p-6">
      <header className="rounded-card bg-[linear-gradient(135deg,#17452C,#0E2A1A_55%,#0B2014)] p-5 text-white shadow-card">
        <div className="mb-2">
          <ProBadge />
        </div>
        <h1 className="type-app-title text-white">StepQ Pro</h1>
        <p className="type-web-small mt-1 max-w-[640px] text-[#CFE3D6]">
          Everything that differs between Free and Pro is set here. Members become Pro when you make
          them Pro; there are no payments yet.
        </p>
        {data.ready && (
          <p className="type-web-small mt-3 text-[#F5D58A]">
            {data.counts.pro.toLocaleString('en-IN')} Pro ·{' '}
            {data.counts.free.toLocaleString('en-IN')} Free ·{' '}
            {data.counts.hosts.toLocaleString('en-IN')} QRun hosts
          </p>
        )}
      </header>
      {!data.ready ? (
        <section className="rounded-card bg-white p-5 shadow-card">
          <h2 className="type-app-subheading mb-1">Pro isn&apos;t set up in the database yet</h2>
          <p className="type-web-small text-muted">
            Run <code>20261126000000_pro_tier.sql</code> (from the app repo&apos;s
            supabase/migrations) in the Supabase SQL editor, then reload this page.
          </p>
        </section>
      ) : (
        <>
          <LimitsEditor features={data.features} />
          <Members
            members={data.members}
            requests={data.requests}
            counts={data.counts}
            search={search}
            filter={filter}
          />
          <div className="grid gap-5 xl:grid-cols-2">
            <OfficialQRun />
            <ProChallenges challenges={data.challenges} />
          </div>
          <ChangeLog log={data.log} />
        </>
      )}
    </main>
  );
}
