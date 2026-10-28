/**
 * The database schema, applied idempotently on a server's first query (see `db.ts`) and kept
 * here so it can also be pasted into the Supabase SQL editor. Tables live in their own `stepq`
 * schema, which Supabase's public REST API does not expose, and row-level security is on with
 * no policies, so only the server's own connection (the `postgres` role) can read or write.
 */
export const SCHEMA_SQL = `
create schema if not exists stepq;

create table if not exists stepq.stats (
  id int primary key default 1 check (id = 1),
  waitlist_count int not null default 0,
  updated_at timestamptz not null default now()
);
insert into stepq.stats (id) values (1) on conflict do nothing;

create table if not exists stepq.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  gender text not null,
  age_group text not null,
  source text,
  position int,
  username text unique,
  created_at timestamptz not null default now()
);

create table if not exists stepq.team_applications (
  id uuid primary key,
  name text not null,
  email text not null,
  phone text not null,
  role text not null,
  link text,
  why text not null,
  resume bytea not null,
  resume_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists stepq.ambassador_applications (
  id uuid primary key,
  name text not null,
  email text not null,
  phone text not null,
  city text not null,
  instagram text not null,
  followers text not null,
  college_or_company text not null,
  plan text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists stepq.backings (
  id uuid primary key,
  name text not null,
  phone text not null,
  amount int not null,
  show_on_wall boolean not null,
  reference text not null,
  status text not null default 'pending',
  wall_name text,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create table if not exists stepq.founder_messages (
  id uuid primary key,
  name text not null,
  email text not null,
  phone text,
  topic text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists stepq.mail (
  id bigserial primary key,
  to_addr text not null,
  subject text not null default '',
  template text not null,
  props jsonb not null,
  reply_to text,
  status text not null default 'queued',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists mail_pending on stepq.mail (id) where status in ('queued', 'sending');

create table if not exists stepq.rate_limits (
  key text primary key,
  count int not null,
  reset_at timestamptz not null
);

create table if not exists stepq.requests (
  key text primary key,
  result jsonb,
  created_at timestamptz not null default now()
);

create table if not exists stepq.chunks (
  id uuid not null,
  idx int not null,
  total int not null,
  part text not null,
  created_at timestamptz not null default now(),
  primary key (id, idx)
);

-- 2026-10-27: statuses admins set from the dashboard, and anonymous website clicks.
alter table stepq.team_applications
  add column if not exists status text not null default 'pending_review';
alter table stepq.mail add column if not exists reply_status text;

create table if not exists stepq.site_events (
  id bigserial primary key,
  kind text not null,
  path text not null,
  label text,
  referrer text,
  created_at timestamptz not null default now()
);
create index if not exists site_events_created_at on stepq.site_events (created_at);

-- 2026-10-28: country asked on the waitlist form. Nullable: people who joined before have none.
alter table stepq.waitlist add column if not exists country text;

do $$
declare t text;
begin
  foreach t in array array['stats', 'waitlist', 'team_applications', 'ambassador_applications',
    'backings', 'founder_messages', 'mail', 'rate_limits', 'requests', 'chunks', 'site_events']
  loop
    execute format('alter table stepq.%I enable row level security', t);
  end loop;
end $$;
`;
