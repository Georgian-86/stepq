import { redirect } from 'next/navigation';
import { authConfigured } from '@/server/admin/gotrue';
import { adminState } from '@/server/admin/session';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if ((await adminState()).kind === 'admin') redirect('/admin');
  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center px-4 py-10">
      <div className="rounded-card bg-white p-6 shadow-card">
        <h1 className="type-app-title mb-1">StepQ admin</h1>
        <p className="type-web-small mb-6 text-muted">Sign in with your admin account.</p>
        {authConfigured() ? (
          <LoginForm />
        ) : (
          <p role="alert" className="type-web-small text-tomato-text">
            Admin sign-in is not set up yet: add SUPABASE_ANON_KEY to the site’s environment.
          </p>
        )}
      </div>
    </main>
  );
}
