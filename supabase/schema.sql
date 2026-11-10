-- AuraSpin cloud sync schema.
-- One row per (user, bucket). Buckets mirror the app's local storage buckets:
-- library, history, player, theme, onboarded, apikey, oauth.
-- Last write wins per bucket; updated_at decides which side is newer.

create table if not exists public.user_state (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  bucket     text        not null check (bucket in ('library', 'history', 'player', 'theme', 'onboarded', 'apikey', 'oauth')),
  data       jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, bucket)
);

-- Each signed-in user can only ever see and change their own rows.
alter table public.user_state enable row level security;

create policy "Users read own state"
  on public.user_state for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own state"
  on public.user_state for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own state"
  on public.user_state for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own state"
  on public.user_state for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Live updates to other open devices (Realtime respects the RLS policies above).
alter publication supabase_realtime add table public.user_state;
