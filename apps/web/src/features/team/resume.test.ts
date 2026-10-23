import { RESUME_MAX_BYTES } from '@stepq/schemas';
import { describe, expect, it } from 'vitest';
import { RESUME_ERROR, readResume } from './resume';

const pdf = new TextEncoder().encode('%PDF-1.4\n%%EOF\n');

describe('readResume', () => {
  it('returns the file name and bare base64 of a PDF', async () => {
    const file = new File([pdf], 'cv.pdf', { type: 'application/pdf' });
    const out = await readResume(file);
    expect(out.fileName).toBe('cv.pdf');
    expect(atob(out.base64)).toBe('%PDF-1.4\n%%EOF\n');
  });
  it.each([
    ['a non-PDF type', new File([pdf], 'cv.pdf', { type: 'text/plain' })],
    ['a non-.pdf name', new File([pdf], 'cv.doc', { type: 'application/pdf' })],
    ['a renamed text file', new File(['hello'], 'fake.pdf', { type: 'application/pdf' })],
    ['an empty file', new File([], 'cv.pdf', { type: 'application/pdf' })],
    [
      'a file over 5 MB',
      new File([pdf, new Uint8Array(RESUME_MAX_BYTES)], 'cv.pdf', { type: 'application/pdf' }),
    ],
  ])('rejects %s', async (_n, file) => {
    await expect(readResume(file)).rejects.toThrow(RESUME_ERROR);
  });
});
