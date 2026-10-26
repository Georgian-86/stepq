'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import type { AdminProfile } from '@/server/admin/data';
import { deleteAdminAction, updateAdminAction, type EditAdminState } from './actions';

export function EditAdminForm({ admin, isSelf }: { admin: AdminProfile; isSelf: boolean }) {
  const [state, action, pending] = useActionState<EditAdminState, FormData>(updateAdminAction, {});
  return (
    <div className="mb-5 rounded-card bg-white p-5 shadow-card">
      <form action={action}>
        <h3 className="type-app-subheading mb-1">
          {isSelf ? 'Your profile' : `Edit ${admin.name || admin.email}`}
        </h3>
        <p className="type-web-small mb-4 text-muted">
          Changing the email or password changes how {isSelf ? 'you sign' : 'they sign'} in. Leave
          the password empty to keep it.
        </p>
        <input type="hidden" name="userId" value={admin.userId} />
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Name" name="name" autoComplete="off" defaultValue={admin.name ?? ''} />
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="off"
            required
            defaultValue={admin.email}
          />
          <Field
            label="New password (8+ characters)"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
          />
        </div>
        {state.error && (
          <p role="alert" className="type-web-small mt-3 text-tomato-text">
            {state.error}
          </p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" loading={pending}>
            Save changes
          </Button>
          <Link href="/admin?t=admins" className="type-web-body-strong px-xs text-deep">
            Cancel
          </Link>
        </div>
      </form>

      {!isSelf && (
        <form action={deleteAdminAction} className="mt-6 border-t border-line pt-4">
          <input type="hidden" name="userId" value={admin.userId} />
          <h4 className="type-web-body-strong mb-1 text-tomato-text">Delete this admin</h4>
          <p className="type-web-small mb-3 text-muted">
            Removes their admin access and deletes their sign-in account. This cannot be undone.
          </p>
          <label className="type-web-small mb-3 flex items-center gap-2">
            <input type="checkbox" name="confirm" value="yes" required />
            Yes, delete {admin.email}
          </label>
          <Button type="submit" className="bg-tomato-text">
            Delete admin
          </Button>
        </form>
      )}
    </div>
  );
}
