import { timingSafeEqual } from 'node:crypto';
import { env } from '@/server/env';
import { loggable } from '@/server/errors';
import { deliverCampaigns, runNudges } from '@/server/push/deliver';
import { pushConfigured } from '@/server/push/fcm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorised(req: Request): boolean {
  const secret = env.cronSecret();
  if (!secret) return false;
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

/**
 * GET /api/cron/push, called every 15 minutes by the scheduler (.github/workflows/push-cron.yml)
 * with `Authorization: Bearer $CRON_SECRET`: sends admin pushes that are due, then the
 * automatic nudges for this time of day. Anyone else gets a 404.
 */
export async function GET(req: Request) {
  if (!authorised(req)) return new Response('Not found', { status: 404 });
  if (!pushConfigured()) {
    return Response.json(
      { ok: false, error: 'FIREBASE_SERVICE_ACCOUNT is not set' },
      { status: 503 },
    );
  }
  try {
    const campaigns = await deliverCampaigns();
    const nudges = await runNudges();
    return Response.json({ ok: true, campaigns, nudges });
  } catch (e) {
    console.error('push cron', loggable(e));
    return Response.json({ ok: false }, { status: 500 });
  }
}

export const POST = GET;
