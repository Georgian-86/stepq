import { asUser, tableCsv } from '@/server/admin/data';
import { adminUser } from '@/server/admin/session';
import { errorResponse } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /admin/export?t=<table>: the whole table as CSV, for admins only. */
export async function GET(req: Request) {
  try {
    const user = await adminUser();
    if (!user) return new Response('Not found', { status: 404 });
    const table = new URL(req.url).searchParams.get('t') ?? '';
    const csv = await asUser(user, (c) => tableCsv(c, table));
    const day = new Date().toISOString().slice(0, 10);
    return new Response('﻿' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="stepq-${table.replace(/[^\w-]+/g, '_')}-${day}.csv"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
