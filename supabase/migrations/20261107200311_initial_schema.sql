-- DareYou: initial schema
-- Tables: profiles, friendships, dares, dare_updates
-- Every table has Row Level Security (RLS) enabled.

------------------------------------------------------------
-- PROFILES: one row per user, created automatically on sign-up
------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (char_length(username) between 3 and 30),
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

------------------------------------------------------------
-- FRIENDSHIPS: requests and accepted friendships
------------------------------------------------------------
create table public.friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

-- Only one friendship per pair, regardless of who asked whom
create unique index friendships_pair_idx on public.friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);

-- Helper used by the access rules: are users a and b friends?
create function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a)
      )
  );
$$;

revoke execute on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

------------------------------------------------------------
-- DARES: a task with a deadline, for yourself or a friend
------------------------------------------------------------
create table public.dares (
  id bigint generated always as identity primary key,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  assignee_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text,
  deadline timestamptz not null,
  status text not null default 'open' check (status in ('open', 'completed', 'failed')),
  visibility text not null default 'friends' check (visibility in ('private', 'friends')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index dares_assignee_idx on public.dares (assignee_id);
create index dares_creator_idx on public.dares (creator_id);

------------------------------------------------------------
-- DARE_UPDATES: progress posts on a dare (text + optional photo)
------------------------------------------------------------
create table public.dare_updates (
  id bigint generated always as identity primary key,
  dare_id bigint not null references public.dares (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  image_path text,
  created_at timestamptz not null default now()
);

create index dare_updates_dare_idx on public.dare_updates (dare_id);

------------------------------------------------------------
-- ROW LEVEL SECURITY
------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.dares enable row level security;
alter table public.dare_updates enable row level security;

-- Profiles: signed-in users can find each other; you edit only your own
create policy "Profiles are visible to signed-in users"
  on public.profiles for select to authenticated
  using (true);

create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Friendships: you see and remove your own; you send requests; the recipient accepts
create policy "See own friendships"
  on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy "Send friend requests"
  on public.friendships for insert to authenticated
  with check ((select auth.uid()) = requester_id and status = 'pending');

create policy "Recipient accepts friend requests"
  on public.friendships for update to authenticated
  using ((select auth.uid()) = addressee_id)
  with check ((select auth.uid()) = addressee_id);

create policy "Remove own friendships"
  on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- Dares: visible to creator, assignee, and (unless private) their friends
create policy "See own dares and friends' dares"
  on public.dares for select to authenticated
  using (
    (select auth.uid()) in (creator_id, assignee_id)
    or (
      visibility = 'friends'
      and (
        public.are_friends((select auth.uid()), assignee_id)
        or public.are_friends((select auth.uid()), creator_id)
      )
    )
  );

create policy "Create dares for yourself or a friend"
  on public.dares for insert to authenticated
  with check (
    (select auth.uid()) = creator_id
    and (assignee_id = creator_id or public.are_friends(creator_id, assignee_id))
  );

create policy "Creator and assignee update dares"
  on public.dares for update to authenticated
  using ((select auth.uid()) in (creator_id, assignee_id))
  with check ((select auth.uid()) in (creator_id, assignee_id));

create policy "Creator deletes dares"
  on public.dares for delete to authenticated
  using ((select auth.uid()) = creator_id);

-- Dare updates: visible to whoever can see the dare; only the assignee posts progress
create policy "See updates of visible dares"
  on public.dare_updates for select to authenticated
  using (exists (select 1 from public.dares d where d.id = dare_id));

create policy "Assignee posts progress"
  on public.dare_updates for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1 from public.dares d
      where d.id = dare_id and d.assignee_id = (select auth.uid())
    )
  );

create policy "Authors delete their own updates"
  on public.dare_updates for delete to authenticated
  using ((select auth.uid()) = author_id);