import { redirect } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { asAdmin, listTables } from '@/server/admin/data';
import type { AuthUser } from '@/server/admin/gotrue';
import { signedInUser } from '@/server/admin/session';
import { logout } from '../actions';
import { adminHref } from '../params';
import { NavContent, NavLink, NavProvider } from '../ui/nav';
import { SidebarNav } from '../ui/Sidebar';
import { SidebarSkeleton } from '../ui/Skeletons';

export const dynamic = 'force-dynamic';

/**
 * The dashboard frame: header and sidebar. It renders once per visit and stays on screen while
 * the views inside it (`page.tsx`) change, so a click only waits for the view it opens.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await signedInUser();
  if (!user) redirect('/admin/login');
  return (
    <NavProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 bg-white/95 px-4 py-3 backdrop-blur edge-b md:px-6">
          <NavLink href="/admin" className="type-app-subheading flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-flex size-7 items-center justify-center rounded-[8px] bg-deep text-[13px] font-bold text-white"
            >
              S
            </span>
            StepQ admin
          </NavLink>
          <div className="flex items-center gap-1 sm:gap-3">
            <NavLink
              href={adminHref({ t: 'admins', edit: user.id })}
              className="type-web-small hidden max-w-[220px] truncate text-muted underline-offset-2 hover:underline sm:inline"
            >
              {user.email}
            </NavLink>
            <form action={logout}>
              <Button type="submit" variant="text">
                Sign out
              </Button>
            </form>
          </div>
        </header>

        <div className="flex flex-1 flex-col md:flex-row">
          <nav
            aria-label="Dashboard"
            className="bg-white px-2 py-3 edge-b md:sticky md:top-[61px] md:h-[calc(100dvh-61px)] md:w-[248px] md:shrink-0 md:overflow-y-auto md:shadow-[inset_-1.5px_0_0_var(--color-line)]"
          >
            <Suspense fallback={<SidebarSkeleton />}>
              <Sidebar user={user} />
            </Suspense>
          </nav>
          <NavContent>{children}</NavContent>
        </div>
      </div>
    </NavProvider>
  );
}

async function Sidebar({ user }: { user: AuthUser }) {
  const tables = await asAdmin(user, listTables);
  return tables ? <SidebarNav tables={tables} /> : null;
}
