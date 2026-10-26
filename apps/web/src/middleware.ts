import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  cookieOptions,
  refreshSession,
  secondsLeft,
} from '@/server/admin/gotrue';

/**
 * Keeps an /admin sign-in alive: refreshes the Supabase access token shortly before it expires
 * (pages and route handlers cannot set cookies while rendering). Who may see what is decided
 * by the pages themselves (`server/admin/session.ts`) and by RLS, not here.
 */
export async function middleware(req: NextRequest) {
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh || (access && secondsLeft(access) > 60)) return withHeaders(NextResponse.next());

  const session = await refreshSession(refresh).catch(() => null);
  if (!session) {
    req.cookies.delete(ACCESS_COOKIE);
    req.cookies.delete(REFRESH_COOKIE);
    const res = withHeaders(NextResponse.next({ request: req }));
    res.cookies.set(ACCESS_COOKIE, '', { ...cookieOptions, maxAge: 0 });
    res.cookies.set(REFRESH_COOKIE, '', { ...cookieOptions, maxAge: 0 });
    return res;
  }
  // The page rendering this request sees the new token too.
  req.cookies.set(ACCESS_COOKIE, session.accessToken);
  req.cookies.set(REFRESH_COOKIE, session.refreshToken);
  const res = withHeaders(NextResponse.next({ request: req }));
  res.cookies.set(ACCESS_COOKIE, session.accessToken, cookieOptions);
  res.cookies.set(REFRESH_COOKIE, session.refreshToken, cookieOptions);
  return res;
}

function withHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  res.headers.set('Cache-Control', 'private, no-store');
  res.headers.set('X-Frame-Options', 'DENY');
  return res;
}

export const config = { matcher: ['/admin', '/admin/:path*'] };
