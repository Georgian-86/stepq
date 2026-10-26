'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { addAdminAction, type AddAdminState } from './actions';

export function AddAdminForm() {
  const [state, action, pending] = useActionState<AddAdminState, FormData>(addAdminAction, {});
  return (
    <form action={action} className="mb-5 rounded-card bg-white p-5 shadow-card">
      <h3 className="type-app-subheading mb-1">Add an admin</h3>
      <p className="type-web-small mb-4 text-muted">
        A new email gets an account with the password you set here (share it with them privately).
        An existing account keeps its own password.
      </p>
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <Field label="Name (optional)" name="name" autoComplete="off" />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="off"
          required
          defaultValue={state.email}
        />
        <Field
          label="Password (8+ characters)"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
        />
        <Button type="submit" loading={pending}>
          Add admin
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="type-web-small mt-3 text-tomato-text">
          {state.error}
        </p>
      )}
      {state.done && (
        <p role="status" className="type-web-small mt-3 text-deep">
          {state.done}
        </p>
      )}
    </form>
  );
}
