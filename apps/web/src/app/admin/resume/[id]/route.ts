import { z } from 'zod';
import { asUser, readResume } from '@/server/admin/data';
import { adminUser } from '@/server/admin/session';
import { errorResponse } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /admin/resume/<application id>: a job applicant's résumé PDF, for admins only. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await adminUser();
    const { id } = await params;
    if (!user || !z.string().uuid().safeParse(id).success) {
      return new Response('Not found', { status: 404 });
    }
    const row = await asUser(user, (c) => readResume(c, id));
    if (!row) return new Response('Not found', { status: 404 });
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
