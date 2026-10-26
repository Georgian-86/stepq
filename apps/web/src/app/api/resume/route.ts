import { query } from '@/server/db';
import { ApiError } from '@/server/errors';
import { errorResponse } from '@/server/http';
import { verifyToken } from '@/server/signedToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The résumé PDF behind the signed link in a team-application alert. */
export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get('token') ?? '';
    const { id } = verifyToken(token, 'resume');
    const { rows } = await query<{ resume: Buffer; resume_name: string }>(
      'select resume, resume_name from stepq.team_applications where id = $1',
      [id],
    );
    const row = rows[0];
    if (!row) throw new ApiError('not-found', 'This link is no longer valid.');
    const name = row.resume_name.replace(/[^\w.\- ]+/g, '_') || 'resume.pdf';
    return new Response(new Uint8Array(row.resume), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${name}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
