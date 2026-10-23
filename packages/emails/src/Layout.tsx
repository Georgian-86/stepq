import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { CSSProperties, ReactNode } from 'react';
import { colors, typeStyles } from '@stepq/tokens';

export type PikoMood = 'happy' | 'cheer';

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@600&family=Nunito:wght@400;700&display=swap';
const HEADING_FONT = "Fredoka, 'Trebuchet MS', Verdana, sans-serif";
const BODY_FONT = "Nunito, 'Segoe UI', Helvetica, Arial, sans-serif";

function style(key: string, family: string): CSSProperties {
  const s = typeStyles[key];
  if (!s) throw new Error(`Unknown type style ${key}`);
  return {
    fontFamily: family,
    fontWeight: s.weight,
    fontSize: s.size,
    lineHeight: `${s.lineHeight}px`,
    letterSpacing: s.letterSpacing || undefined,
    color: colors.ink,
    margin: 0,
    marginBottom: 0,
  };
}

const s = {
  body: { backgroundColor: colors.page, margin: 0, padding: '20px 0' },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    maxWidth: 600,
  },
  header: { backgroundColor: colors.leaf, padding: '28px 32px' },
  wordmark: {
    fontFamily: HEADING_FONT,
    fontWeight: 600,
    fontSize: 35,
    lineHeight: '40px',
    letterSpacing: '-1px',
    color: colors.ink,
    margin: 0,
  },
  content: { padding: 32 },
  h: { ...style('web/h2', HEADING_FONT), marginBottom: 16 },
  p: { ...style('web/body', BODY_FONT), marginBottom: 16 },
  strong: { ...style('web/body-strong', BODY_FONT), marginBottom: 16 },
  muted: { ...style('web/body', BODY_FONT), color: colors.muted, marginBottom: 0 },
  button: {
    backgroundColor: colors.deep,
    color: colors.white,
    borderRadius: 999,
    padding: '15px 24px',
    fontFamily: BODY_FONT,
    fontWeight: 700,
    fontSize: 16,
    lineHeight: '22px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  link: { color: colors.deep },
} satisfies Record<string, CSSProperties>;

/** A user-supplied URL is only ever clickable when it is http(s). */
export function safeHref(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? url.trim() : undefined;
  } catch {
    return undefined;
  }
}

export function Layout(props: {
  siteUrl: string;
  mood?: PikoMood;
  preview: string;
  children: ReactNode;
}) {
  const mood = props.mood ?? 'happy';
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <link href={FONTS_HREF} rel="stylesheet" />
      </Head>
      <Preview>{props.preview}</Preview>
      <Body style={s.body}>
        <Container style={s.card}>
          <Section style={s.header}>
            <table width="100%" role="presentation" cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td>
                    <Text style={s.wordmark}>
                      step<span style={{ color: colors.deep }}>q</span>
                    </Text>
                  </td>
                  <td align="right">
                    <Img
                      src={`${props.siteUrl}/email/piko-${mood}.png`}
                      alt="Piko, the StepQ mascot"
                      width={72}
                      height={72}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>
          <Section style={s.content}>{props.children}</Section>
        </Container>
      </Body>
    </Html>
  );
}

export const Heading = (p: { children: ReactNode }) => <Text style={s.h}>{p.children}</Text>;
export const P = (p: { children: ReactNode }) => <Text style={s.p}>{p.children}</Text>;
export const Strong = (p: { children: ReactNode }) => <Text style={s.strong}>{p.children}</Text>;
export const Muted = (p: { children: ReactNode }) => <Text style={s.muted}>{p.children}</Text>;

export function Cta(p: { href: string; children: ReactNode }) {
  return (
    <Section style={{ margin: '8px 0 24px' }}>
      <Button href={p.href} style={s.button}>
        {p.children}
      </Button>
    </Section>
  );
}

/** Check-mark list row (Figma icon/check, as a text glyph because email clients block SVG). */
export function CheckRow(p: { children: ReactNode }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ marginBottom: 12 }}>
      <tbody>
        <tr>
          <td
            valign="top"
            style={{ width: 28, color: colors.deep, ...style('web/body', BODY_FONT) }}
          >
            <span style={{ color: colors.deep, fontWeight: 700 }}>&#10003;</span>
          </td>
          <td style={style('web/body', BODY_FONT)}>{p.children}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** Renders a user-supplied link: clickable only when http(s), otherwise plain text. */
export function MaybeLink(p: { url: string }) {
  const href = safeHref(p.url);
  return href ? (
    <Link href={href} style={s.link}>
      {p.url}
    </Link>
  ) : (
    <>{p.url}</>
  );
}

export { s as layoutStyles };
