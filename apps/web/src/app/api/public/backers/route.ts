import { query } from '@/server/db';
import { errorResponse, json } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Verified backers who asked to be on the wall, in the order they were verified. */
export async function GET() {
  try {
    const { rows } = await query<{ wall_name: string }>(
      `select wall_name from stepq.backings
       where status = 'verified' and wall_name is not null order by verified_at, id`,
    );
    return json({ names: rows.map((r) => r.wall_name) }, 200, {
      'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30',
    });
  } catch (e) {
    return errorResponse(e);
  }
}
