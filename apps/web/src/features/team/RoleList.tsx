'use client';

import { ROLE_LABELS } from '@stepq/schemas';
import { Icon } from '@/components/ui/Icon';
import { ROLE_DESCRIPTIONS } from '@/content/roles';
import type { Role } from '@/content/site';

function JdList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-[8px]">
      <h4 className="type-web-body-strong text-ink">{title}</h4>
      <ul className="type-web-small flex list-disc flex-col gap-[6px] pl-[20px] text-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * W04 "Open roles" accordion (`10:145`): one card open at a time. Open = white with a 2 px
 * deep border, closed = page background with a 1.5 px line border. The open card shows the
 * role's job description (`content/roles.ts`).
 */
export function RoleList({
  roles,
  open,
  onToggle,
}: {
  roles: Role[];
  open: Role | null;
  onToggle: (role: Role) => void;
}) {
  return (
    <ul className="flex flex-col gap-[14px]">
      {roles.map((role) => {
        const isOpen = open === role;
        const label = ROLE_LABELS[role];
        const jd = ROLE_DESCRIPTIONS[role];
        const bodyId = `role-${role}-jd`;
        return (
          <li
            key={role}
            className={`rounded-card edge ${
              isOpen
                ? 'bg-white p-[26px] [--edge-w:2px] [--edge:var(--color-deep)]'
                : 'bg-page p-[25.5px]'
            }`}
          >
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={bodyId}
                onClick={() => onToggle(role)}
                className="-m-s flex w-[calc(100%+16px)] items-center justify-between gap-m rounded-(--radius-s) p-s text-left outline-none focus-visible:outline-2 focus-visible:outline-deep"
              >
                <span className="flex min-w-0 flex-col gap-[2px]">
                  <span className="type-web-h3 text-ink">{label}</span>
                  <span className="type-web-small text-muted">
                    {jd.type} · {jd.area}
                  </span>
                </span>
                <span className="type-web-small-strong flex shrink-0 items-center gap-[6px] text-deep">
                  {isOpen ? 'Hide JD' : 'View JD'}
                  <Icon
                    name="chev-deep"
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>
            </h3>
            <div
              id={bodyId}
              hidden={!isOpen}
              className="mt-[12px] flex-col gap-[16px] [&:not([hidden])]:flex"
            >
              <p className="type-web-body text-muted">{jd.summary}</p>
              <JdList title="What you will do" items={jd.responsibilities} />
              <JdList title="What we are looking for" items={jd.requirements} />
              <div className="flex flex-col gap-[8px]">
                <h4 className="type-web-body-strong text-ink">How to apply</h4>
                <p className="type-web-small text-muted">
                  {jd.howToApply} Use the form on this page.
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
