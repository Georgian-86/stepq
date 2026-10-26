import { query } from '@/server/db';
import { errorResponse, json } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The live waitlist count on the home page. */
export async function GET() {
  try {
    const { rows } = await query<{ waitlist_count: number }>(
      'select waitlist_count from stepq.stats where id = 1',
    );
    return json({ waitlistCount: rows[0]?.waitlist_count ?? 0 }, 200, {
      'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30',
    });
  } catch (e) {
    return errorResponse(e);
  }
}
