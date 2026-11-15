-- Dare proofs: finish a dare with a photo, the creator decides
--
-- Status flow:
--   friend dare:  open → submitted (photo uploaded) → completed   (creator accepts)
--                                                  → open        (creator rejects, deadline not passed)
--                                                  → failed      (creator rejects, deadline passed)
--   own dare:     open → completed   (photo uploaded, no review needed)
--   deadline:     open without proof → failed   (scheduled job, every 5 minutes)
--                 submitted is NOT failed — the proof came in time, it waits for the creator

------------------------------------------------------------
-- 1. New status 'submitted' + where the proof photo is stored
------------------------------------------------------------
alter table public.dares drop constraint dares_status_check;
alter table public.dares
  add constraint dares_status_check
  check (status in ('pending', 'open', 'submitted', 'declined', 'completed', 'failed'));

alter table public.dares
  add column proof_path text,            -- path inside the 'dare-proofs' bucket
  add column proof_submitted_at timestamptz;

------------------------------------------------------------
-- 2. Private storage bucket for proof photos
--    Files live at  <dare id>/<random name>.jpg
------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dare-proofs',
  'dare-proofs',
  false,                                   -- only via signed URLs
  10 * 1024 * 1024,                        -- 10 MB per photo
  array['image/jpeg', 'image/png', 'image/heic', 'image/webp']
)
on conflict (id) do nothing;

-- The assignee may upload into the folder of their own running dare
create policy "Assignee uploads dare proof"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dare-proofs'
    and exists (
      select 1 from public.dares d
      where d.id::text = (storage.foldername(name))[1]
        and d.assignee_id = (select auth.uid())
        and d.status = 'open'
    )
  );

-- Creator and assignee may look at the proof
create policy "Creator and assignee view dare proof"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'dare-proofs'
    and exists (
      select 1 from public.dares d
      where d.id::text = (storage.foldername(name))[1]
        and (select auth.uid()) in (d.creator_id, d.assignee_id)
    )
  );

------------------------------------------------------------
-- 3. Submit proof (assignee). Own dares complete right away.
--    Returns the new status: 'submitted' | 'completed'
------------------------------------------------------------
create function public.submit_dare_proof(target_dare_id bigint, image_path text)
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

  select * into d from public.dares where id = target_dare_id for update;

  -- Runs as definer (bypasses RLS), so check access by hand
  if not found or d.assignee_id <> me then
    raise exception 'Dare not found';
  end if;

  if d.status <> 'open' then
    raise exception 'Proof can only be submitted for a running dare';
  end if;

  if d.deadline < now() then
    raise exception 'The deadline of this dare has already passed';
  end if;

  -- The photo must be one I uploaded into this dare's folder
  if split_part(image_path, '/', 1) <> d.id::text
     or not exists (
       select 1 from storage.objects o
       where o.bucket_id = 'dare-proofs'
         and o.name = image_path
         and o.owner_id = me::text
     ) then
    raise exception 'Proof photo not found';
  end if;

  new_status := case when d.creator_id = d.assignee_id then 'completed' else 'submitted' end;

  update public.dares
  set status = new_status,
      proof_path = image_path,
      proof_submitted_at = now(),
      completed_at = case when new_status = 'completed' then now() else null end
  where id = d.id;

  return new_status;
end;
$$;

revoke execute on function public.submit_dare_proof(bigint, text) from public, anon;
grant execute on function public.submit_dare_proof(bigint, text) to authenticated;

------------------------------------------------------------
-- 4. Review proof (creator of a friend dare)
--    Returns the new status: 'completed' | 'open' | 'failed'
------------------------------------------------------------
create function public.review_dare_proof(target_dare_id bigint, approve boolean)
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

  select * into d from public.dares where id = target_dare_id for update;

  if not found or d.creator_id <> me then
    raise exception 'Dare not found';
  end if;

  if d.status <> 'submitted' then
    raise exception 'There is no proof waiting for review';
  end if;

  new_status := case
    when approve then 'completed'
    when d.deadline > now() then 'open'     -- another try is still possible
    else 'failed'
  end;

  update public.dares
  set status = new_status,
      completed_at = case when new_status = 'completed' then now() else null end,
      -- A rejected photo is no longer "the" proof (the file itself stays in storage)
      proof_path = case when approve then proof_path else null end,
      proof_submitted_at = case when approve then proof_submitted_at else null end
  where id = d.id;

  return new_status;
end;
$$;

revoke execute on function public.review_dare_proof(bigint, boolean) from public, anon;
grant execute on function public.review_dare_proof(bigint, boolean) to authenticated;

------------------------------------------------------------
-- 5. Friends can also see dares that are waiting for review
------------------------------------------------------------
drop policy "See own dares and friends' dares" on public.dares;

create policy "See own dares and friends' dares"
  on public.dares for select to authenticated
  using (
    (select auth.uid()) in (creator_id, assignee_id)
    or (
      visibility = 'friends'
      and status in ('open', 'submitted', 'completed', 'failed')
      and (
        public.are_friends((select auth.uid()), assignee_id)
        or public.are_friends((select auth.uid()), creator_id)
      )
    )
  );

------------------------------------------------------------
-- 6. Deadline passed without proof → failed (every 5 minutes)
------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

create function public.fail_overdue_dares()
returns void
language sql
security definer set search_path = ''
as $$
  update public.dares
  set status = 'failed'
  where status = 'open' and deadline < now();
$$;

-- Only the scheduler (postgres) runs this, never the app
revoke execute on function public.fail_overdue_dares() from public, anon, authenticated;

-- Same name again = replaces the job, so re-running is safe
select cron.schedule(
  'fail-overdue-dares',
  '*/5 * * * *',
  'select public.fail_overdue_dares()'
);
