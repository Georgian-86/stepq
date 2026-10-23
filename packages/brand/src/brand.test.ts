import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { iconSvg, pikoSvg } from './index';

const figmaDir = join(__dirname, '../../../apps/web/e2e/figma');

describe('brand SVGs', () => {
  const all = [
    ...Object.entries(pikoSvg).map(([k, v]) => [`piko/${k}`, v] as const),
    ...Object.entries(iconSvg).map(([k, v]) => [`icon/${k}`, v] as const),
  ];

  it('exports the three Piko moods', () => {
    expect(Object.keys(pikoSvg).sort()).toEqual(['cheer', 'happy', 'nudge']);
  });

  it.each(all)('%s is a self-contained SVG with explicit size', (_name, svg) => {
    expect(svg.startsWith('<svg')).toBe(true);
    const root = svg.slice(0, svg.indexOf('>'));
    expect(root).toMatch(/\swidth="/);
    expect(root).toMatch(/\sheight="/);
    expect(svg).not.toContain('https://www.figma.com');
  });
});

describe('Figma reference renders', () => {
  const pngs = readdirSync(figmaDir).filter((f) => f.endsWith('.png'));

  it('has the desktop references', () => {
    expect(pngs.filter((f) => f.startsWith('w')).length).toBeGreaterThanOrEqual(13);
  });

  it.each(pngs.filter((f) => f.startsWith('w')))('%s is 1440 px wide', (file) => {
    const header = readFileSync(join(figmaDir, file)).subarray(0, 24);
    expect(header.subarray(12, 16).toString('ascii')).toBe('IHDR');
    expect(header.readUInt32BE(16)).toBe(1440);
  });
});
