import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { colors, radius, space, toCssVariables, typeStyles } from './index';

const css = readFileSync(new URL('../tailwind.css', import.meta.url), 'utf8');
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe('colors', () => {
  it('matches the Figma variables', () => {
    expect(colors).toEqual({
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
    });
  });
  it('appears in tailwind.css with the same hex', () => {
    for (const [name, hex] of Object.entries(colors)) {
      expect(css).toContain(`--color-${kebab(name)}: ${hex};`);
    }
  });
});

describe('radius and space', () => {
  it('match Figma', () => {
    expect(radius).toEqual({ s: 12, m: 16, l: 24, pill: 999 });
    expect(space).toEqual({ xs: 4, s: 8, m: 16, l: 24, xl: 32 });
    for (const [k, v] of Object.entries(radius)) expect(css).toContain(`--radius-${k}: ${v}px;`);
    for (const [k, v] of Object.entries(space)) expect(css).toContain(`--spacing-${k}: ${v}px;`);
  });
});

describe('typeStyles', () => {
  it('has exact web hero and h2', () => {
    expect(typeStyles['web/hero']).toEqual({
      family: 'Fredoka',
      weight: 600,
      size: 72,
      lineHeight: 76,
      letterSpacing: -1.5,
    });
    expect(typeStyles['web/h2']?.letterSpacing).toBe(-0.6);
  });
  it('has app label', () => {
    expect(typeStyles['app/label']).toEqual({
      family: 'Nunito',
      weight: 800,
      size: 11,
      lineHeight: 14,
      letterSpacing: 1.2,
      uppercase: true,
    });
  });
  it('has all 23 styles', () => {
    expect(Object.keys(typeStyles)).toHaveLength(23);
  });
  it('every required utility class exists in tailwind.css', () => {
    for (const c of [
      'web-hero',
      'web-h1',
      'web-h2',
      'web-h3',
      'web-lead',
      'web-body',
      'web-body-strong',
      'web-small',
      'web-small-strong',
      'label',
      'button',
      'chip',
    ]) {
      expect(css).toContain(`@utility type-${c} {`);
    }
  });
  it('type styles are Tailwind utilities so variants (lg:type-web-hero) work', () => {
    // Plain unlayered `.type-*` rules would beat every utility and could not take variants.
    expect(css).not.toMatch(/^\.type-/m);
  });
  it('every typeStyle has a utility whose values match', () => {
    for (const [key, t] of Object.entries(typeStyles)) {
      const cls = key.replace('/', '-').replace(/^app-(label|button)$/, '$1');
      if (!css.includes(`@utility type-${cls} {`)) continue;
      const b = css.split(`@utility type-${cls} {`)[1]!.split('}')[0]!;
      expect(b, cls).toContain(`font-size: ${t.size}px;`);
      expect(b, cls).toContain(`line-height: ${t.lineHeight}px;`);
      expect(b, cls).toContain(`font-weight: ${t.weight};`);
      expect(b, cls).toContain(`letter-spacing: ${t.letterSpacing}px;`);
      expect(b, cls).toContain(t.family === 'Fredoka' ? 'var(--font-display)' : 'var(--font-body)');
    }
  });
  it('utility sizes match typeStyles', () => {
    const block = (cls: string) => css.split(`@utility type-${cls} {`)[1]!.split('}')[0]!;
    const hero = typeStyles['web/hero']!;
    expect(block('web-hero')).toContain(`font-size: ${hero.size}px;`);
    expect(block('web-hero')).toContain(`line-height: ${hero.lineHeight}px;`);
    expect(block('web-hero')).toContain(`letter-spacing: ${hero.letterSpacing}px;`);
    expect(block('label')).toContain('text-transform: uppercase;');
  });
});

describe('toCssVariables', () => {
  it('emits colour variables', () => {
    const out = toCssVariables();
    expect(out).toContain('--color-deep: #0A7F3F;');
    expect(out).toContain('--color-mango-soft: #FFF3D6;');
    expect(out).toContain('--radius-pill: 999px;');
  });
});
