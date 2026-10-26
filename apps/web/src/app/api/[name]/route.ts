import { after } from 'next/server';
import { handleCall } from '@/server/http';
import { deliverPendingMail } from '@/server/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// A 5 MB résumé and an email send fit comfortably.
export const maxDuration = 30;

/** The site's API: POST /api/<name> with JSON `data` → `{ result }` or `{ error }`. */
export async function POST(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const res = await handleCall((await params).name, req);
  // Send any mail this request queued (and retry earlier failures) after the response.
  after(() => deliverPendingMail().catch((e) => console.error('mail delivery', e)));
  return res;
}
