import { asUser, tableExport, type ExportFormat } from '@/server/admin/data';
import { adminUser } from '@/server/admin/session';
import { errorResponse } from '@/server/http';
import { rowQuery, type Params } from '../params';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES: Record<ExportFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
};

/**
 * GET /admin/export?t=<table>[&format=csv|json][&col=<name>…][&scope=filtered&q=…&f.<col>=…
 * &from=…&to=…]: the table, for admins only. Without `scope=filtered` every row is included.
 */
export async function GET(req: Request) {
  try {
    const user = await adminUser();
    if (!user) return new Response('Not found', { status: 404 });
    const url = new URL(req.url);
    const table = url.searchParams.get('t') ?? '';
    const format: ExportFormat = url.searchParams.get('format') === 'json' ? 'json' : 'csv';
    const columns = url.searchParams.getAll('col');
    const params: Params = {};
    for (const [k, v] of url.searchParams) params[k] = v;
    const q = url.searchParams.get('scope') === 'filtered' ? rowQuery(params) : {};
    const body = await asUser(user, (c) => tableExport(c, table, { ...q, columns, format }));
    const day = new Date().toISOString().slice(0, 10);
    const name = `stepq-${table.replace(/[^\w-]+/g, '_')}-${day}.${format}`;
    return new Response(format === 'csv' ? '﻿' + body : body, {
      headers: {
        'Content-Type': TYPES[format],
        'Content-Disposition': `attachment; filename="${name}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
