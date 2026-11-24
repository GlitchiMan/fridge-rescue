-- Fridge Rescue accounts: profiles + one private kitchen per user.
-- Every table uses Row Level Security, so a signed-in user can only ever reach their own rows.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 80),
  appearance jsonb check (
    appearance is null or (
      jsonb_typeof(appearance) = 'object'
      and appearance ->> 'palette' in ('forest', 'sage', 'champagne', 'midnight')
      and appearance ->> 'mode' in ('system', 'light', 'dark')
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kitchen_states (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 2000000),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.kitchen_states enable row level security;

revoke all on public.profiles, public.kitchen_states from public, anon;
grant select on public.profiles to authenticated;
grant update (display_name, appearance) on public.profiles to authenticated;
-- Kitchen writes go through save_kitchen_state so concurrent devices can't overwrite each other.
grant select on public.kitchen_states to authenticated;

create policy "Users read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Users update their own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Users read their own kitchen" on public.kitchen_states
  for select to authenticated using ((select auth.uid()) = user_id);

-- Create a profile when an account is created.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 80));
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomic save with optimistic locking. Always acts on the caller's own row.
create function public.save_kitchen_state(p_data jsonb, p_expected_revision bigint)
returns table (saved boolean, new_revision bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_revision bigint;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_expected_revision is null then
    insert into public.kitchen_states (user_id, data)
    values (v_user, p_data)
    on conflict (user_id) do nothing
    returning revision into v_revision;
  else
    update public.kitchen_states k
    set data = p_data, revision = k.revision + 1, updated_at = now()
    where k.user_id = v_user and k.revision = p_expected_revision
    returning k.revision into v_revision;
  end if;

  if v_revision is not null then
    return query select true, v_revision;
  else
    return query select false, (select k.revision from public.kitchen_states k where k.user_id = v_user);
  end if;
end;
$$;
revoke all on function public.save_kitchen_state(jsonb, bigint) from public, anon;
grant execute on function public.save_kitchen_state(jsonb, bigint) to authenticated;

-- Lets a user permanently delete their own account. Cascades to profile and kitchen.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = v_user;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
