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

/** Rounded control shell (W04 select / textarea / file row): 12 px radius, 1.5 px line border. */
export function roundedControl(error?: string) {
  return `w-full rounded-(--radius-s) border-[1.5px] bg-white type-web-body text-ink transition-colors duration-150 outline-none placeholder:text-muted ${
    error ? 'border-tomato' : 'border-line focus-within:border-deep focus:border-deep'
  }`;
}
