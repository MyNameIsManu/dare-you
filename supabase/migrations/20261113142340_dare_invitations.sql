-- Dare invitations: a dare for a friend must be accepted before it starts
--
-- Status flow:
--   dare for yourself:  open → completed | failed
--   dare for a friend:  pending → open → completed | failed
--                       pending → declined   (kept, so the creator sees the answer)
-- The creator can withdraw (delete) a dare at any time, e.g. while pending.

------------------------------------------------------------
-- 1. New status values
------------------------------------------------------------
alter table public.dares drop constraint dares_status_check;
alter table public.dares
  add constraint dares_status_check
  check (status in ('pending', 'open', 'declined', 'completed', 'failed'));

------------------------------------------------------------
-- 2. The database decides the starting status, not the app:
--    yourself → 'open', a friend → 'pending'
------------------------------------------------------------
create function public.set_new_dare_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := case
    when new.assignee_id = new.creator_id then 'open'
    else 'pending'
  end;
  new.completed_at := null;
  return new;
end;
$$;

create trigger dares_set_status
  before insert on public.dares
  for each row execute procedure public.set_new_dare_status();

------------------------------------------------------------
-- 3. No direct updates any more.
--    Status changes only go through functions like respond_to_dare(),
--    so nobody can skip the invitation or edit someone else's dare.
------------------------------------------------------------
drop policy "Creator and assignee update dares" on public.dares;
revoke update on public.dares from anon, authenticated;

------------------------------------------------------------
-- 4. Accept or decline a dare you were invited to
--    Returns the new status: 'open' | 'declined'
------------------------------------------------------------
create function public.respond_to_dare(target_dare_id bigint, accept boolean)
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
  update public.dares set status = new_status where id = d.id;
  return new_status;
end;
$$;

revoke execute on function public.respond_to_dare(bigint, boolean) from public, anon;
grant execute on function public.respond_to_dare(bigint, boolean) to authenticated;

------------------------------------------------------------
-- 5. Pending and declined dares stay between creator and assignee;
--    friends only see dares that were accepted (or are for yourself)
------------------------------------------------------------
drop policy "See own dares and friends' dares" on public.dares;

create policy "See own dares and friends' dares"
  on public.dares for select to authenticated
  using (
    (select auth.uid()) in (creator_id, assignee_id)
    or (
      visibility = 'friends'
      and status in ('open', 'completed', 'failed')
      and (
        public.are_friends((select auth.uid()), assignee_id)
        or public.are_friends((select auth.uid()), creator_id)
      )
    )
  );

------------------------------------------------------------
-- 6. Progress posts only on running dares
------------------------------------------------------------
drop policy "Assignee posts progress" on public.dare_updates;

create policy "Assignee posts progress"
  on public.dare_updates for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1 from public.dares d
      where d.id = dare_id
        and d.assignee_id = (select auth.uid())
        and d.status = 'open'
    )
  );
