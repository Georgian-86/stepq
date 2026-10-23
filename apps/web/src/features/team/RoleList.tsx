'use client';

import { ROLE_LABELS } from '@stepq/schemas';
import { Icon } from '@/components/ui/Icon';
import type { Role, SiteContent } from '@/content/site';

/** Figma placeholder JD text (`10:156`), shown until `content/site.ts` has the real one. */
export const JD_PLACEHOLDER =
  'The job description for each role is written and shared by StepQ. It covers what you will work on, the time it needs each week, and who you report to.';

/**
 * W04 "Open roles" accordion (`10:145`): one card open at a time. Open = white with a 2 px
 * deep border, closed = page background with a 1.5 px line border. The Download row only
 * appears when the role has a JD file.
 */
export function RoleList({
  roles,
  open,
  onToggle,
}: {
  roles: SiteContent['roles'];
  open: Role | null;
  onToggle: (role: Role) => void;
}) {
  return (
    <ul className="flex flex-col gap-[14px]">
      {roles.map((role) => {
        const isOpen = open === role.id;
        const label = ROLE_LABELS[role.id];
        const bodyId = `role-${role.id}-jd`;
        return (
          <li
            key={role.id}
            className={`rounded-card p-l ${
              isOpen ? 'border-2 border-deep bg-white' : 'border-[1.5px] border-line bg-page'
            }`}
          >
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={bodyId}
                onClick={() => onToggle(role.id)}
                className="-m-s flex w-[calc(100%+16px)] items-center justify-between gap-m rounded-(--radius-s) p-s text-left outline-none focus-visible:outline-2 focus-visible:outline-deep"
              >
                <span className="flex min-w-0 flex-col gap-[2px]">
                  <span className="type-web-h3 text-ink">{label}</span>
                  <span className="type-web-small text-muted">Remote · Unpaid</span>
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
              className="mt-[12px] flex-col gap-[12px] [&:not([hidden])]:flex"
            >
              <p className="type-web-body text-muted">{role.jdSummary ?? JD_PLACEHOLDER}</p>
              {role.jdUrl && (
                <a
                  href={role.jdUrl}
                  download
                  target="_blank"
                  rel="noopener"
                  className="flex min-h-[44px] items-center gap-[10px] rounded-(--radius-s) bg-mint px-[14px] py-[12px] outline-none focus-visible:outline-2 focus-visible:outline-deep"
                >
                  <Icon name="file-deep" />
                  <span className="type-web-small-strong min-w-0 flex-1 text-ink">
                    {label} – job description.pdf
                  </span>
                  <span className="type-web-small-strong text-deep">Download</span>
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
