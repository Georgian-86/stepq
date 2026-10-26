/**
 * Admin access, layered on the site's schema (`../schema.ts`) the first time an admin page
 * queries the database (see `db.ts` in this folder), so the public site never runs it.
 *
 * Admin queries do not use the server's own `postgres` privileges: each runs in a transaction
 * as Supabase's `authenticated` role, with the signed-in user's id in `request.jwt.claims`
 * (what `auth.uid()` reads). Every table in `stepq`, including tables added later, gets a
 * read-only policy that lets that role see rows only when `stepq.is_admin()`, i.e. the user is
 * listed in `stepq.admins`. `authenticated` has no write grants: the only writes are
 * `stepq.add_admin` / `stepq.remove_admin`, which check `stepq.is_admin()` themselves.
 *
 * The `stepq` schema stays out of Supabase's public REST API, so even a signed-in admin's
 * token cannot reach it from a browser; only this server can.
 *
 * On a plain Postgres (tests) the `authenticated` role is created here; on Supabase it exists.
 */
export const ADMIN_SQL = `
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not pg_has_role(current_user, 'authenticated', 'member') then
    execute format('grant authenticated to %I', current_user);
  end if;
exception when insufficient_privilege then
  null; -- Supabase's postgres role is already a member
end $$;

create table if not exists stepq.admins (
  user_id uuid primary key,
  email text not null,
  created_at timestamptz not null default now()
);
alter table stepq.admins add column if not exists added_by text;

create or replace function stepq.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $fn$
  select exists (
    select 1 from stepq.admins
    where user_id = (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
  )
$fn$;
revoke all on function stepq.is_admin() from public;
grant execute on function stepq.is_admin() to authenticated;
grant usage on schema stepq to authenticated;

-- An admin adds an admin by email. A new email gets a confirmed Supabase Auth account with the
-- given password (written the way Supabase Auth itself stores it, so no service key is needed);
-- an existing account keeps its password. Returns 'created' or 'promoted'.
create or replace function stepq.add_admin(new_email text, new_password text)
returns text
language plpgsql volatile security definer set search_path = ''
as $fn$
declare
  me jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  addr text := lower(trim(new_email));
  uid uuid;
  outcome text := 'promoted';
begin
  if not stepq.is_admin() then
    raise exception 'Only admins can add admins.' using errcode = '42501';
  end if;
  if addr !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'Enter a valid email.' using errcode = '22023';
  end if;
  select id into uid from auth.users where lower(email) = addr;
  if uid is null then
    if coalesce(length(new_password), 0) < 8 then
      raise exception 'A new account needs a password of at least 8 characters.'
        using errcode = '22023';
    end if;
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', addr,
      extensions.crypt(new_password, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), uid, uid::text, 'email',
      jsonb_build_object('sub', uid::text, 'email', addr, 'email_verified', true),
      now(), now(), now()
    );
    outcome := 'created';
  end if;
  insert into stepq.admins (user_id, email, added_by)
  values (uid, addr, me ->> 'email')
  on conflict (user_id) do nothing;
  return outcome;
end
$fn$;

-- Takes admin access away (the Supabase Auth account stays). Admins cannot remove themselves,
-- so there is always at least one.
create or replace function stepq.remove_admin(target uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $fn$
begin
  if not stepq.is_admin() then
    raise exception 'Only admins can remove admins.' using errcode = '42501';
  end if;
  if target = (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid then
    raise exception 'You cannot remove yourself.' using errcode = '22023';
  end if;
  delete from stepq.admins where user_id = target;
end
$fn$;

revoke all on function stepq.add_admin(text, text) from public;
revoke all on function stepq.remove_admin(uuid) from public;
grant execute on function stepq.add_admin(text, text) to authenticated;
grant execute on function stepq.remove_admin(uuid) to authenticated;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'stepq' loop
    execute format('alter table stepq.%I enable row level security', t);
    execute format('grant select on stepq.%I to authenticated', t);
    if not exists (
      select 1 from pg_policies
      where schemaname = 'stepq' and tablename = t and policyname = 'admins_read'
    ) then
      execute format(
        'create policy admins_read on stepq.%I for select to authenticated using (stepq.is_admin())',
        t
      );
    end if;
  end loop;
end $$;
`;
