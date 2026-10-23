export const colors = {
  leaf: '#22C55E',
  deep: '#0A7F3F',
  mango: '#FFB627',
  tomato: '#F0533A',
  ink: '#0E2A1A',
  white: '#FFFFFF',
  mint: '#EEF6F0',
  line: '#DCE7DF',
  muted: '#55695D',
  mangoSoft: '#FFF3D6',
  tomatoSoft: '#FDE6E1',
  tomatoText: '#B8321C',
  leafSoft: '#DDF7E6',
  page: '#F6F9F6',
} as const satisfies Record<string, string>;

export const radius = { s: 12, m: 16, l: 24, pill: 999 } as const;
export const space = { xs: 4, s: 8, m: 16, l: 24, xl: 32 } as const;

export interface TypeStyle {
  family: 'Fredoka' | 'Nunito';
  weight: number;
  size: number;
  lineHeight: number;
  letterSpacing: number;
  uppercase?: boolean;
}

const t = (
  family: TypeStyle['family'],
  weight: number,
  size: number,
  lineHeight: number,
  letterSpacing = 0,
  uppercase?: boolean,
): TypeStyle => ({
  family,
  weight,
  size,
  lineHeight,
  letterSpacing,
  ...(uppercase ? { uppercase } : {}),
});

export const typeStyles: Record<string, TypeStyle> = {
  'web/hero': t('Fredoka', 600, 72, 76, -1.5),
  'web/h1': t('Fredoka', 600, 48, 54),
  'web/h2': t('Fredoka', 600, 36, 42, -0.6),
  'web/h3': t('Fredoka', 600, 22, 28),
  'web/lead': t('Nunito', 400, 20, 30),
  'web/body': t('Nunito', 400, 16, 26),
  'web/body-strong': t('Nunito', 700, 16, 24),
  'web/small': t('Nunito', 400, 14, 20),
  'web/small-strong': t('Nunito', 700, 14, 20),
  'web/number': t('Fredoka', 600, 40, 44),
  'app/display': t('Fredoka', 600, 34, 40),
  'app/title': t('Fredoka', 600, 28, 34),
  'app/heading': t('Fredoka', 600, 20, 26),
  'app/subheading': t('Fredoka', 500, 17, 22),
  'app/number-xl': t('Fredoka', 600, 52, 56),
  'app/number-l': t('Fredoka', 600, 30, 34),
  'app/number-m': t('Fredoka', 600, 18, 22),
  'app/body': t('Nunito', 400, 15, 22),
  'app/body-strong': t('Nunito', 700, 15, 22),
  'app/small': t('Nunito', 400, 13, 18),
  'app/small-strong': t('Nunito', 700, 13, 18),
  'app/label': t('Nunito', 800, 11, 14, 1.2, true),
  'app/button': t('Nunito', 700, 16, 22),
};
