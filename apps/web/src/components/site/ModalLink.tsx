'use client';

import type { ReactNode } from 'react';
import { useModalParam } from '@/lib/useModalParam';

/**
 * Link that opens a `?modal=` modal in place (history entry, back closes it). Without JS it is
 * an ordinary link to the same URL, which opens the modal on load.
 */
export function ModalLink({
  modal,
  params = {},
  className,
  children,
}: {
  modal: string;
  params?: Record<string, string>;
  className?: string;
  children: ReactNode;
}) {
  const { open } = useModalParam(modal);
  const href = `?${new URLSearchParams({ modal, ...params }).toString()}`;
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        open(params);
      }}
    >
      {children}
    </a>
  );
}
