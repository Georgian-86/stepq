import { query } from '@/server/db';
import { errorResponse, json } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The live waitlist count on the home page: the rows themselves, so deleting a test signup lowers it. */
export async function GET() {
  try {
    const { rows } = await query<{ n: number }>('select count(*)::int as n from stepq.waitlist');
    return json({ waitlistCount: rows[0]?.n ?? 0 }, 200, {
      'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30',
    });
  } catch (e) {
    return errorResponse(e);
  }
}
