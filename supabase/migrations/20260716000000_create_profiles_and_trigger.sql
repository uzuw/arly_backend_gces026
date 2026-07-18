-- ============================================================
-- Migration: Create profiles table + auto-insert trigger
-- ============================================================

-- 1. profiles table
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text        not null,
  email       text        not null,
  role        text        not null default 'user',
  is_premium  boolean     not null default false,
  premium_until timestamptz,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is 'App-level user profile, auto-populated on auth signup.';

-- 2. Row-level security
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Service-role can do everything (used by webhook-mock, admin checks, etc.)
create policy "Service role full access"
  on public.profiles
  for all
  to service_role
  using (true)
  with check (true);

-- 3. Trigger function: fire after a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  _username text;
begin
  -- Pluck username from raw_user_meta_data, fall back to email prefix
  _username := coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, username, email)
  values (new.id, _username, new.email);

  return new;
end;
$$;

-- 4. Attach trigger to auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
