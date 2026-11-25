-- Daily dare limit, with unlimited dares for admin accounts
--
-- Rule: after daring a friend, you have to wait 24 hours before daring a
-- friend again.
--   - Dares for yourself don't count and are never limited.
--   - Withdrawn dares are deleted, so they don't count either.
--   - Declined and expired dares still exist, so they do count.
--
-- Admins have no limit. An account is an admin when its confirmed email
-- matches an entry in admin_emails, ignoring a "+tag" before the @:
--   me@gmail.com, me+test@gmail.com, me+anything@gmail.com  → admin
--
-- The admin emails are NOT part of this migration (the repo is public).
-- Add them once in the Supabase SQL editor:
--   insert into public.admin_emails (email) values ('me@gmail.com');

------------------------------------------------------------
-- 1. Admin emails: invisible to the app (RLS on, no policies, no grants)
------------------------------------------------------------
create table public.admin_emails (
  email text primary key check (email = lower(email) and email not like '%+%')
);

alter table public.admin_emails enable row level security;
revoke all on public.admin_emails from anon, authenticated;

------------------------------------------------------------
-- 2. Is the signed-in user an admin?
--    Only confirmed emails count, so nobody can sign up as me+x@gmail.com
--    without access to my inbox.
------------------------------------------------------------
create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.admin_emails a
      on a.email = regexp_replace(lower(u.email), '\+[^@]*@', '@')
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

------------------------------------------------------------
-- 3. When may the signed-in user dare a friend again?
--    null = right now (or no limit at all for admins).
------------------------------------------------------------
create function public.next_dare_allowed_at()
returns timestamptz
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  next_at timestamptz;
begin
  if public.is_admin() then
    return null;
  end if;

  select max(created_at) + interval '24 hours'
  into next_at
  from public.dares
  where creator_id = (select auth.uid())
    and assignee_id <> creator_id;

  if next_at is null or next_at <= now() then
    return null;
  end if;
  return next_at;
end;
$$;

revoke execute on function public.next_dare_allowed_at() from public, anon;
grant execute on function public.next_dare_allowed_at() to authenticated;

------------------------------------------------------------
-- 4. Enforce it on every new dare
------------------------------------------------------------
create function public.enforce_daily_dare_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  next_at timestamptz;
begin
  -- The client must not backdate a dare to get around the limit
  new.created_at := now();

  -- Dares for yourself are unlimited; server-side inserts (no signed-in
  -- user, e.g. the SQL editor) are not limited either
  if new.assignee_id = new.creator_id or (select auth.uid()) is null then
    return new;
  end if;

  -- Two dares sent at the same moment must not both slip through
  perform pg_advisory_xact_lock(hashtextextended(new.creator_id::text, 0));

  next_at := public.next_dare_allowed_at();
  if next_at is not null then
    raise exception 'daily_dare_limit'
      using hint = to_char(next_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_daily_dare_limit() from public, anon, authenticated;

create trigger enforce_daily_dare_limit
  before insert on public.dares
  for each row execute function public.enforce_daily_dare_limit();
