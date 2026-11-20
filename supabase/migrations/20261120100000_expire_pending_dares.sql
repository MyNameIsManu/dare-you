-- Expire invitations nobody answered in time
--
-- A pending dare can't be accepted after its deadline (respond_to_dare checks
-- that), but nothing moved it on, so it stayed 'pending' forever.
-- New final state 'expired': the friend never answered before the deadline.
-- (Not 'declined' — that would tell the creator the friend said no.)
--
--   pending → expired   deadline passed without an answer (scheduled job)

------------------------------------------------------------
-- 1. New status value
------------------------------------------------------------
alter table public.dares drop constraint dares_status_check;
alter table public.dares
  add constraint dares_status_check
  check (status in (
    'pending', 'open', 'submitted', 'declined', 'expired', 'completed', 'failed'
  ));

------------------------------------------------------------
-- 2. The existing job (every 5 minutes) now also expires invitations.
--    Same name and signature, so the cron schedule keeps working.
------------------------------------------------------------
create or replace function public.fail_overdue_dares()
returns void
language sql
security definer set search_path = ''
as $$
  update public.dares
  set status = 'failed'
  where status = 'open' and deadline < now();

  update public.dares
  set status = 'expired'
  where status = 'pending' and deadline < now();
$$;

-- create or replace keeps the old grants, but repeat them to be explicit
revoke execute on function public.fail_overdue_dares() from public, anon, authenticated;

------------------------------------------------------------
-- 3. Invitations that are already overdue: expire them right away
------------------------------------------------------------
update public.dares
set status = 'expired'
where status = 'pending' and deadline < now();
