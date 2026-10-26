'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { login, type LoginState } from '../actions';

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        required
        defaultValue={state.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {state.error && (
        <p role="alert" className="type-web-small text-tomato-text">
          {state.error}
        </p>
      )}
      <Button type="submit" loading={pending}>
        Sign in
      </Button>
    </form>
  );
}
