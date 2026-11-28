import { Button, Link, Section, Text } from '@react-email/components';
import type { CSSProperties, ReactNode } from 'react';
import { colors } from '@stepq/tokens';
import { BODY_FONT, HEADING_FONT, proColors, typeStyle } from '../Layout';

/**
 * Shared pieces for the member-facing (lifecycle and account) emails. Everything is a table or
 * inline style, because Gmail, Outlook and Apple Mail strip <style> blocks, flexbox and SVG.
 */

export type MailKind = 'transactional' | 'lifecycle';

/** 12,345 the Indian way (12,345 / 1,23,456). */
export const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

const t = {
  h: {
    fontFamily: HEADING_FONT,
    fontWeight: 600,
    fontSize: 28,
    lineHeight: '34px',
    letterSpacing: '-0.4px',
    color: colors.ink,
    margin: '0 0 16px',
  },
  h3: { ...typeStyle('web/h3', HEADING_FONT), margin: '8px 0 12px' },
  p: { ...typeStyle('web/body', BODY_FONT), margin: '0 0 16px' },
  small: { ...typeStyle('web/small', BODY_FONT), color: colors.muted, margin: '0 0 8px' },
  label: {
    fontFamily: BODY_FONT,
    fontWeight: 800,
    fontSize: 11,
    lineHeight: '14px',
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
    color: colors.muted,
    margin: 0,
  },
  num: {
    fontFamily: HEADING_FONT,
    fontWeight: 600,
    fontSize: 26,
    lineHeight: '30px',
    color: colors.ink,
    margin: '4px 0 0',
  },
  link: { color: colors.deep, fontWeight: 700, textDecoration: 'underline' },
  footer: {
    ...typeStyle('web/small', BODY_FONT),
    fontSize: 13,
    lineHeight: '19px',
    color: colors.muted,
    margin: '0 0 8px',
    textAlign: 'center',
  },
} satisfies Record<string, CSSProperties>;

export const H = (p: { children: ReactNode }) => <Text style={t.h}>{p.children}</Text>;
export const H3 = (p: { children: ReactNode }) => <Text style={t.h3}>{p.children}</Text>;
export const Body = (p: { children: ReactNode }) => <Text style={t.p}>{p.children}</Text>;
export const Small = (p: { children: ReactNode }) => <Text style={t.small}>{p.children}</Text>;
export const A = (p: { href: string; children: ReactNode }) => (
  <Link href={p.href} style={t.link}>
    {p.children}
  </Link>
);

const button = (bg: string, fg: string): CSSProperties => ({
  backgroundColor: bg,
  color: fg,
  borderRadius: 999,
  padding: '15px 28px',
  fontFamily: BODY_FONT,
  fontWeight: 700,
  fontSize: 16,
  lineHeight: '22px',
  textDecoration: 'none',
  display: 'inline-block',
});

/** Primary button. 'gold' is for Pro moments only. */
export function Button1(p: { href: string; tone?: 'deep' | 'gold'; children: ReactNode }) {
  const gold = p.tone === 'gold';
  return (
    <Section style={{ margin: '8px 0 24px' }}>
      <Button
        href={p.href}
        style={
          gold
            ? {
                ...button(proColors.gold2, proColors.night2),
                border: `1px solid ${proColors.gold3}`,
              }
            : button(colors.deep, colors.white)
        }
      >
        {p.children}
      </Button>
    </Section>
  );
}

const tones = {
  mint: { bg: colors.mint, border: colors.line, fg: colors.ink },
  leaf: { bg: colors.leafSoft, border: colors.leafSoft, fg: colors.ink },
  mango: { bg: colors.mangoSoft, border: colors.mangoSoft, fg: colors.ink },
  tomato: { bg: colors.tomatoSoft, border: colors.tomatoSoft, fg: colors.tomatoText },
  champagne: { bg: proColors.champagne, border: proColors.champagne2, fg: proColors.goldText },
  night: { bg: proColors.night2, border: proColors.gold3, fg: colors.white },
} as const;
export type Tone = keyof typeof tones;

export function Callout(p: { tone?: Tone; title?: string; children: ReactNode }) {
  const c = tones[p.tone ?? 'mint'];
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 16,
        margin: '0 0 20px',
      }}
    >
      <tbody>
        <tr>
          <td style={{ padding: '16px 20px' }}>
            {p.title ? (
              <Text
                style={{
                  ...typeStyle('web/body-strong', BODY_FONT),
                  color: c.fg,
                  margin: '0 0 4px',
                }}
              >
                {p.title}
              </Text>
            ) : null}
            <Text style={{ ...typeStyle('web/body', BODY_FONT), color: c.fg, margin: 0 }}>
              {p.children}
            </Text>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** A row of 2 or 3 number tiles (weekly summary, results). */
export function Stats(p: { items: { label: string; value: string }[]; tone?: 'mint' | 'night' }) {
  const night = p.tone === 'night';
  const width = `${Math.floor(100 / p.items.length)}%`;
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{ margin: '0 0 20px', borderCollapse: 'separate', borderSpacing: '8px 0' }}
    >
      <tbody>
        <tr>
          {p.items.map((i) => (
            <td
              key={i.label}
              width={width}
              valign="top"
              style={{
                backgroundColor: night ? proColors.night1 : colors.mint,
                border: `1px solid ${night ? proColors.gold3 : colors.line}`,
                borderRadius: 16,
                padding: '14px 12px',
              }}
            >
              <Text style={{ ...t.label, color: night ? proColors.onNightMuted : colors.muted }}>
                {i.label}
              </Text>
              <Text style={{ ...t.num, color: night ? proColors.goldOnNight : colors.ink }}>
                {i.value}
              </Text>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

/** A numbered or ticked step list. */
export function Steps(p: { items: ReactNode[]; numbered?: boolean; tone?: 'deep' | 'gold' }) {
  const mark = p.tone === 'gold' ? proColors.gold3 : colors.deep;
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: '0 0 20px' }}>
      <tbody>
        {p.items.map((item, i) => (
          <tr key={i}>
            <td valign="top" style={{ width: 34, paddingBottom: 12 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: p.tone === 'gold' ? proColors.champagne2 : colors.leafSoft,
                  color: mark,
                  textAlign: 'center',
                  fontFamily: BODY_FONT,
                  fontWeight: 800,
                  fontSize: 13,
                  lineHeight: '24px',
                }}
              >
                {p.numbered ? i + 1 : '✓'}
              </span>
            </td>
            <td valign="top" style={{ ...typeStyle('web/body', BODY_FONT), paddingBottom: 12 }}>
              {item}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Signoff(p: { from?: string }) {
  return (
    <>
      <Text style={{ ...t.p, margin: '8px 0 0' }}>Chalo, chalte hain.</Text>
      <Text style={{ ...t.p, color: colors.muted, margin: 0 }}>{p.from ?? 'Team StepQ'}</Text>
    </>
  );
}

/** Links every lifecycle email carries, so a member can opt out in one click. */
export type OptOut = { unsubscribeUrl: string; preferencesUrl: string };

/**
 * Footer under the card. Transactional mail says why it was sent and can't be unsubscribed from
 * (Gmail and Yahoo exempt it); lifecycle mail always has unsubscribe and preferences links.
 */
export function MemberFooter(
  p: { kind: MailKind; siteUrl: string; reason?: string } & Partial<OptOut>,
) {
  const reason =
    p.reason ??
    (p.kind === 'transactional'
      ? 'You are getting this email because of an action on your StepQ account.'
      : 'You are getting this because you have a StepQ account.');
  return (
    <>
      <Text style={t.footer}>{reason}</Text>
      {p.kind === 'lifecycle' && p.unsubscribeUrl && p.preferencesUrl ? (
        <Text style={t.footer}>
          <Link
            href={p.preferencesUrl}
            style={{ color: colors.muted, textDecoration: 'underline' }}
          >
            Choose which emails you get
          </Link>
          {'  ·  '}
          <Link
            href={p.unsubscribeUrl}
            style={{ color: colors.muted, textDecoration: 'underline' }}
          >
            Unsubscribe
          </Link>
        </Text>
      ) : null}
      <Text style={t.footer}>
        StepQ · Walk together, every day ·{' '}
        <Link
          href={`${p.siteUrl}/privacy`}
          style={{ color: colors.muted, textDecoration: 'underline' }}
        >
          Privacy
        </Link>
        {' · '}
        <Link
          href="mailto:connect@stepq.in"
          style={{ color: colors.muted, textDecoration: 'underline' }}
        >
          connect@stepq.in
        </Link>
      </Text>
    </>
  );
}
