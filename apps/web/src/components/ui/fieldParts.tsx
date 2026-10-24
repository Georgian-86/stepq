import type { ReactNode } from 'react';

export function FieldLabel({
  htmlFor,
  id,
  children,
}: {
  htmlFor?: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} id={id} className="type-label block text-muted">
      {children}
    </label>
  );
}

export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="type-app-small text-tomato-text">
      {children}
    </p>
  );
}

/**
 * Rounded control shell (W04 select / textarea): 12 px radius, 1.5 px line stroke (`edge`, so
 * padding includes the 1.5 px), 2 px deep stroke on focus (W16).
 */
export function roundedControl(error?: string) {
  return `w-full rounded-(--radius-s) edge bg-white type-web-body text-ink outline-none placeholder:text-muted focus:[--edge-w:2px] ${
    error ? '[--edge:var(--color-tomato)]' : 'focus:[--edge:var(--color-deep)]'
  }`;
}
