import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { iconSvg, pikoSvg } from './index';

const pkgDir = join(__dirname, '..');
const figmaDir = join(pkgDir, '../../apps/web/e2e/figma');
const svgNames = (dir: string) =>
  readdirSync(join(pkgDir, 'svg', dir))
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.slice(0, -4));

describe('brand SVGs', () => {
  const all = [
    ...Object.entries(pikoSvg).map(([k, v]) => [`piko/${k}`, v] as const),
    ...Object.entries(iconSvg).map(([k, v]) => [`icon/${k}`, v] as const),
  ];

  it('exports the three Piko moods', () => {
    expect(Object.keys(pikoSvg).sort()).toEqual(['cheer', 'happy', 'nudge']);
  });

  it('has an index entry for every SVG on disk', () => {
    expect(Object.keys(iconSvg).sort()).toEqual(svgNames('icons').sort());
    expect(Object.keys(pikoSvg).sort()).toEqual(
      svgNames('.')
        .map((n) => n.replace(/^piko-/, ''))
        .sort(),
    );
  });

  it('names icons <icon>-<colour token>', () => {
    for (const name of Object.keys(iconSvg)) {
      expect(name).toMatch(/^[a-z]+(-[a-z]+)*-(deep|ink|muted|white|leaf|mango|tomato)$/);
    }
  });

  it('keeps generated.ts in sync with svg/', () => {
    const fresh = execFileSync('node', ['scripts/generate.mjs', '--stdout'], {
      cwd: pkgDir,
      encoding: 'utf8',
    });
    expect(readFileSync(join(pkgDir, 'src/generated.ts'), 'utf8')).toBe(fresh);
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
  const required = [
    ...Array.from({ length: 11 }, (_, i) => `w${String(i + 1).padStart(2, '0')}`),
    'w15',
    'w16',
    'w17',
    'm01',
  ];
  const width = (file: string) => {
    const header = readFileSync(join(figmaDir, `${file}.png`)).subarray(0, 24);
    expect(header.subarray(12, 16).toString('ascii')).toBe('IHDR');
    return header.readUInt32BE(16);
  };

  it.each(required)('%s.png exists with the expected width', (name) => {
    expect(width(name)).toBe(name === 'm01' ? 390 : 1440);
  });
});
