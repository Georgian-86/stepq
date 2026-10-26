import { storeChunk } from '@/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** One part of a large request body (see CHUNK_HEADER in server/http.ts). */
export function POST(req: Request) {
  return storeChunk(req);
}
