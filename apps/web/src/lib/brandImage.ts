import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pikoSvg, type PikoMood } from '@stepq/brand';

/** Shared by the favicon, Apple touch icon and link-preview images (built once, at build time). */
export const BRAND = { leaf: '#22C55E', deep: '#0A7F3F', ink: '#0E2A1A', white: '#FFFFFF' };

const fontFile = (family: 'fredoka' | 'nunito', weight: number) =>
  readFile(
    join(
      process.cwd(),
      `node_modules/@fontsource/${family}/files/${family}-latin-${weight}-normal.woff`,
    ),
  );

export async function brandFonts() {
  const [fredoka, nunito] = await Promise.all([fontFile('fredoka', 600), fontFile('nunito', 700)]);
  return [
    { name: 'Fredoka', data: fredoka, weight: 600 as const, style: 'normal' as const },
    { name: 'Nunito', data: nunito, weight: 700 as const, style: 'normal' as const },
  ];
}

export const pikoDataUri = (mood: PikoMood) =>
  `data:image/svg+xml;base64,${Buffer.from(pikoSvg[mood]).toString('base64')}`;
