import { NextResponse, type NextRequest } from 'next/server';

/**
 * `stepq.in/join` (the W03 invite link): 307 to the home page, keeping the query string so
 * `?ref=` and UTM parameters reach the waitlist form's `source` (spec §10a).
 */
export function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = '/';
  return NextResponse.redirect(url, 307);
}
