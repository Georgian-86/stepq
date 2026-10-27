import { query } from '@/server/db';
import { ApiError } from '@/server/errors';
import { clientIp, errorResponse } from '@/server/http';
import { enforceRateLimit } from '@/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Text the tracker may send; anything else is dropped. */
const clip = (v: unknown, max: number) =>
  typeof v === 'string' && v.trim() ? v.trim().replace(/\s+/g, ' ').slice(0, max) : null;

/**
 * POST /api/track `{ kind: 'view' | 'click', path, label?, referrer? }`: one anonymous page
 * view or click for the admin Stats page. No cookies, IP or user agent are stored; the referrer
 * is kept as a host name only. Always answers 204 so the site never waits on it.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const kind = body?.kind;
    const path = clip(body?.path, 200);
    if ((kind !== 'view' && kind !== 'click') || !path?.startsWith('/')) {
      return new Response(null, { status: 204 });
    }
    if (path.startsWith('/admin')) return new Response(null, { status: 204 });
    await enforceRateLimit(clientIp(req.headers), 'track', 300, 600);
    let referrer: string | null = null;
    try {
      const ref = clip(body?.referrer, 300);
      const host = ref ? new URL(ref).host : '';
      if (host && host !== (req.headers.get('x-forwarded-host') ?? req.headers.get('host'))) {
        referrer = host.slice(0, 100);
      }
    } catch {
      referrer = null;
    }
    await query(
      'insert into stepq.site_events (kind, path, label, referrer) values ($1, $2, $3, $4)',
      [kind, path.split('?')[0], kind === 'click' ? clip(body?.label, 120) : null, referrer],
    );
    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'resource-exhausted') {
      return new Response(null, { status: 204 });
    }
    return errorResponse(e);
  }
}
