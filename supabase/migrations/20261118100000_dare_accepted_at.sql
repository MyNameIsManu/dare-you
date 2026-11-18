-- accepted_at: when a dare actually started
--
-- A dare for a friend only starts once they accept it, so created_at is the
-- wrong starting point for progress ("x of y days done").
--   dare for yourself:  accepted_at = created_at (starts right away)
--   dare for a friend:  accepted_at = null while pending, set on accept
--   declined:           stays null

------------------------------------------------------------
-- 1. Column + backfill
--    Existing dares that already started: the real accept time is unknown,
--    so fall back to created_at.
------------------------------------------------------------
alter table public.dares add column accepted_at timestamptz;

update public.dares
set accepted_at = created_at
where status in ('open', 'submitted', 'completed', 'failed');

------------------------------------------------------------
-- 2. On insert the database sets it, not the app
------------------------------------------------------------
create or replace function public.set_new_dare_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assignee_id = new.creator_id then
    new.status := 'open';
    new.accepted_at := now();
  else
    new.status := 'pending';
    new.accepted_at := null;
  end if;
  new.completed_at := null;
  return new;
end;
$$;

------------------------------------------------------------
-- 3. Accepting an invitation starts the clock
--    Same as before, plus accepted_at.
------------------------------------------------------------
create or replace function public.respond_to_dare(target_dare_id bigint, accept boolean)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  d public.dares%rowtype;
  new_status text;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  -- Lock the row so two answers can't race each other
  select * into d from public.dares where id = target_dare_id for update;

  -- Runs as definer (bypasses RLS), so check access by hand.
  -- Same message for "doesn't exist" and "not yours" to avoid leaking ids.
  if not found or d.assignee_id <> me then
    raise exception 'Dare not found';
  end if;

  if d.status <> 'pending' then
    raise exception 'This dare has already been answered';
  end if;

  if accept and d.deadline < now() then
    raise exception 'The deadline of this dare has already passed';
  end if;

  new_status := case when accept then 'open' else 'declined' end;
  update public.dares
  set status = new_status,
      accepted_at = case when accept then now() else null end
  where id = d.id;
  return new_status;
end;
$$;
