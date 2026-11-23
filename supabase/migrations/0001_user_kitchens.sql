-- Fridge Rescue 4.0 — proposed per-user cloud kitchen persistence.
-- Run only after creating a Supabase project and reviewing the migration.
-- Auth is managed by Supabase Auth. Do NOT store passwords in this table.
create table if not exists public.user_kitchens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  revision bigint not null default 1 check (revision >= 1),
  updated_at timestamptz not null default now(),
  constraint kitchen_payload_is_object check (jsonb_typeof(data) = 'object'),
  constraint kitchen_payload_size check (octet_length(data::text) <= 2000000)
);

alter table public.user_kitchens enable row level security;

-- Only signed-in users can use this table; never expose a service-role key.
revoke all on table public.user_kitchens from anon;
grant select, insert, update, delete on table public.user_kitchens to authenticated;

create policy "Read your own kitchen" on public.user_kitchens
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Create your own kitchen" on public.user_kitchens
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Update your own kitchen" on public.user_kitchens
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Delete your own kitchen" on public.user_kitchens
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Application must validate state with the existing Zod parser before sending,
-- preserve guest data until the user confirms import, and handle revision conflicts.
