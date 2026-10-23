import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'text';

const base =
  'type-button inline-flex min-h-[52px] items-center justify-center gap-s rounded-pill px-l py-[15px] whitespace-nowrap transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:cursor-not-allowed motion-reduce:active:scale-100';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-deep text-white disabled:opacity-70',
  text: 'text-deep disabled:opacity-60',
};

/** Class names of Button (Figma `4:116`), for links styled as buttons. */
export function buttonClass(variant: ButtonVariant = 'primary', className = '') {
  return `${base} ${variants[variant]} ${className}`;
}

export function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-[18px] animate-spin-slow rounded-full border-2 border-current border-r-transparent"
    />
  );
}

export function Button({
  variant = 'primary',
  loading = false,
  type = 'button',
  disabled,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, className)}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
