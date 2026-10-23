import { colors, radius, space } from './tokens';

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** CSS custom-property declarations, one per line, for use inside a rule block. */
export function toCssVariables(): string {
  const lines = [
    ...Object.entries(colors).map(([k, v]) => `--color-${kebab(k)}: ${v};`),
    ...Object.entries(radius).map(([k, v]) => `--radius-${k}: ${v}px;`),
    ...Object.entries(space).map(([k, v]) => `--spacing-${k}: ${v}px;`),
  ];
  return lines.join('\n');
}
