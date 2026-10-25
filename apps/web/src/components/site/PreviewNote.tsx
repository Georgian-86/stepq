import type { ReactNode } from 'react';
import { PREVIEW_MODE } from '@/lib/preview';

/** Preview builds only: a mango-soft line inside a modal or card (where the banner is hidden). */
export function PreviewNote({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  if (!PREVIEW_MODE) return null;
  return (
    <p
      className={`type-web-small rounded-(--radius-s) bg-mango-soft px-m py-s text-ink ${className}`}
    >
      {children}
    </p>
  );
}
