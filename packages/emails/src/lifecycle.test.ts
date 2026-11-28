import { describe, expect, it } from 'vitest';
import { catalog, render, type TemplateName } from './index';

const opts = { siteUrl: 'https://stepq.in' };
const r = (name: string, props: object) => render(name as TemplateName, props as never, opts);

describe('lifecycle catalog', () => {
  it('has 20 member emails with a trigger and timing each', () => {
    expect(catalog).toHaveLength(20);
    for (const e of catalog) {
      expect(e.trigger.length, e.name).toBeGreaterThan(5);
      expect(e.timing.length, e.name).toBeGreaterThan(5);
      if (e.kind === 'lifecycle') {
        expect(e.preference, e.name).toBeDefined();
        expect(e.minors, `${e.name}: no marketing to under-18s`).toBe(false);
      }
    }
  });

  for (const e of catalog) {
    it(`${e.name} renders its sample`, async () => {
      const out = await r(e.name, e.sample);
      expect(out.subject.length).toBeGreaterThan(5);
      expect(out.subject.length).toBeLessThanOrEqual(60);
      expect(out.html).not.toContain('<svg');
      expect(out.html).toContain('https://stepq.in/email/piko-');
      expect(out.html).toContain('https://stepq.in/privacy');
      expect(out.text.length).toBeGreaterThan(50);
      if (e.kind === 'lifecycle') {
        expect(out.html).toContain('Unsubscribe');
        expect(out.html).toContain('https://stepq.in/email/unsubscribe?t=SAMPLE');
        expect(out.html).toContain('https://stepq.in/email/preferences?t=SAMPLE');
      } else {
        expect(out.html).not.toContain('Unsubscribe');
      }
    });
  }
});

describe('lifecycle templates', () => {
  it('welcome uses the goal, in Indian number format', async () => {
    const out = await r('welcome', {
      firstName: 'Riya',
      dailyGoal: 10000,
      openAppUrl: 'https://stepq.in/app',
    });
    expect(out.subject).toBe('Welcome to StepQ, Riya!');
    expect(out.html).toContain('10,000 steps');
    expect(out.html).toContain('piko-cheer.png');
  });

  it('welcomePro uses the gold header and says who bills', async () => {
    const e = catalog.find((c) => c.name === 'welcomePro')!;
    const store = await r('welcomePro', e.sample);
    expect(store.html).toContain('#F5B83D');
    expect(store.html).toContain('PRO');
    expect(store.html).toContain('renews on 28 Dec 2026');
    const gift = await r('welcomePro', { ...e.sample, source: 'admin', renewsOn: undefined });
    expect(gift.html).toContain('nothing to pay');
    expect(gift.html).not.toContain('App Store');
  });

  it('weeklySummary handles a first week and Pro members', async () => {
    const e = catalog.find((c) => c.name === 'weeklySummary')!;
    const first = await r('weeklySummary', {
      ...e.sample,
      changePct: undefined,
      friendRank: undefined,
    });
    expect(first.html).toContain('Your first week on StepQ');
    expect(first.html).not.toContain('among your friends');
    const down = await r('weeklySummary', { ...e.sample, changePct: -20.4 });
    expect(down.html).toContain('20% less');
    const pro = await r('weeklySummary', { ...e.sample, isPro: true });
    expect(pro.html).toContain('See your Insights');
    expect(pro.subject).toBe('Riya, you walked 61,240 steps last week');
  });

  it('milestone subjects per kind', async () => {
    const base = catalog.find((c) => c.name === 'milestone')!.sample;
    expect((await r('milestone', { ...base, kind: 'first10k' })).subject).toContain('first 10K');
    expect((await r('milestone', { ...base, kind: 'streak', value: 100 })).subject).toContain(
      '100-day',
    );
    expect((await r('milestone', { ...base, kind: 'lifetime', value: 100000 })).subject).toContain(
      '1,00,000',
    );
  });

  it('challengeResult without a reward shows the board button', async () => {
    const base = catalog.find((c) => c.name === 'challengeResult')!.sample;
    const out = await r('challengeResult', { ...base, reward: undefined, rank: 140 });
    expect(out.subject).toBe('You finished #140 in November Monsoon Walk');
    expect(out.html).toContain('See the full board');
    expect(out.html).not.toContain('Your reward');
  });

  it('Supabase auth templates default to Supabase variables', async () => {
    const out = await r('authConfirmSignup', {});
    expect(out.html).toContain('href="{{ .ConfirmationURL }}"');
    const change = await r('authEmailChange', {});
    expect(change.html).toContain('{{ .NewEmail }}');
  });

  it('escapes member-supplied names', async () => {
    const base = catalog.find((c) => c.name === 'friendRequest')!.sample;
    const out = await r('friendRequest', { ...base, fromName: '<img src=x onerror=1>' });
    expect(out.html).not.toContain('<img src=x');
    expect(out.html).toContain('&lt;img');
  });
});
