// Lists every launch item the client still has to supply. Exit 1 while any remain.
// Usage: pnpm check:launch [--allow=<id>,<id>]   (accepts named gaps; ids are printed below)
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { SiteContent } from '../apps/web/src/content/site';

export interface LaunchInput {
  content: SiteContent;
  /** Effective MAIL_FROM (prod env file, else the Functions default); null when unknown. */
  mailFrom: string | null;
  /** Footer source still contains the placeholder sentence. */
  footerPlaceholder: boolean;
  /** AMBASSADOR_KIT_URL from functions/.env.<prod>; undefined = file missing (unknown). */
  kitUrl: string | undefined;
  /** apphosting.yaml has NEXT_PUBLIC_RECAPTCHA_KEY; undefined = file missing (unknown). */
  recaptchaKey: boolean | undefined;
}

export interface Gap {
  id: string;
  missing: string;
  question: string;
  /** True when the state could not be determined (reported, but not known to be wrong). */
  unknown?: boolean;
}

const blank = (v: string | null | undefined) => !v || !v.trim();

export function findGaps(i: LaunchInput): Gap[] {
  const gaps: Gap[] = [];
  const c = i.content;
  if (blank(c.privacyPolicy))
    gaps.push({ id: 'privacyPolicy', missing: 'privacy policy text (Markdown)', question: 'Q3' });
  for (const r of c.roles)
    if (blank(r.jdUrl))
      gaps.push({
        id: `roles.${r.id}.jdUrl`,
        missing: `job description PDF URL for ${r.id}`,
        question: 'Q4',
      });
  if (blank(c.ambassadorEligibility))
    gaps.push({
      id: 'ambassadorEligibility',
      missing: 'ambassador eligibility text',
      question: 'Q4',
    });
  if (!c.ambassadorTerms || c.ambassadorTerms.length === 0)
    gaps.push({ id: 'ambassadorTerms', missing: 'ambassador T&C sections', question: 'Q4' });
  for (const name of ['instagram', 'linkedin', 'youtube'] as const)
    if (blank(c.socials[name]))
      gaps.push({ id: `socials.${name}`, missing: `${name} URL`, question: 'Q4' });
  if (i.kitUrl === undefined)
    gaps.push({
      id: 'kitUrl',
      missing: 'AMBASSADOR_KIT_URL unknown (functions/.env.stepq-prod not found)',
      question: 'Q4',
      unknown: true,
    });
  else if (blank(i.kitUrl))
    gaps.push({
      id: 'kitUrl',
      missing: 'AMBASSADOR_KIT_URL is empty in functions/.env.stepq-prod',
      question: 'Q4',
    });
  if (i.mailFrom === null || /hello@stepq\.in/i.test(i.mailFrom))
    gaps.push({
      id: 'mailFrom',
      missing: 'MAIL_FROM is still the placeholder hello@stepq.in',
      question: 'Q5',
    });
  if (i.footerPlaceholder)
    gaps.push({
      id: 'footerPlaceholder',
      missing:
        'footer still says "hello@stepq.in is a placeholder until StepQ confirms its address."',
      question: 'Q5',
    });
  if (!c.fundCollectsEmail)
    gaps.push({
      id: 'fundEmailPromise',
      missing: 'Fund copy promises a thank-you email but the form does not collect one',
      question: 'Q1',
    });
  if (i.recaptchaKey === undefined)
    gaps.push({
      id: 'recaptchaKey',
      missing: 'NEXT_PUBLIC_RECAPTCHA_KEY unknown (apps/web/apphosting.yaml not found)',
      question: 'Q6',
      unknown: true,
    });
  else if (!i.recaptchaKey)
    gaps.push({
      id: 'recaptchaKey',
      missing: 'NEXT_PUBLIC_RECAPTCHA_KEY not set in apphosting.yaml',
      question: 'Q6',
    });
  return gaps;
}

export interface Report {
  exitCode: 0 | 1;
  lines: string[];
}

export function report(gaps: Gap[], allow: string[] = []): Report {
  const accepted = gaps.filter((g) => allow.includes(g.id));
  const open = gaps.filter((g) => !allow.includes(g.id));
  const lines = open.map((g) => `${g.id.padEnd(26)} ${g.missing}  [${g.question}]`);
  for (const g of accepted)
    lines.push(`${g.id.padEnd(26)} accepted gap (--allow)  [${g.question}]`);
  lines.push(
    open.length
      ? `\n${open.length} launch item(s) still open.`
      : '\nAll launch items are filled (or explicitly allowed).',
  );
  return { exitCode: open.length ? 1 : 0, lines };
}

const read = (path: string) => (existsSync(path) ? readFileSync(path, 'utf8') : undefined);
const envValue = (text: string, key: string) =>
  text
    .match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]
    ?.trim()
    .replace(/^["']|["']$/g, '');

export async function loadInput(root: string): Promise<LaunchInput> {
  const { site } = (await import(
    pathToFileURL(join(root, 'apps/web/src/content/site.ts')).href
  )) as { site: SiteContent };
  const prodEnv = read(join(root, 'functions/.env.stepq-prod'));
  const config = read(join(root, 'functions/src/config.ts')) ?? '';
  const mailFrom =
    (prodEnv && envValue(prodEnv, 'MAIL_FROM')) ||
    config.match(/defineString\('MAIL_FROM',\s*\{\s*default:\s*'([^']*)'/)?.[1] ||
    null;
  const footer = read(join(root, 'apps/web/src/components/site/Footer.tsx')) ?? '';
  const apphosting = read(join(root, 'apps/web/apphosting.yaml'));
  return {
    content: site,
    mailFrom,
    footerPlaceholder: footer.includes('is a placeholder until StepQ confirms its address.'),
    kitUrl: prodEnv === undefined ? undefined : (envValue(prodEnv, 'AMBASSADOR_KIT_URL') ?? ''),
    recaptchaKey:
      apphosting === undefined
        ? undefined
        : /NEXT_PUBLIC_RECAPTCHA_KEY/.test(apphosting) &&
          !/variable:\s*NEXT_PUBLIC_RECAPTCHA_KEY\s*\n\s*value:\s*(""|'')?\s*(\n|$)/.test(
            apphosting,
          ),
  };
}

export function parseAllow(argv: string[]): string[] {
  return argv
    .filter((a) => a.startsWith('--allow='))
    .flatMap((a) => a.slice('--allow='.length).split(','))
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const root = join(__dirname, '..');
  const { exitCode, lines } = report(
    findGaps(await loadInput(root)),
    parseAllow(process.argv.slice(2)),
  );
  console.log(lines.join('\n'));
  process.exit(exitCode);
}

if (require.main === module) void main();
