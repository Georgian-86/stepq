import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { site, type SiteContent } from '../apps/web/src/content/site';
import {
  findGaps,
  hasFooterPlaceholder,
  hasRecaptchaKey,
  loadInput,
  parseAllow,
  report,
  type LaunchInput,
} from './check-launch';

const filledContent: SiteContent = {
  ...site,
  roles: site.roles.map((r) => ({ ...r, jdUrl: `https://stepq.in/jd/${r.id}.pdf` })),
  ambassadorEligibility: 'Anyone 18+.',
  ambassadorTerms: [{ title: 'Terms', body: 'Be kind.' }],
  socials: { instagram: 'https://i', linkedin: 'https://l', youtube: 'https://y' },
  privacyPolicy: '## Policy',
  fundCollectsEmail: true,
};
const filled: LaunchInput = {
  content: filledContent,
  mailFrom: 'StepQ <hello@getstepq.com>',
  footerPlaceholder: false,
  kitUrl: 'https://kit',
  recaptchaKey: true,
};
const root = join(import.meta.dirname, '..');

describe('check-launch', () => {
  // Frozen copy of today's content: filling the real site.ts later must not break CI.
  const defaults: SiteContent = {
    roles: ['marketing', 'design', 'content', 'tech'].map((id) => ({
      id: id as SiteContent['roles'][number]['id'],
      jdUrl: null,
      jdSummary: null,
    })),
    ambassadorEligibility: null,
    ambassadorTerms: null,
    socials: { instagram: null, linkedin: null, youtube: null },
    privacyPolicy: null,
    contactEmail: 'hello@stepq.in',
    fundCollectsEmail: false,
  };

  it('current defaults leave items open and exit 1', () => {
    const gaps = findGaps({
      content: defaults,
      mailFrom: 'StepQ <hello@stepq.in>',
      footerPlaceholder: true,
      kitUrl: undefined,
      recaptchaKey: undefined,
    });
    const ids = gaps.map((g) => g.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'privacyPolicy',
        'ambassadorTerms',
        'roles.marketing.jdUrl',
        'fundEmailPromise',
      ]),
    );
    const r = report(gaps);
    expect(r.exitCode).toBe(1);
    expect(r.lines.join('\n')).toMatch(/privacyPolicy .*\[Q3\]/);
  });

  // Whether the real repo still has the Q5 placeholders, read independently of loadInput.
  const realQ5 = () => {
    const footer = readFileSync(join(root, 'apps/web/src/components/site/Footer.tsx'), 'utf8');
    const config = readFileSync(join(root, 'functions/src/config.ts'), 'utf8');
    return {
      footer: /hello@stepq\.in/i.test(footer) && /placeholder/i.test(footer),
      mail: /MAIL_FROM',\s*\{\s*default:\s*'[^']*hello@stepq\.in/i.test(config),
    };
  };

  it('real repo: Q5 gaps are reported exactly while the placeholders exist', async () => {
    const ids = findGaps(await loadInput(root)).map((g) => g.id);
    const q5 = realQ5();
    expect(ids.includes('footerPlaceholder')).toBe(q5.footer);
    expect(ids.includes('mailFrom')).toBe(q5.mail);
  });

  it('footer detection: any wording, and a missing file is unknown', () => {
    expect(hasFooterPlaceholder('<p>hello@stepq.in is only a placeholder for now</p>')).toBe(true);
    expect(hasFooterPlaceholder('<p>hello@stepq.in</p>')).toBe(false);
    const g = findGaps({ ...filled, footerPlaceholder: undefined });
    expect(g.map((x) => x.id)).toEqual(['footerPlaceholder']);
    expect(g[0].unknown).toBe(true);
  });

  it('recaptcha detection ignores comments and needs a non-empty value', () => {
    const y = (v: string) =>
      `env:\n  # value: commented\n  - variable: NEXT_PUBLIC_RECAPTCHA_KEY\n    ${v}\n  - variable: OTHER\n    value: x\n`;
    expect(hasRecaptchaKey(y('value: abc'))).toBe(true);
    expect(hasRecaptchaKey(y('value: ""'))).toBe(false);
    expect(hasRecaptchaKey(y('value:'))).toBe(false);
    expect(hasRecaptchaKey(y('# value: abc'))).toBe(false);
    expect(hasRecaptchaKey('# - variable: NEXT_PUBLIC_RECAPTCHA_KEY\n#   value: abc\n')).toBe(
      false,
    );
  });

  it('a filled fixture is clean and exits 0', () => {
    expect(findGaps(filled)).toEqual([]);
    expect(report([]).exitCode).toBe(0);
  });

  it('flags the mail placeholder, footer sentence and unknown files', () => {
    const ids = findGaps({
      ...filled,
      mailFrom: 'StepQ <hello@stepq.in>',
      footerPlaceholder: true,
      kitUrl: undefined,
      recaptchaKey: undefined,
    }).map((g) => g.id);
    expect(ids).toEqual(['kitUrl', 'mailFrom', 'footerPlaceholder', 'recaptchaKey']);
    expect(findGaps({ ...filled, kitUrl: '' }).map((g) => g.id)).toEqual(['kitUrl']);
    expect(findGaps({ ...filled, recaptchaKey: false }).map((g) => g.id)).toEqual(['recaptchaKey']);
  });

  it('--allow accepts named gaps only', () => {
    const gaps = findGaps({ ...filled, content: { ...filledContent, privacyPolicy: null } });
    expect(report(gaps, parseAllow(['--allow=privacyPolicy,x'])).exitCode).toBe(0);
    expect(report(gaps, ['socials.youtube']).exitCode).toBe(1);
  });

  it('reads a fixture repo (env file, apphosting) and the CLI exit code', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'launch-'));
    for (const d of ['functions/src', 'apps/web/src/components/site', 'apps/web/src/content'])
      mkdirSync(join(dir, d), { recursive: true });
    writeFileSync(
      join(dir, 'functions/.env.stepq-prod'),
      'MAIL_FROM=StepQ <hi@x.com>\nAMBASSADOR_KIT_URL=https://kit\n',
    );
    writeFileSync(
      join(dir, 'apps/web/apphosting.yaml'),
      'env:\n  - variable: NEXT_PUBLIC_RECAPTCHA_KEY\n    value: abc\n',
    );
    writeFileSync(join(dir, 'apps/web/src/components/site/Footer.tsx'), '<p>© 2026</p>');
    writeFileSync(
      join(dir, 'apps/web/src/content/site.ts'),
      `export const site = ${JSON.stringify(filledContent)};`,
    );
    const input = await loadInput(dir);
    expect(findGaps(input)).toEqual([]);

    const cli = (...args: string[]) =>
      spawnSync('pnpm', ['exec', 'tsx', 'scripts/check-launch.ts', ...args], {
        cwd: root,
        encoding: 'utf8',
      });
    const open = cli();
    const gapIds = findGaps(await loadInput(root)).map((g) => g.id);
    expect(open.status).toBe(gapIds.length ? 1 : 0);
    const q5 = realQ5();
    if (q5.footer) expect(open.stdout).toContain('footerPlaceholder');
    if (q5.mail) expect(open.stdout).toContain('mailFrom');
    const ids = gapIds.join(',');
    expect(cli(`--allow=${ids}`).status).toBe(0);
  });
});
