/**
 * Admin access, layered on the site's schema (`../schema.ts`) the first time an admin page
 * queries the database (see `db.ts` in this folder), so the public site never runs it.
 *
 * Admin queries do not use the server's own `postgres` privileges: each runs in a transaction
 * as Supabase's `authenticated` role, with the signed-in user's id in `request.jwt.claims`
 * (what `auth.uid()` reads). Every table in `stepq`, including tables added later, gets a
 * read-only policy that lets that role see rows only when `stepq.is_admin()`, i.e. the user is
 * listed in `stepq.admins`. `authenticated` has no write grants: the only writes are the
 * `stepq.*_admin` functions and `stepq.set_status` below, which check `stepq.is_admin()`
 * themselves.
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
alter table stepq.admins add column if not exists name text;

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

-- An admin edits an admin (themselves included): name, sign-in email and password. Empty
-- values leave a field as it is. Email and password change the Supabase Auth account itself.
create or replace function stepq.update_admin(
  target uuid, new_name text, new_email text, new_password text
)
returns void
language plpgsql volatile security definer set search_path = ''
as $fn$
declare
  addr text := lower(trim(coalesce(new_email, '')));
begin
  if not stepq.is_admin() then
    raise exception 'Only admins can edit admins.' using errcode = '42501';
  end if;
  if not exists (select 1 from stepq.admins where user_id = target) then
    raise exception 'That admin no longer exists.' using errcode = '22023';
  end if;
  if new_name is not null then
    update stepq.admins set name = nullif(trim(new_name), '') where user_id = target;
    update auth.users
      set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('full_name', nullif(trim(new_name), '')),
        updated_at = now()
      where id = target;
  end if;
  if addr <> '' and addr <> (select lower(email) from auth.users where id = target) then
    if addr !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
      raise exception 'Enter a valid email.' using errcode = '22023';
    end if;
    if exists (select 1 from auth.users where lower(email) = addr and id <> target) then
      raise exception 'Another account already uses that email.' using errcode = '22023';
    end if;
    update auth.users set email = addr, email_confirmed_at = now(), updated_at = now()
      where id = target;
    update auth.identities
      set identity_data = identity_data || jsonb_build_object('email', addr), updated_at = now()
      where user_id = target and provider = 'email';
    update stepq.admins set email = addr where user_id = target;
  end if;
  if coalesce(new_password, '') <> '' then
    if length(new_password) < 8 then
      raise exception 'The password needs at least 8 characters.' using errcode = '22023';
    end if;
    update auth.users
      set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
        updated_at = now()
      where id = target;
  end if;
end
$fn$;

-- Deletes another admin: their admin access and their Supabase Auth account (they can no longer
-- sign in). Admins cannot delete themselves, so there is always at least one.
create or replace function stepq.delete_admin(target uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $fn$
begin
  if not stepq.is_admin() then
    raise exception 'Only admins can delete admins.' using errcode = '42501';
  end if;
  if target = (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid then
    raise exception 'You cannot delete yourself.' using errcode = '22023';
  end if;
  delete from stepq.admins where user_id = target;
  delete from auth.identities where user_id = target;
  delete from auth.users where id = target;
end
$fn$;

revoke all on function stepq.update_admin(uuid, text, text, text) from public;
revoke all on function stepq.delete_admin(uuid) from public;
grant execute on function stepq.update_admin(uuid, text, text, text) to authenticated;
grant execute on function stepq.delete_admin(uuid) to authenticated;
revoke all on function stepq.add_admin(text, text) from public;
revoke all on function stepq.remove_admin(uuid) from public;
grant execute on function stepq.add_admin(text, text) to authenticated;
grant execute on function stepq.remove_admin(uuid) to authenticated;

-- An admin sets a row's status from the dashboard. Only the (table, column) pairs and values
-- listed here can be written, so this is no general write path. Approving an ambassador or
-- verifying a backing also stamps approved_at / verified_at (and the wall name, computed by the
-- server from the backer's name, as the emailed verify link does). Returns true the first time
-- an ambassador is approved, so the server sends the welcome email once.
create or replace function stepq.set_status(
  tbl text, row_id text, col text, val text, wall text default null
)
returns boolean
language plpgsql volatile security definer set search_path = ''
as $fn$
declare
  allowed text[];
  clearable boolean := false;
  first_time boolean := false;
  n int;
begin
  if not stepq.is_admin() then
    raise exception 'Only admins can change statuses.' using errcode = '42501';
  end if;
  case tbl || '.' || col
    when 'team_applications.status' then
      allowed := array['pending_review', 'contacted', 'considered', 'waiting_confirmation',
        'accepted', 'rejected'];
    when 'ambassador_applications.status' then
      allowed := array['pending', 'contacted', 'approved', 'rejected'];
    when 'backings.status' then
      allowed := array['pending', 'verified', 'rejected'];
    when 'mail.reply_status' then
      allowed := array['revert_pending', 'reverted'];
      clearable := true;
    else
      raise exception 'That status cannot be changed here.' using errcode = '22023';
  end case;
  if nullif(val, '') is null and not clearable then
    raise exception 'Pick a status.' using errcode = '22023';
  end if;
  if nullif(val, '') is not null and not (val = any(allowed)) then
    raise exception 'Unknown status.' using errcode = '22023';
  end if;

  if tbl = 'team_applications' then
    update stepq.team_applications set status = val where id::text = row_id;
  elsif tbl = 'ambassador_applications' then
    select approved_at is null and val = 'approved' into first_time
      from stepq.ambassador_applications where id::text = row_id for update;
    update stepq.ambassador_applications
      set status = val,
        approved_at = case when val = 'approved' then coalesce(approved_at, now()) else approved_at end
      where id::text = row_id;
  elsif tbl = 'backings' then
    update stepq.backings
      set status = val,
        verified_at = case when val = 'verified' then coalesce(verified_at, now()) else verified_at end,
        wall_name = case when val = 'verified' and show_on_wall then coalesce(wall_name, nullif(wall, ''))
          else wall_name end
      where id::text = row_id;
  else
    update stepq.mail set reply_status = nullif(val, '') where id::text = row_id;
  end if;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'That record no longer exists.' using errcode = '22023';
  end if;
  return coalesce(first_time, false);
end
$fn$;
revoke all on function stepq.set_status(text, text, text, text, text) from public;
grant execute on function stepq.set_status(text, text, text, text, text) to authenticated;

-- Every table, including ones added later, is readable by admins only. The check is wrapped in
-- a subquery so Postgres runs it once per query, not once per row.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'stepq' loop
    execute format('alter table stepq.%I enable row level security', t);
    execute format('grant select on stepq.%I to authenticated', t);
    if exists (
      select 1 from pg_policies
      where schemaname = 'stepq' and tablename = t and policyname = 'admins_read'
    ) then
      execute format(
        'alter policy admins_read on stepq.%I to authenticated using ((select stepq.is_admin()))',
        t
      );
    else
      execute format(
        'create policy admins_read on stepq.%I for select to authenticated using ((select stepq.is_admin()))',
        t
      );
    end if;
  end loop;
end $$;
`;
