import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { beforeEach, describe, expect, it } from 'vitest';
import { submitTeamApplicationHandler } from '../src/handlers/team';
import { bucket, db } from '../src/lib/admin';
import { setMailTransport } from '../src/lib/mail';

const host = process.env.FIRESTORE_EMULATOR_HOST;
const hasEmulator = Boolean(host);
if (hasEmulator) {
  process.env.STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199';
}

const fixture = (n: string) =>
  readFileSync(fileURLToPath(new URL(`./fixtures/${n}`, import.meta.url)));
const big = () => Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(5 * 1024 * 1024 + 1 - 9)]);

const req = (data: unknown, ip = '2.2.2.2') =>
  ({ data, rawRequest: { headers: { 'x-forwarded-for': ip } } }) as unknown as CallableRequest;

const data = (bytes: Buffer, over: Record<string, unknown> = {}) => ({
  name: 'Aarav Mehta',
  email: 'aarav@gmail.com',
  phone: '9876543210',
  role: 'design',
  why: 'I love building calm, useful products.',
  resume: { fileName: 'resume.pdf', base64: bytes.toString('base64') },
  website: '',
  requestId: randomUUID(),
  ...over,
});

const expectResumeError = async (d: unknown) => {
  await expect(submitTeamApplicationHandler(req(d))).rejects.toMatchObject({
    code: 'invalid-argument',
    details: { fields: { resume: 'Upload a PDF up to 5 MB' } },
  });
};

describe.skipIf(!hasEmulator)('submitTeamApplication', () => {
  beforeEach(async () => {
    setMailTransport(undefined);
    await fetch(`http://${host}/emulator/v1/projects/demo-stepq/databases/(default)/documents`, {
      method: 'DELETE',
    });
  });

  it('stores the PDF, the application and one founder mail', async () => {
    const out = await submitTeamApplicationHandler(req(data(fixture('resume.pdf'))));
    expect(out).toEqual({ firstName: 'Aarav' });
    const apps = await db().collection('teamApplications').get();
    expect(apps.size).toBe(1);
    const app = apps.docs[0]!;
    expect(app.data()).toMatchObject({ role: 'design', resumePath: `resumes/${app.id}.pdf` });
    const [meta] = await bucket().file(`resumes/${app.id}.pdf`).getMetadata();
    expect(meta.contentType).toBe('application/pdf');
    const mails = await db().collection('mail').get();
    expect(mails.size).toBe(1);
    const m = mails.docs[0]!.data();
    expect(m.template).toBe('teamApplicationAlert');
    expect(m.props.roleLabel).toBe('Design & Creative Intern');
    expect(m.props.resumeUrl).toBeTruthy();
    expect(m.props.resumeUrl).toContain(encodeURIComponent(`resumes/${app.id}.pdf`));
  });

  it('rejects a non-PDF renamed to .pdf', () => expectResumeError(data(fixture('fake.pdf'))));
  it('rejects a file over 5 MB', () => expectResumeError(data(big())));
  it('rejects an empty file', async () => {
    await expect(
      submitTeamApplicationHandler(
        req(data(Buffer.alloc(0), { resume: { fileName: 'a.pdf', base64: '' } })),
      ),
    ).rejects.toMatchObject({
      code: 'invalid-argument',
      details: { fields: { resume: expect.any(String) } },
    });
  });
  it('rejects invalid base64', () =>
    expectResumeError(
      data(Buffer.alloc(0), { resume: { fileName: 'a.pdf', base64: '%PDF-!!not base64!!' } }),
    ));

  it('is idempotent on a repeated requestId', async () => {
    const d = data(fixture('resume.pdf'));
    await submitTeamApplicationHandler(req(d));
    await submitTeamApplicationHandler(req(d));
    expect((await db().collection('teamApplications').get()).size).toBe(1);
    expect((await db().collection('mail').get()).size).toBe(1);
  });
});
