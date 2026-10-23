'use client';

import { teamApplicationInput } from '@stepq/schemas';
import { useState } from 'react';
import { GUTTER } from '@/components/site/links';
import { site, type Role } from '@/content/site';
import { useZodForm } from '@/lib/useZodForm';
import { RoleList } from './RoleList';
import { NO_RESUME, TeamForm } from './TeamForm';

const FIRST = site.roles[0]?.id ?? null;

/**
 * W04 body (`10:144`): open roles and the application form. Opening a role selects it in
 * "Position applied for"; changing the select leaves the cards as they are. As in Figma, the
 * first role starts open (and so selected).
 */
export function JoinTeam() {
  const form = useZodForm(teamApplicationInput, {
    idPrefix: 'team',
    initial: { resume: NO_RESUME, ...(FIRST ? { role: FIRST } : {}) },
  });
  const [open, setOpen] = useState<Role | null>(FIRST);
  const { setValue, validateField } = form;

  function toggle(role: Role) {
    if (open === role) {
      setOpen(null);
      return;
    }
    setOpen(role);
    setValue('role', role);
    validateField('role');
  }

  return (
    <section
      aria-label="Open roles and application"
      className={`mx-auto flex max-w-[1440px] flex-col items-stretch gap-[48px] py-[56px] lg:flex-row lg:items-start lg:py-[88px] ${GUTTER}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-[14px]">
        <h2 className="type-web-h2 text-ink">Open roles</h2>
        <RoleList roles={site.roles} open={open} onToggle={toggle} />
      </div>
      <TeamForm form={form} />
    </section>
  );
}
